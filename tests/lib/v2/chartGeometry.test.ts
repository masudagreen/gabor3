/**
 * chartGeometry.test.ts — 折れ線グラフ座標計算（CH-1 / F-09）。
 *
 * View ベース描画の土台となる純関数を検証：
 *  - Y 軸 0〜100 マッピング（score=100 が上端、0 が下端）
 *  - X 軸等間隔配置（点 1 個は中央、複数は左右端）
 *  - 線分の長さ・角度
 *  - 当日強調フラグの伝搬
 */

import { computeChartGeometry } from '../../../src/lib/v2/chartGeometry';
import type { HistoryPoint } from '../../../src/lib/v2/historyView';

function pt(date: string, score: number, isToday = false): HistoryPoint {
  return { date, score, isToday };
}

describe('computeChartGeometry — Y 軸マッピング', () => {
  it('score=100 は上端 y=0、score=0 は下端 y=height', () => {
    const g = computeChartGeometry([pt('a', 100), pt('b', 0)], 200, 160);
    expect(g.points[0].y).toBe(0);
    expect(g.points[1].y).toBe(160);
  });

  it('score=50 は中央 y=height/2', () => {
    const g = computeChartGeometry([pt('a', 50)], 200, 160);
    expect(g.points[0].y).toBe(80);
  });

  it('範囲外スコアはクランプされる', () => {
    const g = computeChartGeometry([pt('a', 120), pt('b', -10)], 200, 160);
    expect(g.points[0].y).toBe(0); // 120 → 100 上端
    expect(g.points[1].y).toBe(160); // -10 → 0 下端
  });
});

describe('computeChartGeometry — X 軸配置', () => {
  it('点 1 個は中央', () => {
    const g = computeChartGeometry([pt('a', 50)], 200, 160);
    expect(g.points[0].x).toBe(100);
  });

  it('点 3 個は 0 / 中央 / 右端に等間隔', () => {
    const g = computeChartGeometry([pt('a', 50), pt('b', 60), pt('c', 70)], 200, 160);
    expect(g.points.map((p) => p.x)).toEqual([0, 100, 200]);
  });

  it('空系列では点・線分なし', () => {
    const g = computeChartGeometry([], 200, 160);
    expect(g.points).toEqual([]);
    expect(g.segments).toEqual([]);
  });
});

describe('computeChartGeometry — 線分', () => {
  it('点間を結ぶ線分が (点数-1) 本できる', () => {
    const g = computeChartGeometry([pt('a', 0), pt('b', 0), pt('c', 0)], 200, 160);
    expect(g.segments).toHaveLength(2);
  });

  it('水平線分の角度は 0 度、長さは x 差', () => {
    const g = computeChartGeometry([pt('a', 50), pt('b', 50)], 200, 160);
    const seg = g.segments[0];
    expect(seg.angleDeg).toBeCloseTo(0);
    expect(seg.length).toBeCloseTo(200);
  });

  it('点 1 個では線分なし', () => {
    const g = computeChartGeometry([pt('a', 50)], 200, 160);
    expect(g.segments).toEqual([]);
  });
});

describe('computeChartGeometry — 当日強調フラグ', () => {
  it('isToday を点に伝搬する', () => {
    const g = computeChartGeometry([pt('a', 50, false), pt('b', 80, true)], 200, 160);
    expect(g.points[0].isToday).toBe(false);
    expect(g.points[1].isToday).toBe(true);
  });
});
