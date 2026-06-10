/**
 * badges.test.ts — v3.0 バッジ付与判定（spec §6 / F-09 バッジ部）。
 *
 * 3 軸 11 種の付与/非付与の境界を網羅する：
 *  - 継続（B-01〜05）：currentStreak ちょうどの境界。
 *  - 高難度（B-06〜08）：クリアのみ対象 / 振動 / 遅い速度（≤3）/ 最難域。
 *  - 高レベル（B-09〜11）：highestLevel ≥10 / 中盤(50%) / 終盤(85%) の割合境界。
 *  - 既獲得の二重獲得しない / earnedAt 保持。
 */

import {
  evaluateBadges,
  meetsBadgeCondition,
  isMasterLevel,
  midLevelThreshold,
  highLevelThreshold,
  type BadgeContext,
} from '../../../src/lib/v3/badges';
import type { BadgeStatus } from '../../../src/state/v3/schema';
import { BADGE_IDS } from '../../../src/state/v3/schema';
import type { LevelParams } from '../../../src/lib/v3/level';

const NOW = new Date('2026-06-10T12:00:00.000Z');

const EASY_PARAMS: LevelParams = {
  count: 1,
  seconds: 40,
  direction: 'one-way',
  gridSize: 3,
  rotationSpeed: 6,
};

function ctx(overrides: Partial<BadgeContext> = {}): BadgeContext {
  return {
    result: 'clear',
    levelParams: EASY_PARAMS,
    highestLevel: 0,
    totalLevels: 720,
    currentStreak: 0,
    now: NOW,
    ...overrides,
  };
}

const allUnearned = (): BadgeStatus[] =>
  BADGE_IDS.map((id) => ({ badgeId: id, earned: false, earnedAt: null }));

describe('継続日数軸（B-01〜B-05、currentStreak 境界）', () => {
  it('B-01 は連続 1 日（初回完了）で獲得、0 日では非獲得', () => {
    expect(meetsBadgeCondition('B-01', ctx({ currentStreak: 0 }))).toBe(false);
    expect(meetsBadgeCondition('B-01', ctx({ currentStreak: 1 }))).toBe(true);
  });

  it('B-02 は 3 日ちょうどで獲得、2 日では非獲得', () => {
    expect(meetsBadgeCondition('B-02', ctx({ currentStreak: 2 }))).toBe(false);
    expect(meetsBadgeCondition('B-02', ctx({ currentStreak: 3 }))).toBe(true);
  });

  it('B-03 は 7 日ちょうど、B-04 は 14 日ちょうど、B-05 は 30 日ちょうど', () => {
    expect(meetsBadgeCondition('B-03', ctx({ currentStreak: 6 }))).toBe(false);
    expect(meetsBadgeCondition('B-03', ctx({ currentStreak: 7 }))).toBe(true);
    expect(meetsBadgeCondition('B-04', ctx({ currentStreak: 13 }))).toBe(false);
    expect(meetsBadgeCondition('B-04', ctx({ currentStreak: 14 }))).toBe(true);
    expect(meetsBadgeCondition('B-05', ctx({ currentStreak: 29 }))).toBe(false);
    expect(meetsBadgeCondition('B-05', ctx({ currentStreak: 30 }))).toBe(true);
  });

  it('継続バッジは失敗ゲームでも streak が満たせば獲得（完了＝クリア/失敗いずれか）', () => {
    expect(
      meetsBadgeCondition('B-01', ctx({ result: 'fail', currentStreak: 1 })),
    ).toBe(true);
  });
});

describe('高難度到達軸（B-06〜B-08、クリアのみ対象）', () => {
  it('B-06「振動を見抜く目」：振動レベルをクリアで獲得、一方向では非獲得', () => {
    expect(
      meetsBadgeCondition(
        'B-06',
        ctx({ levelParams: { ...EASY_PARAMS, direction: 'oscillate' } }),
      ),
    ).toBe(true);
    expect(
      meetsBadgeCondition(
        'B-06',
        ctx({ levelParams: { ...EASY_PARAMS, direction: 'one-way' } }),
      ),
    ).toBe(false);
  });

  it('B-06 は失敗（振動レベルでも）では獲得しない', () => {
    expect(
      meetsBadgeCondition(
        'B-06',
        ctx({ result: 'fail', levelParams: { ...EASY_PARAMS, direction: 'oscillate' } }),
      ),
    ).toBe(false);
  });

  it('B-07「スロー回転ハンター」：速度 3 でクリアは獲得、3.5 では非獲得（≤3 が遅い域）', () => {
    expect(
      meetsBadgeCondition(
        'B-07',
        ctx({ levelParams: { ...EASY_PARAMS, rotationSpeed: 3 } }),
      ),
    ).toBe(true);
    expect(
      meetsBadgeCondition(
        'B-07',
        ctx({ levelParams: { ...EASY_PARAMS, rotationSpeed: 2 } }),
      ),
    ).toBe(true);
    expect(
      meetsBadgeCondition(
        'B-07',
        ctx({ levelParams: { ...EASY_PARAMS, rotationSpeed: 3.5 } }),
      ),
    ).toBe(false);
  });

  it('B-08「達人の眼」：最難域（個数4・4x4・振動・速度≤2.5）の全条件で獲得', () => {
    const master: LevelParams = {
      count: 4,
      seconds: 20,
      direction: 'oscillate',
      gridSize: 4,
      rotationSpeed: 2.5,
    };
    expect(isMasterLevel(master)).toBe(true);
    expect(meetsBadgeCondition('B-08', ctx({ levelParams: master }))).toBe(true);
  });

  it('B-08：いずれか 1 条件でも欠けると非獲得（境界）', () => {
    const base: LevelParams = {
      count: 4,
      seconds: 20,
      direction: 'oscillate',
      gridSize: 4,
      rotationSpeed: 2.5,
    };
    expect(isMasterLevel({ ...base, count: 3 })).toBe(false);
    expect(isMasterLevel({ ...base, gridSize: 3 })).toBe(false);
    expect(isMasterLevel({ ...base, direction: 'one-way' })).toBe(false);
    expect(isMasterLevel({ ...base, rotationSpeed: 3 })).toBe(false);
  });
});

describe('高レベル到達軸（B-09〜B-11、highestLevel 割合境界）', () => {
  it('B-09「二桁の壁」：最高到達 10 で獲得、9 では非獲得', () => {
    expect(meetsBadgeCondition('B-09', ctx({ highestLevel: 9 }))).toBe(false);
    expect(meetsBadgeCondition('B-09', ctx({ highestLevel: 10 }))).toBe(true);
  });

  it('B-10「熟達者」：総 720 で中盤しきい値 360 ちょうどで獲得、359 では非獲得', () => {
    expect(midLevelThreshold(720)).toBe(360);
    expect(
      meetsBadgeCondition('B-10', ctx({ highestLevel: 359, totalLevels: 720 })),
    ).toBe(false);
    expect(
      meetsBadgeCondition('B-10', ctx({ highestLevel: 360, totalLevels: 720 })),
    ).toBe(true);
  });

  it('B-11「頂を目指して」：総 720 で終盤しきい値 612 ちょうどで獲得、611 では非獲得', () => {
    expect(highLevelThreshold(720)).toBe(612);
    expect(
      meetsBadgeCondition('B-11', ctx({ highestLevel: 611, totalLevels: 720 })),
    ).toBe(false);
    expect(
      meetsBadgeCondition('B-11', ctx({ highestLevel: 612, totalLevels: 720 })),
    ).toBe(true);
  });

  it('B-10/B-11 は総レベル数が変わると割合で追従する（範囲設定）', () => {
    // 総 100 レベルなら中盤 50 / 終盤 85。
    expect(midLevelThreshold(100)).toBe(50);
    expect(highLevelThreshold(100)).toBe(85);
    expect(
      meetsBadgeCondition('B-10', ctx({ highestLevel: 50, totalLevels: 100 })),
    ).toBe(true);
    expect(
      meetsBadgeCondition('B-11', ctx({ highestLevel: 84, totalLevels: 100 })),
    ).toBe(false);
  });

  it('高レベルは結果（clear/fail）に依らず highestLevel だけで判定する', () => {
    // highestLevel は applyResult 後の値（クリアした最高）なので、今回 fail でも維持される。
    expect(
      meetsBadgeCondition('B-09', ctx({ result: 'fail', highestLevel: 10 })),
    ).toBe(true);
  });
});

describe('evaluateBadges（全 11 バッジ集約）', () => {
  it('未獲得から、条件を満たす複数バッジを同時に新規獲得する', () => {
    const master: LevelParams = {
      count: 4,
      seconds: 20,
      direction: 'oscillate',
      gridSize: 4,
      rotationSpeed: 2,
    };
    const { next, newlyEarned } = evaluateBadges(
      ctx({
        result: 'clear',
        levelParams: master,
        highestLevel: 700,
        totalLevels: 720,
        currentStreak: 7,
      }),
      allUnearned(),
    );
    // 継続 B-01/02/03（streak 7）+ 高難度 B-06/07/08 + 高レベル B-09/10/11。
    expect(newlyEarned.sort()).toEqual(
      ['B-01', 'B-02', 'B-03', 'B-06', 'B-07', 'B-08', 'B-09', 'B-10', 'B-11'].sort(),
    );
    // B-04（14日）/ B-05（30日）は未達。
    expect(next.find((s) => s.badgeId === 'B-04')?.earned).toBe(false);
    expect(next.find((s) => s.badgeId === 'B-05')?.earned).toBe(false);
    // 全 11 件返る。
    expect(next).toHaveLength(11);
    // earnedAt は now で揃う。
    expect(next.find((s) => s.badgeId === 'B-01')?.earnedAt).toBe(NOW.toISOString());
  });

  it('既獲得バッジは二重獲得せず earnedAt を保持する', () => {
    const prior: BadgeStatus[] = allUnearned().map((s) =>
      s.badgeId === 'B-01'
        ? { badgeId: 'B-01', earned: true, earnedAt: '2026-01-01T00:00:00.000Z' }
        : s,
    );
    const { next, newlyEarned } = evaluateBadges(
      ctx({ currentStreak: 1 }),
      prior,
    );
    expect(newlyEarned).not.toContain('B-01');
    expect(next.find((s) => s.badgeId === 'B-01')?.earnedAt).toBe(
      '2026-01-01T00:00:00.000Z',
    );
  });

  it('条件未達なら何も獲得しない（L1 を初回クリア・streak 1 のみ B-01）', () => {
    const { newlyEarned } = evaluateBadges(
      ctx({ result: 'clear', levelParams: EASY_PARAMS, highestLevel: 1, currentStreak: 1 }),
      allUnearned(),
    );
    expect(newlyEarned).toEqual(['B-01']);
  });
});
