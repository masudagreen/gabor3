/**
 * courseSession — F-05 全ゲーム連続コース 純関数テスト。
 */
import {
  COURSE_TIMING,
  advanceFromCooldown,
  advanceFromDistanceReminder,
  advanceFromInterstitial,
  buildCourseGames,
  completeGameWithResult,
  currentGameIndex,
  estimateCourseDurationSec,
  nextGameLabel,
  shuffleByDateSeed,
  startCourseSession,
} from '../../../src/lib/v11/courseSession';
import { GAME_REGISTRY } from '../../../src/state/gameRegistry';
import { GameSessionResultV11 } from '../../../src/state/storage-v11';

const FIXED_NOW = '2026-04-30T08:00:00.000Z';

function mkResult(gameId: GameSessionResultV11['gameId']): GameSessionResultV11 {
  return { gameId, threshold: 5.0, isCorrect: true };
}

describe('courseSession: buildCourseGames', () => {
  it('registry-order：order 昇順で 9 ゲーム返す（v1.1.4：G-09/10/11/12 disabled）', () => {
    const games = buildCourseGames('registry-order');
    expect(games.length).toBe(9);
    for (let i = 0; i < games.length - 1; i++) {
      expect(games[i].order).toBeLessThan(games[i + 1].order);
    }
  });

  it('releaseEnabled=true のゲームのみ含む', () => {
    const games = buildCourseGames('registry-order');
    for (const g of games) expect(g.releaseEnabled).toBe(true);
  });

  it('date-seeded-random：同じ seed なら同じ順序（決定論）', () => {
    const a = buildCourseGames('date-seeded-random', '2026-04-30');
    const b = buildCourseGames('date-seeded-random', '2026-04-30');
    expect(a.map((g) => g.gameId)).toEqual(b.map((g) => g.gameId));
  });

  it('date-seeded-random：seed が違えば順序が変わりうる', () => {
    const a = buildCourseGames('date-seeded-random', '2026-04-30');
    const b = buildCourseGames('date-seeded-random', '2026-05-30');
    // 13 件全部同じ順序になる確率は天文学的に低いので、少なくとも 1 つは違う
    const sameOrder = a.every((g, i) => g.gameId === b[i].gameId);
    expect(sameOrder).toBe(false);
  });

  it('date-seeded-random：内容（gameId 集合）は releaseEnabled 集合と一致', () => {
    const a = buildCourseGames('date-seeded-random', 'seed-1');
    const ids = new Set(a.map((g) => g.gameId));
    const enabled = GAME_REGISTRY.filter((g) => g.releaseEnabled);
    expect(ids.size).toBe(enabled.length);
    for (const g of enabled) {
      expect(ids.has(g.gameId)).toBe(true);
    }
  });
});

describe('courseSession: shuffleByDateSeed', () => {
  it('決定論：同じ seed なら同じ並び', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const a = shuffleByDateSeed(arr, 'abc');
    const b = shuffleByDateSeed(arr, 'abc');
    expect(a).toEqual(b);
  });

  it('元配列を破壊しない', () => {
    const arr = [1, 2, 3];
    shuffleByDateSeed(arr, 'x');
    expect(arr).toEqual([1, 2, 3]);
  });

  it('要素は同じ（permutation）', () => {
    const arr = [1, 2, 3, 4, 5];
    const out = shuffleByDateSeed(arr, 'foo').sort((a, b) => a - b);
    expect(out).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('courseSession: 状態遷移', () => {
  it('startCourseSession で phase = distance-reminder（v1.1.4：9 ゲーム）', () => {
    const s = startCourseSession({ sessionId: 'S1', startedAt: FIXED_NOW });
    expect(s.phase.kind).toBe('distance-reminder');
    expect(s.results).toEqual([]);
    expect(s.games.length).toBe(9);
  });

  it('distance-reminder → game(0)', () => {
    const s0 = startCourseSession({ sessionId: 'S1', startedAt: FIXED_NOW });
    const s1 = advanceFromDistanceReminder(s0);
    expect(s1.phase.kind).toBe('game');
    if (s1.phase.kind === 'game') {
      expect(s1.phase.index).toBe(0);
      expect(s1.phase.gameId).toBe(s0.games[0].gameId);
    }
  });

  it('game(0) → 結果記録 → interstitial(0, isFinalGame=false)', () => {
    let s = startCourseSession({ sessionId: 'S1', startedAt: FIXED_NOW });
    s = advanceFromDistanceReminder(s);
    const result = mkResult(s.games[0].gameId);
    const s2 = completeGameWithResult(s, result);
    expect(s2.phase.kind).toBe('interstitial');
    if (s2.phase.kind === 'interstitial') {
      expect(s2.phase.index).toBe(0);
      expect(s2.phase.isFinalGame).toBe(false);
    }
    expect(s2.results.length).toBe(1);
    expect(s2.results[0]).toEqual(result);
  });

  it('interstitial(0) → game(1)', () => {
    let s = startCourseSession({ sessionId: 'S1', startedAt: FIXED_NOW });
    s = advanceFromDistanceReminder(s);
    s = completeGameWithResult(s, mkResult(s.games[0].gameId));
    s = advanceFromInterstitial(s);
    expect(s.phase.kind).toBe('game');
    if (s.phase.kind === 'game') {
      expect(s.phase.index).toBe(1);
      expect(s.phase.gameId).toBe(s.games[1].gameId);
    }
  });

  it('最終ゲーム interstitial → cooldown', () => {
    let s = startCourseSession({ sessionId: 'S1', startedAt: FIXED_NOW });
    s = advanceFromDistanceReminder(s);
    for (let i = 0; i < s.games.length; i++) {
      s = completeGameWithResult(s, mkResult(s.games[i].gameId));
      if (i < s.games.length - 1) {
        s = advanceFromInterstitial(s);
      }
    }
    // 最終 interstitial で isFinalGame=true
    expect(s.phase.kind).toBe('interstitial');
    if (s.phase.kind === 'interstitial') {
      expect(s.phase.isFinalGame).toBe(true);
    }
    s = advanceFromInterstitial(s);
    expect(s.phase.kind).toBe('cooldown');
  });

  it('cooldown → complete', () => {
    let s = startCourseSession({ sessionId: 'S1', startedAt: FIXED_NOW });
    s = advanceFromDistanceReminder(s);
    for (let i = 0; i < s.games.length; i++) {
      s = completeGameWithResult(s, mkResult(s.games[i].gameId));
      s = advanceFromInterstitial(s);
    }
    expect(s.phase.kind).toBe('cooldown');
    s = advanceFromCooldown(s);
    expect(s.phase.kind).toBe('complete');
  });

  it('全 9 ゲーム結果が results に蓄積される（v1.1.4）', () => {
    let s = startCourseSession({ sessionId: 'S1', startedAt: FIXED_NOW });
    s = advanceFromDistanceReminder(s);
    for (let i = 0; i < s.games.length; i++) {
      s = completeGameWithResult(s, mkResult(s.games[i].gameId));
      s = advanceFromInterstitial(s);
    }
    s = advanceFromCooldown(s);
    expect(s.results.length).toBe(9);
    const ids = s.results.map((r) => r.gameId);
    expect(new Set(ids).size).toBe(9);
  });

  it('phase 違いの advance は no-op（不正遷移防止）', () => {
    let s = startCourseSession({ sessionId: 'S1', startedAt: FIXED_NOW });
    // distance-reminder で advanceFromInterstitial → no-op
    const s2 = advanceFromInterstitial(s);
    expect(s2).toBe(s);
    // distance-reminder で completeGameWithResult → no-op
    const s3 = completeGameWithResult(s, mkResult('G-01'));
    expect(s3).toBe(s);
  });

  it('currentGameIndex は game/interstitial 時のみ', () => {
    let s = startCourseSession({ sessionId: 'S1', startedAt: FIXED_NOW });
    expect(currentGameIndex(s)).toBeNull();
    s = advanceFromDistanceReminder(s);
    expect(currentGameIndex(s)).toBe(0);
    s = completeGameWithResult(s, mkResult(s.games[0].gameId));
    expect(currentGameIndex(s)).toBe(0);
    s = advanceFromInterstitial(s);
    expect(currentGameIndex(s)).toBe(1);
  });

  it('nextGameLabel：interstitial で次ゲーム名が出る、最終では null', () => {
    let s = startCourseSession({ sessionId: 'S1', startedAt: FIXED_NOW });
    s = advanceFromDistanceReminder(s);
    s = completeGameWithResult(s, mkResult(s.games[0].gameId));
    const lbl = nextGameLabel(s);
    expect(lbl).toBe(`${s.games[1].gameId} ${s.games[1].nameJa}`);

    // 最終まで進める
    let cur = s;
    for (let i = 1; i < cur.games.length; i++) {
      cur = advanceFromInterstitial(cur);
      cur = completeGameWithResult(cur, mkResult(cur.games[i].gameId));
    }
    expect(cur.phase.kind).toBe('interstitial');
    expect(nextGameLabel(cur)).toBeNull();
  });
});

describe('courseSession: 所要時間', () => {
  it('estimateCourseDurationSec(13)：3 + 13×60 + 13×10 + 10 = 923 秒', () => {
    expect(estimateCourseDurationSec(13)).toBe(923);
  });

  it('estimateCourseDurationSec(7)：縮小時もちゃんと計算できる', () => {
    expect(estimateCourseDurationSec(7)).toBe(
      COURSE_TIMING.distanceReminderSec +
        7 * 60 +
        7 * 10 +
        COURSE_TIMING.cooldownSec,
    );
  });

  it('estimateCourseDurationSec(0)：ゲーム 0 件なら 0 秒', () => {
    expect(estimateCourseDurationSec(0)).toBe(0);
  });
});
