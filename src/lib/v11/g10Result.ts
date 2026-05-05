/**
 * G-10 テクスチャ分離の結果サマリ用ヘルパー（screens.md S16-03）。
 *
 * - 正解ラベル / ユーザー回答ラベル（「左上」「右上」「左下」「右下」）
 * - 前回比 diff（向き差を主軸として比較）
 *
 * 純関数のみ。AsyncStorage / RN は触らない。
 */

import { MetricDiff } from '../../components/v11/MetricCard';
import { computeDiffFromBest } from './g01Result';
import {
  G10GradingResult,
  G10Quadrant,
  quadrantToJaLabel,
} from './g10Trial';

/** 「正解は『左上』」の表示用ラベル（screens.md S16-03） */
export function buildG10CorrectAnswerLabel(q: G10Quadrant): string {
  return quadrantToJaLabel(q);
}

/** 「あなたの回答『左上』」の表示用ラベル。null は呼び出し側で「未回答」処理 */
export function buildG10UserAnswerLabel(
  userAnswer: G10Quadrant | null,
): string | null {
  if (userAnswer === null) return null;
  return quadrantToJaLabel(userAnswer);
}

/** G-10 結果の補助テキスト：未回答時は「未回答」、それ以外は空文字 */
export function buildG10ResultDetailText(
  grading: G10GradingResult | null,
): string {
  if (!grading) return '';
  if (grading.unattempted) return '未回答';
  return '';
}

/**
 * 前回比 diff（向き差を主軸）。
 *   step=5、digits=0。閾値が小さいほど良い（向き差が小さくても異領域を検出できる
 *   = 視覚機能が高い、v1.1 共通規約）。
 *
 * 例：
 *   - 過去ベスト 30° / 今回 25° → improved（'-', '5'）
 *   - 過去ベスト 30° / 今回 30° → flat
 *   - 過去ベスト 30° / 今回 35° → worsened（'+', '5'）
 */
export function computeG10DiffFromBest(args: {
  currentThreshold: number;
  previousBest: number | null;
  step?: number;
  digits?: number;
}): MetricDiff | undefined {
  return computeDiffFromBest({
    currentThreshold: args.currentThreshold,
    previousBest: args.previousBest,
    step: args.step ?? 5,
    digits: args.digits ?? 0,
  });
}

/** 向き差を「30°」のように整数 + ° 単位で整形 */
export function formatG10ThresholdLabel(orientationDiffDeg: number): string {
  return `${Math.round(orientationDiffDeg)}°`;
}
