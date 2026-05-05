/**
 * spec.md §9.2 週次グラフ集計のテスト。
 * - buildLast28DaysChart：28 日連続のデータポイントを返す
 * - summarizeChart：今日 / 平均 / 最大の集計
 * - getIsoWeekStart：A-6 ISO 週（月曜開始）
 * - buildLast4Weeks：過去 4 週間の集計
 */

import { DailyStats } from '../../src/state/storage';
import {
  buildLast28DaysChart,
  buildLast4Weeks,
  formatDateLocal,
  getIsoWeekStart,
  summarizeChart,
} from '../../src/lib/weeklyStats';

describe('weeklyStats: 28 日チャート生成', () => {
  it('空のデータでも 28 件返す（全て score=null）', () => {
    const today = new Date(2026, 3, 29); // 2026-04-29
    const points = buildLast28DaysChart([], today);
    expect(points).toHaveLength(28);
    expect(points.every((p) => p.score === null)).toBe(true);
    // 末尾は今日
    expect(points[27].date).toBe('2026-04-29');
    // 先頭は 27 日前
    expect(points[0].date).toBe('2026-04-02');
  });

  it('当日と数日前のデータがチャートに反映される', () => {
    const today = new Date(2026, 3, 29);
    const stats: DailyStats[] = [
      {
        date: '2026-04-29',
        courseCompleted: true,
        game1BestThreshold: 4,
        game2BestThreshold: 4.2,
        game3BestThreshold: 12,
        v1Score: 76,
        sessionCount: 1,
      },
      {
        date: '2026-04-22',
        courseCompleted: true,
        game1BestThreshold: 5,
        game2BestThreshold: 5,
        game3BestThreshold: 15,
        v1Score: 65,
        sessionCount: 1,
      },
    ];
    const points = buildLast28DaysChart(stats, today);
    expect(points[27].score).toBe(76); // 当日
    expect(points[20].score).toBe(65); // 7 日前
    // 他の日は null
    expect(points[0].score).toBeNull();
    expect(points[26].score).toBeNull();
  });

  it('summarizeChart：今日 / 平均 / 最大を計算する', () => {
    const today = new Date(2026, 3, 29);
    const stats: DailyStats[] = [
      mkStat('2026-04-29', 76),
      mkStat('2026-04-28', 50),
      mkStat('2026-04-27', 60),
    ];
    const summary = summarizeChart(buildLast28DaysChart(stats, today));
    expect(summary.todayScore).toBe(76);
    expect(summary.daysWithData).toBe(3);
    expect(summary.average).toBe(62); // round((76+50+60)/3) = 62
    expect(summary.max).toBe(76);
    expect(summary.maxDate).toBe('2026-04-29');
  });

  it('summarizeChart：データ 0 件で全 null', () => {
    const today = new Date(2026, 3, 29);
    const summary = summarizeChart(buildLast28DaysChart([], today));
    expect(summary.todayScore).toBeNull();
    expect(summary.daysWithData).toBe(0);
    expect(summary.average).toBeNull();
    expect(summary.max).toBeNull();
  });
});

describe('weeklyStats: ISO 週（A-6）', () => {
  it('水曜日（2026-04-29 = Wed）→ 月曜（2026-04-27）', () => {
    const wed = new Date(2026, 3, 29);
    expect(formatDateLocal(getIsoWeekStart(wed))).toBe('2026-04-27');
  });
  it('日曜日（2026-05-03 = Sun）→ 前週月曜（2026-04-27）', () => {
    const sun = new Date(2026, 4, 3);
    expect(formatDateLocal(getIsoWeekStart(sun))).toBe('2026-04-27');
  });
  it('月曜日（2026-04-27 = Mon）→ そのまま', () => {
    const mon = new Date(2026, 3, 27);
    expect(formatDateLocal(getIsoWeekStart(mon))).toBe('2026-04-27');
  });
});

describe('weeklyStats: 4 週間集計', () => {
  it('4 週間を週順（古→新）で 4 件返す', () => {
    const today = new Date(2026, 3, 29);
    const weeks = buildLast4Weeks([], today);
    expect(weeks).toHaveLength(4);
    expect(weeks[3].weekStart).toBe('2026-04-27'); // 今週月曜
    expect(weeks[0].weekStart).toBe('2026-04-06'); // 3 週前月曜
    expect(weeks.every((w) => w.bestScore === null)).toBe(true);
  });

  it('当週内の日次値からベスト・平均を計算', () => {
    const today = new Date(2026, 3, 29); // Wed
    const stats: DailyStats[] = [
      mkStat('2026-04-27', 50), // Mon
      mkStat('2026-04-28', 60), // Tue
      mkStat('2026-04-29', 76), // Wed
    ];
    const weeks = buildLast4Weeks(stats, today);
    expect(weeks[3].bestScore).toBe(76);
    expect(weeks[3].average).toBe(62); // (50+60+76)/3 = 62
    expect(weeks[3].daysWithData).toBe(3);
  });
});

function mkStat(date: string, score: number): DailyStats {
  return {
    date,
    courseCompleted: true,
    game1BestThreshold: null,
    game2BestThreshold: null,
    game3BestThreshold: null,
    v1Score: score,
    sessionCount: 1,
  };
}
