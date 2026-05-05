/**
 * G-06 ガウス窓サイズ弁別の結果サマリ用ヘルパー（screens.md S14-03）。
 *
 * - 正解ラベル / ユーザー回答ラベル（「左が大きい」「右が大きい」）
 * - 前回比 diff（直近平均 vs 過去ベスト）— v1.1 共通の computeDiffFromBest をラップ
 *
 * 純関数のみ。AsyncStorage / RN は触らない（テスト容易性）。
 */

import { MetricDiff } from '../../components/v11/MetricCard';
import { computeDiffFromBest } from './g01Result';
import {
  G06GradingResult,
  G06Side,
  sideToSizeJaLabel,
} from './g06Trial';

/** 「正解は『左が大きい』」の表示用ラベル（screens.md S14-03） */
export function buildG06CorrectAnswerLabel(correctSide: G06Side): string {
  return sideToSizeJaLabel(correctSide);
}

/** 「あなたの回答『左が大きい』」の表示用ラベル。null は呼び出し側で「未回答」処理 */
export function buildG06UserAnswerLabel(
  userAnswer: G06Side | null,
): string | null {
  if (userAnswer === null) return null;
  return sideToSizeJaLabel(userAnswer);
}

/**
 * G-06 結果の補助テキスト：未回答時は「未回答」、それ以外は空文字。
 * G-04 / G-05 と同じく 1 試行 1 回答のため数値内訳は無い。
 */
export function buildG06ResultDetailText(
  grading: G06GradingResult | null,
): string {
  if (!grading) return '';
  if (grading.unattempted) return '未回答';
  return '';
}

/**
 * 前回比 diff（G-04 / G-05 と同じヘルパーを step / digits 引数だけ揃えて呼び出す）。
 * G-06 の閾値 = SD 比、step = 0.1（gameRegistry より）、表示桁数 = 1。
 *
 * 例：
 *   - 過去ベスト 1.5 / 今回 1.4 → improved（sign='-', '0.1'）
 *   - 過去ベスト 1.5 / 今回 1.5 → flat（差 0 ≤ step/2=0.05）
 *   - 過去ベスト 1.5 / 今回 1.6 → worsened（sign='+', '0.1'）
 */
export function computeG06DiffFromBest(args: {
  currentThreshold: number;
  previousBest: number | null;
  step?: number;
  digits?: number;
}): MetricDiff | undefined {
  return computeDiffFromBest({
    currentThreshold: args.currentThreshold,
    previousBest: args.previousBest,
    step: args.step ?? 0.1,
    digits: args.digits ?? 1,
  });
}
