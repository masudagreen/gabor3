/**
 * schema.ts — v3.0 データモデル（spec §7、`gaboreye:v3:*` 名前空間）。
 *
 * v3.0 は「スコア管理 → レベル管理」へのリブート。本ファイルは型定義と既定値のみを
 * 持つ純粋モジュール（副作用なし）。永続化は state/v3/repository.ts、起動時消去は
 * state/v3/migration.ts、設定 setter は state/v3/settings.ts が担う。
 *
 * データモデルは spec §7 で凍結済み。フィールド追加・変更にはユーザー再承認が必要。
 *
 * v2.0 の gridSize(n)/roundSeconds(m)/roundCount(r)/rotationSpeed(a)/sfChangeSpeed(b)/
 * scoringMode/progressiveModeEnabled/progressionState、RoundRecord/SessionRecord/
 * sessionScore/bestSessionScore 等のスコア系は v3 スキーマに**存在しない**（spec §7 注記）。
 */

import type { DeviceType, ViewingDistanceCm } from '../../lib/calibration';
import {
  VALUE_SETS,
  DEFAULT_VALUE_SETS,
  DEFAULT_VARIABLE_ORDER,
  OUTER_VARIABLE_KEYS,
  defaultVariableRanges,
  fullVariableRanges,
  repeatRange,
  DEFAULT_REPEAT_COUNT,
  MIN_REPEAT_COUNT,
  MAX_REPEAT_COUNT,
  type VariableKey,
  type VariableRanges,
  type Direction,
  type GridSize,
  type LevelParams,
  type LevelState,
  type GameResult,
} from '../../lib/v3/level';
import {
  DEFAULT_COUNT_RANGE,
  COUNT_RANGE_PRESETS,
  type CountRangePreset,
} from '../../lib/v3/roundGen';

export const SCHEMA_VERSION = '3.2.0' as const;
export const APP_VERSION = '3.2.0' as const;

/** 繰り返し回数 n の値域（spec §4.1/AS-37、1〜6、既定 4）。 */
export const REPEAT_COUNT_MIN = MIN_REPEAT_COUNT;
export const REPEAT_COUNT_MAX = MAX_REPEAT_COUNT;
export const DEFAULT_REPEAT_COUNT_VALUE = DEFAULT_REPEAT_COUNT;

/** セッション時間（分）の値域（spec §7.2 / AS-23、1〜15、既定 5）。 */
export const SESSION_MINUTES_MIN = 1 as const;
export const SESSION_MINUTES_MAX = 15 as const;
export const DEFAULT_SESSION_MINUTES = 5 as const;

/** v3.0 名前空間プレフィックス（spec §7.10）。 */
export const V3_PREFIX = 'gaboreye:v3:' as const;

/**
 * F-11 で起動時に消去する旧名前空間（spec §7.9 / AS-13）。
 * v1 / v1.1 / v1.2 / **v2** 由来のキーを全消去する（v2 はスコア管理スキーマで非互換）。
 */
export const LEGACY_PREFIXES = [
  'gaboreye:v1:',
  'gaboreye:v1.1:',
  'gaboreye:v1.2:',
  'gaboreye:v2:',
] as const;

// ---------------------------------------------------------------------------
// 列挙型
// ---------------------------------------------------------------------------

export type AgeGroup = '40s' | '50s' | '60s' | '70s+' | 'unspecified';

export const AGE_GROUPS: readonly AgeGroup[] = [
  '40s',
  '50s',
  '60s',
  '70s+',
  'unspecified',
] as const;

export type DarkMode = 'system' | 'light' | 'dark';
export const DARK_MODES: readonly DarkMode[] = ['system', 'light', 'dark'] as const;

export type OneEyeGuidance = 'off' | 'left' | 'right' | 'alternate';
export const ONE_EYE_GUIDANCE_OPTIONS: readonly OneEyeGuidance[] = [
  'off',
  'left',
  'right',
  'alternate',
] as const;

/** バッジ ID（spec §6、3 軸 11 種 B-01〜B-11）。 */
export type BadgeId =
  | 'B-01'
  | 'B-02'
  | 'B-03'
  | 'B-04'
  | 'B-05'
  | 'B-06'
  | 'B-07'
  | 'B-08'
  | 'B-09'
  | 'B-10'
  | 'B-11';

export const BADGE_IDS: readonly BadgeId[] = [
  'B-01',
  'B-02',
  'B-03',
  'B-04',
  'B-05',
  'B-06',
  'B-07',
  'B-08',
  'B-09',
  'B-10',
  'B-11',
] as const;

/** 視聴距離の選択肢（30/40/50cm）。 */
export const VIEWING_DISTANCE_OPTIONS: readonly ViewingDistanceCm[] = [
  30, 40, 50,
] as const;

// レベルシステムの型を再エクスポート（v3 データ層の利用者が 1 箇所から取れるように）。
export {
  VALUE_SETS,
  DEFAULT_VALUE_SETS,
  DEFAULT_VARIABLE_ORDER,
  OUTER_VARIABLE_KEYS,
  defaultVariableRanges,
  fullVariableRanges,
  repeatRange,
  DEFAULT_COUNT_RANGE,
  COUNT_RANGE_PRESETS,
};
export type {
  VariableKey,
  VariableRanges,
  Direction,
  GridSize,
  LevelParams,
  LevelState,
  GameResult,
  CountRangePreset,
};

// ---------------------------------------------------------------------------
// 7.1 UserProfile
// ---------------------------------------------------------------------------

export type UserProfile = {
  onboardingCompleted: boolean;
  /** 【v3.2 追加】チュートリアル Lv0 完了フラグ。初回プレイで完了したら true（AS-32）。 */
  tutorialCompleted: boolean;
  /** 免責同意日時（ISO 文字列）。未同意は null。 */
  disclaimerAgreedAt: string | null;
  ageGroup: AgeGroup;
  viewingDistanceCm: ViewingDistanceCm;
  deviceTypeEstimated: DeviceType;
  /** 初回起動日時（ISO 文字列）。 */
  createdAt: string;
  schemaVersion: string;
};

// ---------------------------------------------------------------------------
// 7.2 Settings
// ---------------------------------------------------------------------------

export type Settings = {
  /**
   * 【v3.1 追加】1 セッションの長さ（分）。1〜15、1 刻み、既定 5（AS-23）。
   * レベル変数ではない全プレイ共通設定（梯子・総レベル数に影響しない）。
   */
  sessionMinutes: number;
  /**
   * 【v3.2 追加】繰り返し回数 n（1〜6・既定 4、AS-37）。最内側オドメータの radix。
   * 総レベル数 = n×180。`variableRanges.repeat` はこの値から [1..n] に同期される。
   */
  repeatCount: number;
  /**
   * 【v3.2 追加】本番ラウンドの回転個数のランダム範囲プリセット（§4.9・AS-36）。
   * 'cells_minus_1' | 'half' | 'fixed_1_4'。
   */
  countRange: CountRangePreset;
  /**
   * 各変数の有効値部分集合（振れ幅、テスト用）。各要素は §4.1 拡張後の全集合の部分集合。
   * v3.2：`repeat`（最内側・[1..repeatCount] に同期）＋外側 4 変数。個数（count）は含まない。
   */
  variableRanges: VariableRanges;
  /**
   * 変化順（最内側 → 最外側）。v3.2 デフォルト ['repeat','seconds','direction','gridSize','rotationSpeed']。
   * `repeat` は常に最内側固定（組み替え対象は外側 4 変数のみ、§4.2）。
   */
  variableOrder: VariableKey[];
  darkMode: DarkMode;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  oneEyeGuidance: OneEyeGuidance;
};

// ---------------------------------------------------------------------------
// 7.4 SessionRecord（1 セッション = 1 レコード、v3.1 で GameRecord を置換）
// ---------------------------------------------------------------------------

export type GameResultValue = GameResult; // 'clear' | 'fail'

/**
 * 1 セッションの要約（spec §7.4）。ラウンド詳細は永続化しない（データ肥大回避、AS-29）。
 * 永続化キー `gaboreye:v3:session:<uuid>`。
 */
export type SessionRecord = {
  sessionId: string;
  /** セッション開始日時（ISO 文字列）。 */
  startedAt: string;
  /**
   * セッション終了日時（ISO 文字列）。中断で完了済みラウンドが 1 つもない場合は記録しない
   * （= 本レコード自体を保存しない）。完了済みラウンドが 1 つ以上ある中断はその時点までを記録する（F-07）。
   */
  completedAt: string | null;
  /** そのセッションで適用された設定時間（分）。 */
  sessionMinutes: number;
  /** そのセッションで完了したラウンド数。 */
  roundCount: number;
  /** クリアしたラウンド数。 */
  clearCount: number;
  /** 失敗したラウンド数。 */
  failCount: number;
  /** セッション開始時のレベル。 */
  startLevel: number;
  /** セッション終了時のレベル（= 次セッション開始レベル）。 */
  endLevel: number;
  /** そのセッションで到達した最高レベル。 */
  highestLevelInSession: number;
  /**
   * 【v3.1 改訂】そのセッションの実プレイ秒数（= パッチを見ている時間。各ラウンドの
   * 実プレイ秒数の合計、3 秒開示は含めない）。累計ゲーム時間の集計元。
   */
  playSec: number;
};

/**
 * v3.0 の旧 `GameRecord`（`gaboreye:v3:game:<uuid>`）。v3.1 では参照しない（無視）。
 * migration が読み出し専用で互換参照する必要が出た場合のために型のみ残す（永続化はしない）。
 */
export type LegacyGameRecord = {
  gameId: string;
  startedAt: string;
  completedAt: string | null;
  level: number;
  levelParams: LevelParams;
  result: GameResult;
  levelDelta: -1 | 0 | 1;
};

// ---------------------------------------------------------------------------
// 7.5 DailyStats（日付ごとに 1 レコード）
// ---------------------------------------------------------------------------

export type DailyStats = {
  /** YYYY-MM-DD（端末ローカル）。 */
  date: string;
  /** その日に**クリア**した最高レベル（代表値 max、AS-29）。 */
  highestLevelReached: number;
  /** 【v3.1】その日のセッション完了件数。 */
  sessionCount: number;
  /** （任意）その日のラウンド完了件数（旧 gameCount の意味を読み替え）。 */
  roundCount: number;
};

// ---------------------------------------------------------------------------
// 7.6 Streak
// ---------------------------------------------------------------------------

export type Streak = {
  currentStreak: number;
  longestStreak: number;
  /** 最終プレイ完了日（YYYY-MM-DD）。未プレイは null。 */
  lastPlayedDate: string | null;
};

// ---------------------------------------------------------------------------
// 7.7 PlayStats（累計）
// ---------------------------------------------------------------------------

export type PlayStats = {
  /** 【v3.1】累計セッション完了回数（= 累計プレイ回数の表示元。1 セッション = 1 プレイ、AS-29）。 */
  totalSessions: number;
  /** （任意）累計ラウンド完了回数。 */
  totalRounds: number;
  /**
   * 【v3.1 改訂】累計ゲーム時間（秒）＝全セッションのパッチ視認時間合計。
   * 履歴タブで「累計ゲーム時間」として表示する。
   */
  totalPlaySec: number;
};

// ---------------------------------------------------------------------------
// 7.8 BadgeStatus（バッジ 1 種 = 1 レコード）
// ---------------------------------------------------------------------------

export type BadgeStatus = {
  badgeId: BadgeId;
  earned: boolean;
  /** 獲得日時（ISO 文字列）。未獲得は null。 */
  earnedAt: string | null;
};

// ---------------------------------------------------------------------------
// 既定値ファクトリ
// ---------------------------------------------------------------------------

export function defaultSettings(): Settings {
  return {
    // 既定セッション時間 5 分（spec §7.2 / AS-23）。
    sessionMinutes: DEFAULT_SESSION_MINUTES,
    // 既定の繰り返し回数 n=4・個数範囲プリセット（spec §4.9/AS-37）。
    repeatCount: DEFAULT_REPEAT_COUNT,
    countRange: DEFAULT_COUNT_RANGE,
    // 既定の有効集合（外側 v3.0 同一・repeat=[1..4]、追加値 OFF。総レベル数 720。AS-27/AS-37）。
    variableRanges: defaultVariableRanges(),
    variableOrder: [...DEFAULT_VARIABLE_ORDER],
    darkMode: 'system',
    soundEnabled: true,
    hapticsEnabled: true,
    oneEyeGuidance: 'off',
  };
}

export function defaultUserProfile(
  now: string,
  deviceType: DeviceType,
): UserProfile {
  return {
    onboardingCompleted: false,
    tutorialCompleted: false,
    disclaimerAgreedAt: null,
    ageGroup: 'unspecified',
    viewingDistanceCm: 40,
    deviceTypeEstimated: deviceType,
    createdAt: now,
    schemaVersion: SCHEMA_VERSION,
  };
}

export function defaultStreak(): Streak {
  return { currentStreak: 0, longestStreak: 0, lastPlayedDate: null };
}

export function defaultPlayStats(): PlayStats {
  return { totalSessions: 0, totalRounds: 0, totalPlaySec: 0 };
}

export function defaultBadgeStatus(badgeId: BadgeId): BadgeStatus {
  return { badgeId, earned: false, earnedAt: null };
}
