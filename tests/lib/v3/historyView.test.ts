/**
 * historyView.test.ts — v3.0 履歴ビュー整形（F-09、純関数）。
 *
 * DailyStats（highestLevelReached = クリア基準 max）→ 折れ線系列（日付昇順・直近 N 日窓・
 * 当日強調）への変換、データ少時案内（7 日未満）、aria 要約を検証する。
 */

import {
  buildHistoryView,
  buildHistoryViewAt,
  shortDateLabel,
  historyChartSummary,
  HISTORY_WINDOW_DAYS,
  MIN_DAYS_FOR_TREND,
} from '../../../src/lib/v3/historyView';
import type { DailyStats } from '../../../src/state/v3/schema';

const ds = (date: string, level: number, count = 1): DailyStats => ({
  date,
  highestLevelReached: level,
  sessionCount: count,
  roundCount: count,
});

describe('buildHistoryView（日次到達レベル系列、F-09）', () => {
  it('日付昇順に並べ、highestLevelReached を level として採用する（同日 max 済み）', () => {
    const daily = [ds('2026-06-10', 20), ds('2026-06-08', 12), ds('2026-06-09', 18)];
    const view = buildHistoryView(daily, '2026-06-10');
    expect(view.points.map((p) => [p.date, p.level])).toEqual([
      ['2026-06-08', 12],
      ['2026-06-09', 18],
      ['2026-06-10', 20],
    ]);
  });

  it('当日（today）の点に isToday=true を立てる（グラフ強調用）', () => {
    const view = buildHistoryView(
      [ds('2026-06-09', 10), ds('2026-06-10', 15)],
      '2026-06-10',
    );
    expect(view.points.find((p) => p.date === '2026-06-10')?.isToday).toBe(true);
    expect(view.points.find((p) => p.date === '2026-06-09')?.isToday).toBe(false);
  });

  it('直近 N 日窓より古い日・未来日を除外する', () => {
    const old = '2026-05-01'; // 30 日窓の外
    const future = '2026-06-11';
    const view = buildHistoryView(
      [ds(old, 5), ds('2026-06-10', 20), ds(future, 99)],
      '2026-06-10',
    );
    expect(view.points.map((p) => p.date)).toEqual(['2026-06-10']);
  });

  it('データ 7 日未満で showTrendHint=true（F-09 案内）', () => {
    const daily = Array.from({ length: 6 }, (_, i) =>
      ds(`2026-06-0${i + 4}`, 10 + i),
    );
    const view = buildHistoryView(daily, '2026-06-10');
    expect(view.dataDayCount).toBe(6);
    expect(view.showTrendHint).toBe(true);
  });

  it('データ 7 日以上で showTrendHint=false', () => {
    const daily = Array.from({ length: 7 }, (_, i) =>
      ds(`2026-06-0${i + 4}`, 10 + i),
    );
    const view = buildHistoryView(daily, '2026-06-10');
    expect(view.dataDayCount).toBe(7);
    expect(view.showTrendHint).toBe(false);
  });

  it('空データ → 系列空・showTrendHint=true', () => {
    const view = buildHistoryView([], '2026-06-10');
    expect(view.points).toEqual([]);
    expect(view.showTrendHint).toBe(true);
  });

  it('既定の窓・閾値は spec 値（30 日 / 7 日）', () => {
    expect(HISTORY_WINDOW_DAYS).toBe(30);
    expect(MIN_DAYS_FOR_TREND).toBe(7);
  });
});

describe('buildHistoryViewAt（Date 注入ラッパー）', () => {
  it('Date を YYYY-MM-DD に変換して buildHistoryView と同等', () => {
    const now = new Date(2026, 5, 10, 23, 0, 0); // ローカル 2026-06-10
    const view = buildHistoryViewAt([ds('2026-06-10', 25)], now);
    expect(view.points).toEqual([
      { date: '2026-06-10', level: 25, isToday: true },
    ]);
  });
});

describe('shortDateLabel', () => {
  it('YYYY-MM-DD → M/D', () => {
    expect(shortDateLabel('2026-06-09')).toBe('6/9');
    expect(shortDateLabel('2026-12-25')).toBe('12/25');
  });
});

describe('historyChartSummary（aria 要約、F-09 a11y）', () => {
  it('最新点とデータ日数を返す', () => {
    const view = buildHistoryView(
      [ds('2026-06-09', 10), ds('2026-06-10', 25)],
      '2026-06-10',
    );
    expect(historyChartSummary(view)).toEqual({
      latestDate: '2026-06-10',
      latestLevel: 25,
      dayCount: 2,
    });
  });

  it('空系列は null', () => {
    expect(historyChartSummary(buildHistoryView([], '2026-06-10'))).toBeNull();
  });
});
