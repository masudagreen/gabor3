/**
 * G-08 残像方位弁別の結果サマリ用ヘルパー（screens.md S20-G08-RESULT）。
 *
 * v1.1.1（Sprint 20-C）改訂：
 *   - 旧：「下のパッチは時計回り／反時計回り」（horizontal-2 文言）
 *   - 新：「下の左／下の右」（直接選択方式の側ラベル）。SR 読み上げの整合性のため、
 *     traditional な「下のパッチは時計回り／反時計回り」ラベルも buildG08LegacyXxx
 *     として残置（後方互換のため）。
 *
 * 純関数のみ。AsyncStorage / RN は触らない（テスト容易性）。
 */

import { MetricDiff } from '../../components/v11/MetricCard';
import { computeDiffFromBest } from './g01Result';
import {
  G08Direction,
  G08GradingResult,
  directionToJaLabel,
} from './g08Trial';

/** 「正解は『下のパッチは時計回り』」（旧仕様 / SR 読み上げ互換） */
export function buildG08CorrectAnswerLabel(direction: G08Direction): string {
  return directionToJaLabel(direction);
}

/** 「あなたの回答『下のパッチは時計回り』」（旧仕様 / SR 読み上げ互換） */
export function buildG08UserAnswerLabel(
  userAnswer: G08Direction | null,
): string | null {
  if (userAnswer === null) return null;
  return directionToJaLabel(userAnswer);
}

/**
 * v1.1.1 Sprint 20-C：side ベースの正解ラベル。
 * 「下の左のパッチ」「下の右のパッチ」。
 */
export function buildG08CorrectSideLabel(
  correctSide: 'left' | 'right',
): string {
  return correctSide === 'left' ? '下の左のパッチ' : '下の右のパッチ';
}

/** v1.1.1 Sprint 20-C：side ベースのユーザー回答ラベル */
export function buildG08UserSideLabel(
  userAnswerSide: 'left' | 'right' | null,
): string | null {
  if (userAnswerSide === null) return null;
  return userAnswerSide === 'left' ? '下の左のパッチ' : '下の右のパッチ';
}

/**
 * G-08 結果の補助テキスト：未回答時は「未回答」、それ以外は空文字。
 */
export function buildG08ResultDetailText(
  grading: G08GradingResult | null,
): string {
  if (!grading) return '';
  if (grading.unattempted) return '未回答';
  return '';
}

/**
 * 前回比 diff（G-04 / G-05 / G-06 と同じヘルパーを step / digits 引数だけ揃えて呼ぶ）。
 * G-08 の閾値 = テストパッチの絶対角度（°）、step=1（gameRegistry より）、桁数=0。
 */
export function computeG08DiffFromBest(args: {
  currentThreshold: number;
  previousBest: number | null;
  step?: number;
  digits?: number;
}): MetricDiff | undefined {
  return computeDiffFromBest({
    currentThreshold: args.currentThreshold,
    previousBest: args.previousBest,
    step: args.step ?? 1,
    digits: args.digits ?? 0,
  });
}
