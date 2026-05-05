/**
 * storage-v11 Sprint 18 追加分テスト：
 *   - loadRecentDailyStatsV11
 *   - recordFullCourseCompletionV11
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadDailyStatsV11,
  loadRecentDailyStatsV11,
  recordFullCourseCompletionV11,
  saveDailyStatsV11,
  createDefaultDailyStatsV11,
} from '../../../src/state/storage-v11';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('storage-v11: loadRecentDailyStatsV11', () => {
  it('過去 28 日範囲の DailyStats を日付昇順で返す', async () => {
    await saveDailyStatsV11({
      ...createDefaultDailyStatsV11('2026-04-01'),
      wideScore: 50,
    });
    await saveDailyStatsV11({
      ...createDefaultDailyStatsV11('2026-04-15'),
      wideScore: 60,
    });
    await saveDailyStatsV11({
      ...createDefaultDailyStatsV11('2026-04-30'),
      wideScore: 70,
    });

    const recent = await loadRecentDailyStatsV11('2026-04-30', 28);
    // 28 日範囲：2026-04-03 〜 2026-04-30 → 2026-04-15 と 2026-04-30 が含まれる
    expect(recent.map((r) => r.date)).toEqual(['2026-04-15', '2026-04-30']);
  });

  it('範囲外（古すぎる）レコードは除外', async () => {
    await saveDailyStatsV11({
      ...createDefaultDailyStatsV11('2025-01-01'),
      wideScore: 30,
    });
    const recent = await loadRecentDailyStatsV11('2026-04-30', 28);
    expect(recent).toEqual([]);
  });

  it('未来日付（end より新しい）は除外', async () => {
    await saveDailyStatsV11({
      ...createDefaultDailyStatsV11('2026-05-01'),
      wideScore: 40,
    });
    await saveDailyStatsV11({
      ...createDefaultDailyStatsV11('2026-04-30'),
      wideScore: 70,
    });
    const recent = await loadRecentDailyStatsV11('2026-04-30', 28);
    expect(recent.map((r) => r.date)).toEqual(['2026-04-30']);
  });

  it('データ皆無 → 空配列', async () => {
    const recent = await loadRecentDailyStatsV11('2026-04-30', 28);
    expect(recent).toEqual([]);
  });

  it('境界：endDate そのものは含まれる', async () => {
    await saveDailyStatsV11({
      ...createDefaultDailyStatsV11('2026-04-30'),
      wideScore: 50,
    });
    const recent = await loadRecentDailyStatsV11('2026-04-30', 1);
    expect(recent).toHaveLength(1);
  });

  it('日付昇順（古い→新しい）でソートされる', async () => {
    await saveDailyStatsV11({
      ...createDefaultDailyStatsV11('2026-04-30'),
      wideScore: 70,
    });
    await saveDailyStatsV11({
      ...createDefaultDailyStatsV11('2026-04-29'),
      wideScore: 60,
    });
    await saveDailyStatsV11({
      ...createDefaultDailyStatsV11('2026-04-28'),
      wideScore: 50,
    });
    const recent = await loadRecentDailyStatsV11('2026-04-30', 28);
    expect(recent.map((r) => r.date)).toEqual([
      '2026-04-28',
      '2026-04-29',
      '2026-04-30',
    ]);
  });
});

describe('storage-v11: recordFullCourseCompletionV11', () => {
  it('初回フルコース：fullCourseCompleted=true、wideScore 算出、永続化', async () => {
    const updated = await recordFullCourseCompletionV11('2026-04-30', [
      { gameId: 'G-01', threshold: 1, isCorrect: true },
      { gameId: 'G-04', threshold: 0.02, isCorrect: true }, // v1.1.4 で min=0.02
    ]);
    expect(updated.fullCourseCompleted).toBe(true);
    expect(updated.wideScore).toBe(100);

    // 永続化されている
    const reloaded = await loadDailyStatsV11('2026-04-30');
    expect(reloaded.fullCourseCompleted).toBe(true);
    expect(reloaded.wideScore).toBe(100);
  });

  it('同日 2 回目：sessionCount は累積、ベストは min', async () => {
    await recordFullCourseCompletionV11('2026-04-30', [
      { gameId: 'G-01', threshold: 5, isCorrect: true },
    ]);
    const second = await recordFullCourseCompletionV11('2026-04-30', [
      { gameId: 'G-01', threshold: 2, isCorrect: true },
    ]);
    expect(second.sessionCount).toBe(2);
    expect(second.gameBestThresholds['G-01']).toBe(2);
  });
});
