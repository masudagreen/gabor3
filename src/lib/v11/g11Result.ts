/**
 * G-11 Vernier 整列判定の結果サマリ用ヘルパー（screens.md S16-06）。
 *
 * - 正解ラベル / ユーザー回答ラベル（「下のパッチは左にずれている」等）
 * - 前回比 diff（arcmin を主軸として比較）
 *
 * 純関数のみ。AsyncStorage / RN は触らない。
 */

import { MetricDiff } from '../../components/v11/MetricCard';
import { computeDiffFromBest } from './g01Result';
import {
  G11GradingResult,
  G11OffsetDirection,
  directionToJaLabel,
} from './g11Trial';

/** 「正解は『下のパッチは左にずれている』」の表示用ラベル（screens.md S16-06） */
export function buildG11CorrectAnswerLabel(d: G11OffsetDirection): string {
  return directionToJaLabel(d);
}

/** 「あなたの回答『下のパッチは左にずれている』」の表示用ラベル。null は呼び出し側で「未回答」処理 */
export function buildG11UserAnswerLabel(
  userAnswer: G11OffsetDirection | null,
): string | null {
  if (userAnswer === null) return null;
  return directionToJaLabel(userAnswer);
}

/** G-11 結果の補助テキスト：未回答時は「未回答」、それ以外は空文字 */
export function buildG11ResultDetailText(
  grading: G11GradingResult | null,
): string {
  if (!grading) return '';
  if (grading.unattempted) return '未回答';
  return '';
}

/**
 * 前回比 diff（arcmin を主軸）。
 *   step=0.2、digits=1。閾値が小さいほど良い（より微小なズレを判別できる
 *   = ハイパーアキュイティが高い）。
 *
 * 例：
 *   - 過去ベスト 2.0' / 今回 1.8' → improved（'-', '0.2'）
 *   - 過去ベスト 2.0' / 今回 2.0' → flat
 *   - 過去ベスト 2.0' / 今回 2.2' → worsened（'+', '0.2'）
 */
export function computeG11DiffFromBest(args: {
  currentThreshold: number;
  previousBest: number | null;
  step?: number;
  digits?: number;
}): MetricDiff | undefined {
  return computeDiffFromBest({
    currentThreshold: args.currentThreshold,
    previousBest: args.previousBest,
    step: args.step ?? 0.2,
    digits: args.digits ?? 1,
  });
}

/**
 * ズレ量を「2.0'」のように小数 1 桁 + ' 単位（arcmin 略号）で整形。
 * screens.md S16-06：「閾値 2.0'、ズレ量(arcmin)」
 */
export function formatG11ThresholdLabel(arcminVal: number): string {
  return `${arcminVal.toFixed(1)}'`;
}
