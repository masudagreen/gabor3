/**
 * V1 スコア算出（spec.md §9.1）。
 *
 * 各ゲームの staircase 閾値を 0〜100 に正規化し、3 ゲームの算術平均を
 * 「V1 スコア」とする。閾値が小さい（精度が高い）ほどスコアは高い。
 *
 * 正規化式：
 *   - Game 1: clamp((8 - threshold) / (8 - 3) × 100, 0, 100)
 *   - Game 2: clamp((10 - threshold) / (10 - 1) × 100, 0, 100)
 *   - Game 3: clamp((45 - threshold) / (45 - 5) × 100, 0, 100)
 *
 * 欠損ゲーム（threshold が null）がある日は、実施したゲームのみの平均を採る。
 * 3 ゲーム全て欠損の場合は null を返す。
 */

const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

/** Game 1（変化察知）のスコア。threshold は最大角度差 °、易 8° → 難 3° */
export function game1Score(threshold: number): number {
  return clamp(((8 - threshold) / (8 - 3)) * 100, 0, 100);
}

/** Game 2（二重表裏判別）のスコア。threshold は最小判別角度差 °、易 10° → 難 1° */
export function game2Score(threshold: number): number {
  return clamp(((10 - threshold) / (10 - 1)) * 100, 0, 100);
}

/** Game 3（周辺視野ハント）のスコア。threshold は最小角度差 °、易 45° → 難 5° */
export function game3Score(threshold: number): number {
  return clamp(((45 - threshold) / (45 - 5)) * 100, 0, 100);
}

/**
 * 3 ゲームの閾値から V1 スコア（0-100 整数）を算出する。
 * null の閾値は除外する。全て null の場合は null を返す。
 */
export function computeV1Score(
  game1Threshold: number | null,
  game2Threshold: number | null,
  game3Threshold: number | null,
): number | null {
  const scores: number[] = [];
  if (game1Threshold != null) scores.push(game1Score(game1Threshold));
  if (game2Threshold != null) scores.push(game2Score(game2Threshold));
  if (game3Threshold != null) scores.push(game3Score(game3Threshold));
  if (scores.length === 0) return null;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(avg);
}

/**
 * 前回比（差分）の表示用構造。
 *   - direction: 'up'   = 上昇（改善）
 *                'down' = 下降（悪化）
 *                'flat' = 同じ
 *                'first' = 比較対象なし（はじめての記録）
 *   - delta: スコア差（current - previous）。direction='first' のときは null
 */
export type ScoreDiff = {
  direction: 'up' | 'down' | 'flat' | 'first';
  delta: number | null;
};

/**
 * 現在 V1 スコアと前回 V1 スコアから ScoreDiff を作る。
 * 「上昇」は改善（V1 スコアは大きい方が良い）。
 */
export function computeScoreDiff(
  current: number | null,
  previous: number | null,
): ScoreDiff {
  if (current == null) return { direction: 'first', delta: null };
  if (previous == null) return { direction: 'first', delta: null };
  const d = current - previous;
  if (d > 0) return { direction: 'up', delta: d };
  if (d < 0) return { direction: 'down', delta: d };
  return { direction: 'flat', delta: 0 };
}

/**
 * 閾値ベースの前回比（spec.md §F-11）。
 * 閾値は小さい方が改善（improved）なので、direction の意味が V1 スコアと逆になる。
 *   - improved: 前回より閾値が小さくなった（改善）
 *   - worse:    前回より閾値が大きくなった（悪化）
 *   - flat:     前回と同じ
 *   - first:    比較対象なし
 *   - delta:    current - previous（負なら改善）
 */
export type ThresholdDiff = {
  direction: 'improved' | 'worse' | 'flat' | 'first';
  delta: number | null;
};

export function computeThresholdDiff(
  current: number | null,
  previous: number | null,
): ThresholdDiff {
  if (current == null) return { direction: 'first', delta: null };
  if (previous == null) return { direction: 'first', delta: null };
  const d = current - previous;
  if (d < 0) return { direction: 'improved', delta: d };
  if (d > 0) return { direction: 'worse', delta: d };
  return { direction: 'flat', delta: 0 };
}
