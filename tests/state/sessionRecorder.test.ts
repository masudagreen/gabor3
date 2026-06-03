/**
 * sessionRecorder.test.ts — 完了セッションの SessionRecord 組み立て・永続化（F-04 / §6.4）。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buildSessionRecord,
  persistCompletedSession,
  paramsSnapshotOf,
} from '../../src/state/sessionRecorder';
import { loadSession } from '../../src/state/repository';
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

function rs(over: Partial<RoundScore>): RoundScore {
  return {
    changingPatchCount: 2,
    staticPatchCount: 7,
    tpCount: 2,
    fpCount: 0,
    fnCount: 0,
    roundScore: 2,
    ...over,
  };
}

describe('paramsSnapshotOf', () => {
  it('GameConfig を ParamsSnapshot（§6.4）へマップする', () => {
    expect(paramsSnapshotOf(CONFIG)).toEqual({
      n: 4,
      m: 20,
      r: 2,
      a: 6,
      b: 0.15,
      scoringMode: 'auto-confirm',
    });
  });
});

describe('buildSessionRecord', () => {
  it('RoundRecord 配列・sessionScore・paramsSnapshot を組み立てる', () => {
    const record = buildSessionRecord({
      sessionId: 'sess-1',
      startedAt: '2026-05-30T10:00:00.000Z',
      completedAt: '2026-05-30T10:03:00.000Z',
      config: CONFIG,
      roundScores: [rs({}), rs({})],
    });
    expect(record.sessionId).toBe('sess-1');
    expect(record.completedAt).not.toBeNull();
    expect(record.rounds).toHaveLength(2);
    expect(record.rounds[0].roundIndex).toBe(1);
    expect(record.rounds[1].roundIndex).toBe(2);
    expect(record.sessionScore).toBe(100);
    expect(record.paramsSnapshot.n).toBe(4);
  });

  it('FP を含むセッションはスコアが下がる', () => {
    const record = buildSessionRecord({
      sessionId: 'sess-2',
      startedAt: '2026-05-30T10:00:00.000Z',
      completedAt: '2026-05-30T10:03:00.000Z',
      config: CONFIG,
      roundScores: [rs({ fpCount: 7, roundScore: -5 })],
    });
    expect(record.sessionScore).toBeLessThan(100);
  });
});

describe('persistCompletedSession', () => {
  it('SessionRecord を永続化し再読込できる', async () => {
    await persistCompletedSession({
      sessionId: 'sess-3',
      startedAt: '2026-05-30T10:00:00.000Z',
      completedAt: '2026-05-30T10:03:00.000Z',
      config: CONFIG,
      roundScores: [rs({})],
    });
    const loaded = await loadSession('sess-3');
    expect(loaded).not.toBeNull();
    expect(loaded!.sessionId).toBe('sess-3');
    expect(loaded!.completedAt).toBe('2026-05-30T10:03:00.000Z');
    expect(loaded!.rounds).toHaveLength(1);
  });
});
