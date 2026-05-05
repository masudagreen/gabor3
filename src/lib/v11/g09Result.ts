/**
 * G-09 側方マスキングの結果サマリ用ヘルパー（screens.md S15-06）。
 *
 * - 正解ラベル / ユーザー回答ラベル（「中央は縦寄り」「中央は横寄り」）
 * - 前回比 diff（contrast を主軸として比較）
 * - 「c=0.10 / d=3λ」のような合成閾値表示文字列
 *
 * 純関数のみ。AsyncStorage / RN は触らない。
 */

import { MetricDiff } from '../../components/v11/MetricCard';
import { computeDiffFromBest } from './g01Result';
import {
  G09GradingResult,
  G09Orientation,
  derivePolatSpacingFromContrast,
  orientationToJaLabel,
} from './g09Trial';

/** 「正解は『中央は縦寄り』」の表示用ラベル（screens.md S15-06） */
export function buildG09CorrectAnswerLabel(o: G09Orientation): string {
  return orientationToJaLabel(o);
}

/** 「あなたの回答『中央は縦寄り』」の表示用ラベル。null は「未回答」処理 */
export function buildG09UserAnswerLabel(
  userAnswer: G09Orientation | null,
): string | null {
  if (userAnswer === null) return null;
  return orientationToJaLabel(userAnswer);
}

/** G-09 結果の補助テキスト：未回答時は「未回答」、それ以外は空文字 */
export function buildG09ResultDetailText(
  grading: G09GradingResult | null,
): string {
  if (!grading) return '';
  if (grading.unattempted) return '未回答';
  return '';
}

/**
 * 前回比 diff（contrast を主軸）。
 *   contrast step=0.01、digits=2。閾値が小さいほど良い（v1.1 共通規約）。
 *
 * 例：
 *   - 過去ベスト 0.10 / 今回 0.08 → improved（'-', '0.02'）
 *   - 過去ベスト 0.10 / 今回 0.10 → flat
 *   - 過去ベスト 0.10 / 今回 0.12 → worsened（'+', '0.02'）
 */
export function computeG09DiffFromBest(args: {
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
 * 「c=0.10」表示文字列（screens.md S15-06 メイン MetricCard 主要値）。
 * digits=2 で固定。
 */
export function formatG09ContrastLabel(contrast: number): string {
  return `c=${contrast.toFixed(2)}`;
}

/**
 * 「d=3.0λ」表示文字列（screens.md S15-06 副次表示）。
 * digits=1 で固定。
 */
export function formatG09SpacingLabel(spacingLambdaMultiplier: number): string {
  return `d=${spacingLambdaMultiplier.toFixed(1)}λ`;
}

/**
 * contrast を渡すと「c=0.10\nd=3.0λ」（改行区切り）の表示文字列を返す。
 * MetricCard の value に渡す合成ラベル（screens.md S15-06）。
 */
export function formatG09CombinedThresholdLabel(contrast: number): string {
  const spacing = derivePolatSpacingFromContrast(contrast);
  return `${formatG09ContrastLabel(contrast)}\n${formatG09SpacingLabel(spacing)}`;
}
