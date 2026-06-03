/**
 * badgeRecorder.test.ts — バッジ付与の永続化配線（spec §5.4 / §6.8）。
 *
 * recordCompletedSession 経由でバッジが付与・保存され、二重獲得しないこと、
 * B-11 が高スコア累計 5 回目で付与されることを検証する。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { recordCompletedSession } from '../../src/state/statsRecorder';
import {
  recordBadgesForSession,
  countHighScoreSessions,
} from '../../src/state/badgeRecorder';
import {
  loadAllBadgeStatuses,
  loadBadgeStatus,
} from '../../src/state/repository';
import type { GameConfig } from '../../src/lib/v2/gameMachine';
import type { RoundScore } from '../../src/lib/v2/scoring';
import type { SessionRecord } from '../../src/state/schema';

beforeEach(async () => {
  await AsyncStorage.clear();
});

const CONFIG: GameConfig = {
  gridSize: 4,
  roundSeconds: 20,
  roundCount: 1,
  rotationSpeed: 6,
  sfChangeSpeed: 0.15,
  scoringMode: 'auto-confirm',
};

const SLOW_CONFIG: GameConfig = { ...CONFIG, rotationSpeed: 3, sfChangeSpeed: 0.1 };

function perfectRound(): RoundScore {
  return {
    changingPatchCount: 2,
    staticPatchCount: 7,
    tpCount: 2,
    fpCount: 0,
    fnCount: 0,
    roundScore: 2,
  };
}

function zeroRound(): RoundScore {
  return {
    changingPatchCount: 2,
    staticPatchCount: 7,
    tpCount: 0,
    fpCount: 0,
    fnCount: 2,
    roundScore: 0,
  };
}

let counter = 0;
function recordPerfect(config: GameConfig = CONFIG, now = new Date('2026-05-30T10:00:00Z')) {
  counter += 1;
  return recordCompletedSession({
    sessionId: `s-${counter}`,
    startedAt: now.toISOString(),
    config,
    roundScores: [perfectRound()],
    now,
  });
}

describe('countHighScoreSessions', () => {
  it('スコア 80 以上の完了セッションのみを数える', () => {
    const sessions: SessionRecord[] = [
      { sessionId: 'a', startedAt: '', completedAt: 'x', paramsSnapshot: { n: 4, m: 20, r: 1, a: 6, b: 0.15, scoringMode: 'auto-confirm' }, rounds: [], sessionScore: 100 },
      { sessionId: 'b', startedAt: '', completedAt: 'x', paramsSnapshot: { n: 4, m: 20, r: 1, a: 6, b: 0.15, scoringMode: 'auto-confirm' }, rounds: [], sessionScore: 79 },
      { sessionId: 'c', startedAt: '', completedAt: null, paramsSnapshot: { n: 4, m: 20, r: 1, a: 6, b: 0.15, scoringMode: 'auto-confirm' }, rounds: [], sessionScore: 100 },
      { sessionId: 'd', startedAt: '', completedAt: 'x', paramsSnapshot: { n: 4, m: 20, r: 1, a: 6, b: 0.15, scoringMode: 'auto-confirm' }, rounds: [], sessionScore: 80 },
    ];
    expect(countHighScoreSessions(sessions)).toBe(2); // a, d
  });
});

describe('recordCompletedSession のバッジ配線', () => {
  it('初回満点セッションで B-01/B-09/B-10 を付与し保存する', async () => {
    const result = await recordPerfect();
    expect(result.newlyEarnedBadges).toEqual(
      expect.arrayContaining(['B-01', 'B-09', 'B-10']),
    );

    const stored = await loadAllBadgeStatuses();
    const earnedIds = stored.filter((s) => s.earned).map((s) => s.badgeId).sort();
    expect(earnedIds).toEqual(expect.arrayContaining(['B-01', 'B-09', 'B-10']));

    const b01 = await loadBadgeStatus('B-01');
    expect(b01.earned).toBe(true);
    expect(b01.earnedAt).not.toBeNull();
  });

  it('遅い設定 + 全問正答で B-06/B-07/B-08 も付与する', async () => {
    const result = await recordPerfect(SLOW_CONFIG);
    expect(result.newlyEarnedBadges).toEqual(
      expect.arrayContaining(['B-06', 'B-07', 'B-08']),
    );
  });

  it('B-01 は 2 回目以降は新規獲得に含まれない（二重獲得しない）', async () => {
    const r1 = await recordPerfect(CONFIG, new Date('2026-05-30T10:00:00Z'));
    expect(r1.newlyEarnedBadges).toContain('B-01');
    const at1 = (await loadBadgeStatus('B-01')).earnedAt;

    // 翌日完了 → B-01 は再付与されない、earnedAt も保持
    const r2 = await recordPerfect(CONFIG, new Date('2026-05-31T10:00:00Z'));
    expect(r2.newlyEarnedBadges).not.toContain('B-01');
    const at2 = (await loadBadgeStatus('B-01')).earnedAt;
    expect(at2).toBe(at1);
  });

  it('スコア 80 以上を 5 セッション達成すると B-11 を付与する', async () => {
    // 同日に複数完了でも累計セッション数は増える（DailyStats は max、PlayStats は累計）
    let lastResult = null as Awaited<ReturnType<typeof recordPerfect>> | null;
    for (let i = 0; i < 5; i++) {
      lastResult = await recordPerfect(
        CONFIG,
        new Date(`2026-06-0${i + 1}T10:00:00Z`),
      );
    }
    expect(lastResult?.newlyEarnedBadges).toContain('B-11');
    expect((await loadBadgeStatus('B-11')).earned).toBe(true);
  });

  it('4 セッション目までは B-11 を付与しない', async () => {
    let lastResult = null as Awaited<ReturnType<typeof recordPerfect>> | null;
    for (let i = 0; i < 4; i++) {
      lastResult = await recordPerfect(
        CONFIG,
        new Date(`2026-06-0${i + 1}T10:00:00Z`),
      );
    }
    expect(lastResult?.newlyEarnedBadges).not.toContain('B-11');
    expect((await loadBadgeStatus('B-11')).earned).toBe(false);
  });

  it('低スコアセッションでは高スコアバッジを付与しない（B-01 のみ）', async () => {
    counter += 1;
    const result = await recordCompletedSession({
      sessionId: `s-${counter}`,
      startedAt: '2026-05-30T10:00:00Z',
      config: CONFIG,
      roundScores: [zeroRound()],
      now: new Date('2026-05-30T10:00:00Z'),
    });
    expect(result.newlyEarnedBadges).toContain('B-01');
    expect(result.newlyEarnedBadges).not.toContain('B-09');
    expect(result.newlyEarnedBadges).not.toContain('B-10');
  });
});

describe('recordBadgesForSession 直接呼び出し', () => {
  it('連続 3 日で B-02 を付与する', async () => {
    const session: SessionRecord = {
      sessionId: 'x',
      startedAt: '',
      completedAt: 'x',
      paramsSnapshot: { n: 4, m: 20, r: 1, a: 6, b: 0.15, scoringMode: 'auto-confirm' },
      rounds: [{ roundIndex: 1, changingPatchCount: 2, tpCount: 2, fpCount: 0, fnCount: 0, roundScore: 2 }],
      sessionScore: 100,
    };
    const result = await recordBadgesForSession({
      session,
      currentStreak: 3,
      now: new Date('2026-05-30T10:00:00Z'),
    });
    expect(result.newlyEarned).toContain('B-02');
  });
});
