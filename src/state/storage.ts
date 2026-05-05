/**
 * 端末ローカル永続化レイヤー（AsyncStorage）。
 *
 * Sprint 1 では：
 *   - StaircaseState（ゲームごと、§12.1）
 *   - SessionRecord / TrialRecord の最小ログ（Game 2 のみ）
 * を扱う。Sprint 2 以降で UserProfile / Settings / DailyStats を追加する。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GameId,
  STAIRCASE_CONFIGS,
  StaircaseState,
  createStaircase,
} from '../lib/staircase';
import {
  DeviceType,
  ViewingDistanceCm,
  DEFAULT_VIEWING_DISTANCE_CM,
} from '../lib/calibration';

const KEY_PREFIX = 'gaboreye:v1:';
const KEY_STAIRCASE = (gameId: GameId): string =>
  `${KEY_PREFIX}staircase:${gameId}`;
const KEY_SESSIONS = `${KEY_PREFIX}sessions`;
const KEY_TRIALS = `${KEY_PREFIX}trials`;
const KEY_USER_PROFILE = `${KEY_PREFIX}userProfile`;
const KEY_DAILY_STATS = `${KEY_PREFIX}dailyStats`;
const KEY_STREAK = `${KEY_PREFIX}streak`;
const KEY_BADGES = `${KEY_PREFIX}badges`;
const KEY_SETTINGS = `${KEY_PREFIX}settings`;

/**
 * StaircaseState の取得。未保存なら初期値を返す。
 */
export async function loadStaircase(gameId: GameId): Promise<StaircaseState> {
  try {
    const raw = await AsyncStorage.getItem(KEY_STAIRCASE(gameId));
    if (!raw) return createStaircase(gameId);
    const parsed = JSON.parse(raw) as StaircaseState;
    if (parsed.gameId !== gameId) return createStaircase(gameId);
    return parsed;
  } catch {
    return createStaircase(gameId);
  }
}

/**
 * StaircaseState の保存。
 */
export async function saveStaircase(state: StaircaseState): Promise<void> {
  await AsyncStorage.setItem(
    KEY_STAIRCASE(state.gameId),
    JSON.stringify(state),
  );
}

/**
 * StaircaseState のリセット（設定 → staircase リセット用）。
 * 永続化レイヤーから消すのではなく、初期値で上書きする。
 */
export async function resetStaircaseStorage(gameId: GameId): Promise<StaircaseState> {
  const initial = createStaircase(gameId);
  await saveStaircase(initial);
  return initial;
}

// ---------------------------------------------------------------------------
// SessionRecord / TrialRecord（最小ログ、Sprint 5 で活用）
// ---------------------------------------------------------------------------

/** spec.md §12.1 `SessionRecord` 簡易版 */
export type SessionRecord = {
  sessionId: string;
  sessionType: 'course' | 'single';
  startedAt: string;
  completedAt: string | null;
  game1Threshold: number | null;
  game2Threshold: number | null;
  game3Threshold: number | null;
  v1Score: number | null;
  trialCount: number;
};

/** spec.md §12.1 `TrialRecord` */
export type TrialRecord = {
  trialId: string;
  sessionId: string;
  gameId: GameId;
  paramValue: number;
  isCorrect: boolean | null;
  responseTimeMs: number | null;
  timestamp: string;
};

export async function appendSession(s: SessionRecord): Promise<void> {
  const raw = (await AsyncStorage.getItem(KEY_SESSIONS)) ?? '[]';
  const arr = JSON.parse(raw) as SessionRecord[];
  arr.push(s);
  await AsyncStorage.setItem(KEY_SESSIONS, JSON.stringify(arr));
}

export async function loadSessions(): Promise<SessionRecord[]> {
  const raw = (await AsyncStorage.getItem(KEY_SESSIONS)) ?? '[]';
  return JSON.parse(raw) as SessionRecord[];
}

export async function appendTrials(trials: TrialRecord[]): Promise<void> {
  if (trials.length === 0) return;
  const raw = (await AsyncStorage.getItem(KEY_TRIALS)) ?? '[]';
  const arr = JSON.parse(raw) as TrialRecord[];
  arr.push(...trials);
  await AsyncStorage.setItem(KEY_TRIALS, JSON.stringify(arr));
}

export async function loadTrials(): Promise<TrialRecord[]> {
  const raw = (await AsyncStorage.getItem(KEY_TRIALS)) ?? '[]';
  return JSON.parse(raw) as TrialRecord[];
}

/**
 * 累計試行数を取得（spec.md §9.3 B-05「100 試行」用）。
 *
 * 個別 TrialRecord の append が無いセッションでも、SessionRecord の trialCount
 * を集計に含める。これにより Sprint 5 までに記録された SessionRecord も
 * 累計に正しく含まれる。
 */
export async function getTotalTrialCount(): Promise<number> {
  const trials = await loadTrials();
  if (trials.length > 0) return trials.length;
  // 後方互換：TrialRecord が無い場合は SessionRecord.trialCount を合算
  const sessions = await loadSessions();
  return sessions.reduce((acc, s) => acc + (s.trialCount ?? 0), 0);
}

// ---------------------------------------------------------------------------
// UserProfile（spec.md §12.1、Sprint 4 で導入）
// ---------------------------------------------------------------------------

/** spec.md §12.1 `UserProfile` の AgeGroup */
export type AgeGroup = '40s' | '50s' | '60s' | '70s+' | 'unspecified';

/** spec.md §12.1 `UserProfile` */
export type UserProfile = {
  onboardingCompleted: boolean;
  /** ISO 8601 文字列、未同意なら null */
  disclaimerAgreedAt: string | null;
  ageGroup: AgeGroup;
  viewingDistanceCm: ViewingDistanceCm;
  deviceTypeEstimated: DeviceType;
  /** ISO 8601 文字列、初回起動日時 */
  createdAt: string;
};

/**
 * UserProfile の初期値。アプリ起動時に未保存ならこの値で初期化する。
 *
 * `deviceTypeEstimated` は呼び出し元で `estimateDeviceTypeAdvanced` を使って
 * 上書きする想定（AppRouter で実施）。
 */
export function createDefaultUserProfile(
  now: () => string = () => new Date().toISOString(),
): UserProfile {
  return {
    onboardingCompleted: false,
    disclaimerAgreedAt: null,
    ageGroup: 'unspecified',
    viewingDistanceCm: DEFAULT_VIEWING_DISTANCE_CM,
    deviceTypeEstimated: 'pc',
    createdAt: now(),
  };
}

/**
 * UserProfile の取得。未保存なら createDefaultUserProfile() を返す。
 *
 * 受け入れ：
 *   - 不正 JSON / スキーマ不一致時はデフォルト値で復帰する（A-1 / NF-21 の堅牢性）
 */
export async function loadUserProfile(
  now: () => string = () => new Date().toISOString(),
): Promise<UserProfile> {
  try {
    const raw = await AsyncStorage.getItem(KEY_USER_PROFILE);
    if (!raw) return createDefaultUserProfile(now);
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return mergeUserProfile(createDefaultUserProfile(now), parsed);
  } catch {
    return createDefaultUserProfile(now);
  }
}

/**
 * UserProfile の保存。
 */
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(KEY_USER_PROFILE, JSON.stringify(profile));
}

/**
 * 部分更新ヘルパー。load → patch → save を 1 関数で扱う。
 */
export async function updateUserProfile(
  patch: Partial<UserProfile>,
): Promise<UserProfile> {
  const current = await loadUserProfile();
  const next = mergeUserProfile(current, patch);
  await saveUserProfile(next);
  return next;
}

/** デフォルト値と部分入力を合成し、必須フィールドを担保する */
function mergeUserProfile(
  base: UserProfile,
  patch: Partial<UserProfile>,
): UserProfile {
  return {
    onboardingCompleted: patch.onboardingCompleted ?? base.onboardingCompleted,
    disclaimerAgreedAt: patch.disclaimerAgreedAt ?? base.disclaimerAgreedAt,
    ageGroup: patch.ageGroup ?? base.ageGroup,
    viewingDistanceCm: patch.viewingDistanceCm ?? base.viewingDistanceCm,
    deviceTypeEstimated:
      patch.deviceTypeEstimated ?? base.deviceTypeEstimated,
    createdAt: patch.createdAt ?? base.createdAt,
  };
}

// ---------------------------------------------------------------------------
// DailyStats（spec.md §12.1、Sprint 5 で導入）
// ---------------------------------------------------------------------------

/**
 * 日次集計レコード（spec.md §12.1 `DailyStats`）。
 *
 * 日付（YYYY-MM-DD、端末ローカル）をキーとし、
 * - その日の各ゲーム最良閾値（小さい値ほど上達 = ベスト）
 * - V1 スコア（その日の最良スコア。同日複数セッションは max）
 * - セッション件数（コース完了 / 単体含む）
 * - コース完了したか（おまかせコース完了履歴の有無）
 * を保持する。
 */
export type DailyStats = {
  /** YYYY-MM-DD（端末ローカル） */
  date: string;
  /** その日にコース完了が 1 回でもあれば true */
  courseCompleted: boolean;
  /** Game 1 ベスト閾値（°）。null = データなし */
  game1BestThreshold: number | null;
  game2BestThreshold: number | null;
  game3BestThreshold: number | null;
  /** その日の V1 スコア（0-100、整数）。null = データなし */
  v1Score: number | null;
  /** その日のセッション件数（course / single 合計） */
  sessionCount: number;
};

/** 全 DailyStats を取得（日付順保証なし） */
export async function loadAllDailyStats(): Promise<DailyStats[]> {
  try {
    const raw = (await AsyncStorage.getItem(KEY_DAILY_STATS)) ?? '[]';
    return JSON.parse(raw) as DailyStats[];
  } catch {
    return [];
  }
}

/**
 * 指定日の DailyStats を upsert（無ければ新規、あれば patch）。
 * 「ベスト閾値」は小さい方を採用。「V1 スコア」は大きい方を採用（spec.md §9.1）。
 */
export async function upsertDailyStats(
  date: string,
  patch: Partial<Omit<DailyStats, 'date'>>,
): Promise<DailyStats> {
  const all = await loadAllDailyStats();
  const idx = all.findIndex((d) => d.date === date);
  const base: DailyStats =
    idx >= 0
      ? all[idx]
      : {
          date,
          courseCompleted: false,
          game1BestThreshold: null,
          game2BestThreshold: null,
          game3BestThreshold: null,
          v1Score: null,
          sessionCount: 0,
        };
  const merged: DailyStats = {
    date,
    courseCompleted: patch.courseCompleted ?? base.courseCompleted,
    game1BestThreshold: bestThreshold(
      base.game1BestThreshold,
      patch.game1BestThreshold,
    ),
    game2BestThreshold: bestThreshold(
      base.game2BestThreshold,
      patch.game2BestThreshold,
    ),
    game3BestThreshold: bestThreshold(
      base.game3BestThreshold,
      patch.game3BestThreshold,
    ),
    v1Score: bestScore(base.v1Score, patch.v1Score),
    sessionCount: patch.sessionCount ?? base.sessionCount,
  };
  if (idx >= 0) all[idx] = merged;
  else all.push(merged);
  await AsyncStorage.setItem(KEY_DAILY_STATS, JSON.stringify(all));
  return merged;
}

/** 閾値は小さい方が良い（spec.md §9.3） */
function bestThreshold(
  a: number | null | undefined,
  b: number | null | undefined,
): number | null {
  if (a == null) return b ?? null;
  if (b == null) return a;
  return Math.min(a, b);
}

/** V1 スコアは大きい方が良い */
function bestScore(
  a: number | null | undefined,
  b: number | null | undefined,
): number | null {
  if (a == null) return b ?? null;
  if (b == null) return a;
  return Math.max(a, b);
}

// ---------------------------------------------------------------------------
// Streak（spec.md §12.1 / §9.3、Sprint 6 で導入）
// ---------------------------------------------------------------------------

/** spec.md §12.1 `Streak` */
export type Streak = {
  /** 現在の連続日数 */
  currentStreak: number;
  /** 過去最長 */
  longestStreak: number;
  /** 最終コース完了日（YYYY-MM-DD、端末ローカル） */
  lastCompletedDate: string | null;
};

/** Streak の初期値（未記録状態） */
export function createDefaultStreak(): Streak {
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastCompletedDate: null,
  };
}

/** Streak の取得。未保存ならデフォルト値を返す。 */
export async function loadStreak(): Promise<Streak> {
  try {
    const raw = await AsyncStorage.getItem(KEY_STREAK);
    if (!raw) return createDefaultStreak();
    const parsed = JSON.parse(raw) as Partial<Streak>;
    return {
      currentStreak: parsed.currentStreak ?? 0,
      longestStreak: parsed.longestStreak ?? 0,
      lastCompletedDate: parsed.lastCompletedDate ?? null,
    };
  } catch {
    return createDefaultStreak();
  }
}

/** Streak の保存。 */
export async function saveStreak(streak: Streak): Promise<void> {
  await AsyncStorage.setItem(KEY_STREAK, JSON.stringify(streak));
}

// ---------------------------------------------------------------------------
// BadgeStatus（spec.md §12.1 / §9.3、Sprint 6 で導入）
// ---------------------------------------------------------------------------

/** バッジ ID（spec.md §9.3 / B-01〜B-08） */
export type BadgeId =
  | 'B-01'
  | 'B-02'
  | 'B-03'
  | 'B-04'
  | 'B-05'
  | 'B-06'
  | 'B-07'
  | 'B-08';

export const ALL_BADGE_IDS: readonly BadgeId[] = [
  'B-01',
  'B-02',
  'B-03',
  'B-04',
  'B-05',
  'B-06',
  'B-07',
  'B-08',
] as const;

/** spec.md §12.1 `BadgeStatus`（バッジ 1 種類 = 1 レコード） */
export type BadgeStatus = {
  badgeId: BadgeId;
  earned: boolean;
  /** ISO 8601 日時。未獲得は null */
  earnedAt: string | null;
};

/** 8 種類すべてを未獲得状態で初期化 */
export function createDefaultBadgeStatuses(): BadgeStatus[] {
  return ALL_BADGE_IDS.map((id) => ({
    badgeId: id,
    earned: false,
    earnedAt: null,
  }));
}

/** BadgeStatus 全件取得。未保存ならデフォルト（全未獲得）。
 * 永続化レコードに含まれない ID（将来追加バッジ等）はデフォルト値で補完。
 */
export async function loadBadgeStatuses(): Promise<BadgeStatus[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_BADGES);
    if (!raw) return createDefaultBadgeStatuses();
    const parsed = JSON.parse(raw) as BadgeStatus[];
    const byId = new Map<BadgeId, BadgeStatus>();
    for (const b of parsed) {
      if (ALL_BADGE_IDS.includes(b.badgeId)) byId.set(b.badgeId, b);
    }
    return ALL_BADGE_IDS.map(
      (id) =>
        byId.get(id) ?? {
          badgeId: id,
          earned: false,
          earnedAt: null,
        },
    );
  } catch {
    return createDefaultBadgeStatuses();
  }
}

/** BadgeStatus 全件保存。 */
export async function saveBadgeStatuses(
  statuses: BadgeStatus[],
): Promise<void> {
  await AsyncStorage.setItem(KEY_BADGES, JSON.stringify(statuses));
}

// ---------------------------------------------------------------------------
// Settings（spec.md §10.1 / §12.1、Sprint 7 で導入）
// ---------------------------------------------------------------------------

/** spec.md §12.1 `Settings` の DarkMode */
export type DarkModePreference = 'system' | 'light' | 'dark';

/** spec.md §12.1 `Settings` の OneEyeGuidance */
export type OneEyeGuidance = 'off' | 'left' | 'right' | 'alternate';

/** spec.md §12.1 `Settings` */
export type Settings = {
  /** 効果音 ON/OFF（spec.md §10.1 デフォルト ON） */
  soundEnabled: boolean;
  /** 振動（ハプティクス）ON/OFF（デフォルト ON、Web では実質 no-op） */
  hapticsEnabled: boolean;
  /** ダークモード preference（system / light / dark、デフォルト system） */
  darkMode: DarkModePreference;
  /** 片眼ガイダンス（off / left / right / alternate、デフォルト off） */
  oneEyeGuidance: OneEyeGuidance;
  /** Game 3 リズム BGM（デフォルト OFF） */
  game3BgmEnabled: boolean;
};

/** Settings の初期値（spec.md §10.1 のデフォルト列） */
export function createDefaultSettings(): Settings {
  return {
    soundEnabled: true,
    hapticsEnabled: true,
    darkMode: 'system',
    oneEyeGuidance: 'off',
    game3BgmEnabled: false,
  };
}

/** Settings 取得。未保存ならデフォルト値を返す（堅牢性：不正 JSON でもデフォルト復帰）。 */
export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(KEY_SETTINGS);
    if (!raw) return createDefaultSettings();
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return mergeSettings(createDefaultSettings(), parsed);
  } catch {
    return createDefaultSettings();
  }
}

/** Settings の保存。 */
export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));
}

/** Settings 部分更新（load → patch → save）。 */
export async function updateSettings(
  patch: Partial<Settings>,
): Promise<Settings> {
  const current = await loadSettings();
  const next = mergeSettings(current, patch);
  await saveSettings(next);
  return next;
}

function mergeSettings(base: Settings, patch: Partial<Settings>): Settings {
  return {
    soundEnabled: patch.soundEnabled ?? base.soundEnabled,
    hapticsEnabled: patch.hapticsEnabled ?? base.hapticsEnabled,
    darkMode: patch.darkMode ?? base.darkMode,
    oneEyeGuidance: patch.oneEyeGuidance ?? base.oneEyeGuidance,
    game3BgmEnabled: patch.game3BgmEnabled ?? base.game3BgmEnabled,
  };
}

// ---------------------------------------------------------------------------
// 全データ削除（spec.md §10.2 / §12.3、Sprint 7 で本実装）
// ---------------------------------------------------------------------------

/**
 * 全データ削除（spec.md §10.2）。
 *
 * 削除対象（spec.md §12.1 の全コレクション）：
 *   UserProfile / Settings / StaircaseState（3 ゲーム）/ SessionRecord /
 *   TrialRecord / DailyStats / Streak / BadgeStatus
 *
 * 削除後は呼び出し元で onboardingCompleted=false の状態（=オンボへ戻る）。
 */
export async function clearAllStorage(): Promise<void> {
  const keys: string[] = [
    KEY_STAIRCASE('game1'),
    KEY_STAIRCASE('game2'),
    KEY_STAIRCASE('game3'),
    KEY_SESSIONS,
    KEY_TRIALS,
    KEY_USER_PROFILE,
    KEY_DAILY_STATS,
    KEY_STREAK,
    KEY_BADGES,
    KEY_SETTINGS,
  ];
  await AsyncStorage.multiRemove(keys);
}

/**
 * 全 staircase をリセット（spec.md §10.1「staircase をリセット」設定項目）。
 * SessionRecord / Streak / Badges は残し、3 ゲームの StaircaseState のみ初期値に戻す。
 */
export async function resetAllStaircases(): Promise<void> {
  await Promise.all([
    resetStaircaseStorage('game1'),
    resetStaircaseStorage('game2'),
    resetStaircaseStorage('game3'),
  ]);
}

// 未使用ガード：tsc の noUnusedLocals 対策
void STAIRCASE_CONFIGS;
