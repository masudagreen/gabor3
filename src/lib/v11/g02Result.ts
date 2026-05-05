/**
 * G-02 左右並び傾き判別の結果サマリ用ヘルパー（screens.md S10-03）。
 *
 * - 正解ラベル / ユーザー回答ラベル
 * - 前回比 diff（直近平均 vs 過去ベスト）— v1.1 共通の computeDiffFromBest をラップ
 *
 * 純関数のみ。AsyncStorage / RN は触らない（テスト容易性）。
 */

import { MetricDiff } from '../../components/v11/MetricCard';
import { computeDiffFromBest } from './g01Result';
import { G02GradingResult, G02Side, sideToJaLabel } from './g02Trial';

/** 「正解は『左』」の表示用ラベル（screens.md S10-03） */
export function buildG02CorrectAnswerLabel(correctSide: G02Side): string {
  return sideToJaLabel(correctSide);
}

/** 「あなたの回答『左』」の表示用ラベル。null は呼び出し側で「未回答」処理 */
export function buildG02UserAnswerLabel(
  userAnswer: G02Side | null,
): string | null {
  if (userAnswer === null) return null;
  return sideToJaLabel(userAnswer);
}

/**
 * G-02 結果の補助テキスト：未回答時は「未回答」、それ以外は空文字。
 * G-01 のような「（正解 N, 誤答 M）」相当の数値は G-02 では存在しない（1 試行 1 回答）。
 */
export function buildG02ResultDetailText(
  grading: G02GradingResult | null,
): string {
  if (!grading) return '';
  if (grading.unattempted) return '未回答';
  return '';
}

/**
 * 前回比 diff（G-01 と同じヘルパーを step 引数だけ揃えて呼び出す）。
 * G-02 の閾値 = 角度差（°）、step = 1°（gameRegistry より）。
 */
export function computeG02DiffFromBest(args: {
  currentThreshold: number;
  previousBest: number | null;
  step?: number;
  digits?: number;
}): MetricDiff | undefined {
  return computeDiffFromBest({
    currentThreshold: args.currentThreshold,
    previousBest: args.previousBest,
    step: args.step ?? 1,
    digits: args.digits ?? 1,
  });
}
