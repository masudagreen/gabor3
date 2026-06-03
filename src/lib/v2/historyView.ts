/**
 * historyView.ts — 履歴タブ（F-09 グラフ部）の表示用データ整形（純関数、spec §6.5/§7）。
 *
 * 永続化済みの DailyStats（その日の最良スコア max・件数、spec §6.5）を受け取り、
 * 折れ線グラフ用の系列（日付順・直近 N 日窓・当日強調フラグ）に変換する。
 * 同日複数セッションは DailyStats.bestSessionScore が既に max を保持しているため、
 * 本層は max 済みの値をそのまま日付順に並べるだけでよい。
 *
 * 日付依存（「当日」「直近 N 日」）はテスト可能にするため today（YYYY-MM-DD）を引数で受ける。
 * Streak.currentStreak / PlayStats.totalSessions はそのまま表示するため整形不要。
 */

import { localDateString, parseLocalDate } from './dateUtil';
import type { DailyStats } from '../../state/schema';

/** グラフにプロットする 1 点（日付 + その日の代表スコア + 当日フラグ）。 */
export type HistoryPoint = {
  /** YYYY-MM-DD（端末ローカル） */
  date: string;
  /** その日の代表スコア（DailyStats.bestSessionScore = max） */
  score: number;
  /** today と一致する点（当日強調用、色 + ◆ 形） */
  isToday: boolean;
};

/** 履歴タブが描画に必要とする整形済みビューモデル。 */
export type HistoryView = {
  /** 日付昇順の系列（直近 windowDays 日のうち実データがある日のみ） */
  points: HistoryPoint[];
  /** データが少なく傾向案内を出すべきか（実データ日数 < minDaysForTrend） */
  showTrendHint: boolean;
  /** 観測された実データの日数（中断除く完了セッションがあった日数） */
  dataDayCount: number;
};

/** 履歴タブのデフォルト窓・閾値（spec §7 / screens.md S7-1）。 */
export const HISTORY_WINDOW_DAYS = 30;
/** データ少時案内の閾値（spec F-09「目安 7 日未満」）。 */
export const MIN_DAYS_FOR_TREND = 7;

/**
 * 直近 N 日窓に入る DailyStats だけを日付昇順に並べ替えてプロット点へ変換する。
 *
 * 「直近 N 日窓」= today から (windowDays - 1) 日前まで（両端含む）。窓より古い日や
 * 未来日（時計巻き戻し等）は除外する。欠損日（プレイしなかった日）は点を作らない
 * （折れ線は実データ点のみを結ぶ）。
 *
 * @param allDaily 全 DailyStats（順不同可）。bestSessionScore は max 済み（§6.5）。
 * @param today    当日の YYYY-MM-DD（端末ローカル）。
 * @param opts     窓日数 / 傾向案内閾値（既定は spec 値）。
 */
export function buildHistoryView(
  allDaily: readonly DailyStats[],
  today: string,
  opts?: { windowDays?: number; minDaysForTrend?: number },
): HistoryView {
  const windowDays = opts?.windowDays ?? HISTORY_WINDOW_DAYS;
  const minDaysForTrend = opts?.minDaysForTrend ?? MIN_DAYS_FOR_TREND;

  const todayMs = parseLocalDate(today).getTime();
  const msPerDay = 24 * 60 * 60 * 1000;
  const earliestMs = todayMs - (windowDays - 1) * msPerDay;

  const inWindow = allDaily.filter((d) => {
    const t = parseLocalDate(d.date).getTime();
    return t >= earliestMs && t <= todayMs;
  });

  const sorted = [...inWindow].sort(
    (a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime(),
  );

  const points: HistoryPoint[] = sorted.map((d) => ({
    date: d.date,
    score: d.bestSessionScore,
    isToday: d.date === today,
  }));

  return {
    points,
    dataDayCount: points.length,
    showTrendHint: points.length < minDaysForTrend,
  };
}

/** Date 注入版（実行時の便宜ラッパー）。 */
export function buildHistoryViewAt(
  allDaily: readonly DailyStats[],
  now: Date,
  opts?: { windowDays?: number; minDaysForTrend?: number },
): HistoryView {
  return buildHistoryView(allDaily, localDateString(now), opts);
}

/** 軸ラベル等に使う短い日付表記（M/D）。 */
export function shortDateLabel(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * グラフの aria-label 要約用データ（spec a11y：「過去 N 日の日次スコア。最新 {date} は {n} 点」）。
 * 最新点（系列末尾＝最も新しい日）とデータ日数を返す。空系列なら null。
 */
export function historyChartSummary(
  view: HistoryView,
): { latestDate: string; latestScore: number; dayCount: number } | null {
  if (view.points.length === 0) return null;
  const latest = view.points[view.points.length - 1];
  return {
    latestDate: latest.date,
    latestScore: latest.score,
    dayCount: view.dataDayCount,
  };
}
