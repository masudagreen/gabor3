/**
 * G-05 空間周波数弁別の結果サマリ用ヘルパー（screens.md S13-03）。
 *
 * - 正解ラベル / ユーザー回答ラベル（「左が細かい」「右が細かい」）
 * - 前回比 diff（直近平均 vs 過去ベスト）— v1.1 共通の computeDiffFromBest をラップ
 *
 * 純関数のみ。AsyncStorage / RN は触らない（テスト容易性）。
 */

import { MetricDiff } from '../../components/v11/MetricCard';
import { computeDiffFromBest } from './g01Result';
import {
  G05GradingResult,
  G05Side,
  sideToSfJaLabel,
} from './g05Trial';

/** 「正解は『左が細かい』」の表示用ラベル（screens.md S13-03） */
export function buildG05CorrectAnswerLabel(correctSide: G05Side): string {
  return sideToSfJaLabel(correctSide);
}

/** 「あなたの回答『左が細かい』」の表示用ラベル。null は呼び出し側で「未回答」処理 */
export function buildG05UserAnswerLabel(
  userAnswer: G05Side | null,
): string | null {
  if (userAnswer === null) return null;
  return sideToSfJaLabel(userAnswer);
}

/**
 * G-05 結果の補助テキスト：未回答時は「未回答」、それ以外は空文字。
 * G-04 と同じく 1 試行 1 回答のため数値内訳は無い。
 */
export function buildG05ResultDetailText(
  grading: G05GradingResult | null,
): string {
  if (!grading) return '';
  if (grading.unattempted) return '未回答';
  return '';
}

/**
 * 前回比 diff（G-01 / G-02 / G-04 と同じヘルパーを step / digits 引数だけ揃えて
 * 呼び出す）。G-05 の閾値 = cpd 比、step = 0.1（gameRegistry より）、表示桁数 = 1。
 *
 * 例：
 *   - 過去ベスト 1.5 / 今回 1.4 → improved（sign='-', '0.1'）
 *   - 過去ベスト 1.5 / 今回 1.5 → flat（差 0 ≤ step/2=0.05）
 *   - 過去ベスト 1.5 / 今回 1.6 → worsened（sign='+', '0.1'）
 */
export function computeG05DiffFromBest(args: {
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
