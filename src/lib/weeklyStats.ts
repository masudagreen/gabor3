/**
 * 週次・日次集計ヘルパー（spec.md §9.2 / A-6）。
 *
 * 過去 28 日（4 週間）の V1 スコア折れ線データを生成する。
 * 「日付」は端末ローカルの YYYY-MM-DD で扱う（A-6）。
 * ISO 週は月曜開始だが、本ヘルパーでは「直近 28 日」を日単位で並べる。
 */

import { DailyStats } from '../state/storage';

/** 日付を YYYY-MM-DD 形式に変換（端末ローカルタイムゾーン） */
export function formatDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 1 日加算した Date を返す（純関数） */
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export type ChartDataPoint = {
  /** YYYY-MM-DD */
  date: string;
  /** その日の V1 スコア。データなしは null */
  score: number | null;
};

/**
 * 過去 28 日の V1 スコア折れ線データを生成。
 *
 * @param stats - DailyStats 全件
 * @param today - 当日（端末ローカル）。デフォルトは new Date()
 * @returns 28 件の ChartDataPoint。日付昇順、欠損日は score=null
 */
export function buildLast28DaysChart(
  stats: DailyStats[],
  today: Date = new Date(),
): ChartDataPoint[] {
  const byDate = new Map<string, DailyStats>();
  for (const s of stats) byDate.set(s.date, s);
  const points: ChartDataPoint[] = [];
  for (let i = 27; i >= 0; i--) {
    const d = addDays(today, -i);
    const key = formatDateLocal(d);
    const stat = byDate.get(key);
    points.push({ date: key, score: stat?.v1Score ?? null });
  }
  return points;
}

/**
 * チャートデータからサマリ統計を計算。
 *   - todayScore: 当日のスコア（null 許容）
 *   - daysWithData: スコア値がある日の件数
 *   - average: スコア値がある日の平均（整数四捨五入、null 許容）
 *   - max: スコア値の最大（null 許容）
 *   - maxDate: 最大スコアの日付（複数日同点時は新しい方）
 */
export type ChartSummary = {
  todayScore: number | null;
  daysWithData: number;
  average: number | null;
  max: number | null;
  maxDate: string | null;
};

export function summarizeChart(points: ChartDataPoint[]): ChartSummary {
  const today = points[points.length - 1];
  const valid = points.filter((p) => p.score != null) as Array<{
    date: string;
    score: number;
  }>;
  if (valid.length === 0) {
    return {
      todayScore: today?.score ?? null,
      daysWithData: 0,
      average: null,
      max: null,
      maxDate: null,
    };
  }
  const sum = valid.reduce((a, p) => a + p.score, 0);
  const avg = Math.round(sum / valid.length);
  // 最大値（複数候補は配列末尾＝最新を採用）
  let max = valid[0].score;
  let maxDate = valid[0].date;
  for (const p of valid) {
    if (p.score >= max) {
      max = p.score;
      maxDate = p.date;
    }
  }
  return {
    todayScore: today?.score ?? null,
    daysWithData: valid.length,
    average: avg,
    max,
    maxDate,
  };
}

/**
 * ISO 週（月曜始まり、A-6）の開始日（月曜）を返す。
 * 純関数、入力 Date は変更しない。
 */
export function getIsoWeekStart(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  const day = r.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day; // Sun→-6、Mon→0、Tue→-1 ...
  r.setDate(r.getDate() + diff);
  return r;
}

/**
 * 過去 4 週間（4 ISO 週）の週次集計を返す。
 *   - weekStart: その週の月曜（YYYY-MM-DD）
 *   - bestScore: その週内の最大 V1 スコア（データなしは null）
 *   - average:   その週内のスコア平均（データなしは null、整数四捨五入）
 *   - daysWithData: その週内でスコアがある日数
 *
 * 配列は週順（古い → 新しい）で 4 件返す。
 */
export type WeeklyAggregate = {
  weekStart: string;
  bestScore: number | null;
  average: number | null;
  daysWithData: number;
};

export function buildLast4Weeks(
  stats: DailyStats[],
  today: Date = new Date(),
): WeeklyAggregate[] {
  const byDate = new Map<string, DailyStats>();
  for (const s of stats) byDate.set(s.date, s);

  const thisWeekStart = getIsoWeekStart(today);
  const result: WeeklyAggregate[] = [];
  for (let w = 3; w >= 0; w--) {
    const weekStart = addDays(thisWeekStart, -7 * w);
    const scores: number[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      const stat = byDate.get(formatDateLocal(d));
      if (stat?.v1Score != null) scores.push(stat.v1Score);
    }
    const best = scores.length === 0 ? null : Math.max(...scores);
    const avg =
      scores.length === 0
        ? null
        : Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    result.push({
      weekStart: formatDateLocal(weekStart),
      bestScore: best,
      average: avg,
      daysWithData: scores.length,
    });
  }
  return result;
}
