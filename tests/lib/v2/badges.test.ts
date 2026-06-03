/**
 * badges.test.ts — バッジ付与判定の単体テスト（spec §5 / screens.md S8）。
 *
 * B-01〜B-11 の各獲得境界、未獲得継続、二重獲得しない（earnedAt 保持）、
 * 複数同時獲得、B-11 の累計境界・残り回数を網羅する。
 */

import {
  evaluateBadges,
  meetsBadgeCondition,
  isSessionPerfectClear,
  remainingForStableHighScore,
  type BadgeContext,
} from '../../../src/lib/v2/badges';
import {
  defaultBadgeStatus,
  BADGE_IDS,
  type BadgeId,
  type BadgeStatus,
  type SessionRecord,
  type ParamsSnapshot,
  type RoundRecord,
} from '../../../src/state/schema';

const NOW = new Date('2026-05-30T10:00:00.000Z');

function snapshot(over: Partial<ParamsSnapshot> = {}): ParamsSnapshot {
  return {
    n: 4,
    m: 20,
    r: 2,
    a: 6,
    b: 0.15,
    scoringMode: 'auto-confirm',
    ...over,
  };
}

function round(over: Partial<RoundRecord> = {}): RoundRecord {
  return {
    roundIndex: 1,
    changingPatchCount: 2,
    tpCount: 2,
    fpCount: 0,
    fnCount: 0,
    roundScore: 2,
    ...over,
  };
}

function session(over: Partial<SessionRecord> = {}): SessionRecord {
  return {
    sessionId: 's1',
    startedAt: '2026-05-30T09:59:00.000Z',
    completedAt: NOW.toISOString(),
    paramsSnapshot: snapshot(),
    rounds: [round({ roundIndex: 1 }), round({ roundIndex: 2 })],
    sessionScore: 100,
    ...over,
  };
}

function ctx(over: Partial<BadgeContext> = {}): BadgeContext {
  return {
    session: session(),
    currentStreak: 1,
    highScoreSessionCount: 1,
    now: NOW,
    ...over,
  };
}

function allUnearned(): BadgeStatus[] {
  return BADGE_IDS.map((id) => defaultBadgeStatus(id));
}

describe('isSessionPerfectClear', () => {
  it('変化パッチ全正答 & 誤選択ゼロ & 選び逃しゼロで true', () => {
    expect(isSessionPerfectClear(session())).toBe(true);
  });

  it('選び逃し（FN>0）があると false', () => {
    const s = session({
      rounds: [round({ tpCount: 1, fnCount: 1 })],
    });
    expect(isSessionPerfectClear(s)).toBe(false);
  });

  it('誤選択（FP>0）があると false', () => {
    const s = session({ rounds: [round({ fpCount: 1 })] });
    expect(isSessionPerfectClear(s)).toBe(false);
  });

  it('変化パッチが 1 つも無いと false', () => {
    const s = session({
      rounds: [round({ changingPatchCount: 0, tpCount: 0, fnCount: 0 })],
    });
    expect(isSessionPerfectClear(s)).toBe(false);
  });
});

describe('B-01〜B-05 継続日数軸の境界', () => {
  const cases: Array<{ id: BadgeId; pass: number; fail: number }> = [
    { id: 'B-01', pass: 1, fail: 0 },
    { id: 'B-02', pass: 3, fail: 2 },
    { id: 'B-03', pass: 7, fail: 6 },
    { id: 'B-04', pass: 14, fail: 13 },
    { id: 'B-05', pass: 30, fail: 29 },
  ];

  for (const c of cases) {
    it(`${c.id}：連続 ${c.pass} 日で獲得、${c.fail} 日では未獲得`, () => {
      expect(meetsBadgeCondition(c.id, ctx({ currentStreak: c.pass }))).toBe(
        true,
      );
      expect(meetsBadgeCondition(c.id, ctx({ currentStreak: c.fail }))).toBe(
        false,
      );
    });
  }

  it('連続日数が閾値を超えても獲得（>=）', () => {
    expect(meetsBadgeCondition('B-03', ctx({ currentStreak: 10 }))).toBe(true);
  });
});

describe('B-06 スロー回転ハンター（a≤3 & 全問正答）', () => {
  it('a=3 かつ全問正答で獲得', () => {
    const c = ctx({ session: session({ paramsSnapshot: snapshot({ a: 3 }) }) });
    expect(meetsBadgeCondition('B-06', c)).toBe(true);
  });

  it('a=4（速い）では未獲得', () => {
    const c = ctx({ session: session({ paramsSnapshot: snapshot({ a: 4 }) }) });
    expect(meetsBadgeCondition('B-06', c)).toBe(false);
  });

  it('a≤3 でも全問正答でない（FN あり）と未獲得', () => {
    const c = ctx({
      session: session({
        paramsSnapshot: snapshot({ a: 2 }),
        rounds: [round({ tpCount: 1, fnCount: 1 })],
      }),
    });
    expect(meetsBadgeCondition('B-06', c)).toBe(false);
  });
});

describe('B-07 微差を見抜く目（b≤0.10 & 全問正答）', () => {
  it('b=0.10 かつ全問正答で獲得', () => {
    const c = ctx({
      session: session({ paramsSnapshot: snapshot({ b: 0.1 }) }),
    });
    expect(meetsBadgeCondition('B-07', c)).toBe(true);
  });

  it('b=0.15（大きい）では未獲得', () => {
    const c = ctx({
      session: session({ paramsSnapshot: snapshot({ b: 0.15 }) }),
    });
    expect(meetsBadgeCondition('B-07', c)).toBe(false);
  });

  it('b≤0.10 でも全問正答でない（FP あり）と未獲得', () => {
    const c = ctx({
      session: session({
        paramsSnapshot: snapshot({ b: 0.05 }),
        rounds: [round({ fpCount: 1 })],
      }),
    });
    expect(meetsBadgeCondition('B-07', c)).toBe(false);
  });
});

describe('B-08 達人の眼（a≤3 & b≤0.10 & スコア≥80）', () => {
  it('a=3, b=0.10, score=80 で獲得', () => {
    const c = ctx({
      session: session({
        paramsSnapshot: snapshot({ a: 3, b: 0.1 }),
        sessionScore: 80,
      }),
    });
    expect(meetsBadgeCondition('B-08', c)).toBe(true);
  });

  it('a だけ難（b 大）では未獲得', () => {
    const c = ctx({
      session: session({
        paramsSnapshot: snapshot({ a: 3, b: 0.2 }),
        sessionScore: 100,
      }),
    });
    expect(meetsBadgeCondition('B-08', c)).toBe(false);
  });

  it('最難設定でもスコア 79 では未獲得', () => {
    const c = ctx({
      session: session({
        paramsSnapshot: snapshot({ a: 2, b: 0.05 }),
        sessionScore: 79,
      }),
    });
    expect(meetsBadgeCondition('B-08', c)).toBe(false);
  });

  it('B-08 は全問正答でなくても高スコアなら獲得しうる', () => {
    const c = ctx({
      session: session({
        paramsSnapshot: snapshot({ a: 2, b: 0.05 }),
        rounds: [round({ tpCount: 1, fnCount: 1 })],
        sessionScore: 85,
      }),
    });
    expect(meetsBadgeCondition('B-08', c)).toBe(true);
  });
});

describe('B-09 / B-10 高スコア軸の境界', () => {
  it('B-09：score=80 で獲得、79 では未獲得', () => {
    expect(
      meetsBadgeCondition('B-09', ctx({ session: session({ sessionScore: 80 }) })),
    ).toBe(true);
    expect(
      meetsBadgeCondition('B-09', ctx({ session: session({ sessionScore: 79 }) })),
    ).toBe(false);
  });

  it('B-10：score=100 で獲得、99 では未獲得', () => {
    expect(
      meetsBadgeCondition(
        'B-10',
        ctx({ session: session({ sessionScore: 100 }) }),
      ),
    ).toBe(true);
    expect(
      meetsBadgeCondition(
        'B-10',
        ctx({ session: session({ sessionScore: 99 }) }),
      ),
    ).toBe(false);
  });
});

describe('B-11 安定の高得点（80以上を累計5回）', () => {
  it('累計 5 回目で獲得', () => {
    expect(
      meetsBadgeCondition('B-11', ctx({ highScoreSessionCount: 5 })),
    ).toBe(true);
  });

  it('累計 4 回では未獲得', () => {
    expect(
      meetsBadgeCondition('B-11', ctx({ highScoreSessionCount: 4 })),
    ).toBe(false);
  });

  it('残り回数：4 回時点で残り 1、5 回時点で残り 0', () => {
    expect(remainingForStableHighScore(4)).toBe(1);
    expect(remainingForStableHighScore(5)).toBe(0);
    expect(remainingForStableHighScore(6)).toBe(0);
    expect(remainingForStableHighScore(0)).toBe(5);
  });
});

describe('evaluateBadges 全体', () => {
  it('初回満点セッションで複数バッジを同時獲得（B-01/B-09/B-10）', () => {
    const { next, newlyEarned } = evaluateBadges(
      ctx({ currentStreak: 1, highScoreSessionCount: 1 }),
      allUnearned(),
    );
    expect(newlyEarned).toEqual(expect.arrayContaining(['B-01', 'B-09', 'B-10']));
    const b01 = next.find((s) => s.badgeId === 'B-01');
    expect(b01?.earned).toBe(true);
    expect(b01?.earnedAt).toBe(NOW.toISOString());
  });

  it('next は常に 11 バッジを返す', () => {
    const { next } = evaluateBadges(ctx(), allUnearned());
    expect(next).toHaveLength(BADGE_IDS.length);
    expect(next.map((s) => s.badgeId).sort()).toEqual([...BADGE_IDS].sort());
  });

  it('既獲得バッジは二重獲得しない（earnedAt を保持）', () => {
    const prevAt = '2026-05-01T00:00:00.000Z';
    const current = allUnearned().map((s) =>
      s.badgeId === 'B-01'
        ? { badgeId: s.badgeId, earned: true, earnedAt: prevAt }
        : s,
    );
    const { next, newlyEarned } = evaluateBadges(
      ctx({ currentStreak: 1 }),
      current,
    );
    expect(newlyEarned).not.toContain('B-01');
    const b01 = next.find((s) => s.badgeId === 'B-01');
    expect(b01?.earnedAt).toBe(prevAt); // 上書きしない
  });

  it('条件を満たさないバッジは未獲得のまま', () => {
    const lowScore = ctx({
      session: session({ sessionScore: 50, rounds: [round({ tpCount: 1, fnCount: 1 })] }),
      currentStreak: 1,
      highScoreSessionCount: 0,
    });
    const { next, newlyEarned } = evaluateBadges(lowScore, allUnearned());
    expect(newlyEarned).toContain('B-01'); // 初回完了は獲得
    expect(newlyEarned).not.toContain('B-09');
    expect(newlyEarned).not.toContain('B-10');
    const b09 = next.find((s) => s.badgeId === 'B-09');
    expect(b09?.earned).toBe(false);
  });

  it('現在ステータスが空でも全 11 を未獲得として扱い判定する', () => {
    const { next, newlyEarned } = evaluateBadges(
      ctx({ currentStreak: 7, highScoreSessionCount: 1 }),
      [],
    );
    expect(next).toHaveLength(BADGE_IDS.length);
    // 連続 7 日 → B-01/B-02/B-03 を獲得
    expect(newlyEarned).toEqual(
      expect.arrayContaining(['B-01', 'B-02', 'B-03']),
    );
    expect(newlyEarned).not.toContain('B-04');
  });

  it('B-11 を 5 回目で新規獲得する', () => {
    const { newlyEarned } = evaluateBadges(
      ctx({ highScoreSessionCount: 5 }),
      allUnearned(),
    );
    expect(newlyEarned).toContain('B-11');
  });
});
