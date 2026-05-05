/**
 * バッジ判定ロジックの単体テスト（src/lib/badges.ts）。
 *
 * カバー範囲：
 *   - B-01〜B-08 各バッジの獲得条件
 *   - 既獲得バッジは再発火しない（earned 状態維持）
 *   - B-08 進捗ヒント（improvingCount / data 不足）
 *   - buildBadgeHint：未獲得バッジのヒント文言
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {
  BADGE_META,
  buildBadgeHint,
  checkAllImprovingStatus,
  checkBadgeCondition,
  evaluateBadges,
} from '../../src/lib/badges';
import {
  createDefaultBadgeStatuses,
  createDefaultStreak,
  DailyStats,
  Streak,
} from '../../src/state/storage';

const TODAY = new Date(2026, 3, 29); // 2026-04-29
const baseCtx = (over: Partial<{
  streak: Streak;
  totalTrialCount: number;
  allDailyStats: DailyStats[];
  today: Date;
}> = {}) => ({
  streak: over.streak ?? createDefaultStreak(),
  totalTrialCount: over.totalTrialCount ?? 0,
  allDailyStats: over.allDailyStats ?? [],
  today: over.today ?? TODAY,
});

const sampleDay = (
  date: string,
  patch: Partial<DailyStats> = {},
): DailyStats => ({
  date,
  courseCompleted: false,
  game1BestThreshold: null,
  game2BestThreshold: null,
  game3BestThreshold: null,
  v1Score: null,
  sessionCount: 0,
  ...patch,
});

describe('checkBadgeCondition: B-01 はじめの一歩', () => {
  it('未完了なら false、初回完了で true', () => {
    expect(
      checkBadgeCondition('B-01', baseCtx({ allDailyStats: [] })),
    ).toBe(false);
    expect(
      checkBadgeCondition(
        'B-01',
        baseCtx({
          allDailyStats: [
            sampleDay('2026-04-29', { courseCompleted: true }),
          ],
        }),
      ),
    ).toBe(true);
  });
});

describe('checkBadgeCondition: B-02/B-03/B-04 連続日数', () => {
  it('B-02：3 日連続で獲得', () => {
    expect(
      checkBadgeCondition('B-02', baseCtx({
        streak: { currentStreak: 2, longestStreak: 2, lastCompletedDate: '2026-04-29' },
      })),
    ).toBe(false);
    expect(
      checkBadgeCondition('B-02', baseCtx({
        streak: { currentStreak: 3, longestStreak: 3, lastCompletedDate: '2026-04-29' },
      })),
    ).toBe(true);
  });

  it('B-03：7 日連続で獲得', () => {
    expect(
      checkBadgeCondition('B-03', baseCtx({
        streak: { currentStreak: 6, longestStreak: 6, lastCompletedDate: '2026-04-29' },
      })),
    ).toBe(false);
    expect(
      checkBadgeCondition('B-03', baseCtx({
        streak: { currentStreak: 7, longestStreak: 7, lastCompletedDate: '2026-04-29' },
      })),
    ).toBe(true);
  });

  it('B-04：30 日連続で獲得', () => {
    expect(
      checkBadgeCondition('B-04', baseCtx({
        streak: { currentStreak: 29, longestStreak: 29, lastCompletedDate: '2026-04-29' },
      })),
    ).toBe(false);
    expect(
      checkBadgeCondition('B-04', baseCtx({
        streak: { currentStreak: 30, longestStreak: 30, lastCompletedDate: '2026-04-29' },
      })),
    ).toBe(true);
  });
});

describe('checkBadgeCondition: B-05 累計試行数', () => {
  it('99 試行では未獲得、100 試行で獲得', () => {
    expect(
      checkBadgeCondition('B-05', baseCtx({ totalTrialCount: 99 })),
    ).toBe(false);
    expect(
      checkBadgeCondition('B-05', baseCtx({ totalTrialCount: 100 })),
    ).toBe(true);
    expect(
      checkBadgeCondition('B-05', baseCtx({ totalTrialCount: 250 })),
    ).toBe(true);
  });
});

describe('checkBadgeCondition: B-06/B-07 V1 スコア閾値', () => {
  it('B-07：Game 2 ベスト閾値からスコア 80 で獲得', () => {
    // game2Score(2) = (10 - 2) / 9 * 100 = 88.9 → ≥80 で獲得
    expect(
      checkBadgeCondition(
        'B-07',
        baseCtx({
          allDailyStats: [
            sampleDay('2026-04-29', { game2BestThreshold: 2 }),
          ],
        }),
      ),
    ).toBe(true);
    // game2Score(4) = (10 - 4) / 9 * 100 ≈ 66.7 → 未獲得
    expect(
      checkBadgeCondition(
        'B-07',
        baseCtx({
          allDailyStats: [
            sampleDay('2026-04-29', { game2BestThreshold: 4 }),
          ],
        }),
      ),
    ).toBe(false);
  });

  it('B-06：Game 3 ベスト閾値からスコア 80 で獲得', () => {
    // game3Score(13) = (45 - 13) / 40 * 100 = 80 → 獲得
    expect(
      checkBadgeCondition(
        'B-06',
        baseCtx({
          allDailyStats: [
            sampleDay('2026-04-29', { game3BestThreshold: 13 }),
          ],
        }),
      ),
    ).toBe(true);
    // game3Score(20) = (45 - 20) / 40 * 100 = 62.5 → 未獲得
    expect(
      checkBadgeCondition(
        'B-06',
        baseCtx({
          allDailyStats: [
            sampleDay('2026-04-29', { game3BestThreshold: 20 }),
          ],
        }),
      ),
    ).toBe(false);
  });
});

describe('checkAllImprovingStatus（B-08）', () => {
  /**
   * 過去 14 日（today=2026-04-29）：
   *   recent7 = 04-23 〜 04-29
   *   prev7   = 04-16 〜 04-22
   */
  it('3 ゲームすべて改善中で improvingCount=3', () => {
    const stats: DailyStats[] = [
      // 前 7 日（04-16, 04-17）：閾値が大きい
      sampleDay('2026-04-16', {
        game1BestThreshold: 6,
        game2BestThreshold: 6,
        game3BestThreshold: 25,
      }),
      sampleDay('2026-04-17', {
        game1BestThreshold: 6,
        game2BestThreshold: 6,
        game3BestThreshold: 25,
      }),
      // 過去 7 日（04-28, 04-29）：閾値が小さい
      sampleDay('2026-04-28', {
        game1BestThreshold: 4,
        game2BestThreshold: 4,
        game3BestThreshold: 15,
      }),
      sampleDay('2026-04-29', {
        game1BestThreshold: 4,
        game2BestThreshold: 4,
        game3BestThreshold: 15,
      }),
    ];
    const r = checkAllImprovingStatus(stats, TODAY);
    expect(r.improvingCount).toBe(3);
    expect(r.game1).toBe('improving');
    expect(r.game2).toBe('improving');
    expect(r.game3).toBe('improving');
    expect(r.hasInsufficientData).toBe(false);
    expect(checkBadgeCondition('B-08', baseCtx({ allDailyStats: stats }))).toBe(true);
  });

  it('2 ゲーム改善・1 ゲーム横ばい/悪化で improvingCount=2、未獲得', () => {
    const stats: DailyStats[] = [
      sampleDay('2026-04-16', {
        game1BestThreshold: 6,
        game2BestThreshold: 6,
        game3BestThreshold: 25,
      }),
      sampleDay('2026-04-17', {
        game1BestThreshold: 6,
        game2BestThreshold: 6,
        game3BestThreshold: 25,
      }),
      sampleDay('2026-04-28', {
        game1BestThreshold: 4, // 改善
        game2BestThreshold: 7, // 悪化
        game3BestThreshold: 15, // 改善
      }),
      sampleDay('2026-04-29', {
        game1BestThreshold: 4,
        game2BestThreshold: 7,
        game3BestThreshold: 15,
      }),
    ];
    const r = checkAllImprovingStatus(stats, TODAY);
    expect(r.improvingCount).toBe(2);
    expect(r.game2).toBe('flat-or-worse');
    expect(checkBadgeCondition('B-08', baseCtx({ allDailyStats: stats }))).toBe(false);
  });

  it('データ不足（前 7 日が 1 日未満のみ）で insufficient-data', () => {
    const stats: DailyStats[] = [
      sampleDay('2026-04-29', {
        game1BestThreshold: 4,
        game2BestThreshold: 4,
        game3BestThreshold: 15,
      }),
    ];
    const r = checkAllImprovingStatus(stats, TODAY);
    expect(r.hasInsufficientData).toBe(true);
    expect(r.improvingCount).toBe(0);
    expect(checkBadgeCondition('B-08', baseCtx({ allDailyStats: stats }))).toBe(false);
  });
});

describe('evaluateBadges：再獲得しない', () => {
  it('既に earned=true のバッジは再獲得しない（newlyEarned に含まれない）', () => {
    const current = createDefaultBadgeStatuses();
    // B-01 を獲得済にする
    current[0] = {
      badgeId: 'B-01',
      earned: true,
      earnedAt: '2026-04-20T00:00:00.000Z',
    };
    const ctx = baseCtx({
      allDailyStats: [
        sampleDay('2026-04-29', { courseCompleted: true }),
      ],
    });
    const r = evaluateBadges(current, ctx);
    expect(r.newlyEarned).not.toContain('B-01');
    // earnedAt も保持される
    const b01 = r.next.find((b) => b.badgeId === 'B-01');
    expect(b01?.earned).toBe(true);
    expect(b01?.earnedAt).toBe('2026-04-20T00:00:00.000Z');
  });

  it('複数バッジが同時に新規獲得される', () => {
    const ctx = baseCtx({
      streak: {
        currentStreak: 7,
        longestStreak: 7,
        lastCompletedDate: '2026-04-29',
      },
      totalTrialCount: 150,
      allDailyStats: [
        sampleDay('2026-04-29', { courseCompleted: true }),
      ],
    });
    const r = evaluateBadges(createDefaultBadgeStatuses(), ctx);
    // B-01, B-02, B-03, B-05 を一度に獲得
    expect(r.newlyEarned).toContain('B-01');
    expect(r.newlyEarned).toContain('B-02');
    expect(r.newlyEarned).toContain('B-03');
    expect(r.newlyEarned).toContain('B-05');
    expect(r.newlyEarned).not.toContain('B-04');
  });
});

describe('buildBadgeHint', () => {
  it('B-03 一週間：「あと N 日」ヒント', () => {
    const ctx = baseCtx({
      streak: {
        currentStreak: 3,
        longestStreak: 3,
        lastCompletedDate: '2026-04-29',
      },
    });
    expect(buildBadgeHint('B-03', ctx)).toBe('あと 4 日');
  });

  it('B-05 100 試行：「累計 N 試行 / 100 試行」ヒント', () => {
    const ctx = baseCtx({ totalTrialCount: 87 });
    expect(buildBadgeHint('B-05', ctx)).toBe('累計 87 試行 / 100 試行');
  });

  it('B-08 全方位改善：データ不足時のヒント', () => {
    const ctx = baseCtx({ allDailyStats: [] });
    expect(buildBadgeHint('B-08', ctx)).toContain('データがもう少し必要です');
  });

  it('B-08 全方位改善：N ゲーム改善中ヒント', () => {
    const stats: DailyStats[] = [
      sampleDay('2026-04-16', {
        game1BestThreshold: 6,
        game2BestThreshold: 6,
        game3BestThreshold: 25,
      }),
      sampleDay('2026-04-17', {
        game1BestThreshold: 6,
        game2BestThreshold: 6,
        game3BestThreshold: 25,
      }),
      sampleDay('2026-04-28', {
        game1BestThreshold: 4,
        game2BestThreshold: 7,
        game3BestThreshold: 15,
      }),
      sampleDay('2026-04-29', {
        game1BestThreshold: 4,
        game2BestThreshold: 7,
        game3BestThreshold: 15,
      }),
    ];
    const ctx = baseCtx({ allDailyStats: stats });
    expect(buildBadgeHint('B-08', ctx)).toBe(
      '3 ゲーム中 2 ゲームが先週比で改善中',
    );
  });
});

describe('BADGE_META', () => {
  it('全 8 バッジに name / earnedDescription / conditionText がある', () => {
    const ids = ['B-01', 'B-02', 'B-03', 'B-04', 'B-05', 'B-06', 'B-07', 'B-08'] as const;
    for (const id of ids) {
      const meta = BADGE_META[id];
      expect(meta.name.length).toBeGreaterThan(0);
      expect(meta.earnedDescription.length).toBeGreaterThan(0);
      expect(meta.conditionText.length).toBeGreaterThan(0);
    }
  });
});
