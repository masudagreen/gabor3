/**
 * G-03 周辺視野ハントの結果サマリ用ヘルパー（screens.md S11-03）。
 *
 * - 正解ラベル / ユーザー回答ラベル（「3 時の方向」等の日本語表示）
 * - 前回比 diff（直近平均 vs 過去ベスト）— v1.1 共通の computeDiffFromBest をラップ
 *
 * 純関数のみ。AsyncStorage / RN は触らない（テスト容易性）。
 */

import { MetricDiff } from '../../components/v11/MetricCard';
import { computeDiffFromBest } from './g01Result';
import {
  G03ClockPosition,
  G03GradingResult,
  clockPositionToJaLabel,
} from './g03Trial';

/** 「正解は『3 時の方向』」の表示用ラベル（screens.md S11-03） */
export function buildG03CorrectAnswerLabel(pos: G03ClockPosition): string {
  return clockPositionToJaLabel(pos);
}

/** 「あなたの回答『6 時の方向』」の表示用ラベル。null は呼び出し側で「未回答」処理 */
export function buildG03UserAnswerLabel(
  userAnswer: G03ClockPosition | null,
): string | null {
  if (userAnswer === null) return null;
  return clockPositionToJaLabel(userAnswer);
}

/**
 * G-03 結果の補助テキスト：未回答時は「未回答」、それ以外は空文字。
 * G-03 では 1 試行 1 回答（G-01 のような複数選択ではない）なので追加情報なし。
 */
export function buildG03ResultDetailText(
  grading: G03GradingResult | null,
): string {
  if (!grading) return '';
  if (grading.unattempted) return '未回答';
  return '';
}

/**
 * 前回比 diff（G-01 / G-02 と同じヘルパーを step 引数だけ揃えて呼び出す）。
 * G-03 の閾値 = 角度差（°）、step = 2°（gameRegistry より）。
 */
export function computeG03DiffFromBest(args: {
  currentThreshold: number;
  previousBest: number | null;
  step?: number;
  digits?: number;
}): MetricDiff | undefined {
  return computeDiffFromBest({
    currentThreshold: args.currentThreshold,
    previousBest: args.previousBest,
    step: args.step ?? 2,
    digits: args.digits ?? 1,
  });
}
