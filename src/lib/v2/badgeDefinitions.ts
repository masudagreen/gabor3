/**
 * badgeDefinitions.ts — バッジ定義メタ（spec §5、3 軸 11 個 / screens.md S8 表）。
 *
 * 各バッジの id / 名称 / 軸 / 獲得条件メタ / 未獲得ヒントを宣言的に保持する純データ。
 * 付与判定ロジックは badges.ts、永続化は state/repository.ts（`gaboreye:v2:badge:*`）。
 *
 * 高難度の閾値は design system §9.2 / screens.md S8 を採用：
 *   - a（回転速度）≤ 3 °/sec を「遅い」域
 *   - b（周波数変化速度）≤ 0.10 hz/sec を「小さい」域
 *   - 「クリア / 全問正答」= セッション全体で FN=0 かつ FP=0（変化パッチを過不足なく正答）
 * 高スコアの閾値：80（B-09/B-11）/ 100（B-10）。
 *
 * 文言は i18n（badge.* キー）に置かず、表示の安定性のため本ファイルに直接保持する
 * （v2.0 は日本語のみ、AS-20。多言語化時は i18n キーへ移す）。
 */

import type { BadgeId } from '../../state/schema';

/** バッジの 3 軸（spec §5.1〜§5.3）。 */
export type BadgeAxis = 'streak' | 'difficulty' | 'score';

/** 高難度クリアと判定する閾値（screens.md S8 / system §9.2）。 */
export const SLOW_ROTATION_MAX = 3; // a ≤ 3 °/sec を「遅い」
export const SMALL_SF_CHANGE_MAX = 0.1; // b ≤ 0.10 hz/sec を「小さい」

/** 高スコアと判定する閾値（spec §5.3）。 */
export const HIGH_SCORE_THRESHOLD = 80; // B-09 / B-11
export const PERFECT_SCORE = 100; // B-10
/** B-11：スコア 80 以上の累計達成回数。 */
export const STABLE_HIGH_SCORE_COUNT = 5;

/** 継続日数バッジの連続日数閾値（B-01〜B-05）。B-01 は初回完了（連続 1）。 */
export const STREAK_THRESHOLDS: Record<BadgeId, number | null> = {
  'B-01': 1,
  'B-02': 3,
  'B-03': 7,
  'B-04': 14,
  'B-05': 30,
  'B-06': null,
  'B-07': null,
  'B-08': null,
  'B-09': null,
  'B-10': null,
  'B-11': null,
};

export type BadgeDefinition = {
  id: BadgeId;
  axis: BadgeAxis;
  /** バッジ名（screens.md S8 表）。 */
  name: string;
  /** 獲得条件の説明（詳細展開・SR 用）。 */
  condition: string;
  /**
   * 未獲得時のヒント（screens.md S8）。
   * B-11 は残り回数を埋める動的ヒントのため、{{remaining}} を含むテンプレート。
   */
  hint: string;
};

/**
 * B-01〜B-11 の定義（screens.md S8 表に準拠）。
 * 表示順は軸ごと（継続 → 高難度 → 高スコア）に id 昇順。
 */
export const BADGE_DEFINITIONS: readonly BadgeDefinition[] = [
  {
    id: 'B-01',
    axis: 'streak',
    name: 'はじめの一歩',
    condition: '初めてのセッションを完了する',
    hint: '初めてのセッションを完了すると獲得',
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
  {
    id: 'B-06',
    axis: 'difficulty',
    name: 'スロー回転ハンター',
    condition: '回転速度が遅い域（3°/秒以下）で変化パッチを全問正答する',
    hint: '回転速度を遅く設定して全問正解すると獲得',
  },
  {
    id: 'B-07',
    axis: 'difficulty',
    name: '微差を見抜く目',
    condition: '周波数変化が小さい域（0.10以下）で変化パッチを全問正答する',
    hint: '周波数変化を小さく設定して全問正解すると獲得',
  },
  {
    id: 'B-08',
    axis: 'difficulty',
    name: '達人の眼',
    condition: '回転も周波数も最も難しい域で高スコアを達成する',
    hint: '最も難しい設定で高スコアを出すと獲得',
  },
  {
    id: 'B-09',
    axis: 'score',
    name: '好調のしるし',
    condition: 'セッションスコア 80 以上を達成する',
    hint: 'スコア 80 以上を達成すると獲得',
  },
  {
    id: 'B-10',
    axis: 'score',
    name: 'パーフェクト',
    condition: 'セッションスコア 100（全ラウンド満点）を達成する',
    hint: 'スコア 100（全ラウンド満点）を達成すると獲得',
  },
  {
    id: 'B-11',
    axis: 'score',
    name: '安定の高得点',
    condition: 'スコア 80 以上を累計 5 セッション達成する',
    hint: 'スコア 80 以上をあと {{remaining}} 回で獲得',
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
