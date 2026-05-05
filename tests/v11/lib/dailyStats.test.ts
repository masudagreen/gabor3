/**
 * dailyStats — F-12 日次集計テスト（純関数。AsyncStorage は触らない）。
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {
  applyFullCourseCompletion,
  applySingleGameSession,
  emptyDailyStats,
} from '../../../src/lib/v11/dailyStats';
import { GameSessionResultV11 } from '../../../src/state/storage-v11';

const DATE = '2026-04-30';

function mkResult(
  gameId: GameSessionResultV11['gameId'],
  threshold: number,
  isCorrect = true,
): GameSessionResultV11 {
  return { gameId, threshold, isCorrect };
}

describe('dailyStats: applyFullCourseCompletion', () => {
  it('初回フルコース：fullCourseCompleted=true、wideScore 算出', () => {
    const init = emptyDailyStats(DATE);
    const results = [
      mkResult('G-01', 1), // 100
      mkResult('G-04', 0.02), // 100（v1.1.4 で min=0.02）
    ];
    const updated = applyFullCourseCompletion(init, results);
    expect(updated.fullCourseCompleted).toBe(true);
    expect(updated.sessionCount).toBe(1);
    expect(updated.gameBestThresholds['G-01']).toBe(1);
    expect(updated.gameBestThresholds['G-04']).toBe(0.02);
    expect(updated.wideScore).toBe(100);
  });

  it('同日 2 回目：max の wideScore を採用、ベスト閾値は min を採用', () => {
    const first = applyFullCourseCompletion(emptyDailyStats(DATE), [
      mkResult('G-01', 5), // 56 (= round(5/9 * 100) → 5: ratio = (10-5)/9 = 0.5556 → 56)
    ]);
    expect(first.wideScore).toBe(56);

    // 同じゲームでより難しい閾値を達成した 2 回目（小さい threshold = 良い）
    const second = applyFullCourseCompletion(first, [mkResult('G-01', 2)]);
    // G-01: 2 → ratio = (10-2)/9 = 0.8889 → 89
    expect(second.gameBestThresholds['G-01']).toBe(2);
    expect(second.wideScore).toBe(89);
    expect(second.sessionCount).toBe(2);
  });

  it('同日 2 回目で悪化した場合：wideScore は前回 max を維持', () => {
    const first = applyFullCourseCompletion(emptyDailyStats(DATE), [
      mkResult('G-01', 2), // 89
    ]);
    const second = applyFullCourseCompletion(first, [mkResult('G-01', 8)]);
    // G-01 best は min なので 2 を保持、wideScore も 2 ベース → 89
    expect(second.gameBestThresholds['G-01']).toBe(2);
    expect(second.wideScore).toBe(89);
  });

  it('実施しなかったゲームは gameBestThresholds に入らない', () => {
    const updated = applyFullCourseCompletion(emptyDailyStats(DATE), [
      mkResult('G-01', 3),
    ]);
    expect(updated.gameBestThresholds['G-01']).toBe(3);
    expect(updated.gameBestThresholds['G-04']).toBeUndefined();
  });

  it('不正解でもベスト閾値・wideScore は更新される（閾値は staircase の直近 5 平均なので採用する）', () => {
    const updated = applyFullCourseCompletion(emptyDailyStats(DATE), [
      mkResult('G-01', 4, false),
    ]);
    expect(updated.gameBestThresholds['G-01']).toBe(4);
    expect(updated.wideScore).not.toBeNull();
  });

  it('既存の gameBestThresholds より良ければ更新、悪ければ維持', () => {
    const base = emptyDailyStats(DATE);
    base.gameBestThresholds = { 'G-01': 3 };
    base.wideScore = 78;
    const updated = applyFullCourseCompletion(base, [mkResult('G-01', 5)]);
    expect(updated.gameBestThresholds['G-01']).toBe(3); // 既存の方が良い
  });
});

describe('dailyStats: applySingleGameSession', () => {
  it('単体プレイ：sessionCount +1、ベスト閾値更新', () => {
    const updated = applySingleGameSession(emptyDailyStats(DATE), 'G-04', 0.1);
    expect(updated.sessionCount).toBe(1);
    expect(updated.gameBestThresholds['G-04']).toBe(0.1);
    expect(updated.fullCourseCompleted).toBe(false);
  });

  it('単体プレイ複数回：min を採用', () => {
    let s = applySingleGameSession(emptyDailyStats(DATE), 'G-04', 0.2);
    s = applySingleGameSession(s, 'G-04', 0.08);
    s = applySingleGameSession(s, 'G-04', 0.15);
    expect(s.gameBestThresholds['G-04']).toBe(0.08);
    expect(s.sessionCount).toBe(3);
  });

  it('単体プレイ：fullCourseCompleted は触らない', () => {
    const init = emptyDailyStats(DATE);
    init.fullCourseCompleted = true;
    const updated = applySingleGameSession(init, 'G-04', 0.1);
    expect(updated.fullCourseCompleted).toBe(true);
  });

  it('単体プレイで wideScore も更新される（best thresholds の改善が反映）', () => {
    const updated = applySingleGameSession(emptyDailyStats(DATE), 'G-04', 0.02);
    // G-04: 100 → wideScore = 100（v1.1.4 で min=0.02）
    expect(updated.wideScore).toBe(100);
  });
});

describe('dailyStats: emptyDailyStats', () => {
  it('初期値', () => {
    const e = emptyDailyStats(DATE);
    expect(e.date).toBe(DATE);
    expect(e.fullCourseCompleted).toBe(false);
    expect(e.gameBestThresholds).toEqual({});
    expect(e.wideScore).toBeNull();
    expect(e.sessionCount).toBe(0);
  });
});
