/**
 * chartGeometry.ts — v3.0 到達レベル折れ線グラフの座標計算（純関数、CH-1 / F-09）。
 *
 * View ベース（SVG 非依存・Expo Go / SDK 54 互換）で折れ線を描くため、各データ点の
 * プロット座標と、点間を結ぶ線分（長さ・角度）を計算する。描画コンポーネント
 * （LevelLineChart）は本関数の出力をそのまま絶対配置 View に渡すだけにする。
 *
 * v2.0 の lib/v2/chartGeometry.ts は Y 軸 0〜100 固定（日次スコア）だったが、v3 は
 * **到達レベル（1〜720 まで取りうる）**のため、**動的 Y スケール**を採用する：
 *   - 表示期間の最高到達レベル（日次系列の最大 ∪ 最高到達レベル基準線）に余裕を持たせ、
 *     0 を下端、計算した上端値を Y 軸最大とする（screens.md S8-1：動的スケール）。
 *   - 軸目盛は 0 / 中間 / 上端 の 3 段（軸ラベル 18pt 以上は描画側）。
 *
 * 座標系は左上原点（RN レイアウト準拠）。最高到達レベル基準線（橙破線）も同スケールで
 * y 座標を計算する。
 */

import type { HistoryPoint } from './historyView';

export type PlotPoint = {
  date: string;
  level: number;
  isToday: boolean;
  /** プロット領域内の x（px、左原点）。 */
  x: number;
  /** プロット領域内の y（px、上原点。レベル=yMax が上端、0 が下端）。 */
  y: number;
};

export type PlotSegment = {
  /** 始点 x。 */
  x: number;
  /** 始点 y。 */
  y: number;
  /** 線分長（px）。 */
  length: number;
  /** 水平からの角度（度、時計回り正。RN の rotate に渡す）。 */
  angleDeg: number;
};

export type ChartGeometry = {
  points: PlotPoint[];
  segments: PlotSegment[];
  /** Y 軸の最大値（動的スケール上端）。軸ラベル・基準線が利用する。 */
  yMax: number;
  /** Y 軸目盛（上端 / 中間 / 0 の 3 値、大→小）。軸ラベル描画用。 */
  yTicks: [number, number, number];
  /** 最高到達レベル基準線の y 座標（破線描画用）。highestLevel<=0 なら null。 */
  highestLineY: number | null;
  width: number;
  height: number;
};

/**
 * 動的 Y 軸上端を決める（純関数）。
 *
 * 系列の最大到達レベルと最高到達レベル基準線のうち大きい方に「ヘッドルーム」を足し、
 * きりのよい値へ丸める。データが無く基準線も 0 のときは既定上端（10）を返す
 * （空グラフでも軸が潰れないように）。
 */
export function computeYMax(maxLevelInView: number, highestLevel: number): number {
  const peak = Math.max(maxLevelInView, highestLevel, 0);
  if (peak <= 0) return 10;
  // 1.15 倍のヘッドルームを確保し、5 の倍数（小さいうちは差が出る）へ切り上げる。
  const withHeadroom = peak * 1.15;
  const step = peak < 20 ? 5 : peak < 100 ? 10 : 50;
  return Math.max(step, Math.ceil(withHeadroom / step) * step);
}

/**
 * プロット座標を計算する。
 *
 * @param points       日付昇順の系列（historyView.points）。
 * @param highestLevel 最高到達レベル（LevelState.highestLevel）。基準線 + スケールに使う。
 * @param width        プロット領域の幅（px、Y 軸ラベル領域を除いた内側）。
 * @param height       プロット領域の高さ（px）。
 */
export function computeChartGeometry(
  points: readonly HistoryPoint[],
  highestLevel: number,
  width: number,
  height: number,
): ChartGeometry {
  const n = points.length;
  const maxLevelInView = points.reduce((m, p) => Math.max(m, p.level), 0);
  const yMax = computeYMax(maxLevelInView, highestLevel);

  const toY = (level: number): number => {
    const clamped = Math.max(0, Math.min(yMax, level));
    return height - (clamped / yMax) * height;
  };

  const plotted: PlotPoint[] = points.map((p, i) => {
    // 点が 1 個なら中央。複数なら左右端に等間隔配置。
    const x = n <= 1 ? width / 2 : (width * i) / (n - 1);
    return { date: p.date, level: p.level, isToday: p.isToday, x, y: toY(p.level) };
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

  const midTick = Math.round(yMax / 2);
  return {
    points: plotted,
    segments,
    yMax,
    yTicks: [yMax, midTick, 0],
    highestLineY: highestLevel > 0 ? toY(highestLevel) : null,
    width,
    height,
  };
}
