/**
 * wideScore — F-11 ワイドスコア計算テスト。
 */
import {
  computeWideScore,
  dailyWideScoreFromSessions,
  normalizeThreshold,
  wideScoreFromDailyBest,
} from '../../../src/lib/v11/wideScore';
import { GAME_REGISTRY } from '../../../src/state/gameRegistry';

describe('wideScore: normalizeThreshold', () => {
  it('G-01：min=1（難）→ 100、max=10（易）→ 0', () => {
    expect(normalizeThreshold('G-01', 1)).toBe(100);
    expect(normalizeThreshold('G-01', 10)).toBe(0);
  });

  it('G-01：中央値 5.5 → 50', () => {
    expect(normalizeThreshold('G-01', 5.5)).toBe(50);
  });

  it('G-04：min=0.02（難）→ 100、max=0.12（易）→ 0（v1.1.4 難化後）', () => {
    expect(normalizeThreshold('G-04', 0.02)).toBe(100);
    expect(normalizeThreshold('G-04', 0.12)).toBe(0);
  });

  it('G-04：中央値 0.07 → 50', () => {
    expect(normalizeThreshold('G-04', 0.07)).toBe(50);
  });

  it('範囲外：threshold < min（難方向超過）→ 100 にクランプ', () => {
    expect(normalizeThreshold('G-01', 0)).toBe(100);
  });

  it('範囲外：threshold > max（易方向超過）→ 0 にクランプ', () => {
    expect(normalizeThreshold('G-01', 100)).toBe(0);
  });

  it('未知 gameId → 0', () => {
    // @ts-expect-error 故意に不正な ID
    expect(normalizeThreshold('G-99', 5)).toBe(0);
  });

  it('整数四捨五入：境界 49.5 → 50', () => {
    // G-01 で値を逆算：ratio=0.495 → threshold = 10 - 0.495*9 = 5.545
    expect(normalizeThreshold('G-01', 5.545)).toBe(50);
  });
});

describe('wideScore: computeWideScore', () => {
  it('実施 0 → null', () => {
    expect(computeWideScore({})).toBeNull();
  });

  it('1 ゲームのみ実施：そのゲームの正規化値が返る', () => {
    expect(computeWideScore({ 'G-01': 1 })).toBe(100);
    expect(computeWideScore({ 'G-04': 0.3 })).toBe(0);
  });

  it('2 ゲーム：算術平均（四捨五入）', () => {
    // G-01: 100, G-04: 0 → 平均 50
    expect(computeWideScore({ 'G-01': 1, 'G-04': 0.12 })).toBe(50);
  });

  it('全ゲーム中央値：正規化 50 平均 → 50（enabled ゲーム集合のみ集計）', () => {
    const inputs: Record<string, number> = {};
    for (const g of GAME_REGISTRY) {
      inputs[g.gameId] = (g.paramRange.min + g.paramRange.max) / 2;
    }
    expect(computeWideScore(inputs)).toBe(50);
  });

  it('実施していないゲームは平均から除外される', () => {
    // 2 ゲームのみ実施 → その 2 つだけで平均
    const score = computeWideScore({ 'G-01': 1, 'G-04': 0.02 });
    // G-01: 100, G-04: 100 → 100
    expect(score).toBe(100);
  });

  it('NaN / Infinity は欠損扱いで除外', () => {
    const score = computeWideScore({
      'G-01': 1,
      'G-04': NaN,
      'G-05': Infinity,
    });
    expect(score).toBe(100);
  });

  it('全ゲーム：すべて min（難）→ 100', () => {
    const inputs: Record<string, number> = {};
    for (const g of GAME_REGISTRY) inputs[g.gameId] = g.paramRange.min;
    expect(computeWideScore(inputs)).toBe(100);
  });

  it('全ゲーム：すべて max（易）→ 0', () => {
    const inputs: Record<string, number> = {};
    for (const g of GAME_REGISTRY) inputs[g.gameId] = g.paramRange.max;
    expect(computeWideScore(inputs)).toBe(0);
  });
});

describe('wideScore: dailyWideScoreFromSessions', () => {
  it('複数セッション：max を採用', () => {
    expect(dailyWideScoreFromSessions([60, 75, 50])).toBe(75);
  });

  it('null は除外', () => {
    expect(dailyWideScoreFromSessions([null, 50, null])).toBe(50);
  });

  it('全 null → null', () => {
    expect(dailyWideScoreFromSessions([null, null])).toBeNull();
  });

  it('空 → null', () => {
    expect(dailyWideScoreFromSessions([])).toBeNull();
  });
});

describe('wideScore: wideScoreFromDailyBest', () => {
  it('best thresholds から正規化平均（四捨五入）', () => {
    expect(wideScoreFromDailyBest({ 'G-01': 1, 'G-04': 0.02 })).toBe(100);
  });

  it('空 → null', () => {
    expect(wideScoreFromDailyBest({})).toBeNull();
  });
});
