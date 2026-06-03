/**
 * chartGeometry.ts — 折れ線グラフの座標計算（純関数、CH-1 / F-09）。
 *
 * View ベース（SVG 非依存・Expo Go / SDK 54 互換）で折れ線を描くため、各データ点の
 * プロット座標と、点間を結ぶ線分（長さ・角度）を計算する。描画コンポーネント
 * （LineChart）は本関数の出力をそのまま絶対配置 View に渡すだけにする。
 *
 * Y 軸は 0〜100 固定（日次スコア、F-09）。X 軸は点を等間隔に並べる（欠損日は
 * historyView 側で既に除外済み＝実データ点のみ）。座標系は左上原点（RN レイアウト準拠）。
 */

import type { HistoryPoint } from './historyView';

export type PlotPoint = {
  date: string;
  score: number;
  isToday: boolean;
  /** プロット領域内の x（px、左原点） */
  x: number;
  /** プロット領域内の y（px、上原点。score=100 が上端、0 が下端） */
  y: number;
};

export type PlotSegment = {
  /** 始点 x */
  x: number;
  /** 始点 y */
  y: number;
  /** 線分長（px） */
  length: number;
  /** 水平からの角度（度、時計回り正。RN の rotate に渡す） */
  angleDeg: number;
};

export type ChartGeometry = {
  points: PlotPoint[];
  segments: PlotSegment[];
  width: number;
  height: number;
};

const SCORE_MAX = 100;

/**
 * プロット座標を計算する。
 *
 * @param points 日付昇順の系列（historyView.points）。
 * @param width  プロット領域の幅（px、Y 軸ラベル領域を除いた内側）。
 * @param height プロット領域の高さ（px）。
 */
export function computeChartGeometry(
  points: readonly HistoryPoint[],
  width: number,
  height: number,
): ChartGeometry {
  const n = points.length;

  const plotted: PlotPoint[] = points.map((p, i) => {
    // 点が 1 個なら中央。複数なら左右端に等間隔配置。
    const x = n <= 1 ? width / 2 : (width * i) / (n - 1);
    const clamped = Math.max(0, Math.min(SCORE_MAX, p.score));
    const y = height - (clamped / SCORE_MAX) * height;
    return { date: p.date, score: p.score, isToday: p.isToday, x, y };
  });

  const segments: PlotSegment[] = [];
  for (let i = 0; i < plotted.length - 1; i++) {
    const a = plotted[i];
    const b = plotted[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    segments.push({ x: a.x, y: a.y, length, angleDeg });
  }

  return { points: plotted, segments, width, height };
}
