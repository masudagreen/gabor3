/**
 * sessionRecorder.test.ts — v3.1 完了セッション永続化 + 日次/ストリーク/累計/バッジ更新
 * （spec §7.4〜§7.8, F-04/F-08）。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buildSessionRecord,
  recordCompletedSession,
  type CompletedSessionInput,
} from '../../../src/state/v3/sessionRecorder';
import {
  loadAllSessionRecords,
  loadDailyStats,
  loadStreak,
  loadPlayStats,
  loadAllBadgeStatuses,
} from '../../../src/state/v3/repository';
import type { LevelParams } from '../../../src/lib/v3/level';

const EASY: LevelParams = {
  repeat: 2,
  seconds: 35,
  direction: 'one-way',
  gridSize: 3,
  rotationSpeed: 6,
};

function input(
  overrides: Partial<CompletedSessionInput> = {},
): CompletedSessionInput {
  return {
    sessionId: 's1',
    startedAt: '2026-06-10T00:00:00.000Z',
    sessionMinutes: 5,
    roundCount: 3,
    clearCount: 2,
    failCount: 1,
    startLevel: 5,
    endLevel: 7,
    highestLevelInSession: 7,
    playSec: 300,
    highestClearedLevel: 6,
    clearedLevelParams: [EASY, EASY],
    highestLevel: 6,
    now: new Date('2026-06-10T00:05:00.000Z'),
    ...overrides,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('buildSessionRecord（純関数）', () => {
  it('completedAt を埋めた SessionRecord を組み立てる', () => {
    const rec = buildSessionRecord(input(), '2026-06-10T00:05:00.000Z');
    expect(rec).toEqual({
      sessionId: 's1',
      startedAt: '2026-06-10T00:00:00.000Z',
      completedAt: '2026-06-10T00:05:00.000Z',
      sessionMinutes: 5,
      roundCount: 3,
      clearCount: 2,
      failCount: 1,
      startLevel: 5,
      endLevel: 7,
      highestLevelInSession: 7,
      playSec: 300,
    });
  });
});

describe('recordCompletedSession', () => {
  it('SessionRecord を永続化し、日次/ストリーク/累計を更新する', async () => {
    const res = await recordCompletedSession(input());

    expect(await loadAllSessionRecords()).toHaveLength(1);
    expect(res.session.completedAt).toBe('2026-06-10T00:05:00.000Z');

    const daily = await loadDailyStats('2026-06-10');
    expect(daily).toEqual({
      date: '2026-06-10',
      highestLevelReached: 6, // highestClearedLevel
      sessionCount: 1,
      roundCount: 3,
    });

    expect((await loadStreak()).currentStreak).toBe(1);
    const play = await loadPlayStats();
    expect(play.totalSessions).toBe(1);
    expect(play.totalRounds).toBe(3);
    // 累計ゲーム時間（パッチ視認時間）が加算される。
    expect(play.totalPlaySec).toBe(300);
  });

  it('クリア 0 件のセッションは到達レベルを上げないが sessionCount/累計は増える', async () => {
    const res = await recordCompletedSession(
      input({
        sessionId: 's2',
        clearCount: 0,
        failCount: 2,
        roundCount: 2,
        highestClearedLevel: 0,
        clearedLevelParams: [],
      }),
    );
    expect(res.dailyStats.highestLevelReached).toBe(0);
    expect(res.dailyStats.sessionCount).toBe(1);
    expect(res.dailyStats.roundCount).toBe(2);
    expect(res.playStats.totalSessions).toBe(1);
  });

  it('同日複数セッションで highestLevelReached=max・sessionCount/roundCount 累積', async () => {
    await recordCompletedSession(input({ sessionId: 's1', highestClearedLevel: 6, roundCount: 3 }));
    const res = await recordCompletedSession(
      input({ sessionId: 's2', highestClearedLevel: 10, roundCount: 4 }),
    );
    expect(res.dailyStats.highestLevelReached).toBe(10);
    expect(res.dailyStats.sessionCount).toBe(2);
    expect(res.dailyStats.roundCount).toBe(7);
    expect(res.playStats.totalSessions).toBe(2);
    expect(res.playStats.totalRounds).toBe(7);
  });

  it('翌日プレイで連続日数が伸びる', async () => {
    await recordCompletedSession(
      input({ sessionId: 's1', now: new Date('2026-06-09T10:00:00.000Z') }),
    );
    const res = await recordCompletedSession(
      input({ sessionId: 's2', now: new Date('2026-06-10T10:00:00.000Z') }),
    );
    expect(res.streak.currentStreak).toBe(2);
  });
});

describe('recordCompletedSession — バッジ付与（§6.4 配線）', () => {
  it('初回完了で B-01 を獲得・永続化する', async () => {
    const res = await recordCompletedSession(input());
    expect(res.newlyEarnedBadges).toContain('B-01');
    const persisted = await loadAllBadgeStatuses();
    expect(persisted.find((b) => b.badgeId === 'B-01')?.earned).toBe(true);
  });

  it('振動レベルをクリアしたラウンドがあると B-06 を獲得する（高難度=各クリアラウンドの levelParams）', async () => {
    const res = await recordCompletedSession(
      input({
        clearedLevelParams: [
          { repeat: 1, seconds: 40, direction: 'oscillate', gridSize: 3, rotationSpeed: 6 },
        ],
        highestLevel: 5,
      }),
    );
    expect(res.newlyEarnedBadges).toContain('B-06');
  });

  it('クリア 0 件なら高難度バッジ（B-06）は獲得しない', async () => {
    const res = await recordCompletedSession(
      input({ clearCount: 0, failCount: 2, roundCount: 2, clearedLevelParams: [], highestLevel: 5 }),
    );
    expect(res.newlyEarnedBadges).not.toContain('B-06');
  });

  it('最高到達レベル 10 で B-09 を獲得する（高レベル=highestLevel）', async () => {
    const res = await recordCompletedSession(input({ highestLevel: 10 }));
    expect(res.newlyEarnedBadges).toContain('B-09');
  });

  it('既獲得バッジは二重保存せず newlyEarned に出ない', async () => {
    await recordCompletedSession(input({ sessionId: 's1' }));
    const res = await recordCompletedSession(input({ sessionId: 's2' }));
    expect(res.newlyEarnedBadges).not.toContain('B-01');
  });
});
