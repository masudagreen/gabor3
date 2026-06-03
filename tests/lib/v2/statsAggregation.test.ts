/**
 * statsAggregation.test.ts — 完了セッション集計の純ロジック
 * （spec §6.5 DailyStats / §6.6 Streak / §6.7 PlayStats）。
 */

import {
  updateDailyStats,
  updateStreak,
  updatePlayStats,
} from '../../../src/lib/v2/statsAggregation';
import { defaultStreak, defaultPlayStats } from '../../../src/state/schema';

describe('updateDailyStats（その日の最良スコア max・件数）', () => {
  it('既存なしは score をそのまま、件数 1', () => {
    expect(updateDailyStats(null, '2026-05-30', 72)).toEqual({
      date: '2026-05-30',
      bestSessionScore: 72,
      sessionCount: 1,
    });
  });

  it('既存ありで高いスコアは max を更新し件数 +1', () => {
    const prev = { date: '2026-05-30', bestSessionScore: 60, sessionCount: 1 };
    expect(updateDailyStats(prev, '2026-05-30', 85)).toEqual({
      date: '2026-05-30',
      bestSessionScore: 85,
      sessionCount: 2,
    });
  });

  it('既存より低いスコアでも max は据え置き・件数のみ +1', () => {
    const prev = { date: '2026-05-30', bestSessionScore: 90, sessionCount: 2 };
    expect(updateDailyStats(prev, '2026-05-30', 40)).toEqual({
      date: '2026-05-30',
      bestSessionScore: 90,
      sessionCount: 3,
    });
  });
});

describe('updateStreak（連続日数）', () => {
  it('初回（lastPlayedDate=null）は連続 1', () => {
    const next = updateStreak(defaultStreak(), '2026-05-30');
    expect(next).toEqual({
      currentStreak: 1,
      longestStreak: 1,
      lastPlayedDate: '2026-05-30',
    });
  });

  it('前日からの継続で連続 +1（連続）', () => {
    const prev = {
      currentStreak: 4,
      longestStreak: 4,
      lastPlayedDate: '2026-05-29',
    };
    expect(updateStreak(prev, '2026-05-30')).toEqual({
      currentStreak: 5,
      longestStreak: 5,
      lastPlayedDate: '2026-05-30',
    });
  });

  it('同日に再プレイしても連続日数は変わらない', () => {
    const prev = {
      currentStreak: 5,
      longestStreak: 5,
      lastPlayedDate: '2026-05-30',
    };
    expect(updateStreak(prev, '2026-05-30')).toEqual(prev);
  });

  it('2 日以上空くと連続が途切れて 1 に戻る', () => {
    const prev = {
      currentStreak: 5,
      longestStreak: 5,
      lastPlayedDate: '2026-05-28',
    };
    expect(updateStreak(prev, '2026-05-30')).toEqual({
      currentStreak: 1,
      longestStreak: 5, // 過去最長は保持
      lastPlayedDate: '2026-05-30',
    });
  });

  it('途切れても longestStreak は過去最長を維持する', () => {
    const prev = {
      currentStreak: 2,
      longestStreak: 10,
      lastPlayedDate: '2026-05-20',
    };
    const next = updateStreak(prev, '2026-05-30');
    expect(next.currentStreak).toBe(1);
    expect(next.longestStreak).toBe(10);
  });
});

describe('updatePlayStats（累計）', () => {
  it('累計セッション数を +1 する', () => {
    expect(updatePlayStats(defaultPlayStats())).toEqual({ totalSessions: 1 });
    expect(updatePlayStats({ totalSessions: 41 })).toEqual({
      totalSessions: 42,
    });
  });
});
