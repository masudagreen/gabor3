/**
 * sessionFlow.test.ts — v3.1 セッションフロー I/O 配線（§4.4 / §4.6 / F-04 / F-07 / F-08）。
 *
 * - resolveCompletedRound：ラウンドごとに LevelState を永続化（再起動跨ぎの連続失敗保持＝F-04）。
 * - finalizeSession：SessionRecord・DailyStats・Streak・PlayStats を永続化（§7.4-7.7）。
 * - abortSession：完了済みラウンドありなら記録、0 件なら未記録（AS-30 / F-07）。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  resolveCompletedRound,
  finalizeSession,
  abortSession,
} from '../../../src/state/v3/sessionFlow';
import { startSession, completeRound } from '../../../src/lib/v3/sessionMachine';
import {
  loadLevelState,
  loadAllSessionRecords,
  loadPlayStats,
  loadDailyStats,
} from '../../../src/state/v3/repository';
import { localDateString } from '../../../src/lib/v2/dateUtil';
import type { LevelState } from '../../../src/lib/v3/level';

const NOW = new Date('2026-06-10T00:05:00.000Z');

const L = (
  currentLevel: number,
  consecutiveFailures = 0,
  highestLevel = 0,
): LevelState => ({ currentLevel, consecutiveFailures, highestLevel });

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('resolveCompletedRound（ラウンドごとに LevelState 永続化、F-04）', () => {
  it('クリアで +1 し、永続化された LevelState が再 load で保持される', async () => {
    const s0 = startSession(L(7, 0, 6), 5);
    const out = await resolveCompletedRound({
      session: s0,
      result: 'clear',
      roundPlaySec: 20,
    });
    expect(out.levelDelta).toBe(1);
    expect(out.session.levelState.currentLevel).toBe(8);
    expect(out.shouldContinue).toBe(true);
    // 「再起動」相当：永続化から読み直すと L8/連続失敗 0 が保持される。
    expect(await loadLevelState()).toEqual(out.session.levelState);
  });

  it('連続失敗が再 load 跨ぎで保持され、2 連続失敗でレベル −1（F-04）', async () => {
    const s0 = startSession(L(7, 0, 6), 5);
    const r1 = await resolveCompletedRound({ session: s0, result: 'fail', roundPlaySec: 20 });
    expect((await loadLevelState()).consecutiveFailures).toBe(1);

    const r2 = await resolveCompletedRound({
      session: r1.session,
      result: 'fail',
      roundPlaySec: 20,
    });
    expect(r2.levelDelta).toBe(-1);
    expect((await loadLevelState()).currentLevel).toBe(6);
    expect((await loadLevelState()).consecutiveFailures).toBe(0);
  });
});

describe('finalizeSession（§7.4-7.7 記録、F-08）', () => {
  it('セッション末に SessionRecord・日次・累計を永続化する', async () => {
    let s = startSession(L(7, 0, 6), 5);
    s = completeRound(s, 'clear', 30).session; // L8
    s = completeRound(s, 'fail', 30).session; // 連続失敗 1
    // 永続化されているとは限らないので明示的に finalize する。
    const rec = await finalizeSession({
      session: s,
      sessionId: 's1',
      startedAt: '2026-06-10T00:00:00.000Z',
      now: NOW,
    });

    expect(rec.session.roundCount).toBe(2);
    expect(rec.session.clearCount).toBe(1);
    expect(rec.session.failCount).toBe(1);
    expect(rec.session.startLevel).toBe(7);
    expect(rec.session.endLevel).toBe(s.levelState.currentLevel);

    expect(await loadAllSessionRecords()).toHaveLength(1);
    const daily = await loadDailyStats(localDateString(NOW));
    expect(daily?.sessionCount).toBe(1);
    expect(daily?.roundCount).toBe(2);
    expect(daily?.highestLevelReached).toBe(7); // クリアした最高レベル（L7 をクリア）
    const play = await loadPlayStats();
    expect(play.totalSessions).toBe(1);
    expect(play.totalRounds).toBe(2);
  });
});

describe('abortSession（F-07 / AS-30）', () => {
  it('完了済みラウンド 0 件 → 記録しない（null・SessionRecord なし）', async () => {
    const s = startSession(L(7), 5);
    const result = await abortSession({
      session: s,
      sessionId: 's1',
      startedAt: '2026-06-10T00:00:00.000Z',
      now: NOW,
    });
    expect(result).toBeNull();
    expect(await loadAllSessionRecords()).toHaveLength(0);
  });

  it('完了済みラウンド 1 件以上 → その時点までを記録する', async () => {
    const s = completeRound(startSession(L(7, 0, 6), 5), 'clear', 20).session;
    const result = await abortSession({
      session: s,
      sessionId: 's1',
      startedAt: '2026-06-10T00:00:00.000Z',
      now: NOW,
    });
    expect(result).not.toBeNull();
    expect(result!.session.roundCount).toBe(1);
    expect(await loadAllSessionRecords()).toHaveLength(1);
  });
});
