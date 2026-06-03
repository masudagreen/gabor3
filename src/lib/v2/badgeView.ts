/**
 * badgeView.ts — バッジ一覧の表示モデル（純関数、F-09 バッジ部 / screens.md S8-1）。
 *
 * BadgeStatus[]（永続化）+ 高スコア累計から、UI（BadgeCell）が必要とする行を整形する。
 * - 全 11 バッジを定義順（継続→高難度→高スコア）で返す。
 * - 獲得済み：earnedAt をローカル日付（YYYY-MM-DD）に整形。
 * - 未獲得：ヒント文言。B-11 は「あと {n} 回」を動的に埋める。
 *
 * 日付整形・残り回数はテスト可能にするため純関数とし、文言は badgeDefinitions.ts と
 * i18n に依存しない素のデータ（name/hint/earned）を組み立てる。
 */

import type { BadgeStatus, BadgeId } from '../../state/schema';
import {
  BADGE_DEFINITIONS,
  BADGE_DEFINITION_BY_ID,
  type BadgeAxis,
} from './badgeDefinitions';
import { remainingForStableHighScore } from './badges';
import { localDateString } from './dateUtil';

export type BadgeViewRow = {
  id: BadgeId;
  axis: BadgeAxis;
  name: string;
  earned: boolean;
  /** 獲得済みの場合のローカル日付（YYYY-MM-DD）。未獲得は null。 */
  earnedDate: string | null;
  /** 未獲得時のヒント（B-11 は「あと {n} 回」を展開済み）。獲得済みは条件説明。 */
  hint: string;
  /** 詳細表示（条件全文）。 */
  condition: string;
};

/** id → BadgeStatus の索引（欠けは未獲得扱い）。 */
function statusOf(
  statuses: readonly BadgeStatus[],
  id: BadgeId,
): BadgeStatus {
  return (
    statuses.find((s) => s.badgeId === id) ?? {
      badgeId: id,
      earned: false,
      earnedAt: null,
    }
  );
}

/**
 * B-11 のヒントに残り回数を埋める。テンプレートは「... あと {{remaining}} 回 ...」。
 */
function fillHint(id: BadgeId, template: string, highScoreSessionCount: number): string {
  if (id !== 'B-11') return template;
  const remaining = remainingForStableHighScore(highScoreSessionCount);
  return template.replace('{{remaining}}', String(remaining));
}

/**
 * バッジ一覧の表示行を組み立てる（F-09）。
 *
 * @param statuses             永続化された BadgeStatus（順不同・欠け可）
 * @param highScoreSessionCount スコア 80 以上の累計（B-11 残り回数用）
 */
export function buildBadgeRows(
  statuses: readonly BadgeStatus[],
  highScoreSessionCount: number,
): BadgeViewRow[] {
  return BADGE_DEFINITIONS.map((def) => {
    const st = statusOf(statuses, def.id);
    return {
      id: def.id,
      axis: def.axis,
      name: def.name,
      earned: st.earned,
      earnedDate:
        st.earned && st.earnedAt ? localDateString(new Date(st.earnedAt)) : null,
      hint: fillHint(def.id, def.hint, highScoreSessionCount),
      condition: def.condition,
    };
  });
}

/** 獲得済みバッジ数（一覧ヘッダ等の進捗表示用）。 */
export function earnedCount(statuses: readonly BadgeStatus[]): number {
  return BADGE_DEFINITIONS.reduce(
    (acc, def) => acc + (statusOf(statuses, def.id).earned ? 1 : 0),
    0,
  );
}

/** 演出用：newlyEarned の ID 列を名称付きに解決する。 */
export function resolveBadgeNames(ids: readonly BadgeId[]): { id: BadgeId; name: string }[] {
  return ids.map((id) => ({ id, name: BADGE_DEFINITION_BY_ID[id].name }));
}
