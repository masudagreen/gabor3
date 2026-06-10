/**
 * statsAggregation.test.ts — v3.1 集計純関数（セッション単位、spec §7.5/§7.6/§7.7）。
 */

import {
  updateDailyStats,
  updateStreak,
  updatePlayStats,
} from '../../../src/lib/v3/statsAggregation';
import type { DailyStats, Streak, PlayStats } from '../../../src/state/v3/schema';

describe('updateDailyStats（§7.5：クリア基準 max・sessionCount+1・roundCount 加算）', () => {
  it('既存なし・クリアあり → 到達レベル=最高クリア, sessionCount=1, roundCount=セッションのラウンド数', () => {
    expect(
      updateDailyStats(null, '2026-06-10', {
        highestClearedLevel: 12,
        roundCount: 5,
      }),
    ).toEqual({
      date: '2026-06-10',
      highestLevelReached: 12,
      sessionCount: 1,
      roundCount: 5,
    });
  });

  it('既存なし・クリア 0 件 → 到達レベル 0、sessionCount=1', () => {
    expect(
      updateDailyStats(null, '2026-06-10', {
        highestClearedLevel: 0,
        roundCount: 3,
      }),
    ).toEqual({
      date: '2026-06-10',
      highestLevelReached: 0,
      sessionCount: 1,
      roundCount: 3,
    });
  });

  it('既存あり → 到達レベルは max・sessionCount+1・roundCount 累積', () => {
    const prev: DailyStats = {
      date: '2026-06-10',
      highestLevelReached: 8,
      sessionCount: 2,
      roundCount: 7,
    };
    expect(
      updateDailyStats(prev, '2026-06-10', {
        highestClearedLevel: 12,
        roundCount: 4,
      }),
    ).toEqual({
      date: '2026-06-10',
      highestLevelReached: 12,
      sessionCount: 3,
      roundCount: 11,
    });
  });

  it('既存より低いクリアでも max を維持', () => {
    const prev: DailyStats = {
      date: '2026-06-10',
      highestLevelReached: 12,
      sessionCount: 1,
      roundCount: 2,
    };
    expect(
      updateDailyStats(prev, '2026-06-10', {
        highestClearedLevel: 5,
        roundCount: 6,
      }).highestLevelReached,
    ).toBe(12);
  });
});

describe('updateStreak（§7.6、セッション完了日基準）', () => {
  const base: Streak = { currentStreak: 0, longestStreak: 0, lastPlayedDate: null };
  it('初回 → 連続 1', () => {
    expect(updateStreak(base, '2026-06-10')).toEqual({
      currentStreak: 1,
      longestStreak: 1,
      lastPlayedDate: '2026-06-10',
    });
  });
  it('翌日継続 → +1', () => {
    const prev: Streak = { currentStreak: 1, longestStreak: 1, lastPlayedDate: '2026-06-09' };
    expect(updateStreak(prev, '2026-06-10').currentStreak).toBe(2);
  });
  it('同日再プレイ → 据え置き', () => {
    const prev: Streak = { currentStreak: 3, longestStreak: 3, lastPlayedDate: '2026-06-10' };
    expect(updateStreak(prev, '2026-06-10')).toEqual(prev);
  });
  it('2 日以上空く → 1 にリセット, longest 保持', () => {
    const prev: Streak = { currentStreak: 5, longestStreak: 5, lastPlayedDate: '2026-06-05' };
    const next = updateStreak(prev, '2026-06-10');
    expect(next.currentStreak).toBe(1);
    expect(next.longestStreak).toBe(5);
  });
});

describe('updatePlayStats（§7.7、セッション単位）', () => {
  it('totalSessions+1・totalRounds += ラウンド数・totalPlaySec += プレイ秒数', () => {
    const prev: PlayStats = { totalSessions: 9, totalRounds: 40, totalPlaySec: 1200 };
    expect(updatePlayStats(prev, 6, 300)).toEqual({
      totalSessions: 10,
      totalRounds: 46,
      totalPlaySec: 1500,
    });
    // playSec 省略時は加算 0（後方互換）。
    expect(updatePlayStats(prev, 6)).toEqual({
      totalSessions: 10,
      totalRounds: 46,
      totalPlaySec: 1200,
    });
  });
});
