/**
 * G-07 ガボールエッジ検出の結果サマリ用ヘルパー（screens.md S14-06）。
 *
 * - 正解ラベル（「2 行 2 列・2 行 4 列・3 行 3 列」のような 3 個位置の連結）
 * - ユーザー回答ラベル（「N/3 個正解 (M 過剰)」のような数値内訳、unattempted 時「未回答」）
 * - 前回比 diff — v1.1 共通の computeDiffFromBest をラップ（小さいほど良い、step 1°）
 *
 * 純関数のみ。AsyncStorage / RN は触らない（テスト容易性）。
 */

import { MetricDiff } from '../../components/v11/MetricCard';
import { computeDiffFromBest } from './g01Result';
import {
  buildG07CorrectAnswerLabel,
  buildG07ResultDetailText,
  G07GradingResult,
} from './g07Trial';

/** 「正解は『2 行 2 列・2 行 4 列・3 行 3 列』」の表示用ラベル（screens.md S14-06） */
export function buildG07CorrectLabel(
  grading: G07GradingResult | null,
): string {
  if (!grading) return '';
  return buildG07CorrectAnswerLabel(grading.correctIds);
}

/**
 * 「あなたの回答」表示用ラベル：
 * - null / 未回答 → null（ResultSummaryV11 が「未回答」と表示する）
 * - 全 3 個正解 → 「3/3 個正解」
 * - それ以外 → 「N/3 個正解（M 過剰）」または「N/3 個正解（M 不足）」
 *
 * ResultSummaryV11 の `userAnswerLabel` は string | null を受けるため、未回答時は
 * null を返して既存の「未回答」表示パスに任せる（G-05 の方針と整合）。
 */
export function buildG07UserAnswerLabel(
  grading: G07GradingResult | null,
): string | null {
  if (!grading) return null;
  if (grading.unattempted) return null;
  return buildG07ResultDetailText(grading);
}

/**
 * 前回比 diff（G-04 / G-05 / G-06 と同じヘルパーを step / digits 引数だけ揃えて
 * 呼び出す）。G-07 の閾値 = 向きズレ許容角（°）、step = 1°、表示桁数 = 0。
 *
 * 例：
 *   - 過去ベスト 5 / 今回 4 → improved（sign='-', '1'）
 *   - 過去ベスト 5 / 今回 5 → flat（差 0 ≤ step/2=0.5）
 *   - 過去ベスト 5 / 今回 6 → worsened（sign='+', '1'）
 */
export function computeG07DiffFromBest(args: {
  currentThreshold: number;
  previousBest: number | null;
  step?: number;
  digits?: number;
}): MetricDiff | undefined {
  return computeDiffFromBest({
    currentThreshold: args.currentThreshold,
    previousBest: args.previousBest,
    step: args.step ?? 1,
    digits: args.digits ?? 0,
  });
}
