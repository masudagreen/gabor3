/**
 * G-01 変化察知の結果サマリ用ヘルパー（spec-v11.md §7.1、screens.md S9-03）。
 *
 * - パッチ ID（"r{row}c{col}"）→「N 列 M 行目」表示文字列
 * - 採点結果と staircase 状態から「正解ラベル / ユーザー回答ラベル」を生成
 * - 前回比 diff（直近平均 vs 過去ベスト）を計算
 *
 * 純関数のみ。AsyncStorage / RN は触らない（テスト容易性）。
 */

import { Game1GradingResult, Game1TrialSpec } from '../game1';
import { MetricDiff } from '../../components/v11/MetricCard';

/** パッチ ID（"r0c2"）→「3 列 1 行目」 */
export function patchIdToJaLabel(id: string): string {
  const m = /^r(\d+)c(\d+)$/.exec(id);
  if (!m) return id;
  const row = Number(m[1]) + 1;
  const col = Number(m[2]) + 1;
  return `${col} 列 ${row} 行目`;
}

/** trial.patches 中の変化対象 ID を「N 列 M 行目」リスト文字列にする */
export function buildCorrectAnswerLabel(trial: Game1TrialSpec): string {
  const ids = trial.patches.filter((p) => p.isChanging).map((p) => p.id);
  if (ids.length === 0) return '変化なし';
  return ids.map(patchIdToJaLabel).join('、');
}

/** ユーザーが選択していた ID リストを「N 列 M 行目」表示にする。空なら null */
export function buildUserAnswerLabel(
  selectedIds: ReadonlyArray<string>,
): string | null {
  if (selectedIds.length === 0) return null;
  return selectedIds.map(patchIdToJaLabel).join('、');
}

/**
 * G-01 採点結果を 1 行サマリにする：「（正解 N, 誤答 M）」。
 * 未挑戦時は「未回答」。
 */
export function buildAnswerCountSummary(
  grading: Game1GradingResult | null,
  unattempted: boolean,
): string {
  if (unattempted || !grading) return '未回答';
  return `（正解 ${grading.correctIds.length}, 誤答 ${grading.incorrectIds.length}）`;
}

/**
 * 「前回比」MetricDiff を計算する。
 *
 * 入力：
 *   - currentThreshold: 今回の閾値（直近 5 セッション平均）
 *   - previousBest: 過去のベスト閾値（今日を除く）。null なら初回測定
 *
 * 規約：閾値は「小さいほど良い」（ガボール 0.x や 角度 5° など）。
 * したがって direction 判定は：
 *   - 今回 < 過去ベスト：improved（sign='-'、改善）
 *   - 今回 > 過去ベスト：worsened（sign='+'、やや低下）
 *   - 同等（差 < 0.05 もしくはゲーム step の半分以下）：flat（sign='0'）
 *
 * `step` を渡すと flat 判定の閾値になる（デフォルト 0.05）。
 */
export function computeDiffFromBest(args: {
  currentThreshold: number;
  previousBest: number | null;
  step?: number;
  /** 表示桁数（デフォルト 1） */
  digits?: number;
}): MetricDiff | undefined {
  const { currentThreshold, previousBest } = args;
  const step = args.step ?? 0.05;
  const digits = args.digits ?? 1;
  if (previousBest === null) return undefined; // 初回測定
  const delta = currentThreshold - previousBest;
  const abs = Math.abs(delta);
  const flatThreshold = step / 2;
  const formatNum = (v: number) => v.toFixed(digits);
  if (abs <= flatThreshold) {
    return {
      sign: '0',
      magnitude: formatNum(abs),
      direction: 'flat',
    };
  }
  if (delta < 0) {
    // 今回が過去ベストより小さい = 難度進化 = 改善
    return {
      sign: '-',
      magnitude: formatNum(abs),
      direction: 'improved',
    };
  }
  return {
    sign: '+',
    magnitude: formatNum(abs),
    direction: 'worsened',
  };
}

/** 「正解 N, 誤答 M」形式の補助テキスト（不正解時に表示） */
export function buildResultDetailText(args: {
  grading: Game1GradingResult | null;
  unattempted: boolean;
}): string {
  return buildAnswerCountSummary(args.grading, args.unattempted);
}
