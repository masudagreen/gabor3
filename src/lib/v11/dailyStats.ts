/**
 * dailyStats — F-12 日次集計ロジック（spec-v11.md §F-12 / §9.1 DailyStats）。
 *
 * - 当日のフルコース完了結果から DailyStats を組み立てる
 * - `gameBestThresholds` は当日の各ゲームのベスト（min）を保持
 * - `wideScore` は同日複数セッションの max を採用
 *
 * 本モジュールは AsyncStorage 非依存の純関数。永続化は呼び出し側が
 * `state/storage-v11.ts` の load/save ヘルパーで行う。
 */

import { GameIdV11 } from '../../state/gameIds-v11';
import {
  DailyStatsV11,
  GameSessionResultV11,
  createDefaultDailyStatsV11,
} from '../../state/storage-v11';
import { computeWideScore, wideScoreFromDailyBest } from './wideScore';

/**
 * フルコース完了 1 回分の結果を DailyStats に反映する純関数版。
 *
 * - sessionCount を +1
 * - 各ゲームのベスト閾値を更新（min を採用）
 * - fullCourseCompleted を true に
 * - wideScore は当日 best thresholds から再計算（同日 max ロジックは
 *   `gameBestThresholds` が既に min（=ベスト）を保持しているので、その上で
 *   `wideScoreFromDailyBest` を回せば「その日の best」が反映される）
 *
 * @param current 当日 DailyStats（無ければ createDefaultDailyStatsV11）
 * @param results フルコース 1 回の各ゲーム結果（completedAt 時点）
 */
export function applyFullCourseCompletion(
  current: DailyStatsV11,
  results: ReadonlyArray<GameSessionResultV11>,
): DailyStatsV11 {
  const nextBest: Partial<Record<GameIdV11, number>> = {
    ...current.gameBestThresholds,
  };
  for (const r of results) {
    const prev = nextBest[r.gameId];
    if (prev === undefined || r.threshold < prev) {
      nextBest[r.gameId] = r.threshold;
    }
  }
  // 同日複数セッション：今回セッションのワイドスコア vs 既存 wideScore の max
  const thisSessionThresholds: Partial<Record<GameIdV11, number>> = {};
  for (const r of results) {
    thisSessionThresholds[r.gameId] = r.threshold;
  }
  const thisSessionWide = computeWideScore(thisSessionThresholds);
  const dailyBestWide = wideScoreFromDailyBest(nextBest);
  const candidates: number[] = [];
  if (typeof current.wideScore === 'number') candidates.push(current.wideScore);
  if (typeof thisSessionWide === 'number') candidates.push(thisSessionWide);
  if (typeof dailyBestWide === 'number') candidates.push(dailyBestWide);
  const wideScore = candidates.length > 0 ? Math.max(...candidates) : null;

  return {
    ...current,
    fullCourseCompleted: true,
    gameBestThresholds: nextBest,
    sessionCount: current.sessionCount + 1,
    wideScore,
  };
}

/**
 * 単体プレイ 1 セッションを当日 DailyStats に反映する純関数版。
 *
 * - sessionCount を +1
 * - 当該ゲームのベスト閾値を更新（min を採用）
 * - fullCourseCompleted は変更しない
 * - wideScore は更新する（best thresholds の改善が反映される）
 */
export function applySingleGameSession(
  current: DailyStatsV11,
  gameId: GameIdV11,
  threshold: number,
): DailyStatsV11 {
  const prev = current.gameBestThresholds[gameId];
  const nextBest = {
    ...current.gameBestThresholds,
    [gameId]: prev === undefined ? threshold : Math.min(prev, threshold),
  };
  const dailyBestWide = wideScoreFromDailyBest(nextBest);
  // 既存 wideScore（フルコース時に書き込まれているかも）と max を取る
  const candidates: number[] = [];
  if (typeof current.wideScore === 'number') candidates.push(current.wideScore);
  if (typeof dailyBestWide === 'number') candidates.push(dailyBestWide);
  const wideScore = candidates.length > 0 ? Math.max(...candidates) : null;
  return {
    ...current,
    sessionCount: current.sessionCount + 1,
    gameBestThresholds: nextBest,
    wideScore,
  };
}

/** 空 DailyStats を作る薄いラッパ。 */
export function emptyDailyStats(date: string): DailyStatsV11 {
  return createDefaultDailyStatsV11(date);
}
