/**
 * badgeDefinitions.ts — v3.0 バッジ定義メタ（spec §6、3 軸 11 種 / sprint-9 screens.md）。
 *
 * 各バッジの id / 名称 / 軸 / 獲得条件メタ / 未獲得ヒントを宣言的に保持する純データ。
 * 旧 v2 のスコア依存・周波数（b）依存バッジは廃止し、3 軸（継続日数 / 高難度到達 /
 * 高レベル到達）で再定義する（spec §6.4：旧バッジはアプリ内に一切存在しない）。
 *
 * 軸：
 *   - streak（継続日数 B-01〜B-05）：Streak.currentStreak / PlayStats.totalGames を入力。
 *   - difficulty（高難度到達 B-06〜B-08）：クリアした GameRecord.levelParams を入力。
 *   - level（高レベル到達 B-09〜B-11）：LevelState.highestLevel を入力。
 *
 * 高難度・高レベルの閾値は spec §6 / system §9.3 の Generator 仮置き（AS-21）。
 * デフォルト 720 レベル前提だが、範囲設定で総レベル数が変わるため B-10/B-11 は
 * 「割合ベース」で判定する（system §9.3 の指示通り）。詳細は badges.ts。
 *
 * 文言は v2 と同様に本ファイルに直接保持（日本語のみ、AS-19/NF-25）。多言語化時は
 * i18n キー（badge.B-XX.name 等）へ移す。
 */

import type { BadgeId } from '../../state/v3/schema';

/** バッジの 3 軸（spec §6.1〜§6.3）。 */
export type BadgeAxis = 'streak' | 'difficulty' | 'level';

// ───────────────────────────────────────────────────────────
// 閾値（spec §6 / system §9.3、Generator 仮置き・AS-21）
// ───────────────────────────────────────────────────────────

/** 継続日数バッジ（B-01〜B-05）の連続日数閾値。B-01 は初回完了（連続 1 日）。 */
export const STREAK_THRESHOLDS = {
  'B-01': 1,
  'B-02': 3,
  'B-03': 7,
  'B-04': 14,
  'B-05': 30,
} as const;

/**
 * B-07「スロー回転ハンター」の遅い回転速度域の上限（system §9.3）。
 * 値集合 [6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2] の下位 1/3（3, 2.5, 2）= rotationSpeed ≤ 3。
 * 回転速度は「絶対値（deg/sec）」で意味が一定（速度 6=最易, 2=最難, AS-12）なので、
 * 範囲設定で総レベル数が変わっても閾値は割合化せず絶対値 3 で固定する。
 */
export const SLOW_ROTATION_MAX = 3;

/**
 * B-08「達人の眼」の最難域（全変数が各自の最難寄り、system §9.3）。
 * 個数4 かつ 4x4 かつ 振動 かつ rotationSpeed ≤ 2.5 のレベルをクリアで獲得。
 * これらも「変数の絶対的な最難寄り値」なので絶対値で固定する（割合化しない）。
 */
export const MASTER_MIN_COUNT = 4;
export const MASTER_MIN_GRID_SIZE = 4;
export const MASTER_MAX_ROTATION_SPEED = 2.5;

/**
 * B-09「二桁の壁」：最高到達レベル ≥ 10（spec §6.3、絶対値）。
 * レベル番号は変化順・範囲に依存するが「二桁＝10」という観察可能な絶対指標なので固定。
 */
export const HIGH_LEVEL_ABSOLUTE = 10;

/**
 * B-10「熟達者」：最高到達レベルが中盤（総レベル数の 50% 以上、system §9.3）。
 * 範囲設定で総レベル数が変わるため割合ベース（デフォルト 720 なら ≥ 360）。
 */
export const MID_LEVEL_RATIO = 0.5;

/**
 * B-11「頂を目指して」：最高到達レベルが終盤（総レベル数の 85% 以上、system §9.3）。
 * 割合ベース（デフォルト 720 なら ≥ 612）。
 */
export const HIGH_LEVEL_RATIO = 0.85;

// ───────────────────────────────────────────────────────────
// 定義メタ
// ───────────────────────────────────────────────────────────

export type BadgeDefinition = {
  id: BadgeId;
  axis: BadgeAxis;
  /** バッジ名（sprint-9 screens.md 表 / spec §6）。 */
  name: string;
  /** 獲得条件の説明（詳細展開・SR 用）。 */
  condition: string;
  /** 未獲得時のヒント（sprint-9 screens.md「未獲得ヒント」列）。 */
  hint: string;
};

/**
 * B-01〜B-11 の定義（spec §6 / sprint-9 screens.md 表に準拠）。
 * 表示順は軸ごと（継続 → 高難度 → 高レベル）に id 昇順。
 */
export const BADGE_DEFINITIONS: readonly BadgeDefinition[] = [
  // 継続日数軸（spec §6.1）
  {
    id: 'B-01',
    axis: 'streak',
    name: 'はじめの一歩',
    condition: '初めてゲームを完了する（クリア / 失敗いずれか）',
    hint: '初めてゲームを完了すると獲得',
  },
  {
    id: 'B-02',
    axis: 'streak',
    name: '三日坊主突破',
    condition: '3 日連続でプレイする',
    hint: '3 日連続でプレイすると獲得',
  },
  {
    id: 'B-03',
    axis: 'streak',
    name: '一週間の習慣',
    condition: '7 日連続でプレイする',
    hint: '7 日連続でプレイすると獲得',
  },
  {
    id: 'B-04',
    axis: 'streak',
    name: '二週間マスター',
    condition: '14 日連続でプレイする',
    hint: '14 日連続でプレイすると獲得',
  },
  {
    id: 'B-05',
    axis: 'streak',
    name: '一ヶ月の継続',
    condition: '30 日連続でプレイする',
    hint: '30 日連続でプレイすると獲得',
  },
  // 高難度到達軸（spec §6.2）
  {
    id: 'B-06',
    axis: 'difficulty',
    name: '振動を見抜く目',
    condition: '回転方向が「振動」のレベルをクリアする',
    hint: '振動するパッチのレベルをクリアすると獲得',
  },
  {
    id: 'B-07',
    axis: 'difficulty',
    name: 'スロー回転ハンター',
    condition: '回転速度が遅い域（3°/秒以下）のレベルをクリアする',
    hint: '回転がゆっくりなレベルをクリアすると獲得',
  },
  {
    id: 'B-08',
    axis: 'difficulty',
    name: '達人の眼',
    condition:
      '最難域（個数4・4x4・振動・速度 2.5°/秒以下が揃う）のレベルをクリアする',
    hint: '最も難しいレベルをクリアすると獲得',
  },
  // 高レベル到達軸（spec §6.3）
  {
    id: 'B-09',
    axis: 'level',
    name: '二桁の壁',
    condition: '最高到達レベルが 10 以上になる',
    hint: '最高到達レベルが 10 に達すると獲得',
  },
  {
    id: 'B-10',
    axis: 'level',
    name: '熟達者',
    condition: '最高到達レベルが中盤（全体の 50% 以上）に達する',
    hint: '最高到達レベルが中盤に達すると獲得',
  },
  {
    id: 'B-11',
    axis: 'level',
    name: '頂を目指して',
    condition: '最高到達レベルが終盤（全体の 85% 以上）に達する',
    hint: '最高到達レベルが終盤に達すると獲得',
  },
] as const;

/** id → 定義の索引（O(1) 参照）。 */
export const BADGE_DEFINITION_BY_ID: Readonly<Record<BadgeId, BadgeDefinition>> =
  Object.fromEntries(BADGE_DEFINITIONS.map((d) => [d.id, d])) as Record<
    BadgeId,
    BadgeDefinition
  >;

export function getBadgeDefinition(id: BadgeId): BadgeDefinition {
  return BADGE_DEFINITION_BY_ID[id];
}
