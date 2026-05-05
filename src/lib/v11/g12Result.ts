/**
 * G-12 クラウディングの結果サマリ用ヘルパー（screens.md S17-03）。
 *
 * - 正解ラベル / ユーザー回答ラベル（「垂直」「水平」「斜め右」「斜め左」）
 * - 前回比 diff（spacing 倍率を主軸として比較）
 * - 「2.0×」のような閾値表示文字列
 *
 * 純関数のみ。AsyncStorage / RN は触らない。
 */

import { MetricDiff } from '../../components/v11/MetricCard';
import { computeDiffFromBest } from './g01Result';
import {
  G12GradingResult,
  G12Orientation,
  orientationToJaLabel,
} from './g12Trial';

/** 「正解は『垂直』」の表示用ラベル（screens.md S17-03） */
export function buildG12CorrectAnswerLabel(o: G12Orientation): string {
  return orientationToJaLabel(o);
}

/** 「あなたの回答『斜め右』」の表示用ラベル。null は呼び出し側で「未回答」処理 */
export function buildG12UserAnswerLabel(
  userAnswer: G12Orientation | null,
): string | null {
  if (userAnswer === null) return null;
  return orientationToJaLabel(userAnswer);
}

/** G-12 結果の補助テキスト：未回答時は「未回答」、それ以外は空文字 */
export function buildG12ResultDetailText(
  grading: G12GradingResult | null,
): string {
  if (!grading) return '';
  if (grading.unattempted) return '未回答';
  return '';
}

/**
 * 前回比 diff（spacing 倍率を主軸）。
 *   step=0.2、digits=1。閾値が小さいほど良い（spacing が狭くても判別できる
 *   = クラウディング耐性が高い）。
 *
 * 例：
 *   - 過去ベスト 2.0 / 今回 1.8 → improved（'-', '0.2'）
 *   - 過去ベスト 2.0 / 今回 2.0 → flat
 *   - 過去ベスト 2.0 / 今回 2.2 → worsened（'+', '0.2'）
 */
export function computeG12DiffFromBest(args: {
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
 * spacing 倍率を「2.0×」のように小数 1 桁 + × 単位（target 直径倍）で整形。
 * screens.md S17-03：「閾値 2.0×、spacing(target直径倍)」
 */
export function formatG12ThresholdLabel(spacingMultiplier: number): string {
  return `${spacingMultiplier.toFixed(1)}×`;
}
