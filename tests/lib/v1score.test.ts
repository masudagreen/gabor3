/**
 * spec.md §9.1 V1 スコア算出のテスト。
 * screens.md S5-04 §10 の代表値と一致することを検証。
 */

import {
  computeScoreDiff,
  computeThresholdDiff,
  computeV1Score,
  game1Score,
  game2Score,
  game3Score,
} from '../../src/lib/v1score';

describe('v1score: 個別ゲームの正規化', () => {
  it('Game 1: threshold=4° → 80 点（spec.md §9.1 / screens.md §10.1）', () => {
    expect(game1Score(4)).toBe(80);
  });
  it('Game 1: threshold=8°（最易）→ 0 点（境界クランプ）', () => {
    expect(game1Score(8)).toBe(0);
  });
  it('Game 1: threshold=3°（最難）→ 100 点', () => {
    expect(game1Score(3)).toBe(100);
  });
  it('Game 1: threshold=10°（範囲外、上にハミ出し）→ 0 にクランプ', () => {
    expect(game1Score(10)).toBe(0);
  });

  it('Game 2: threshold=4.2° → 約 64.4 点', () => {
    // (10-4.2)/(10-1)*100 = 5.8/9*100 ≈ 64.444
    expect(Math.round(game2Score(4.2) * 10) / 10).toBeCloseTo(64.4, 1);
  });
  it('Game 2: threshold=1°（最難）→ 100 点', () => {
    expect(game2Score(1)).toBe(100);
  });
  it('Game 2: threshold=10°（最易）→ 0 点', () => {
    expect(game2Score(10)).toBe(0);
  });

  it('Game 3: threshold=12° → 82.5 点', () => {
    // (45-12)/(45-5)*100 = 33/40*100 = 82.5
    expect(game3Score(12)).toBe(82.5);
  });
  it('Game 3: threshold=5°（最難）→ 100 点', () => {
    expect(game3Score(5)).toBe(100);
  });
});

describe('v1score: V1 スコア合成', () => {
  it('3 ゲーム揃い：4 / 4.2 / 12 → 80, 64.4, 82.5 → round(75.6) = 76 点', () => {
    expect(computeV1Score(4, 4.2, 12)).toBe(76);
  });

  it('Game 2 のみ実施：4.2° → round(64.4) = 64 点', () => {
    expect(computeV1Score(null, 4.2, null)).toBe(64);
  });

  it('全て null → null（欠損日）', () => {
    expect(computeV1Score(null, null, null)).toBeNull();
  });

  it('2 ゲームのみ：Game 1=4, Game 3=12 → (80 + 82.5)/2 = 81.25 → 81', () => {
    expect(computeV1Score(4, null, 12)).toBe(81);
  });
});

describe('v1score: 前回比 ScoreDiff', () => {
  it('現在 65 / 前回 60 → +5、direction=up', () => {
    expect(computeScoreDiff(65, 60)).toEqual({ direction: 'up', delta: 5 });
  });
  it('現在 55 / 前回 60 → -5、direction=down', () => {
    expect(computeScoreDiff(55, 60)).toEqual({ direction: 'down', delta: -5 });
  });
  it('現在 60 / 前回 60 → 0、direction=flat', () => {
    expect(computeScoreDiff(60, 60)).toEqual({ direction: 'flat', delta: 0 });
  });
  it('前回データなし → first', () => {
    expect(computeScoreDiff(60, null)).toEqual({
      direction: 'first',
      delta: null,
    });
  });
  it('現在データなし → first', () => {
    expect(computeScoreDiff(null, 60)).toEqual({
      direction: 'first',
      delta: null,
    });
  });
});

describe('v1score: 閾値前回比 ThresholdDiff（小さい方が改善）', () => {
  it('現在 4.0 / 前回 4.3 → 改善、delta=-0.3', () => {
    const r = computeThresholdDiff(4.0, 4.3);
    expect(r.direction).toBe('improved');
    expect(r.delta).toBeCloseTo(-0.3, 5);
  });
  it('現在 4.5 / 前回 4.0 → 悪化、delta=+0.5', () => {
    const r = computeThresholdDiff(4.5, 4.0);
    expect(r.direction).toBe('worse');
    expect(r.delta).toBeCloseTo(0.5, 5);
  });
  it('現在 4.0 / 前回 4.0 → flat', () => {
    expect(computeThresholdDiff(4, 4)).toEqual({ direction: 'flat', delta: 0 });
  });
  it('前回データなし → first', () => {
    expect(computeThresholdDiff(4, null)).toEqual({
      direction: 'first',
      delta: null,
    });
  });
});
