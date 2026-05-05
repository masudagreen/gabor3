/**
 * badges (v1.1) テスト — F-13 / spec-v11.md §10 / §F-13。
 *
 * 13 バッジの獲得条件・F-18 動的除外・進捗ヒントを検証する。
 */

import * as registry from '../../../src/state/gameRegistry';
import {
  BadgeStatusV11,
  bestWideScoreForGame,
  buildBadgeHintV11,
  checkBadgeConditionV11,
  checkBeforeTenPmStreak,
  countEarnedV11,
  createInitialBadgeStatusesV11,
  evaluateBadgesV11,
  isBlockedByDisabledGame,
  isOneGameImproving,
} from '../../../src/lib/v11/badges';
import {
  ALL_BADGE_IDS_V11,
  BadgeIdV11,
} from '../../../src/lib/v11/badgeDefinitions';
import { DailyStatsV11, StreakV11 } from '../../../src/state/storage-v11';
import { GameIdV11 } from '../../../src/state/gameIds-v11';

// ---------------------------------------------------------------------------
// テスト用ヘルパ
// ---------------------------------------------------------------------------

const emptyStreak: StreakV11 = {
  currentStreak: 0,
  longestStreak: 0,
  lastCompletedDate: null,
};

function makeCtx(overrides: Partial<{
  streak: StreakV11;
  totalTrialCount: number;
  allDailyStats: DailyStatsV11[];
  perGamePlayCount: Partial<Record<GameIdV11, number>>;
  perGameBestUpdatedCount: Partial<Record<GameIdV11, number>>;
  fullCourseCompletions: Array<{ completedAt: string; date: string }>;
  today: string;
  now: string;
}> = {}) {
  return {
    streak: overrides.streak ?? emptyStreak,
    totalTrialCount: overrides.totalTrialCount ?? 0,
    allDailyStats: overrides.allDailyStats ?? [],
    perGamePlayCount: overrides.perGamePlayCount ?? {},
    perGameBestUpdatedCount: overrides.perGameBestUpdatedCount ?? {},
    fullCourseCompletions: overrides.fullCourseCompletions ?? [],
    today: overrides.today ?? '2026-04-30',
    now: overrides.now ?? '2026-04-30T10:00:00.000Z',
  };
}

function makeStat(
  date: string,
  bestThresholds: Partial<Record<GameIdV11, number>>,
  fullCourseCompleted = true,
): DailyStatsV11 {
  return {
    date,
    fullCourseCompleted,
    gameBestThresholds: bestThresholds,
    wideScore: null,
    sessionCount: 1,
  };
}

// ---------------------------------------------------------------------------
// 初期状態
// ---------------------------------------------------------------------------

describe('badges v11: createInitialBadgeStatusesV11', () => {
  it('13 件すべて earned=false の初期状態を作る', () => {
    const init = createInitialBadgeStatusesV11();
    expect(init).toHaveLength(13);
    for (const s of init) {
      expect(s.earned).toBe(false);
      expect(s.earnedAt).toBeNull();
    }
  });

  it('13 件すべての badgeId を持つ', () => {
    const ids = createInitialBadgeStatusesV11().map((s) => s.badgeId);
    expect(ids).toEqual(ALL_BADGE_IDS_V11);
  });
});

// ---------------------------------------------------------------------------
// B-01〜B-04（連続日数）
// ---------------------------------------------------------------------------

describe('badges v11: B-01 はじめの一歩', () => {
  it('未完了なら未獲得', () => {
    expect(checkBadgeConditionV11('B-01', makeCtx())).toBe(false);
  });

  it('1 日でも fullCourseCompleted=true があれば獲得', () => {
    const ctx = makeCtx({
      allDailyStats: [makeStat('2026-04-29', {}, true)],
    });
    expect(checkBadgeConditionV11('B-01', ctx)).toBe(true);
  });

  it('fullCourseCompleted=false しかなければ未獲得', () => {
    const ctx = makeCtx({
      allDailyStats: [makeStat('2026-04-29', {}, false)],
    });
    expect(checkBadgeConditionV11('B-01', ctx)).toBe(false);
  });
});

describe('badges v11: B-02 / B-03 / B-04 / B-11（連続日数）', () => {
  it('B-02：currentStreak 3 で獲得、2 で未獲得', () => {
    expect(
      checkBadgeConditionV11(
        'B-02',
        makeCtx({ streak: { ...emptyStreak, currentStreak: 2 } }),
      ),
    ).toBe(false);
    expect(
      checkBadgeConditionV11(
        'B-02',
        makeCtx({ streak: { ...emptyStreak, currentStreak: 3 } }),
      ),
    ).toBe(true);
  });

  it('B-03：currentStreak 7 で獲得', () => {
    expect(
      checkBadgeConditionV11(
        'B-03',
        makeCtx({ streak: { ...emptyStreak, currentStreak: 7 } }),
      ),
    ).toBe(true);
    expect(
      checkBadgeConditionV11(
        'B-03',
        makeCtx({ streak: { ...emptyStreak, currentStreak: 6 } }),
      ),
    ).toBe(false);
  });

  it('B-04：currentStreak 30 で獲得', () => {
    expect(
      checkBadgeConditionV11(
        'B-04',
        makeCtx({ streak: { ...emptyStreak, currentStreak: 30 } }),
      ),
    ).toBe(true);
    expect(
      checkBadgeConditionV11(
        'B-04',
        makeCtx({ streak: { ...emptyStreak, currentStreak: 29 } }),
      ),
    ).toBe(false);
  });

  it('B-11：currentStreak 14 で獲得', () => {
    expect(
      checkBadgeConditionV11(
        'B-11',
        makeCtx({ streak: { ...emptyStreak, currentStreak: 14 } }),
      ),
    ).toBe(true);
    expect(
      checkBadgeConditionV11(
        'B-11',
        makeCtx({ streak: { ...emptyStreak, currentStreak: 13 } }),
      ),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// B-05 累計 100 試行
// ---------------------------------------------------------------------------

describe('badges v11: B-05 累計 100 試行', () => {
  it('99 試行は未獲得', () => {
    expect(
      checkBadgeConditionV11('B-05', makeCtx({ totalTrialCount: 99 })),
    ).toBe(false);
  });

  it('100 試行で獲得', () => {
    expect(
      checkBadgeConditionV11('B-05', makeCtx({ totalTrialCount: 100 })),
    ).toBe(true);
  });

  it('200 試行でも獲得継続', () => {
    expect(
      checkBadgeConditionV11('B-05', makeCtx({ totalTrialCount: 200 })),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// B-06 / B-07（単独依存）
// ---------------------------------------------------------------------------

describe('badges v11: B-06 視野ハンター（G-03 単独依存）', () => {
  it('G-03 ベスト閾値で wideScore 80 以上なら獲得', () => {
    // v1.1.4：G-03 の paramRange: min=1（難）/ max=11（易）。score 80 になる threshold:
    // ratio = (11 - t) / (11 - 1) = 0.8 → t = 3
    const ctx = makeCtx({
      allDailyStats: [makeStat('2026-04-29', { 'G-03': 3 })],
    });
    expect(checkBadgeConditionV11('B-06', ctx)).toBe(true);
  });

  it('G-03 ベスト閾値で wideScore 79 なら未獲得', () => {
    // v1.1.4：threshold = 3.1 → score = round((11-3.1)/10 * 100) = round(79) = 79
    const ctx = makeCtx({
      allDailyStats: [makeStat('2026-04-29', { 'G-03': 3.1 })],
    });
    expect(checkBadgeConditionV11('B-06', ctx)).toBe(false);
  });

  it('G-03 が disabled なら獲得不能（F-18）', () => {
    const spy = jest
      .spyOn(registry, 'getEnabledGames')
      .mockReturnValue(
        registry.GAME_REGISTRY.filter((g) => g.gameId !== 'G-03').sort(
          (a, b) => a.order - b.order,
        ),
      );
    try {
      const ctx = makeCtx({
        allDailyStats: [makeStat('2026-04-29', { 'G-03': 5 })],
      });
      expect(checkBadgeConditionV11('B-06', ctx)).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('badges v11: B-07 弁別の達人（G-02 単独依存）', () => {
  it('G-02 ベスト閾値 1.8（min=1 / max=10、score=91）→ 獲得', () => {
    const ctx = makeCtx({
      allDailyStats: [makeStat('2026-04-29', { 'G-02': 1.8 })],
    });
    expect(checkBadgeConditionV11('B-07', ctx)).toBe(true);
  });

  it('G-02 ベスト閾値 5（中央値、score=56）→ 未獲得', () => {
    const ctx = makeCtx({
      allDailyStats: [makeStat('2026-04-29', { 'G-02': 5 })],
    });
    expect(checkBadgeConditionV11('B-07', ctx)).toBe(false);
  });

  it('G-02 が disabled なら獲得不能', () => {
    const spy = jest
      .spyOn(registry, 'getEnabledGames')
      .mockReturnValue(
        registry.GAME_REGISTRY.filter((g) => g.gameId !== 'G-02').sort(
          (a, b) => a.order - b.order,
        ),
      );
    try {
      const ctx = makeCtx({
        allDailyStats: [makeStat('2026-04-29', { 'G-02': 1 })],
      });
      expect(checkBadgeConditionV11('B-07', ctx)).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });
});

// ---------------------------------------------------------------------------
// B-08 全方位改善
// ---------------------------------------------------------------------------

describe('badges v11: B-08 全方位改善（enabled 全ゲーム前週比改善）', () => {
  it('1 ゲームでも改善していなければ未獲得', () => {
    // G-01 のみ提供。1 ゲーム改善 → 全 13 ゲーム必要なので未獲得
    const stats: DailyStatsV11[] = [];
    // 過去 7 日：G-01 = 3、前 7 日：G-01 = 5（改善）
    for (let i = 0; i < 7; i++) {
      stats.push(makeStat(`2026-04-${30 - i}`, { 'G-01': 3 }));
    }
    for (let i = 7; i < 14; i++) {
      stats.push(makeStat(`2026-04-${30 - i}`, { 'G-01': 5 }));
    }
    const ctx = makeCtx({ today: '2026-04-30', allDailyStats: stats });
    // 他のゲームのデータが無い → checkAllImproving は false
    expect(checkBadgeConditionV11('B-08', ctx)).toBe(false);
  });

  it('isOneGameImproving：データ不足は false', () => {
    expect(
      isOneGameImproving('G-01', [], '2026-04-30'),
    ).toBe(false);
  });

  it('isOneGameImproving：recent 平均 < prev 平均 で true', () => {
    const stats: DailyStatsV11[] = [];
    for (let i = 0; i < 7; i++) {
      stats.push(makeStat(`2026-04-${String(30 - i).padStart(2, '0')}`, { 'G-01': 3 }));
    }
    for (let i = 7; i < 14; i++) {
      stats.push(makeStat(`2026-04-${String(30 - i).padStart(2, '0')}`, { 'G-01': 5 }));
    }
    expect(isOneGameImproving('G-01', stats, '2026-04-30')).toBe(true);
  });

  it('isOneGameImproving：recent 平均 >= prev 平均 で false', () => {
    const stats: DailyStatsV11[] = [];
    for (let i = 0; i < 7; i++) {
      stats.push(makeStat(`2026-04-${String(30 - i).padStart(2, '0')}`, { 'G-01': 5 }));
    }
    for (let i = 7; i < 14; i++) {
      stats.push(makeStat(`2026-04-${String(30 - i).padStart(2, '0')}`, { 'G-01': 5 }));
    }
    expect(isOneGameImproving('G-01', stats, '2026-04-30')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// B-09 探検家
// ---------------------------------------------------------------------------

describe('badges v11: B-09 探検家（enabled 全ゲームを 1 回以上プレイ）', () => {
  it('全 13 ゲームを 1 回以上プレイで獲得', () => {
    const perGamePlayCount: Partial<Record<GameIdV11, number>> = {};
    for (let i = 1; i <= 13; i++) {
      perGamePlayCount[`G-${String(i).padStart(2, '0')}` as GameIdV11] = 1;
    }
    expect(
      checkBadgeConditionV11('B-09', makeCtx({ perGamePlayCount })),
    ).toBe(true);
  });

  it('1 ゲーム未プレイなら未獲得', () => {
    const perGamePlayCount: Partial<Record<GameIdV11, number>> = {};
    for (let i = 1; i <= 12; i++) {
      perGamePlayCount[`G-${String(i).padStart(2, '0')}` as GameIdV11] = 1;
    }
    expect(
      checkBadgeConditionV11('B-09', makeCtx({ perGamePlayCount })),
    ).toBe(false);
  });

  it('F-18：disabled ゲーム 3 件 → 残り 10 ゲームを 1 回以上で獲得', () => {
    const spy = jest.spyOn(registry, 'getEnabledGames').mockReturnValue(
      registry.GAME_REGISTRY.filter(
        (g) => !['G-11', 'G-12', 'G-13'].includes(g.gameId),
      ).sort((a, b) => a.order - b.order),
    );
    try {
      const perGamePlayCount: Partial<Record<GameIdV11, number>> = {};
      for (let i = 1; i <= 10; i++) {
        perGamePlayCount[`G-${String(i).padStart(2, '0')}` as GameIdV11] = 1;
      }
      // G-11/12/13 はプレイされていないが、disabled なので除外集合では獲得
      expect(
        checkBadgeConditionV11('B-09', makeCtx({ perGamePlayCount })),
      ).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });

  it('enabled が 0 件なら獲得不能（極端ケース）', () => {
    const spy = jest.spyOn(registry, 'getEnabledGames').mockReturnValue([]);
    try {
      expect(checkBadgeConditionV11('B-09', makeCtx())).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });
});

// ---------------------------------------------------------------------------
// B-10 全制覇
// ---------------------------------------------------------------------------

describe('badges v11: B-10 全制覇（enabled 全ゲームで 1 度はベスト更新）', () => {
  it('全 13 ゲームでベスト更新で獲得', () => {
    const perGameBestUpdatedCount: Partial<Record<GameIdV11, number>> = {};
    for (let i = 1; i <= 13; i++) {
      perGameBestUpdatedCount[
        `G-${String(i).padStart(2, '0')}` as GameIdV11
      ] = 1;
    }
    expect(
      checkBadgeConditionV11(
        'B-10',
        makeCtx({ perGameBestUpdatedCount }),
      ),
    ).toBe(true);
  });

  it('1 ゲームでもベスト更新がなければ未獲得', () => {
    const perGameBestUpdatedCount: Partial<Record<GameIdV11, number>> = {};
    for (let i = 1; i <= 12; i++) {
      perGameBestUpdatedCount[
        `G-${String(i).padStart(2, '0')}` as GameIdV11
      ] = 1;
    }
    expect(
      checkBadgeConditionV11(
        'B-10',
        makeCtx({ perGameBestUpdatedCount }),
      ),
    ).toBe(false);
  });

  it('F-18：disabled ゲームを除外して評価', () => {
    const spy = jest.spyOn(registry, 'getEnabledGames').mockReturnValue(
      registry.GAME_REGISTRY.filter(
        (g) => !['G-11', 'G-12', 'G-13'].includes(g.gameId),
      ).sort((a, b) => a.order - b.order),
    );
    try {
      const perGameBestUpdatedCount: Partial<Record<GameIdV11, number>> = {};
      for (let i = 1; i <= 10; i++) {
        perGameBestUpdatedCount[
          `G-${String(i).padStart(2, '0')}` as GameIdV11
        ] = 1;
      }
      expect(
        checkBadgeConditionV11(
          'B-10',
          makeCtx({ perGameBestUpdatedCount }),
        ),
      ).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });
});

// ---------------------------------------------------------------------------
// B-12 夜更かし返上
// ---------------------------------------------------------------------------

describe('badges v11: B-12 夜更かし返上（22 時前完了 7 日連続）', () => {
  it('checkBeforeTenPmStreak：完了 0 件 → 0', () => {
    expect(checkBeforeTenPmStreak([])).toBe(0);
  });

  it('22 時前完了 7 日連続で 7 を返す', () => {
    const completions: Array<{ completedAt: string; date: string }> = [];
    for (let i = 0; i < 7; i++) {
      const date = `2026-04-${String(30 - i).padStart(2, '0')}`;
      // ローカル 21:00 に完了
      completions.push({
        completedAt: `${date}T21:00:00`,
        date,
      });
    }
    expect(checkBeforeTenPmStreak(completions)).toBe(7);
  });

  it('1 日でも 22 時以降完了があると連続が途切れる', () => {
    const completions: Array<{ completedAt: string; date: string }> = [
      { completedAt: '2026-04-30T21:00:00', date: '2026-04-30' },
      // 4-29 は 22:30 完了 → 22 時以降
      { completedAt: '2026-04-29T22:30:00', date: '2026-04-29' },
      { completedAt: '2026-04-28T20:00:00', date: '2026-04-28' },
    ];
    // 4-30 だけ連続継続 → 1
    expect(checkBeforeTenPmStreak(completions)).toBe(1);
  });

  it('B-12 受け入れ基準：7 日未満は未獲得、7 日連続で獲得', () => {
    const completions6: Array<{ completedAt: string; date: string }> = [];
    for (let i = 0; i < 6; i++) {
      const date = `2026-04-${String(30 - i).padStart(2, '0')}`;
      completions6.push({ completedAt: `${date}T21:00:00`, date });
    }
    expect(
      checkBadgeConditionV11(
        'B-12',
        makeCtx({ fullCourseCompletions: completions6 }),
      ),
    ).toBe(false);

    const completions7: Array<{ completedAt: string; date: string }> = [];
    for (let i = 0; i < 7; i++) {
      const date = `2026-04-${String(30 - i).padStart(2, '0')}`;
      completions7.push({ completedAt: `${date}T21:00:00`, date });
    }
    expect(
      checkBadgeConditionV11(
        'B-12',
        makeCtx({ fullCourseCompletions: completions7 }),
      ),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// B-13 コンプリート
// ---------------------------------------------------------------------------

describe('badges v11: B-13 コンプリート（enabled 全ゲームでワイドスコア 80 以上）', () => {
  it('全 9 enabled ゲームで wideScore 80 以上 → 獲得（v1.1.4）', () => {
    // v1.1.4：G-09/10/11/12 は disabled。enabled 9 ゲームで 80 以上必要。
    // score 80 = ratio 0.8 → threshold = 0.2*max + 0.8*min
    const stats = makeStat('2026-04-30', {
      'G-01': 2.8, // 0.2*10 + 0.8*1 = 2.8
      'G-02': 2.8,
      'G-03': 3, // 0.2*11 + 0.8*1 = 3.0
      'G-04': 0.04, // 0.2*0.12 + 0.8*0.02 = 0.040
      'G-05': 1.14, // 0.2*1.5 + 0.8*1.05 = 1.14
      'G-06': 1.14,
      'G-07': 3.6, // 0.2*10 + 0.8*2
      'G-08': 2.8, // 0.2*10 + 0.8*1
      'G-13': 0.046, // 0.2*0.15 + 0.8*0.02
    });
    const ctx = makeCtx({ allDailyStats: [stats] });
    expect(checkBadgeConditionV11('B-13', ctx)).toBe(true);
  });

  it('1 ゲームでも 80 未満なら未獲得', () => {
    const stats = makeStat('2026-04-30', {
      'G-01': 5, // 中央値（score=56）
    });
    const ctx = makeCtx({ allDailyStats: [stats] });
    expect(checkBadgeConditionV11('B-13', ctx)).toBe(false);
  });

  it('F-18：さらに G-13 を disabled にすれば残り 8 ゲームで 80 以上を要求（v1.1.4 mock）', () => {
    // v1.1.4：通常時 enabled は 9 ゲーム（G-09/10/11/12 disabled）。
    // 本テストはさらに G-13 を mock で disabled にして、残り 8 ゲームで判定可能か確認。
    const spy = jest.spyOn(registry, 'getEnabledGames').mockReturnValue(
      registry.GAME_REGISTRY.filter(
        (g) =>
          !['G-09', 'G-10', 'G-11', 'G-12', 'G-13'].includes(g.gameId),
      ).sort((a, b) => a.order - b.order),
    );
    try {
      const stats = makeStat('2026-04-30', {
        'G-01': 2.8, // 0.2*10 + 0.8*1
        'G-02': 2.8,
        'G-03': 3, // 0.2*11 + 0.8*1
        'G-04': 0.04, // 0.2*0.12 + 0.8*0.02
        'G-05': 1.14, // 0.2*1.5 + 0.8*1.05
        'G-06': 1.14,
        'G-07': 3.6, // 0.2*10 + 0.8*2
        'G-08': 2.8,
        // G-13 は記録なしだが mock で disabled として除外される
      });
      const ctx = makeCtx({ allDailyStats: [stats] });
      expect(checkBadgeConditionV11('B-13', ctx)).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });
});

// ---------------------------------------------------------------------------
// evaluateBadgesV11
// ---------------------------------------------------------------------------

describe('badges v11: evaluateBadgesV11', () => {
  it('既に earned のバッジは「再獲得」しない（newlyEarned に入らない）', () => {
    const current: BadgeStatusV11[] = [
      { badgeId: 'B-01', earned: true, earnedAt: '2026-04-29T00:00:00.000Z' },
    ];
    const ctx = makeCtx({
      allDailyStats: [makeStat('2026-04-29', {}, true)],
    });
    const { next, newlyEarned } = evaluateBadgesV11(current, ctx);
    expect(newlyEarned).not.toContain('B-01');
    const b01 = next.find((s) => s.badgeId === 'B-01');
    expect(b01?.earned).toBe(true);
    expect(b01?.earnedAt).toBe('2026-04-29T00:00:00.000Z');
  });

  it('未獲得 → 条件達成で newlyEarned に追加、earnedAt セット', () => {
    const ctx = makeCtx({
      allDailyStats: [makeStat('2026-04-29', {}, true)],
      now: '2026-04-30T10:00:00.000Z',
    });
    const { next, newlyEarned } = evaluateBadgesV11([], ctx);
    expect(newlyEarned).toContain('B-01');
    const b01 = next.find((s) => s.badgeId === 'B-01');
    expect(b01?.earned).toBe(true);
    expect(b01?.earnedAt).toBe('2026-04-30T10:00:00.000Z');
  });

  it('複数バッジが同時に達成された場合、すべて newlyEarned に入る', () => {
    const completions: Array<{ completedAt: string; date: string }> = [];
    for (let i = 0; i < 7; i++) {
      const date = `2026-04-${String(30 - i).padStart(2, '0')}`;
      completions.push({ completedAt: `${date}T21:00:00`, date });
    }
    const ctx = makeCtx({
      streak: { ...emptyStreak, currentStreak: 7 },
      allDailyStats: [makeStat('2026-04-30', {}, true)],
      fullCourseCompletions: completions,
    });
    const { newlyEarned } = evaluateBadgesV11([], ctx);
    // B-01 / B-02 / B-03 / B-12 を同時獲得
    expect(newlyEarned).toContain('B-01');
    expect(newlyEarned).toContain('B-02');
    expect(newlyEarned).toContain('B-03');
    expect(newlyEarned).toContain('B-12');
  });

  it('next には常に 13 件が並ぶ（未獲得は earned=false で残る）', () => {
    const { next } = evaluateBadgesV11([], makeCtx());
    expect(next).toHaveLength(13);
  });
});

// ---------------------------------------------------------------------------
// buildBadgeHintV11
// ---------------------------------------------------------------------------

describe('badges v11: buildBadgeHintV11', () => {
  it('B-02：currentStreak 1 なら「あと 2 日」', () => {
    const hint = buildBadgeHintV11(
      'B-02',
      makeCtx({ streak: { ...emptyStreak, currentStreak: 1 } }),
    );
    expect(hint).toContain('あと 2 日');
  });

  it('B-05：累計試行 50 / 100', () => {
    const hint = buildBadgeHintV11('B-05', makeCtx({ totalTrialCount: 50 }));
    expect(hint).toContain('50 試行 / 100 試行');
  });

  it('B-09：探検家 7 / 9（v1.1.4：enabled 9 ゲーム）', () => {
    const perGamePlayCount: Partial<Record<GameIdV11, number>> = {};
    for (let i = 1; i <= 7; i++) {
      perGamePlayCount[`G-${String(i).padStart(2, '0')}` as GameIdV11] = 1;
    }
    const hint = buildBadgeHintV11('B-09', makeCtx({ perGamePlayCount }));
    expect(hint).toContain('7 / 9');
  });

  it('F-18 専用文言：B-06 で G-03 disabled', () => {
    const spy = jest
      .spyOn(registry, 'getEnabledGames')
      .mockReturnValue(
        registry.GAME_REGISTRY.filter((g) => g.gameId !== 'G-03').sort(
          (a, b) => a.order - b.order,
        ),
      );
    try {
      const hint = buildBadgeHintV11('B-06', makeCtx());
      expect(hint).toContain('G-03 は公開対象外');
    } finally {
      spy.mockRestore();
    }
  });

  it('F-18 専用文言：B-07 で G-02 disabled', () => {
    const spy = jest
      .spyOn(registry, 'getEnabledGames')
      .mockReturnValue(
        registry.GAME_REGISTRY.filter((g) => g.gameId !== 'G-02').sort(
          (a, b) => a.order - b.order,
        ),
      );
    try {
      const hint = buildBadgeHintV11('B-07', makeCtx());
      expect(hint).toContain('G-02 は公開対象外');
    } finally {
      spy.mockRestore();
    }
  });
});

// ---------------------------------------------------------------------------
// 補助関数
// ---------------------------------------------------------------------------

describe('badges v11: bestWideScoreForGame', () => {
  it('記録なしなら 0', () => {
    expect(bestWideScoreForGame('G-01', [])).toBe(0);
  });

  it('複数日の記録から max を返す', () => {
    const stats: DailyStatsV11[] = [
      makeStat('2026-04-29', { 'G-01': 5 }), // score 56
      makeStat('2026-04-30', { 'G-01': 2 }), // score 89
    ];
    expect(bestWideScoreForGame('G-01', stats)).toBe(89);
  });
});

describe('badges v11: countEarnedV11', () => {
  it('earned=true の件数を返す', () => {
    const arr: BadgeStatusV11[] = [
      { badgeId: 'B-01', earned: true, earnedAt: '2026-04-29' },
      { badgeId: 'B-02', earned: false, earnedAt: null },
      { badgeId: 'B-03', earned: true, earnedAt: '2026-04-30' },
    ];
    expect(countEarnedV11(arr)).toBe(2);
  });
});

describe('badges v11: isBlockedByDisabledGame', () => {
  it('B-06：G-03 enabled なら false', () => {
    expect(isBlockedByDisabledGame('B-06')).toBe(false);
  });

  it('B-06：G-03 disabled なら true', () => {
    const spy = jest
      .spyOn(registry, 'getEnabledGames')
      .mockReturnValue(
        registry.GAME_REGISTRY.filter((g) => g.gameId !== 'G-03').sort(
          (a, b) => a.order - b.order,
        ),
      );
    try {
      expect(isBlockedByDisabledGame('B-06')).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });

  it('B-08：依存ゲーム未指定なら常に false', () => {
    expect(isBlockedByDisabledGame('B-08')).toBe(false);
  });

  it('B-01：依存なし（連続日数）なら常に false', () => {
    expect(isBlockedByDisabledGame('B-01')).toBe(false);
  });
});
