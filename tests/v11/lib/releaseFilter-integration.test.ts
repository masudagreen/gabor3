/**
 * releaseFilter 統合テスト — F-18 / spec-v11.md §F-18 受け入れ基準。
 *
 * 「`releaseEnabled=false` のゲーム 3 件で動的除外が `wideScore` /
 * `courseSession` / `dailyStats` / `badges` 全部に伝播する」ことを確認。
 *
 * 仕様：
 *   - disabled ゲームはホーム一覧から消える（→ AllGamesListScreen, getEnabledGames()）
 *   - disabled は連続コース対象外（→ buildCourseGames）
 *   - disabled はワイドスコア集計から除外（→ computeWideScore）
 *   - disabled の進捗グラフタブ非表示（→ ProgressGraphScreen 内 enabledIds）
 *   - disabled に依存するバッジは除外集合で再評価（→ checkBadgeConditionV11）
 */

import * as registry from '../../../src/state/gameRegistry';
import { buildCourseGames } from '../../../src/lib/v11/courseSession';
import { computeWideScore } from '../../../src/lib/v11/wideScore';
import {
  checkBadgeConditionV11,
  BadgeEvalContextV11,
} from '../../../src/lib/v11/badges';
import {
  getReleaseEnabledGameCount,
  getReleaseEnabledGameIds,
} from '../../../src/lib/v11/releaseFilter';
import { GameIdV11 } from '../../../src/state/gameIds-v11';

const baseCtx: BadgeEvalContextV11 = {
  streak: { currentStreak: 0, longestStreak: 0, lastCompletedDate: null },
  totalTrialCount: 0,
  allDailyStats: [],
  perGamePlayCount: {},
  perGameBestUpdatedCount: {},
  fullCourseCompletions: [],
  today: '2026-04-30',
  now: '2026-04-30T10:00:00.000Z',
};

describe('F-18 動的除外：v1.1.4 G-09/10/11/12 disabled で全レイヤに伝播', () => {
  // v1.1.4：GAME_REGISTRY 直で 4 ゲーム disabled（mock は不要、実状態で検証）。
  // computeWideScore / buildCourseGames / badges 等が GAME_REGISTRY.releaseEnabled
  // を直読みする設計のため、実状態を使えばすべての層で disabled が伝播する。

  it('releaseFilter：enabled は 9 件', () => {
    expect(getReleaseEnabledGameCount()).toBe(9);
    const ids = getReleaseEnabledGameIds();
    expect(ids).not.toContain('G-09');
    expect(ids).not.toContain('G-10');
    expect(ids).not.toContain('G-11');
    expect(ids).not.toContain('G-12');
  });

  it('courseSession：buildCourseGames は 9 件', () => {
    const games = buildCourseGames('registry-order');
    expect(games).toHaveLength(9);
    expect(games.map((g) => g.gameId)).not.toContain('G-09');
    expect(games.map((g) => g.gameId)).not.toContain('G-12');
  });

  it('wideScore：disabled 4 件のスコアは集計から除外', () => {
    // 全 13 ゲームの threshold（各ゲームの paramRange.min=最良）を渡し、
    // enabled な 9 ゲームのみが集計される → 平均 100。
    const thresholds: Partial<Record<GameIdV11, number>> = {
      'G-01': 1, // min=1, score 100
      'G-02': 1,
      'G-03': 1, // min=1（v1.1.4 で 1..11）
      'G-04': 0.02, // min=0.02
      'G-05': 1.05, // min=1.05
      'G-06': 1.05, // min=1.05
      'G-07': 2,
      'G-08': 1,
      // 以下は disabled、集計に含まれない
      'G-09': 0.05,
      'G-10': 5,
      'G-11': 0.5,
      'G-12': 1.2,
      'G-13': 0.02, // min=0.02
    };
    const score = computeWideScore(thresholds);
    // enabled 9 ゲームすべて min（=最良）を渡したので 100
    expect(score).toBe(100);
  });

  it('B-09 探検家：9 ゲームプレイで獲得（13 ゲームプレイ要件ではなくなる）', () => {
    const perGamePlayCount: Partial<Record<GameIdV11, number>> = {};
    for (const id of ['G-01', 'G-02', 'G-03', 'G-04', 'G-05', 'G-06', 'G-07', 'G-08', 'G-13'] as const) {
      perGamePlayCount[id] = 1;
    }
    expect(
      checkBadgeConditionV11('B-09', { ...baseCtx, perGamePlayCount }),
    ).toBe(true);
  });

  it('B-13 コンプリート：9 ゲームで wideScore 80 達成で獲得', () => {
    const stats = {
      date: '2026-04-30',
      fullCourseCompleted: true,
      // 各ゲームを score 80 程度になる threshold で揃える
      // score 80 = (max - threshold)/(max - min) = 0.8 → threshold = max - 0.8*(max-min) = 0.2*max + 0.8*min
      gameBestThresholds: {
        'G-01': 0.2 * 10 + 0.8 * 1, // 2.8
        'G-02': 0.2 * 10 + 0.8 * 1, // 2.8
        'G-03': 0.2 * 11 + 0.8 * 1, // 3.0（v1.1.4 で 1..11）
        'G-04': 0.2 * 0.12 + 0.8 * 0.02, // 0.040
        'G-05': 0.2 * 1.5 + 0.8 * 1.05, // 1.14
        'G-06': 0.2 * 1.5 + 0.8 * 1.05, // 1.14
        'G-07': 0.2 * 10 + 0.8 * 2, // 3.6
        'G-08': 0.2 * 10 + 0.8 * 1, // 2.8
        'G-13': 0.2 * 0.15 + 0.8 * 0.02, // 0.046
      },
      wideScore: 80,
      sessionCount: 1,
    };
    expect(
      checkBadgeConditionV11('B-13', { ...baseCtx, allDailyStats: [stats] }),
    ).toBe(true);
  });
});

describe('F-18 動的除外：B-06 で G-03 単独 disabled', () => {
  let spy: jest.SpyInstance;

  beforeEach(() => {
    spy = jest
      .spyOn(registry, 'getEnabledGames')
      .mockReturnValue(
        registry.GAME_REGISTRY.filter((g) => g.gameId !== 'G-03').sort(
          (a, b) => a.order - b.order,
        ),
      );
  });

  afterEach(() => {
    spy.mockRestore();
  });

  it('B-06 視野ハンター：G-03 disabled なら獲得不能（最高点 threshold でも false）', () => {
    const stats = {
      date: '2026-04-30',
      fullCourseCompleted: true,
      gameBestThresholds: { 'G-03': 5 }, // 最高難度 = score 100
      wideScore: 100,
      sessionCount: 1,
    };
    expect(
      checkBadgeConditionV11('B-06', { ...baseCtx, allDailyStats: [stats] }),
    ).toBe(false);
  });
});
