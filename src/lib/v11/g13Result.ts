/**
 * G-13 数字探しの結果サマリ用ヘルパー（screens.md S17-06）。
 *
 * - 正解ラベル / ユーザー回答ラベル（"3" など）
 * - 前回比 diff（コントラストを主軸として比較）
 * - 「0.10」のような閾値表示文字列
 *
 * 純関数のみ。AsyncStorage / RN は触らない。
 */

import { MetricDiff } from '../../components/v11/MetricCard';
import { computeDiffFromBest } from './g01Result';
import {
  G13Digit,
  G13GradingResult,
  digitToJaLabel,
} from './g13Trial';

/** 「正解は『3』」の表示用ラベル（screens.md S17-06） */
export function buildG13CorrectAnswerLabel(d: G13Digit): string {
  return digitToJaLabel(d);
}

/** 「あなたの回答『9』」の表示用ラベル。null は呼び出し側で「未回答」処理 */
export function buildG13UserAnswerLabel(
  userAnswer: G13Digit | null,
): string | null {
  if (userAnswer === null) return null;
  return digitToJaLabel(userAnswer);
}

/** G-13 結果の補助テキスト：未回答時は「未回答」、それ以外は空文字 */
export function buildG13ResultDetailText(
  grading: G13GradingResult | null,
): string {
  if (!grading) return '';
  if (grading.unattempted) return '未回答';
  return '';
}

/**
 * 前回比 diff（コントラストを主軸）。
 *   step=0.01、digits=2。閾値が小さいほど良い（より低コントラストでも判別できる
 *   = コントラスト感度が高い）。
 *
 * 例：
 *   - 過去ベスト 0.10 / 今回 0.08 → improved（'-', '0.02'）
 *   - 過去ベスト 0.10 / 今回 0.10 → flat
 *   - 過去ベスト 0.10 / 今回 0.12 → worsened（'+', '0.02'）
 */
export function computeG13DiffFromBest(args: {
  currentThreshold: number;
  previousBest: number | null;
  step?: number;
  digits?: number;
}): MetricDiff | undefined {
  return computeDiffFromBest({
    currentThreshold: args.currentThreshold,
    previousBest: args.previousBest,
    step: args.step ?? 0.01,
    digits: args.digits ?? 2,
  });
}

/**
 * コントラストを「0.10」のように小数 2 桁で整形。
 * screens.md S17-06：「閾値 0.10、コントラスト」
 */
export function formatG13ThresholdLabel(contrast: number): string {
  return contrast.toFixed(2);
}
