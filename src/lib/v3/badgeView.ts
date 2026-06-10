/**
 * badgeView.ts — v3.0 バッジ一覧の表示モデル（純関数、F-09 バッジ部 / sprint-9 screens.md S9-1）。
 *
 * BadgeStatus[]（永続化）から、UI（BadgeCell / BadgeGrid）が必要とする行を整形する。
 * - 全 11 バッジを定義順（継続 → 高難度 → 高レベル）で返す。
 * - 獲得済み：earnedAt をローカル日付（YYYY-MM-DD）に整形。
 * - 未獲得：ヒント文言（badgeDefinitions の hint）。
 *
 * v2 の badgeView（スコア依存・B-11 残り回数テンプレート）を置換。v3 は割合/絶対値の
 * 固定ヒントのみで動的展開は不要（system §9.3 のヒント文言）。日付整形は純関数とし、
 * 文言は badgeDefinitions.ts に依存する素のデータ（name/hint/earned）を組み立てる。
 */

import type { BadgeStatus, BadgeId } from '../../state/v3/schema';
import {
  BADGE_DEFINITIONS,
  BADGE_DEFINITION_BY_ID,
  type BadgeAxis,
} from './badgeDefinitions';
import { localDateString } from '../v2/dateUtil';

export type BadgeViewRow = {
  id: BadgeId;
  axis: BadgeAxis;
  name: string;
  earned: boolean;
  /** 獲得済みの場合のローカル日付（YYYY-MM-DD）。未獲得は null。 */
  earnedDate: string | null;
  /** 未獲得時のヒント。獲得済みでも詳細展開用に保持。 */
  hint: string;
  /** 詳細表示（条件全文）。 */
  condition: string;
};

/** id → BadgeStatus の索引（欠けは未獲得扱い）。 */
function statusOf(statuses: readonly BadgeStatus[], id: BadgeId): BadgeStatus {
  return (
    statuses.find((s) => s.badgeId === id) ?? {
      badgeId: id,
      earned: false,
      earnedAt: null,
    }
  );
}

/**
 * バッジ一覧の表示行を組み立てる（F-09 バッジ部）。
 *
 * @param statuses 永続化された BadgeStatus（順不同・欠け可）
 */
export function buildBadgeRows(statuses: readonly BadgeStatus[]): BadgeViewRow[] {
  return BADGE_DEFINITIONS.map((def) => {
    const st = statusOf(statuses, def.id);
    return {
      id: def.id,
      axis: def.axis,
      name: def.name,
      earned: st.earned,
      earnedDate:
        st.earned && st.earnedAt ? localDateString(new Date(st.earnedAt)) : null,
      hint: def.hint,
      condition: def.condition,
    };
  });
}

/** 軸ごとにグループ化した表示行（screens.md S9-1：軸見出し付きグリッド）。 */
export type BadgeAxisGroup = {
  axis: BadgeAxis;
  rows: BadgeViewRow[];
};

/** バッジ行を軸（継続 → 高難度 → 高レベル）でグループ化する（順序は定義順を保つ）。 */
export function groupBadgeRowsByAxis(
  rows: readonly BadgeViewRow[],
): BadgeAxisGroup[] {
  const order: BadgeAxis[] = ['streak', 'difficulty', 'level'];
  return order
    .map((axis) => ({ axis, rows: rows.filter((r) => r.axis === axis) }))
    .filter((g) => g.rows.length > 0);
}

/** 獲得済みバッジ数（一覧ヘッダ等の進捗表示用）。 */
export function earnedCount(statuses: readonly BadgeStatus[]): number {
  return BADGE_DEFINITIONS.reduce(
    (acc, def) => acc + (statusOf(statuses, def.id).earned ? 1 : 0),
    0,
  );
}

/** 演出用：newlyEarned の ID 列を名称付きに解決する。 */
export function resolveBadgeNames(
  ids: readonly BadgeId[],
): { id: BadgeId; name: string }[] {
  return ids.map((id) => ({ id, name: BADGE_DEFINITION_BY_ID[id].name }));
}
