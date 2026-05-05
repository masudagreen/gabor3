/**
 * G-04 コントラスト弁別の結果サマリ用ヘルパー（screens.md S12-03）。
 *
 * - 正解ラベル / ユーザー回答ラベル（「左が濃い」「右が濃い」）
 * - 前回比 diff（直近平均 vs 過去ベスト）— v1.1 共通の computeDiffFromBest をラップ
 *
 * 純関数のみ。AsyncStorage / RN は触らない（テスト容易性）。
 */

import { MetricDiff } from '../../components/v11/MetricCard';
import { computeDiffFromBest } from './g01Result';
import {
  G04GradingResult,
  G04Side,
  sideToContrastJaLabel,
} from './g04Trial';

/** 「正解は『左が濃い』」の表示用ラベル（screens.md S12-03） */
export function buildG04CorrectAnswerLabel(correctSide: G04Side): string {
  return sideToContrastJaLabel(correctSide);
}

/** 「あなたの回答『左が濃い』」の表示用ラベル。null は呼び出し側で「未回答」処理 */
export function buildG04UserAnswerLabel(
  userAnswer: G04Side | null,
): string | null {
  if (userAnswer === null) return null;
  return sideToContrastJaLabel(userAnswer);
}

/**
 * G-04 結果の補助テキスト：未回答時は「未回答」、それ以外は空文字。
 * G-01 のような「（正解 N, 誤答 M）」相当の数値は G-04 では存在しない（1 試行 1 回答）。
 */
export function buildG04ResultDetailText(
  grading: G04GradingResult | null,
): string {
  if (!grading) return '';
  if (grading.unattempted) return '未回答';
  return '';
}

/**
 * 前回比 diff（G-01 / G-02 と同じヘルパーを step / digits 引数だけ揃えて呼び出す）。
 * G-04 の閾値 = コントラスト差、step = 0.02（gameRegistry より）、表示桁数 = 2。
 *
 * 例：
 *   - 過去ベスト 0.15 / 今回 0.13 → improved（sign='-', '0.02'）
 *   - 過去ベスト 0.15 / 今回 0.15 → flat（差 0 ≤ step/2=0.01）
 *   - 過去ベスト 0.15 / 今回 0.18 → worsened（sign='+', '0.03'）
 */
export function computeG04DiffFromBest(args: {
  currentThreshold: number;
  previousBest: number | null;
  step?: number;
  digits?: number;
}): MetricDiff | undefined {
  return computeDiffFromBest({
    currentThreshold: args.currentThreshold,
    previousBest: args.previousBest,
    step: args.step ?? 0.02,
    digits: args.digits ?? 2,
  });
}
