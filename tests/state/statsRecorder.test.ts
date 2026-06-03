/**
 * statsRecorder.test.ts — 完了セッションの永続化 + 日次/ストリーク/累計更新の配線
 * （spec F-04 / §6.4〜§6.7）。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { recordCompletedSession } from '../../src/state/statsRecorder';
import {
  loadSession,
  loadDailyStats,
  loadStreak,
  loadPlayStats,
} from '../../src/state/repository';
import type { GameConfig } from '../../src/lib/v2/gameMachine';
import type { RoundScore } from '../../src/lib/v2/scoring';

beforeEach(async () => {
  await AsyncStorage.clear();
});

const CONFIG: GameConfig = {
  gridSize: 4,
  roundSeconds: 20,
  roundCount: 2,
  rotationSpeed: 6,
  sfChangeSpeed: 0.15,
  scoringMode: 'auto-confirm',
};

/** 満点ラウンド（TP=2/FP=0）。 */
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

/** 低スコアラウンド（誤選択多め）。 */
function poorRound(): RoundScore {
  return {
    changingPatchCount: 2,
    staticPatchCount: 7,
    tpCount: 0,
    fpCount: 7,
    fnCount: 2,
    roundScore: -7,
  };
}

describe('recordCompletedSession — 永続化と集計', () => {
  it('完了セッションを保存し DailyStats/Streak/PlayStats を初期化する', async () => {
    const now = new Date(2026, 4, 30, 10, 0, 0); // 2026-05-30 ローカル
    const result = await recordCompletedSession({
      sessionId: 's1',
      startedAt: '2026-05-30T01:00:00.000Z',
      config: CONFIG,
      roundScores: [perfectRound(), perfectRound()],
      now,
    });

    expect(result.session.sessionScore).toBe(100);

    const session = await loadSession('s1');
    expect(session).not.toBeNull();
    expect(session!.completedAt).not.toBeNull();

    const daily = await loadDailyStats('2026-05-30');
    expect(daily).toEqual({
      date: '2026-05-30',
      bestSessionScore: 100,
      sessionCount: 1,
    });

    const streak = await loadStreak();
    expect(streak.currentStreak).toBe(1);
    expect(streak.lastPlayedDate).toBe('2026-05-30');

    const play = await loadPlayStats();
    expect(play.totalSessions).toBe(1);
  });

  it('同日 2 セッション目は DailyStats max を更新し件数 +1、累計 +1、連続据え置き', async () => {
    const now = new Date(2026, 4, 30, 10, 0, 0);
    await recordCompletedSession({
      sessionId: 's1',
      startedAt: '2026-05-30T01:00:00.000Z',
      config: CONFIG,
      roundScores: [poorRound(), poorRound()], // 低スコア
      now,
    });
    await recordCompletedSession({
      sessionId: 's2',
      startedAt: '2026-05-30T02:00:00.000Z',
      config: CONFIG,
      roundScores: [perfectRound(), perfectRound()], // 満点
      now: new Date(2026, 4, 30, 11, 0, 0),
    });

    const daily = await loadDailyStats('2026-05-30');
    expect(daily!.bestSessionScore).toBe(100); // max
    expect(daily!.sessionCount).toBe(2);

    const play = await loadPlayStats();
    expect(play.totalSessions).toBe(2);

    const streak = await loadStreak();
    expect(streak.currentStreak).toBe(1); // 同日のため据え置き
  });

  it('翌日プレイで連続日数が +1 になる', async () => {
    await recordCompletedSession({
      sessionId: 's1',
      startedAt: '2026-05-30T01:00:00.000Z',
      config: CONFIG,
      roundScores: [perfectRound()],
      now: new Date(2026, 4, 30, 10, 0, 0),
    });
    await recordCompletedSession({
      sessionId: 's2',
      startedAt: '2026-05-31T01:00:00.000Z',
      config: CONFIG,
      roundScores: [perfectRound()],
      now: new Date(2026, 4, 31, 10, 0, 0),
    });

    const streak = await loadStreak();
    expect(streak.currentStreak).toBe(2);
    expect(streak.lastPlayedDate).toBe('2026-05-31');
  });
});
