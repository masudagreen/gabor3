/**
 * v1.1 永続化レイヤ（spec-v11.md §11、A-12）。
 *
 * Sprint 8 で本格実装。F-17（起動時データリセット）と v1.1 のクリーンスキーマ
 * （A-2）を実装する：
 *   - `clearV1LegacyStorage()`：v1 旧キーを一括 multiRemove
 *   - v1.1 版 load/save ヘルパー（UserProfile / Settings / DataResetNotice
 *     フラグ等）
 *
 * Sprint 8 で本実装する範囲：
 *   - F-17 で必須の `dataResetNoticeShown` / `clearV1LegacyStorage`
 *   - F-04 / オンボーディングで必須の `UserProfile` v1.1 / `Settings` v1.1
 *   - F-09（staircase v1.1）の `loadStaircaseV11` / `saveStaircaseV11` /
 *     `resetStaircaseV11`（13 ゲーム × 個別キー）
 *   - F-04 ホームの `Streak`（v1 と同じ構造）
 *
 * Sprint 9 以降で追加実装：
 *   - SessionRecord / TrialRecord / DailyStats（日付分割キー）/ BadgeStatus
 *
 * 参照：
 *   - spec-v11.md §11「永続化キー名前空間（A-12）」
 *   - spec-v11.md §3「想定 / A-2」（既存データ廃棄前提）
 *   - spec-v11.md §6「F-17 起動時データリセット」
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_VIEWING_DISTANCE_CM,
  DeviceType,
  ViewingDistanceCm,
} from '../lib/calibration';
import { StaircaseStateV11, createStaircaseV11 } from '../lib/v11/staircaseV11';
import { GameIdV11, ALL_GAME_IDS_V11 } from './gameIds-v11';

// ゲーム ID 型と ALL_GAME_IDS_V11 は `gameIds-v11.ts` に分離（AsyncStorage 非依存）。
// 後方互換のため re-export する。
export type { GameIdV11 } from './gameIds-v11';
export { ALL_GAME_IDS_V11 } from './gameIds-v11';

// ---------------------------------------------------------------------------
// v1.1 用キー定数（spec-v11.md §11）
// ---------------------------------------------------------------------------

/** v1.1 名前空間プレフィックス。v1 の `gaboreye:v1:` とは別系統。 */
export const KEY_PREFIX_V11 = 'gaboreye:v1.1:';

/** UserProfile（spec-v11.md §11 例） */
export const KEY_USER_PROFILE_V11 = `${KEY_PREFIX_V11}userProfile`;

/** Settings（spec-v11.md §11 例） */
export const KEY_SETTINGS_V11 = `${KEY_PREFIX_V11}settings`;

/** Streak（spec-v11.md §11 例） */
export const KEY_STREAK_V11 = `${KEY_PREFIX_V11}streak`;

/**
 * F-17 用フラグ：データリセット通知をすでに表示したか。
 * 一度表示したら true を立てて以降は表示しない（spec-v11.md §F-17 受け入れ基準）。
 */
export const KEY_DATA_RESET_NOTICE_SHOWN = `${KEY_PREFIX_V11}dataResetNoticeShown`;

/**
 * StaircaseState（gameId 単位、spec-v11.md §11 例）。
 * 例：`gaboreye:v1.1:staircase:G-04`
 */
export const KEY_STAIRCASE_V11 = (gameId: GameIdV11): string =>
  `${KEY_PREFIX_V11}staircase:${gameId}`;

/**
 * DailyStats（日付単位、spec-v11.md §11 例）。
 * 例：`gaboreye:v1.1:dailyStats:2026-04-30`
 *
 * 注：v1 では DailyStats を 1 つの配列として `gaboreye:v1:dailyStats` に
 * 全件入れていたが、v1.1 では日付単位に分割する（spec-v11.md §11 の例に従う）。
 */
export const KEY_DAILY_STATS_V11 = (date: string): string =>
  `${KEY_PREFIX_V11}dailyStats:${date}`;

/**
 * BadgeStatus（バッジ ID 単位、spec-v11.md §11 例）。
 * 例：`gaboreye:v1.1:badge:B-09`
 */
export const KEY_BADGE_V11 = (badgeId: string): string =>
  `${KEY_PREFIX_V11}badge:${badgeId}`;

/**
 * SessionRecord（uuid 単位、spec-v11.md §11 例）。
 * 例：`gaboreye:v1.1:session:<uuid>`
 */
export const KEY_SESSION_V11 = (sessionId: string): string =>
  `${KEY_PREFIX_V11}session:${sessionId}`;

/**
 * TrialRecord（uuid 単位、spec-v11.md §11 例）。
 * 例：`gaboreye:v1.1:trial:<uuid>`
 */
export const KEY_TRIAL_V11 = (trialId: string): string =>
  `${KEY_PREFIX_V11}trial:${trialId}`;

// ---------------------------------------------------------------------------
// F-17 起動時データリセット：v1 旧キー一覧（消去対象）
// ---------------------------------------------------------------------------

/**
 * v1 由来の永続化キー一覧。
 * F-17（spec-v11.md §6）に従い、アプリ起動時に検出されたら全消去する。
 *
 * v1 の `src/state/storage.ts` で定義されているキーと **完全に対応** している
 * 必要がある。v1 側でキーを増やした場合はここにも追記する。
 */
export const V1_LEGACY_KEYS: readonly string[] = [
  'gaboreye:v1:staircase:game1',
  'gaboreye:v1:staircase:game2',
  'gaboreye:v1:staircase:game3',
  'gaboreye:v1:sessions',
  'gaboreye:v1:trials',
  'gaboreye:v1:userProfile',
  'gaboreye:v1:dailyStats',
  'gaboreye:v1:streak',
  'gaboreye:v1:badges',
  'gaboreye:v1:settings',
] as const;

/** v1 旧キーのプレフィックス。`AsyncStorage.getAllKeys()` 走査時の判定用。 */
export const V1_LEGACY_KEY_PREFIX = 'gaboreye:v1:';

// ---------------------------------------------------------------------------
// F-17 起動時データリセット — 検出と消去
// ---------------------------------------------------------------------------

/**
 * v1 由来データが残っているかを検出する純検査関数（副作用なし）。
 *
 * AsyncStorage.getAllKeys() で取得した全キーから、`V1_LEGACY_KEY_PREFIX` で
 * 始まるものが 1 つでも存在すれば true を返す。
 *
 * 注意：このとき `gaboreye:v1.1:` で始まるキーは検出しない（プレフィックスが
 * 違うため）。`startsWith('gaboreye:v1:')` は v1.1 キーには一致しない。
 */
export async function detectV1LegacyData(): Promise<boolean> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return keys.some((k) => k.startsWith(V1_LEGACY_KEY_PREFIX) && !k.startsWith(KEY_PREFIX_V11));
  } catch {
    return false;
  }
}

/**
 * v1 由来データを全消去する（F-17）。
 *
 * 1. AsyncStorage.getAllKeys() で全キーを取得し `gaboreye:v1:` プレフィックス
 *    （ただし `gaboreye:v1.1:` を除く）を一括 multiRemove する
 * 2. V1_LEGACY_KEYS（明示リスト）に含まれるキーも併せて消去する。
 *    v1 が未来に追加するキーへの安全側冗長対策
 *
 * 戻り値：消去したキーの件数（0 = もともと無かった or 失敗）
 */
export async function clearV1LegacyStorage(): Promise<number> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const targets = new Set<string>();
    for (const k of allKeys) {
      if (k.startsWith(V1_LEGACY_KEY_PREFIX) && !k.startsWith(KEY_PREFIX_V11)) {
        targets.add(k);
      }
    }
    // 明示リストも追加（getAllKeys から漏れた場合の保険）
    for (const k of V1_LEGACY_KEYS) targets.add(k);
    const targetArr = Array.from(targets);
    if (targetArr.length === 0) return 0;
    await AsyncStorage.multiRemove(targetArr);
    return targetArr.length;
  } catch {
    return 0;
  }
}

/** F-17 通知をすでに表示したかを返す。未保存なら false。 */
export async function isDataResetNoticeShown(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY_DATA_RESET_NOTICE_SHOWN);
    return raw === 'true';
  } catch {
    return false;
  }
}

/** F-17 通知を表示済みとマーク（OK タップ直後に呼ぶ）。 */
export async function markDataResetNoticeShown(): Promise<void> {
  await AsyncStorage.setItem(KEY_DATA_RESET_NOTICE_SHOWN, 'true');
}

// ---------------------------------------------------------------------------
// UserProfile v1.1（spec-v11.md §9.1）
// ---------------------------------------------------------------------------

/** spec-v11.md §9.1 `UserProfile` の AgeGroup */
export type AgeGroupV11 = '40s' | '50s' | '60s' | '70s+' | 'unspecified';

/** spec-v11.md §9.1 `UserProfile`（v1 から `schemaVersion` を追加） */
export type UserProfileV11 = {
  onboardingCompleted: boolean;
  /** ISO 8601 文字列、未同意なら null */
  disclaimerAgreedAt: string | null;
  ageGroup: AgeGroupV11;
  viewingDistanceCm: ViewingDistanceCm;
  deviceTypeEstimated: DeviceType;
  /** ISO 8601 文字列、初回起動日時 */
  createdAt: string;
  /** A-12：スキーマバージョン */
  schemaVersion: '1.1.0';
};

/** UserProfile v1.1 の初期値。 */
export function createDefaultUserProfileV11(
  now: () => string = () => new Date().toISOString(),
): UserProfileV11 {
  return {
    onboardingCompleted: false,
    disclaimerAgreedAt: null,
    ageGroup: 'unspecified',
    viewingDistanceCm: DEFAULT_VIEWING_DISTANCE_CM,
    deviceTypeEstimated: 'pc',
    createdAt: now(),
    schemaVersion: '1.1.0',
  };
}

/** UserProfile v1.1 の取得。未保存ならデフォルトを返す。不正 JSON でもデフォルト復帰。 */
export async function loadUserProfileV11(
  now: () => string = () => new Date().toISOString(),
): Promise<UserProfileV11> {
  try {
    const raw = await AsyncStorage.getItem(KEY_USER_PROFILE_V11);
    if (!raw) return createDefaultUserProfileV11(now);
    const parsed = JSON.parse(raw) as Partial<UserProfileV11>;
    return mergeUserProfileV11(createDefaultUserProfileV11(now), parsed);
  } catch {
    return createDefaultUserProfileV11(now);
  }
}

/** UserProfile v1.1 の保存。 */
export async function saveUserProfileV11(
  profile: UserProfileV11,
): Promise<void> {
  await AsyncStorage.setItem(KEY_USER_PROFILE_V11, JSON.stringify(profile));
}

/** UserProfile v1.1 の部分更新（load → patch → save）。 */
export async function updateUserProfileV11(
  patch: Partial<UserProfileV11>,
): Promise<UserProfileV11> {
  const current = await loadUserProfileV11();
  const next = mergeUserProfileV11(current, patch);
  await saveUserProfileV11(next);
  return next;
}

function mergeUserProfileV11(
  base: UserProfileV11,
  patch: Partial<UserProfileV11>,
): UserProfileV11 {
  return {
    onboardingCompleted: patch.onboardingCompleted ?? base.onboardingCompleted,
    disclaimerAgreedAt: patch.disclaimerAgreedAt ?? base.disclaimerAgreedAt,
    ageGroup: patch.ageGroup ?? base.ageGroup,
    viewingDistanceCm: patch.viewingDistanceCm ?? base.viewingDistanceCm,
    deviceTypeEstimated:
      patch.deviceTypeEstimated ?? base.deviceTypeEstimated,
    createdAt: patch.createdAt ?? base.createdAt,
    schemaVersion: '1.1.0',
  };
}

// ---------------------------------------------------------------------------
// Settings v1.1（spec-v11.md §9.1）
// ---------------------------------------------------------------------------

/** spec-v11.md §9.1 `Settings` の DarkMode */
export type DarkModePreferenceV11 = 'system' | 'light' | 'dark';

/** spec-v11.md §9.1 `Settings` の OneEyeGuidance */
export type OneEyeGuidanceV11 = 'off' | 'left' | 'right' | 'alternate';

/**
 * spec-v11.md §9.1 `Settings`。
 *
 * v1 から削除：
 *   - `game3BgmEnabled`：v1.1 では BGM 仕様自体が再定義されるまで保留
 *
 * v1 から継承：soundEnabled / hapticsEnabled / darkMode / oneEyeGuidance
 */
export type SettingsV11 = {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  darkMode: DarkModePreferenceV11;
  oneEyeGuidance: OneEyeGuidanceV11;
};

/** Settings v1.1 の初期値。 */
export function createDefaultSettingsV11(): SettingsV11 {
  return {
    soundEnabled: true,
    hapticsEnabled: true,
    darkMode: 'system',
    oneEyeGuidance: 'off',
  };
}

/** Settings v1.1 取得。未保存ならデフォルト。 */
export async function loadSettingsV11(): Promise<SettingsV11> {
  try {
    const raw = await AsyncStorage.getItem(KEY_SETTINGS_V11);
    if (!raw) return createDefaultSettingsV11();
    const parsed = JSON.parse(raw) as Partial<SettingsV11>;
    return mergeSettingsV11(createDefaultSettingsV11(), parsed);
  } catch {
    return createDefaultSettingsV11();
  }
}

/** Settings v1.1 保存。 */
export async function saveSettingsV11(settings: SettingsV11): Promise<void> {
  await AsyncStorage.setItem(KEY_SETTINGS_V11, JSON.stringify(settings));
}

/** Settings v1.1 部分更新。 */
export async function updateSettingsV11(
  patch: Partial<SettingsV11>,
): Promise<SettingsV11> {
  const current = await loadSettingsV11();
  const next = mergeSettingsV11(current, patch);
  await saveSettingsV11(next);
  return next;
}

function mergeSettingsV11(
  base: SettingsV11,
  patch: Partial<SettingsV11>,
): SettingsV11 {
  return {
    soundEnabled: patch.soundEnabled ?? base.soundEnabled,
    hapticsEnabled: patch.hapticsEnabled ?? base.hapticsEnabled,
    darkMode: patch.darkMode ?? base.darkMode,
    oneEyeGuidance: patch.oneEyeGuidance ?? base.oneEyeGuidance,
  };
}

// ---------------------------------------------------------------------------
// Streak v1.1（spec-v11.md §9.1）— v1 と同じ構造、キーのみ別
// ---------------------------------------------------------------------------

/** spec-v11.md §9.1 `Streak` */
export type StreakV11 = {
  currentStreak: number;
  longestStreak: number;
  /** 最終フルコース完了日（YYYY-MM-DD、端末ローカル） */
  lastCompletedDate: string | null;
};

export function createDefaultStreakV11(): StreakV11 {
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastCompletedDate: null,
  };
}

export async function loadStreakV11(): Promise<StreakV11> {
  try {
    const raw = await AsyncStorage.getItem(KEY_STREAK_V11);
    if (!raw) return createDefaultStreakV11();
    const parsed = JSON.parse(raw) as Partial<StreakV11>;
    return {
      currentStreak: parsed.currentStreak ?? 0,
      longestStreak: parsed.longestStreak ?? 0,
      lastCompletedDate: parsed.lastCompletedDate ?? null,
    };
  } catch {
    return createDefaultStreakV11();
  }
}

export async function saveStreakV11(streak: StreakV11): Promise<void> {
  await AsyncStorage.setItem(KEY_STREAK_V11, JSON.stringify(streak));
}

// ---------------------------------------------------------------------------
// StaircaseState v1.1（spec-v11.md §9.1）
// ---------------------------------------------------------------------------

/** v1.1 StaircaseState の取得。未保存なら初期値（gameRegistry 由来）。 */
export async function loadStaircaseV11(
  gameId: GameIdV11,
): Promise<StaircaseStateV11> {
  try {
    const raw = await AsyncStorage.getItem(KEY_STAIRCASE_V11(gameId));
    if (!raw) return createStaircaseV11(gameId);
    const parsed = JSON.parse(raw) as StaircaseStateV11;
    if (parsed.gameId !== gameId) return createStaircaseV11(gameId);
    return parsed;
  } catch {
    return createStaircaseV11(gameId);
  }
}

/** v1.1 StaircaseState の保存。 */
export async function saveStaircaseV11(
  state: StaircaseStateV11,
): Promise<void> {
  await AsyncStorage.setItem(
    KEY_STAIRCASE_V11(state.gameId),
    JSON.stringify(state),
  );
}

/** v1.1 StaircaseState を初期値にリセット（設定 → staircase リセット）。 */
export async function resetStaircaseV11(
  gameId: GameIdV11,
): Promise<StaircaseStateV11> {
  const initial = createStaircaseV11(gameId);
  await saveStaircaseV11(initial);
  return initial;
}

/** 13 ゲーム全 staircase リセット（設定画面の一括リセット用）。 */
export async function resetAllStaircasesV11(): Promise<void> {
  await Promise.all(ALL_GAME_IDS_V11.map((id) => resetStaircaseV11(id)));
}

// ---------------------------------------------------------------------------
// プレフィックス走査ヘルパー（DailyStats / Badge / Session / Trial 用）
// ---------------------------------------------------------------------------

/**
 * 指定プレフィックスで始まるキーを `AsyncStorage.getAllKeys()` から抽出する。
 *
 * Sprint 9 以降で DailyStats / Badge / Session / Trial の全件取得に使う。
 * Sprint 8 では F-17 検出ロジックの内部関数として、および将来用の公開 API
 * として配置。
 */
export async function getKeysByPrefix(prefix: string): Promise<string[]> {
  try {
    const all = await AsyncStorage.getAllKeys();
    return all.filter((k) => k.startsWith(prefix));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// 全データ削除（v1.1 用、将来の設定画面で使用）
// ---------------------------------------------------------------------------

/**
 * v1.1 名前空間の全データを削除する（spec-v11.md §F-14 設定画面「全データ削除」）。
 *
 * 削除対象：`gaboreye:v1.1:` プレフィックスを持つすべてのキー。
 * Sprint 19 で設定画面と接続される。Sprint 8 では関数を配置して
 * テストでカバレッジを担保。
 */
export async function clearAllStorageV11(): Promise<void> {
  const keys = await getKeysByPrefix(KEY_PREFIX_V11);
  if (keys.length > 0) {
    await AsyncStorage.multiRemove(keys);
  }
}

// ---------------------------------------------------------------------------
// SessionRecord / TrialRecord v1.1（Sprint 9 追加）
// ---------------------------------------------------------------------------

/** spec-v11.md §9.1 `SessionRecord` */
export type SessionTypeV11 = 'full-course' | 'single';

export type GameSessionResultV11 = {
  gameId: GameIdV11;
  /** 今回の閾値（直近 5 セッション平均） */
  threshold: number;
  isCorrect: boolean;
};

export type SessionRecordV11 = {
  sessionId: string;
  sessionType: SessionTypeV11;
  startedAt: string;
  completedAt: string | null;
  gameResults: GameSessionResultV11[];
  wideScore: number | null;
};

/** SessionRecord 1 件を保存（uuid 単位）。 */
export async function saveSessionRecordV11(
  record: SessionRecordV11,
): Promise<void> {
  await AsyncStorage.setItem(
    KEY_SESSION_V11(record.sessionId),
    JSON.stringify(record),
  );
}

/** SessionRecord 1 件をロード。見つからなければ null。 */
export async function loadSessionRecordV11(
  sessionId: string,
): Promise<SessionRecordV11 | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_SESSION_V11(sessionId));
    if (!raw) return null;
    return JSON.parse(raw) as SessionRecordV11;
  } catch {
    return null;
  }
}

/** SessionRecord 全件を取得（プレフィックス走査）。新しい順で返す。 */
export async function loadAllSessionRecordsV11(): Promise<SessionRecordV11[]> {
  const keys = await getKeysByPrefix(`${KEY_PREFIX_V11}session:`);
  if (keys.length === 0) return [];
  try {
    const pairs = await AsyncStorage.multiGet(keys);
    const records: SessionRecordV11[] = [];
    for (const [, raw] of pairs) {
      if (!raw) continue;
      try {
        records.push(JSON.parse(raw) as SessionRecordV11);
      } catch {
        // 壊れたレコードはスキップ
      }
    }
    // startedAt 降順
    records.sort((a, b) =>
      a.startedAt < b.startedAt ? 1 : a.startedAt > b.startedAt ? -1 : 0,
    );
    return records;
  } catch {
    return [];
  }
}

/** spec-v11.md §9.1 `TrialRecord` */
export type TrialRecordV11 = {
  trialId: string;
  sessionId: string;
  gameId: GameIdV11;
  paramValue: number;
  /** 正誤（未挑戦/未回答/中断は null） */
  isCorrect: boolean | null;
  /** ゲームごとに形式が異なる（ID 配列、文字列、数値、null など） */
  selectedAnswer: unknown;
  timestamp: string;
};

export async function saveTrialRecordV11(
  record: TrialRecordV11,
): Promise<void> {
  await AsyncStorage.setItem(
    KEY_TRIAL_V11(record.trialId),
    JSON.stringify(record),
  );
}

export async function loadTrialRecordV11(
  trialId: string,
): Promise<TrialRecordV11 | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_TRIAL_V11(trialId));
    if (!raw) return null;
    return JSON.parse(raw) as TrialRecordV11;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// DailyStats v1.1（Sprint 9 追加）
// ---------------------------------------------------------------------------

/** spec-v11.md §9.1 `DailyStats`（1 日 1 レコード、日付分割キー） */
export type DailyStatsV11 = {
  /** 端末ローカルの YYYY-MM-DD */
  date: string;
  fullCourseCompleted: boolean;
  /** 各ゲームのベスト閾値（その日に記録された分のみ） */
  gameBestThresholds: Partial<Record<GameIdV11, number>>;
  wideScore: number | null;
  sessionCount: number;
};

export function createDefaultDailyStatsV11(date: string): DailyStatsV11 {
  return {
    date,
    fullCourseCompleted: false,
    gameBestThresholds: {},
    wideScore: null,
    sessionCount: 0,
  };
}

export async function loadDailyStatsV11(
  date: string,
): Promise<DailyStatsV11> {
  try {
    const raw = await AsyncStorage.getItem(KEY_DAILY_STATS_V11(date));
    if (!raw) return createDefaultDailyStatsV11(date);
    const parsed = JSON.parse(raw) as Partial<DailyStatsV11>;
    return {
      date: parsed.date ?? date,
      fullCourseCompleted: parsed.fullCourseCompleted ?? false,
      gameBestThresholds: parsed.gameBestThresholds ?? {},
      wideScore: parsed.wideScore ?? null,
      sessionCount: parsed.sessionCount ?? 0,
    };
  } catch {
    return createDefaultDailyStatsV11(date);
  }
}

export async function saveDailyStatsV11(
  stats: DailyStatsV11,
): Promise<void> {
  await AsyncStorage.setItem(
    KEY_DAILY_STATS_V11(stats.date),
    JSON.stringify(stats),
  );
}

/**
 * 単体ゲームのセッション完了結果を DailyStats に反映する。
 *
 * - sessionCount を +1
 * - 当該 gameId のベスト閾値を更新（min を採用：閾値が小さい方が良い、§F-09）
 * - fullCourseCompleted は触らない（フルコース完了時は別経路で更新）
 *
 * 注：閾値の「ベスト」定義は「value が小さい = 難しい難度を達成 = 良い」とする。
 * これは v1 と同じ規約（spec-v11.md §F-12 / 用語集「ベスト閾値」、staircase の
 * paramRange.min が「難しい端」と定義されているため）。
 */
export async function recordSingleGameSessionV11(
  date: string,
  gameId: GameIdV11,
  threshold: number,
): Promise<DailyStatsV11> {
  const current = await loadDailyStatsV11(date);
  const prevBest = current.gameBestThresholds[gameId];
  const nextBest =
    prevBest === undefined ? threshold : Math.min(prevBest, threshold);
  const next: DailyStatsV11 = {
    ...current,
    sessionCount: current.sessionCount + 1,
    gameBestThresholds: {
      ...current.gameBestThresholds,
      [gameId]: nextBest,
    },
  };
  await saveDailyStatsV11(next);
  return next;
}

/**
 * 過去全 DailyStats から、指定ゲームの「過去のベスト閾値（今日を除く）」を取得する。
 *
 * 用途：F-10 結果サマリの「前回比」計算用。今日含めると同日同セッションの値が
 * 「前回」になってしまうため除外する。
 *
 * @param gameId ベスト対象ゲーム
 * @param excludeDate 除外する日付（通常は今日）
 * @returns 過去のベスト閾値。データなしなら null
 */
export async function loadHistoricalBestThresholdV11(
  gameId: GameIdV11,
  excludeDate: string,
): Promise<number | null> {
  const keys = await getKeysByPrefix(`${KEY_PREFIX_V11}dailyStats:`);
  if (keys.length === 0) return null;
  try {
    const pairs = await AsyncStorage.multiGet(keys);
    let best: number | null = null;
    for (const [, raw] of pairs) {
      if (!raw) continue;
      try {
        const stats = JSON.parse(raw) as DailyStatsV11;
        if (stats.date === excludeDate) continue;
        const v = stats.gameBestThresholds?.[gameId];
        if (typeof v === 'number') {
          if (best === null || v < best) best = v;
        }
      } catch {
        // skip
      }
    }
    return best;
  } catch {
    return null;
  }
}

/**
 * 過去 N 日分（指定日以前）の DailyStats を新しい順で取得する（Sprint 18 / F-11）。
 *
 * 進捗グラフ「過去 28 日推移」用。AsyncStorage のキーをプレフィックス走査して
 * 当該範囲を抽出する。
 *
 * @param endDate 含む末尾日付（YYYY-MM-DD、通常は今日）
 * @param days 取得日数（28 日推奨）
 * @returns 日付昇順（古い → 新しい）の DailyStats 配列。欠損日は含まれない
 */
export async function loadRecentDailyStatsV11(
  endDate: string,
  days: number,
): Promise<DailyStatsV11[]> {
  const keys = await getKeysByPrefix(`${KEY_PREFIX_V11}dailyStats:`);
  if (keys.length === 0) return [];
  // 範囲計算：end - (days-1) 〜 end
  const fromDate = subDaysIso(endDate, days - 1);
  try {
    const pairs = await AsyncStorage.multiGet(keys);
    const records: DailyStatsV11[] = [];
    for (const [, raw] of pairs) {
      if (!raw) continue;
      try {
        const stats = JSON.parse(raw) as DailyStatsV11;
        if (stats.date >= fromDate && stats.date <= endDate) {
          records.push(stats);
        }
      } catch {
        // skip
      }
    }
    records.sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
    );
    return records;
  } catch {
    return [];
  }
}

/** 内部ユーティリティ：ローカル日付から N 日減算した YYYY-MM-DD を返す。 */
function subDaysIso(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map((s) => parseInt(s, 10));
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - n);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/**
 * フルコース完了 1 回分を DailyStats に反映して保存する（Sprint 18 / F-12）。
 *
 * 純関数版は `src/lib/v11/dailyStats.ts` の `applyFullCourseCompletion`。
 * 本関数は load → apply → save の薄いラッパで、AsyncStorage に依存する。
 */
export async function recordFullCourseCompletionV11(
  date: string,
  gameResults: ReadonlyArray<GameSessionResultV11>,
): Promise<DailyStatsV11> {
  // 動的 import で循環依存を回避（lib/v11/dailyStats.ts も storage を import するため）
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { applyFullCourseCompletion } = require('../lib/v11/dailyStats') as {
    applyFullCourseCompletion: (
      current: DailyStatsV11,
      results: ReadonlyArray<GameSessionResultV11>,
    ) => DailyStatsV11;
  };
  const current = await loadDailyStatsV11(date);
  const next = applyFullCourseCompletion(current, gameResults);
  await saveDailyStatsV11(next);
  return next;
}

// ---------------------------------------------------------------------------
// BadgeStatus v1.1（Sprint 19 / F-13）
// ---------------------------------------------------------------------------

/**
 * spec-v11.md §9.1 `BadgeStatus`。badgeId 単位で 1 レコード保存。
 *
 * BadgeStatusV11 型は `lib/v11/badges.ts` で定義。本層では永続化のみ。
 */
export type BadgeStatusV11Persisted = {
  badgeId: string;
  earned: boolean;
  earnedAt: string | null;
};

/** badgeId 単位で BadgeStatus 1 件をロード。未保存なら null。 */
export async function loadBadgeStatusV11(
  badgeId: string,
): Promise<BadgeStatusV11Persisted | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_BADGE_V11(badgeId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BadgeStatusV11Persisted;
    return {
      badgeId: parsed.badgeId ?? badgeId,
      earned: parsed.earned ?? false,
      earnedAt: parsed.earnedAt ?? null,
    };
  } catch {
    return null;
  }
}

/** badgeId 単位で BadgeStatus 1 件を保存。 */
export async function saveBadgeStatusV11(
  status: BadgeStatusV11Persisted,
): Promise<void> {
  await AsyncStorage.setItem(
    KEY_BADGE_V11(status.badgeId),
    JSON.stringify(status),
  );
}

/**
 * 13 件の BadgeStatus を一括保存（変更があったものだけ書き込んでもよいが、
 * 13 件は十分小さいので毎回全件書き込みでも問題ない）。
 */
export async function saveAllBadgeStatusesV11(
  statuses: ReadonlyArray<BadgeStatusV11Persisted>,
): Promise<void> {
  await Promise.all(statuses.map((s) => saveBadgeStatusV11(s)));
}

/**
 * 全 BadgeStatus を取得（プレフィックス走査）。Sprint 19 のバッジ一覧画面で使用。
 *
 * 13 件全部に対してキーがあるとは限らない（未獲得は永続化していない場合もある）。
 * 呼び出し側は `lib/v11/badges.createInitialBadgeStatusesV11()` でデフォルト
 * 初期化したうえで、見つかった ID を上書きするのが安全。
 */
export async function loadAllBadgeStatusesV11(): Promise<
  BadgeStatusV11Persisted[]
> {
  const keys = await getKeysByPrefix(`${KEY_PREFIX_V11}badge:`);
  if (keys.length === 0) return [];
  try {
    const pairs = await AsyncStorage.multiGet(keys);
    const records: BadgeStatusV11Persisted[] = [];
    for (const [, raw] of pairs) {
      if (!raw) continue;
      try {
        records.push(JSON.parse(raw) as BadgeStatusV11Persisted);
      } catch {
        // skip
      }
    }
    return records;
  } catch {
    return [];
  }
}
