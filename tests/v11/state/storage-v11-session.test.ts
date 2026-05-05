/**
 * storage-v11 SessionRecord / DailyStats — Sprint 9 追加分（spec-v11.md §9.1）。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createDefaultDailyStatsV11,
  loadAllSessionRecordsV11,
  loadDailyStatsV11,
  loadHistoricalBestThresholdV11,
  loadSessionRecordV11,
  loadTrialRecordV11,
  recordSingleGameSessionV11,
  saveDailyStatsV11,
  saveSessionRecordV11,
  saveTrialRecordV11,
} from '../../../src/state/storage-v11';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('storage-v11 SessionRecord / TrialRecord', () => {
  it('SessionRecord を save → load round-trip', async () => {
    await saveSessionRecordV11({
      sessionId: 'sess-1',
      sessionType: 'single',
      startedAt: '2026-04-30T10:00:00.000Z',
      completedAt: '2026-04-30T10:01:00.000Z',
      gameResults: [
        { gameId: 'G-01', threshold: 5.0, isCorrect: true },
      ],
      wideScore: null,
    });
    const loaded = await loadSessionRecordV11('sess-1');
    expect(loaded?.sessionId).toBe('sess-1');
    expect(loaded?.gameResults[0].gameId).toBe('G-01');
  });

  it('未保存の sessionId は null を返す', async () => {
    const loaded = await loadSessionRecordV11('not-exist');
    expect(loaded).toBeNull();
  });

  it('loadAllSessionRecordsV11 は startedAt 降順', async () => {
    await saveSessionRecordV11({
      sessionId: 'a',
      sessionType: 'single',
      startedAt: '2026-04-29T10:00:00.000Z',
      completedAt: null,
      gameResults: [],
      wideScore: null,
    });
    await saveSessionRecordV11({
      sessionId: 'b',
      sessionType: 'single',
      startedAt: '2026-04-30T10:00:00.000Z',
      completedAt: null,
      gameResults: [],
      wideScore: null,
    });
    const all = await loadAllSessionRecordsV11();
    expect(all.length).toBe(2);
    expect(all[0].sessionId).toBe('b'); // 新しい順
    expect(all[1].sessionId).toBe('a');
  });

  it('TrialRecord を save → load round-trip', async () => {
    await saveTrialRecordV11({
      trialId: 't-1',
      sessionId: 'sess-1',
      gameId: 'G-01',
      paramValue: 5.0,
      isCorrect: true,
      selectedAnswer: ['r0c0'],
      timestamp: '2026-04-30T10:00:00.000Z',
    });
    const loaded = await loadTrialRecordV11('t-1');
    expect(loaded?.trialId).toBe('t-1');
    expect(loaded?.gameId).toBe('G-01');
    expect(loaded?.selectedAnswer).toEqual(['r0c0']);
  });
});

describe('storage-v11 DailyStats', () => {
  it('未保存の date はデフォルト値を返す', async () => {
    const stats = await loadDailyStatsV11('2026-04-30');
    expect(stats).toEqual(createDefaultDailyStatsV11('2026-04-30'));
  });

  it('save → load round-trip', async () => {
    await saveDailyStatsV11({
      date: '2026-04-30',
      fullCourseCompleted: true,
      gameBestThresholds: { 'G-01': 4.5 },
      wideScore: 75,
      sessionCount: 3,
    });
    const loaded = await loadDailyStatsV11('2026-04-30');
    expect(loaded.fullCourseCompleted).toBe(true);
    expect(loaded.gameBestThresholds['G-01']).toBe(4.5);
    expect(loaded.sessionCount).toBe(3);
  });

  it('recordSingleGameSessionV11：初回はベスト＝今回値、sessionCount=1', async () => {
    const stats = await recordSingleGameSessionV11(
      '2026-04-30',
      'G-01',
      5.0,
    );
    expect(stats.gameBestThresholds['G-01']).toBe(5.0);
    expect(stats.sessionCount).toBe(1);
  });

  it('recordSingleGameSessionV11：2 回目は min を採用（小さい方が良い）', async () => {
    await recordSingleGameSessionV11('2026-04-30', 'G-01', 5.0);
    const stats = await recordSingleGameSessionV11(
      '2026-04-30',
      'G-01',
      4.5,
    );
    expect(stats.gameBestThresholds['G-01']).toBe(4.5);
    expect(stats.sessionCount).toBe(2);
  });

  it('recordSingleGameSessionV11：今回値 > 過去ベストならベストは変わらない', async () => {
    await recordSingleGameSessionV11('2026-04-30', 'G-01', 4.5);
    const stats = await recordSingleGameSessionV11(
      '2026-04-30',
      'G-01',
      5.0,
    );
    expect(stats.gameBestThresholds['G-01']).toBe(4.5);
    expect(stats.sessionCount).toBe(2);
  });
});

describe('storage-v11 loadHistoricalBestThresholdV11', () => {
  it('過去データなしなら null', async () => {
    const best = await loadHistoricalBestThresholdV11('G-01', '2026-04-30');
    expect(best).toBeNull();
  });

  it('today を除外、それ以外の日付のベストを返す', async () => {
    await saveDailyStatsV11({
      date: '2026-04-29',
      fullCourseCompleted: false,
      gameBestThresholds: { 'G-01': 5.5 },
      wideScore: null,
      sessionCount: 1,
    });
    await saveDailyStatsV11({
      date: '2026-04-30', // today、除外される
      fullCourseCompleted: false,
      gameBestThresholds: { 'G-01': 4.0 },
      wideScore: null,
      sessionCount: 1,
    });
    const best = await loadHistoricalBestThresholdV11('G-01', '2026-04-30');
    expect(best).toBe(5.5);
  });

  it('複数日のうち最小（一番良い）を返す', async () => {
    await saveDailyStatsV11({
      date: '2026-04-28',
      fullCourseCompleted: false,
      gameBestThresholds: { 'G-01': 5.5 },
      wideScore: null,
      sessionCount: 1,
    });
    await saveDailyStatsV11({
      date: '2026-04-29',
      fullCourseCompleted: false,
      gameBestThresholds: { 'G-01': 4.5 },
      wideScore: null,
      sessionCount: 1,
    });
    const best = await loadHistoricalBestThresholdV11('G-01', '2026-04-30');
    expect(best).toBe(4.5);
  });

  it('当該 gameId のデータがなければ null', async () => {
    await saveDailyStatsV11({
      date: '2026-04-28',
      fullCourseCompleted: false,
      gameBestThresholds: { 'G-04': 0.1 },
      wideScore: null,
      sessionCount: 1,
    });
    const best = await loadHistoricalBestThresholdV11('G-01', '2026-04-30');
    expect(best).toBeNull();
  });
});
