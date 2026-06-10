/**
 * chartGeometry.test.ts — v3.0 到達レベル折れ線の座標計算（F-09、純関数）。
 *
 * 動的 Y スケール（computeYMax）、点座標、線分（長さ・角度）、基準線 y を検証する。
 */

import {
  computeChartGeometry,
  computeYMax,
} from '../../../src/lib/v3/chartGeometry';
import type { HistoryPoint } from '../../../src/lib/v3/historyView';

const pt = (date: string, level: number, isToday = false): HistoryPoint => ({
  date,
  level,
  isToday,
});

describe('computeYMax（動的スケール）', () => {
  it('データなし・最高 0 → 既定上端 10（軸が潰れない）', () => {
    expect(computeYMax(0, 0)).toBe(10);
  });

  it('小さなレベルは 5 の倍数へ切り上げ（ヘッドルーム込み）', () => {
    // peak=8 → 8*1.15=9.2 → step5 で切り上げ 10
    expect(computeYMax(8, 0)).toBe(10);
    // peak=12 → 13.8 → step5 → 15
    expect(computeYMax(12, 0)).toBe(15);
  });

  it('最高到達レベル基準線が系列最大を上回る場合は基準線で上端が決まる', () => {
    // 系列最大 8、最高到達 30 → peak=30, step10 → 30*1.15=34.5 → 40
    expect(computeYMax(8, 30)).toBe(40);
  });

  it('大きいレベル（100 以上）は 50 刻み', () => {
    // peak=300 → 345 → step50 → 350
    expect(computeYMax(300, 0)).toBe(350);
  });
});

describe('computeChartGeometry', () => {
  const W = 200;
  const H = 100;

  it('単点は中央に配置（x=幅/2）', () => {
    const g = computeChartGeometry([pt('2026-06-10', 5, true)], 5, W, H);
    expect(g.points).toHaveLength(1);
    expect(g.points[0].x).toBe(W / 2);
  });

  it('複数点は左右端に等間隔配置し、レベルに応じた y（上端=yMax）', () => {
    const g = computeChartGeometry(
      [pt('2026-06-08', 0), pt('2026-06-09', 5), pt('2026-06-10', 10, true)],
      10,
      W,
      H,
    );
    // yMax: peak=10 → 11.5 → step5 → 15
    expect(g.yMax).toBe(15);
    expect(g.points[0].x).toBe(0);
    expect(g.points[2].x).toBe(W);
    // level 0 → 下端（y=H）
    expect(g.points[0].y).toBeCloseTo(H);
    // level 15(=yMax) は上端 y=0 になるはず（ここでは 10 なので中間より上）
    expect(g.points[2].y).toBeLessThan(g.points[0].y);
  });

  it('線分の本数は点数-1、長さは正', () => {
    const g = computeChartGeometry(
      [pt('a', 2), pt('b', 6), pt('c', 4)],
      6,
      W,
      H,
    );
    expect(g.segments).toHaveLength(2);
    g.segments.forEach((s) => expect(s.length).toBeGreaterThan(0));
  });

  it('yTicks は [上端, 中間, 0]', () => {
    const g = computeChartGeometry([pt('a', 12)], 12, W, H);
    // yMax=15 → ticks [15, 8(=round(7.5)), 0]
    expect(g.yTicks[0]).toBe(15);
    expect(g.yTicks[2]).toBe(0);
    expect(g.yTicks[1]).toBe(Math.round(15 / 2));
  });

  it('highestLevel>0 で基準線 y を返す（同スケール上）', () => {
    const g = computeChartGeometry([pt('a', 10)], 10, W, H);
    expect(g.highestLineY).not.toBeNull();
    expect(g.highestLineY).toBeGreaterThanOrEqual(0);
    expect(g.highestLineY).toBeLessThanOrEqual(H);
  });

  it('highestLevel<=0 で基準線なし（null）', () => {
    const g = computeChartGeometry([pt('a', 0)], 0, W, H);
    expect(g.highestLineY).toBeNull();
  });
});
