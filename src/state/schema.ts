/**
 * schema.ts — v2.0 データモデル（spec.md §6、`gaboreye:v2:*` 名前空間）。
 *
 * 本ファイルは型定義と既定値のみを持つ純粋モジュール（副作用なし）。
 * 永続化（AsyncStorage 読み書き）は state/store.ts、起動時消去は state/migration.ts、
 * 設定 setter は state/settings.ts が担う。
 *
 * データモデルは spec §6 で凍結済み。フィールド追加・変更にはユーザー再承認が必要。
 */

import type { DeviceType, ViewingDistanceCm } from '../lib/calibration';

export const SCHEMA_VERSION = '2.0.0' as const;
export const APP_VERSION = '2.0.0' as const;

/** v2.0 名前空間プレフィックス（§6.10） */
export const V2_PREFIX = 'gaboreye:v2:' as const;

/**
 * F-11 で起動時に消去する旧名前空間（spec §6.1 / AS-11）。
 * v1 / v1.1 / v1.2 由来のキーを全消去する。
 */
export const LEGACY_PREFIXES = [
  'gaboreye:v1:',
  'gaboreye:v1.1:',
  'gaboreye:v1.2:',
] as const;

// ---------------------------------------------------------------------------
// 列挙型
// ---------------------------------------------------------------------------

export type AgeGroup = '40s' | '50s' | '60s' | '70s+' | 'unspecified';

/** 採点方式①②③（spec F-02 / §6.2） */
export type ScoringMode =
  | 'auto-no-confirm' // ① 自動採点（確定なし）
  | 'auto-confirm' // ② 自動採点（確定ボタンあり）
  | 'all-correct-advance'; // ③ 全問正解で次へ

export const SCORING_MODES: readonly ScoringMode[] = [
  'auto-no-confirm',
  'auto-confirm',
  'all-correct-advance',
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

/** バッジ ID（spec §5、3 軸 11 種） */
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

// ---------------------------------------------------------------------------
// パラメータ可動範囲・初期値（design system §9.1、AS-23 仮置き）
// ---------------------------------------------------------------------------

export type SettingsParamSpec = {
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly default: number;
};

/**
 * n/m/r/a/b の可動範囲（system §9.1）。
 * - n 格子サイズ：3–5（離散セグメント）
 * - m 1 ラウンド秒数：10–60（step5）
 * - r ラウンド数：3–10（step1）
 * - a 回転速度：2–12 °/sec（step0.1）※ユーザー要望で 1/10 に細分化
 * - b 周波数変化速度：0.05–0.40 hz/sec（step0.005）※ユーザー要望で 1/10 に細分化
 */
export const PARAM_SPECS = {
  gridSize: { min: 3, max: 5, step: 1, default: 4 },
  roundSeconds: { min: 10, max: 60, step: 5, default: 20 },
  roundCount: { min: 3, max: 10, step: 1, default: 5 },
  rotationSpeed: { min: 2, max: 12, step: 0.1, default: 6 },
  sfChangeSpeed: { min: 0.05, max: 0.4, step: 0.005, default: 0.15 },
} as const satisfies Record<string, SettingsParamSpec>;

/** n は離散 3 値（セグメント）。スライダーではない（components FT-3） */
export const GRID_SIZE_OPTIONS: readonly number[] = [3, 4, 5] as const;

/** 視聴距離の選択肢（OPT-4） */
export const VIEWING_DISTANCE_OPTIONS: readonly ViewingDistanceCm[] = [
  30, 40, 50,
] as const;

// ---------------------------------------------------------------------------
// 6.1 UserProfile
// ---------------------------------------------------------------------------

export type UserProfile = {
  onboardingCompleted: boolean;
  /** 免責同意日時（ISO 文字列）。未同意は null */
  disclaimerAgreedAt: string | null;
  ageGroup: AgeGroup;
  viewingDistanceCm: ViewingDistanceCm;
  deviceTypeEstimated: DeviceType;
  /** 初回起動日時（ISO 文字列） */
  createdAt: string;
  schemaVersion: string;
};

// ---------------------------------------------------------------------------
// 6.2 Settings
// ---------------------------------------------------------------------------

export type Settings = {
  /** n：格子サイズ n×n */
  gridSize: number;
  /** m：1 ラウンドの制限時間（秒） */
  roundSeconds: number;
  /** r：1 セッションのラウンド数 */
  roundCount: number;
  /** a：回転速度（deg/sec） */
  rotationSpeed: number;
  /** b：空間周波数変化速度（hz/sec） */
  sfChangeSpeed: number;
  scoringMode: ScoringMode;
  darkMode: DarkMode;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  oneEyeGuidance: OneEyeGuidance;

  /**
   * 将来の「漸進難化モード」用の拡張余地（spec §6.2 注記）。
   * v2.0 では実装しない（§10 スコープ外）が、後続スプリントで難易度を動的に
   * 変化させる際にスキーマ非互換にならないよう、任意フィールドを残しておく。
   */
  progressiveModeEnabled?: boolean;
  progressionState?: Record<string, number> | null;
};

// ---------------------------------------------------------------------------
// 6.3 RoundRecord
// ---------------------------------------------------------------------------

export type RoundRecord = {
  /** セッション内のラウンド番号（1..r） */
  roundIndex: number;
  /** 変化パッチの個数 */
  changingPatchCount: number;
  /** 正しく選んだ変化パッチ数 */
  tpCount: number;
  /** 誤って選んだ静止パッチ数 */
  fpCount: number;
  /** 選ばなかった変化パッチ数 */
  fnCount: number;
  /** TP − FP のラウンド得点 */
  roundScore: number;
};

// ---------------------------------------------------------------------------
// 6.4 SessionRecord
// ---------------------------------------------------------------------------

export type ParamsSnapshot = {
  n: number;
  m: number;
  r: number;
  a: number;
  b: number;
  scoringMode: ScoringMode;
};

export type SessionRecord = {
  sessionId: string;
  /** 開始日時（ISO 文字列） */
  startedAt: string;
  /** 完了日時（ISO 文字列）。中断時は null（記録対象外） */
  completedAt: string | null;
  paramsSnapshot: ParamsSnapshot;
  rounds: RoundRecord[];
  /** 0〜100 単一スコア（F-04） */
  sessionScore: number;
};

// ---------------------------------------------------------------------------
// 6.5 DailyStats
// ---------------------------------------------------------------------------

export type DailyStats = {
  /** YYYY-MM-DD（端末ローカル） */
  date: string;
  /** その日の最良スコア（max） */
  bestSessionScore: number;
  /** その日のセッション完了件数 */
  sessionCount: number;
};

// ---------------------------------------------------------------------------
// 6.6 Streak
// ---------------------------------------------------------------------------

export type Streak = {
  currentStreak: number;
  longestStreak: number;
  /** 最終プレイ完了日（YYYY-MM-DD）。未プレイは null */
  lastPlayedDate: string | null;
};

// ---------------------------------------------------------------------------
// 6.7 PlayStats
// ---------------------------------------------------------------------------

export type PlayStats = {
  /** 累計セッション完了回数 */
  totalSessions: number;
};

// ---------------------------------------------------------------------------
// 6.8 BadgeStatus
// ---------------------------------------------------------------------------

export type BadgeStatus = {
  badgeId: BadgeId;
  earned: boolean;
  /** 獲得日時（ISO 文字列）。未獲得は null */
  earnedAt: string | null;
};

// ---------------------------------------------------------------------------
// 既定値ファクトリ
// ---------------------------------------------------------------------------

export function defaultSettings(): Settings {
  return {
    gridSize: PARAM_SPECS.gridSize.default,
    roundSeconds: PARAM_SPECS.roundSeconds.default,
    roundCount: PARAM_SPECS.roundCount.default,
    rotationSpeed: PARAM_SPECS.rotationSpeed.default,
    sfChangeSpeed: PARAM_SPECS.sfChangeSpeed.default,
    // 既定 ②（自動採点・確定ボタンあり）。screens.md S2-1 注記の Designer 提案。
    scoringMode: 'auto-confirm',
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
  return { totalSessions: 0 };
}

export function defaultBadgeStatus(badgeId: BadgeId): BadgeStatus {
  return { badgeId, earned: false, earnedAt: null };
}
