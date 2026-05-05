/**
 * courseGameAdapter — 13 ゲームそれぞれの TrialResult から
 * `(threshold, isCorrect, unattempted)` を抽出する小さな adapter。
 *
 * 各ゲームの TrialResult は閾値フィールド名が異なる：
 *   - G-01 / G-02 / G-03 / G-07 / G-08 / G-10 / G-12: thresholdDeg or thresholdSpacing
 *   - G-04 / G-09 / G-13: thresholdContrast
 *   - G-05 / G-06: thresholdRatio
 *   - G-11: thresholdArcmin
 *   - G-12: thresholdSpacing
 *
 * unattempted の場所も一律ではない：
 *   - G-01: `result.unattempted`
 *   - G-02..G-13: `result.grading.unattempted`
 *
 * 本モジュールは UI から呼ばれる。型安全性のため `unknown` を経由して
 * 各ゲーム固有 shape にアクセスする。
 */

import { GameIdV11 } from '../../state/gameIds-v11';

export type CourseGameOutcome = {
  /** 当該ゲームの単位の閾値（直近 5 セッション平均） */
  threshold: number;
  /** 採点結果 */
  isCorrect: boolean;
  /** 未挑戦（中断 or 未回答 60 秒経過） */
  unattempted: boolean;
};

type AnyResult = {
  isCorrectForStaircase?: boolean;
  unattempted?: boolean;
  thresholdDeg?: number;
  thresholdContrast?: number;
  thresholdRatio?: number;
  thresholdArcmin?: number;
  thresholdSpacing?: number;
  grading?: { unattempted?: boolean };
};

const THRESHOLD_FIELD_BY_GAME: Record<GameIdV11, keyof AnyResult> = {
  'G-01': 'thresholdDeg',
  'G-02': 'thresholdDeg',
  'G-03': 'thresholdDeg',
  'G-04': 'thresholdContrast',
  'G-05': 'thresholdRatio',
  'G-06': 'thresholdRatio',
  'G-07': 'thresholdDeg',
  'G-08': 'thresholdDeg',
  'G-09': 'thresholdContrast',
  'G-10': 'thresholdDeg',
  'G-11': 'thresholdArcmin',
  'G-12': 'thresholdSpacing',
  'G-13': 'thresholdContrast',
};

/**
 * 任意のゲームの TrialResult から `(threshold, isCorrect, unattempted)` を抽出。
 *
 * 期待される shape：
 *   - 各ゲーム TrialResult は `isCorrectForStaircase: boolean` を持つ
 *   - threshold フィールド名はゲームごと（thresholdDeg / thresholdContrast / ...）
 *   - unattempted は `result.unattempted` または `result.grading.unattempted`
 */
export function extractCourseGameOutcome(
  gameId: GameIdV11,
  result: unknown,
): CourseGameOutcome {
  const r = result as AnyResult;
  const field = THRESHOLD_FIELD_BY_GAME[gameId];
  const thresholdRaw = r[field];
  const threshold = typeof thresholdRaw === 'number' ? thresholdRaw : 0;

  const unattempted = r.unattempted ?? r.grading?.unattempted ?? false;
  const isCorrect = unattempted ? false : r.isCorrectForStaircase === true;
  return { threshold, isCorrect, unattempted };
}
