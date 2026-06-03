/**
 * historyView.test.ts — 履歴タブ表示用データ整形（spec F-09 グラフ部 / §6.5）。
 *
 * DailyStats → 折れ線系列の変換を検証する：
 *  - 同日 max（DailyStats が保持済みの代表値をそのまま使う）
 *  - 直近 N 日窓（窓外・未来日の除外、欠損日は点を作らない）
 *  - 当日強調フラグ
 *  - データ少時の傾向案内閾値（7 日未満）
 *  - グラフ要約（aria-label 用）
 */

import {
  buildHistoryView,
  buildHistoryViewAt,
  historyChartSummary,
  shortDateLabel,
  HISTORY_WINDOW_DAYS,
  MIN_DAYS_FOR_TREND,
} from '../../../src/lib/v2/historyView';
import type { DailyStats } from '../../../src/state/schema';

function daily(date: string, best: number, count = 1): DailyStats {
  return { date, bestSessionScore: best, sessionCount: count };
}

describe('buildHistoryView — 系列変換', () => {
  it('DailyStats を日付昇順に並べ替えてプロット点へ変換する', () => {
    const data = [daily('2026-05-28', 70), daily('2026-05-26', 50), daily('2026-05-30', 86)];
    const view = buildHistoryView(data, '2026-05-30');
    expect(view.points.map((p) => p.date)).toEqual([
      '2026-05-26',
      '2026-05-28',
      '2026-05-30',
    ]);
    expect(view.points.map((p) => p.score)).toEqual([50, 70, 86]);
  });

  it('DailyStats.bestSessionScore（同日 max 済み）をそのまま代表値に使う', () => {
    // §6.5：同日複数セッションの max は DailyStats 側で確定済み。本層は集計しない。
    const view = buildHistoryView([daily('2026-05-30', 92, 4)], '2026-05-30');
    expect(view.points[0].score).toBe(92);
  });

  it('直近 N 日窓より古い日は除外する', () => {
    const data = [
      daily('2026-05-01', 40), // 30 日窓の外（today=05-30, 窓 = 05-01..05-30）→ 境界内
      daily('2026-04-30', 30), // 窓外
      daily('2026-05-30', 80),
    ];
    const view = buildHistoryView(data, '2026-05-30', { windowDays: 30 });
    expect(view.points.map((p) => p.date)).toEqual(['2026-05-01', '2026-05-30']);
  });

  it('窓の両端を含む（today と (windowDays-1) 日前）', () => {
    const view = buildHistoryView(
      [daily('2026-05-24', 50), daily('2026-05-30', 90)],
      '2026-05-30',
      { windowDays: 7 }, // 窓 = 05-24..05-30
    );
    expect(view.points.map((p) => p.date)).toEqual(['2026-05-24', '2026-05-30']);
  });

  it('窓の 1 日外（古い側）は除外される', () => {
    const view = buildHistoryView(
      [daily('2026-05-23', 50), daily('2026-05-30', 90)],
      '2026-05-30',
      { windowDays: 7 }, // 窓 = 05-24..05-30。05-23 は外
    );
    expect(view.points.map((p) => p.date)).toEqual(['2026-05-30']);
  });

  it('未来日（時計巻き戻し等）は除外する', () => {
    const view = buildHistoryView(
      [daily('2026-05-31', 99), daily('2026-05-30', 80)],
      '2026-05-30',
    );
    expect(view.points.map((p) => p.date)).toEqual(['2026-05-30']);
  });

  it('欠損日（プレイしなかった日）は点を作らない（実データのみ結ぶ）', () => {
    const view = buildHistoryView(
      [daily('2026-05-25', 60), daily('2026-05-28', 70)],
      '2026-05-30',
      { windowDays: 7 },
    );
    expect(view.points).toHaveLength(2);
    expect(view.dataDayCount).toBe(2);
  });

  it('データなしのとき空系列・dataDayCount=0', () => {
    const view = buildHistoryView([], '2026-05-30');
    expect(view.points).toEqual([]);
    expect(view.dataDayCount).toBe(0);
  });
});

describe('buildHistoryView — 当日強調', () => {
  it('today と一致する点のみ isToday=true（色 + ◆ 形で強調）', () => {
    const view = buildHistoryView(
      [daily('2026-05-28', 70), daily('2026-05-30', 86)],
      '2026-05-30',
    );
    const byDate = Object.fromEntries(view.points.map((p) => [p.date, p.isToday]));
    expect(byDate['2026-05-28']).toBe(false);
    expect(byDate['2026-05-30']).toBe(true);
  });

  it('当日にデータが無ければ isToday=true の点は存在しない', () => {
    const view = buildHistoryView([daily('2026-05-28', 70)], '2026-05-30');
    expect(view.points.some((p) => p.isToday)).toBe(false);
  });
});

describe('buildHistoryView — データ少時案内（閾値）', () => {
  it('実データ 7 日未満は showTrendHint=true', () => {
    const data = Array.from({ length: 6 }, (_, i) =>
      daily(`2026-05-${String(25 + i).padStart(2, '0')}`, 50 + i),
    );
    const view = buildHistoryView(data, '2026-05-30');
    expect(view.dataDayCount).toBe(6);
    expect(view.showTrendHint).toBe(true);
  });

  it('実データ 7 日ちょうどで showTrendHint=false（閾値境界）', () => {
    const data = Array.from({ length: 7 }, (_, i) =>
      daily(`2026-05-${String(24 + i).padStart(2, '0')}`, 50 + i),
    );
    const view = buildHistoryView(data, '2026-05-30');
    expect(view.dataDayCount).toBe(7);
    expect(view.showTrendHint).toBe(false);
  });

  it('0 日（完全初期）は showTrendHint=true', () => {
    expect(buildHistoryView([], '2026-05-30').showTrendHint).toBe(true);
  });

  it('閾値はオプションで上書きできる', () => {
    const view = buildHistoryView([daily('2026-05-30', 80)], '2026-05-30', {
      minDaysForTrend: 1,
    });
    expect(view.showTrendHint).toBe(false);
  });
});

describe('buildHistoryViewAt — Date 注入', () => {
  it('Date のローカル日付を today として扱う', () => {
    const now = new Date(2026, 4, 30); // 2026-05-30 ローカル
    const view = buildHistoryViewAt([daily('2026-05-30', 88)], now);
    expect(view.points[0].isToday).toBe(true);
  });
});

describe('historyChartSummary — aria-label 用要約', () => {
  it('最新点（系列末尾）と日数を返す', () => {
    const view = buildHistoryView(
      [daily('2026-05-28', 70), daily('2026-05-30', 86)],
      '2026-05-30',
    );
    expect(historyChartSummary(view)).toEqual({
      latestDate: '2026-05-30',
      latestScore: 86,
      dayCount: 2,
    });
  });

  it('空系列では null', () => {
    expect(historyChartSummary(buildHistoryView([], '2026-05-30'))).toBeNull();
  });
});

describe('shortDateLabel', () => {
  it('YYYY-MM-DD を M/D に短縮する', () => {
    expect(shortDateLabel('2026-05-30')).toBe('5/30');
    expect(shortDateLabel('2026-12-09')).toBe('12/9');
  });
});

describe('定数', () => {
  it('窓 30 日・案内閾値 7 日（spec §7 / F-09）', () => {
    expect(HISTORY_WINDOW_DAYS).toBe(30);
    expect(MIN_DAYS_FOR_TREND).toBe(7);
  });
});
