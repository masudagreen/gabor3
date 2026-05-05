/**
 * badgeContext テスト — Sprint 19 / F-13。
 *
 * `composeBadgeContext` 純関数の集計ロジックを検証する。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { composeBadgeContext } from '../../../src/lib/v11/badgeContext';
import {
  DailyStatsV11,
  SessionRecordV11,
  StreakV11,
} from '../../../src/state/storage-v11';

const emptyStreak: StreakV11 = {
  currentStreak: 0,
  longestStreak: 0,
  lastCompletedDate: null,
};

describe('composeBadgeContext: 空入力', () => {
  it('totalTrialCount=0、各 Map 空', () => {
    const ctx = composeBadgeContext({
      streak: emptyStreak,
      allSessions: [],
      recentDailyStats: [],
      today: '2026-04-30',
    });
    expect(ctx.totalTrialCount).toBe(0);
    expect(ctx.perGamePlayCount).toEqual({});
    expect(ctx.perGameBestUpdatedCount).toEqual({});
    expect(ctx.fullCourseCompletions).toEqual([]);
  });
});

describe('composeBadgeContext: SessionRecord 集計', () => {
  it('perGamePlayCount を gameId 別にカウント', () => {
    const sessions: SessionRecordV11[] = [
      {
        sessionId: 's1',
        sessionType: 'single',
        startedAt: '2026-04-29T10:00:00.000Z',
        completedAt: '2026-04-29T10:01:00.000Z',
        gameResults: [{ gameId: 'G-01', threshold: 3, isCorrect: true }],
        wideScore: null,
      },
      {
        sessionId: 's2',
        sessionType: 'single',
        startedAt: '2026-04-30T10:00:00.000Z',
        completedAt: '2026-04-30T10:01:00.000Z',
        gameResults: [{ gameId: 'G-01', threshold: 2, isCorrect: true }],
        wideScore: null,
      },
    ];
    const ctx = composeBadgeContext({
      streak: emptyStreak,
      allSessions: sessions,
      recentDailyStats: [],
      today: '2026-04-30',
    });
    expect(ctx.perGamePlayCount['G-01']).toBe(2);
    expect(ctx.totalTrialCount).toBe(2);
  });

  it('full-course の SessionRecord は fullCourseCompletions に追加', () => {
    const sessions: SessionRecordV11[] = [
      {
        sessionId: 's1',
        sessionType: 'full-course',
        startedAt: '2026-04-30T20:00:00.000Z',
        completedAt: '2026-04-30T20:13:00.000Z',
        gameResults: Array.from({ length: 13 }, (_, i) => ({
          gameId: `G-${String(i + 1).padStart(2, '0')}` as never,
          threshold: 3,
          isCorrect: true,
        })),
        wideScore: 60,
      },
    ];
    const ctx = composeBadgeContext({
      streak: emptyStreak,
      allSessions: sessions,
      recentDailyStats: [],
      today: '2026-04-30',
    });
    expect(ctx.fullCourseCompletions).toHaveLength(1);
    expect(ctx.fullCourseCompletions[0].date).toBe('2026-04-30');
    expect(ctx.totalTrialCount).toBe(13);
  });

  it('completedAt=null の session は fullCourseCompletions に入らない', () => {
    const sessions: SessionRecordV11[] = [
      {
        sessionId: 's1',
        sessionType: 'full-course',
        startedAt: '2026-04-30T20:00:00.000Z',
        completedAt: null,
        gameResults: [],
        wideScore: null,
      },
    ];
    const ctx = composeBadgeContext({
      streak: emptyStreak,
      allSessions: sessions,
      recentDailyStats: [],
      today: '2026-04-30',
    });
    expect(ctx.fullCourseCompletions).toHaveLength(0);
  });
});

describe('composeBadgeContext: DailyStats からのベスト更新カウント', () => {
  it('gameBestThresholds の各 gameId に 1 ずつ加算', () => {
    const stats: DailyStatsV11[] = [
      {
        date: '2026-04-29',
        fullCourseCompleted: true,
        gameBestThresholds: { 'G-01': 3, 'G-02': 5 },
        wideScore: 60,
        sessionCount: 1,
      },
      {
        date: '2026-04-30',
        fullCourseCompleted: true,
        gameBestThresholds: { 'G-01': 2 },
        wideScore: 65,
        sessionCount: 1,
      },
    ];
    const ctx = composeBadgeContext({
      streak: emptyStreak,
      allSessions: [],
      recentDailyStats: stats,
      today: '2026-04-30',
    });
    expect(ctx.perGameBestUpdatedCount['G-01']).toBe(2);
    expect(ctx.perGameBestUpdatedCount['G-02']).toBe(1);
  });

  it('allDailyStats を recentDailyStats から複製', () => {
    const stats: DailyStatsV11[] = [
      {
        date: '2026-04-30',
        fullCourseCompleted: true,
        gameBestThresholds: { 'G-01': 3 },
        wideScore: 60,
        sessionCount: 1,
      },
    ];
    const ctx = composeBadgeContext({
      streak: emptyStreak,
      allSessions: [],
      recentDailyStats: stats,
      today: '2026-04-30',
    });
    expect(ctx.allDailyStats).toHaveLength(1);
    expect(ctx.allDailyStats[0].date).toBe('2026-04-30');
  });
});

describe('composeBadgeContext: today / now / streak', () => {
  it('today と streak は引数のまま返す', () => {
    const streak: StreakV11 = {
      currentStreak: 5,
      longestStreak: 10,
      lastCompletedDate: '2026-04-30',
    };
    const ctx = composeBadgeContext({
      streak,
      allSessions: [],
      recentDailyStats: [],
      today: '2026-04-30',
    });
    expect(ctx.streak).toEqual(streak);
    expect(ctx.today).toBe('2026-04-30');
  });

  it('now を ISO 8601 で返す（now 未指定時はデフォルト現在時刻）', () => {
    const ctx = composeBadgeContext({
      streak: emptyStreak,
      allSessions: [],
      recentDailyStats: [],
      today: '2026-04-30',
      now: new Date('2026-04-30T10:00:00.000Z'),
    });
    expect(ctx.now).toBe('2026-04-30T10:00:00.000Z');
  });
});
