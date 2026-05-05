/**
 * 日次ベスト計算ヘルパー（spec.md §9.3 / screens.md S6-05, S6-06）。
 *
 * DailyStats から各ゲームの「今日のベスト閾値」と「今日の V1 スコア」を取り出す
 * 薄いラッパ。permanentlogic は upsertDailyStats 側にあるため、ここは読み出しと
 * UI 向けの整形だけを担う。
 */
import { DailyStats } from '../state/storage';
import { formatDateLocal } from './weeklyStats';

export type DailyBestSnapshot = {
  /** YYYY-MM-DD */
  date: string;
  game1Best: number | null;
  game2Best: number | null;
  game3Best: number | null;
  v1Score: number | null;
};

/** 当日の DailyStats を抽出して DailyBestSnapshot に整形（無ければ全 null） */
export function getTodayBest(
  stats: DailyStats[],
  today: Date = new Date(),
): DailyBestSnapshot {
  const date = formatDateLocal(today);
  const stat = stats.find((s) => s.date === date);
  return {
    date,
    game1Best: stat?.game1BestThreshold ?? null,
    game2Best: stat?.game2BestThreshold ?? null,
    game3Best: stat?.game3BestThreshold ?? null,
    v1Score: stat?.v1Score ?? null,
  };
}

/** 過去 7 日間（今日含む）の日次ベストを古→新順で返す */
export function getRecent7DaysBest(
  stats: DailyStats[],
  today: Date = new Date(),
): DailyBestSnapshot[] {
  const map = new Map<string, DailyStats>();
  for (const s of stats) map.set(s.date, s);
  const out: DailyBestSnapshot[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = formatDateLocal(d);
    const stat = map.get(key);
    out.push({
      date: key,
      game1Best: stat?.game1BestThreshold ?? null,
      game2Best: stat?.game2BestThreshold ?? null,
      game3Best: stat?.game3BestThreshold ?? null,
      v1Score: stat?.v1Score ?? null,
    });
  }
  return out;
}
