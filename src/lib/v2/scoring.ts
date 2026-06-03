/**
 * scoring.ts — 採点ロジック（spec F-02 採点 / F-04 セッションスコア集計）。
 *
 * 全採点方式で共通の採点規則：
 * - 選択した変化パッチ = TP（+1）
 * - 選択した静止パッチ = FP（−1）
 * - 選ばなかった変化パッチ = FN（0）
 * - ラウンド得点 roundScore = TP − FP
 *
 * セッションスコアは r ラウンドの集計を 0〜100 整数に正規化する。
 */

import { PatchDef, isChanging } from './patch';
import type { RoundRecord } from '../../state/schema';

/** 1 ラウンドの採点内訳。 */
export type RoundScore = {
  /** 変化パッチの総数（FN 算出と F-04 正規化の分母に使う） */
  changingPatchCount: number;
  /** 静止パッチの総数（F-04 罰項の分母に使う） */
  staticPatchCount: number;
  /** 正しく選んだ変化パッチ数 */
  tpCount: number;
  /** 誤って選んだ静止パッチ数 */
  fpCount: number;
  /** 選ばなかった変化パッチ数 */
  fnCount: number;
  /** TP − FP */
  roundScore: number;
};

/**
 * 選択集合（選択されたパッチ index の集合）とラウンドのパッチ定義から
 * TP/FP/FN とラウンド得点を算出する（純関数）。
 * 種類（回転/周波数）は区別しない（AS-2）。未選択でも算出される（TP=0,FP=0）。
 */
export function scoreRound(
  patches: readonly PatchDef[],
  selected: ReadonlySet<number>,
): RoundScore {
  let changingPatchCount = 0;
  let staticPatchCount = 0;
  let tpCount = 0;
  let fpCount = 0;
  let fnCount = 0;

  for (const patch of patches) {
    const picked = selected.has(patch.index);
    if (isChanging(patch)) {
      changingPatchCount++;
      if (picked) tpCount++;
      else fnCount++;
    } else {
      staticPatchCount++;
      if (picked) fpCount++;
    }
  }

  return {
    changingPatchCount,
    staticPatchCount,
    tpCount,
    fpCount,
    fnCount,
    roundScore: tpCount - fpCount,
  };
}

/**
 * 方式③（全問正解で自動遷移）の判定：選択集合が変化パッチ集合と過不足なく一致するか。
 * 誤選択（FP>0）や選び逃し（FN>0）がある間は false。
 */
export function isAllCorrect(
  patches: readonly PatchDef[],
  selected: ReadonlySet<number>,
): boolean {
  const s = scoreRound(patches, selected);
  return s.fpCount === 0 && s.fnCount === 0 && s.changingPatchCount > 0;
}

/**
 * RoundScore を永続化用の RoundRecord（spec §6.3）へ変換する。
 * staticPatchCount はスキーマに無いため落とす（集計は実行時 state で行う）。
 */
export function toRoundRecord(score: RoundScore, roundIndex: number): RoundRecord {
  return {
    roundIndex,
    changingPatchCount: score.changingPatchCount,
    tpCount: score.tpCount,
    fpCount: score.fpCount,
    fnCount: score.fnCount,
    roundScore: score.roundScore,
  };
}

// ---------------------------------------------------------------------------
// セッションスコア 0〜100 正規化（F-04）
// ---------------------------------------------------------------------------

/**
 * FP 罰係数。誤選択がスコアを下げる強さ。
 *
 * 根拠：正答率 = ΣTP / Σ変化パッチ を主成分（最大 100）とし、そこから
 * 誤選択率 = ΣFP / Σ静止パッチ に罰係数を掛けて減算する。
 * 罰係数 = 50 とすると「静止パッチを半分誤選択」で 25 点減、「全静止を誤選択」で
 * 50 点減となり、満点（誤選択ゼロ＝正答率 100）と明確に区別される。
 * 何も選ばない場合は正答率 0・誤選択 0 → 0 点（満点と明確に区別、F-04 下限要件）。
 */
export const FP_PENALTY = 50;

/**
 * セッションスコア（0〜100 整数）を算出する（F-04）。
 *
 * session = clamp(0, 100, round(100 × ΣTP/Σ変化 − FP_PENALTY × ΣFP/Σ静止))
 *
 * 観察可能な性質（screens.md §1.3 / spec F-04）：
 * - 全ラウンドで変化パッチ全正答 & 誤選択ゼロ → 100
 * - 1 つも選ばず誤選択もしない → 0（下限、満点と明確に区別）
 * - FP はスコアを下げる方向
 *
 * 集計対象のラウンドが空、または変化パッチが 1 つも無い場合は 0 を返す。
 */
export function computeSessionScore(rounds: readonly RoundScore[]): number {
  let totalTp = 0;
  let totalFp = 0;
  let totalChanging = 0;
  let totalStatic = 0;

  for (const r of rounds) {
    totalTp += r.tpCount;
    totalFp += r.fpCount;
    totalChanging += r.changingPatchCount;
    totalStatic += r.staticPatchCount;
  }

  if (totalChanging === 0) return 0;

  const hitRate = totalTp / totalChanging; // 0..1
  const fpRate = totalStatic > 0 ? totalFp / totalStatic : 0; // 0..1
  const raw = 100 * hitRate - FP_PENALTY * fpRate;
  return clamp(0, 100, Math.round(raw));
}

/**
 * 永続化済み RoundRecord 列からセッションスコアを再計算する。
 * RoundRecord は staticPatchCount を持たないため、罰項の分母には
 * 「選んだ静止パッチ数 = fpCount」のみが分かる。集計の整合のため、
 * セッション完了時は RoundScore（staticPatchCount を含む）から
 * computeSessionScore を使う。本関数は記録からの近似再計算用途に留める。
 */
export function clamp(min: number, max: number, value: number): number {
  return Math.min(max, Math.max(min, value));
}
