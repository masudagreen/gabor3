/**
 * HistoryScreen.test.tsx — v3.0 履歴タブ（S8、F-09 グラフ部 / screens.md S8-1）。
 *
 * - 永続化（DailyStats / Streak / PlayStats / LevelState）を読み込み、StatTile・折れ線・
 *   当日強調・データ少時案内を表示する（F-09 受け入れ基準）。
 * - 同日 max は historyView（DailyStats.highestLevelReached）で確定済み。
 * - バッジ部は S9 のため本 S8 ではプレースホルダ表示。
 *
 * AsyncStorage はインメモリモック（jest.setup.ts）。repository の save で seed する。
 */

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { HistoryScreen } from '../../../src/screens/v3/HistoryScreen';
import {
  saveDailyStats,
  saveStreak,
  savePlayStats,
  saveLevelState,
  saveBadgeStatus,
} from '../../../src/state/v3/repository';

const NOW = () => new Date(2026, 5, 10, 12, 0, 0); // ローカル 2026-06-10

function renderHistory() {
  return render(
    <ThemeProvider preference="dark" systemScheme="dark">
      <HistoryScreen now={NOW} testId="hist" />
    </ThemeProvider>,
  );
}

async function seedDays(
  days: { date: string; level: number; count?: number }[],
) {
  for (const d of days) {
    await saveDailyStats({
      date: d.date,
      highestLevelReached: d.level,
      sessionCount: d.count ?? 1,
      roundCount: d.count ?? 1,
    });
  }
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('HistoryScreen 完全初期（0 ゲーム）', () => {
  it('最高 0・連続 0 日・累計 0 回 + データ少時案内（F-09）', async () => {
    renderHistory();
    await waitFor(() => expect(screen.getByTestId('hist-title')).toBeTruthy());

    // StatTile aria-label に 0 が出る
    expect(screen.getByLabelText('最高到達レベル 0')).toBeTruthy();
    expect(screen.getByLabelText('連続日数 0 日')).toBeTruthy();
    expect(screen.getByLabelText('累計プレイ回数 0 回')).toBeTruthy();

    // 7 日未満の傾向案内
    expect(screen.getByTestId('hist-trend-hint')).toBeTruthy();
    expect(
      screen.getByText('もう少しデータが集まると傾向が見えます'),
    ).toBeTruthy();
  });
});

describe('HistoryScreen 集計値の表示（F-09）', () => {
  it('最高到達レベル / 連続日数 / 累計プレイ回数 / 累計ゲーム時間を永続化から表示', async () => {
    await saveLevelState({ currentLevel: 26, consecutiveFailures: 0, highestLevel: 25 });
    await saveStreak({ currentStreak: 5, longestStreak: 7, lastPlayedDate: '2026-06-10' });
    // 7320 秒 = 2 時間 2 分。
    await savePlayStats({ totalSessions: 37, totalRounds: 120, totalPlaySec: 7320 });
    await seedDays([
      { date: '2026-06-08', level: 12 },
      { date: '2026-06-09', level: 18 },
      { date: '2026-06-10', level: 20, count: 3 },
    ]);

    renderHistory();
    await waitFor(() => expect(screen.getByTestId('hist-title')).toBeTruthy());

    expect(screen.getByLabelText('最高到達レベル 25')).toBeTruthy();
    expect(screen.getByLabelText('連続日数 5 日')).toBeTruthy();
    expect(screen.getByLabelText('累計プレイ回数 37 回')).toBeTruthy();
    // 累計ゲーム時間（パッチを見ている時間の合計）。
    expect(screen.getByLabelText('累計ゲーム時間 2時間2分')).toBeTruthy();
    // 最高到達レベル数値タイルの値
    expect(screen.getByTestId('hist-highest-value').props.children).toBe('25');
    expect(screen.getByTestId('hist-total-value').props.children).toBe('37');
    expect(screen.getByTestId('hist-streak-value').props.children).toBe('5');
    expect(screen.getByTestId('hist-playtime-value').props.children).toBe('2時間2分');
  });
});

describe('HistoryScreen グラフ（CH-1、F-09）', () => {
  it('7 日以上のデータで傾向案内を出さず、グラフ aria に最新到達レベル・最高到達レベルを含む', async () => {
    await saveLevelState({ currentLevel: 9, consecutiveFailures: 0, highestLevel: 8 });
    const days = Array.from({ length: 8 }, (_, i) => ({
      date: `2026-06-0${i + 3}`,
      level: i + 1,
    }));
    await seedDays(days);

    renderHistory();
    await waitFor(() => expect(screen.getByTestId('hist-title')).toBeTruthy());

    // 7 日以上 → 傾向案内なし
    expect(screen.queryByTestId('hist-trend-hint')).toBeNull();

    // グラフ aria 要約に最新到達レベル（8 = 6/10）と最高到達レベル（8）
    const chart = screen.getByTestId('hist-chart');
    expect(chart.props.accessibilityLabel).toContain('最新');
    expect(chart.props.accessibilityLabel).toContain('レベル 8');
    expect(chart.props.accessibilityLabel).toContain('最高到達レベル 8');
  });

  it('当日の点が ◆ で強調表示される（color + 形、NF-12）', async () => {
    await saveLevelState({ currentLevel: 21, consecutiveFailures: 0, highestLevel: 20 });
    await seedDays([
      { date: '2026-06-09', level: 10 },
      { date: '2026-06-10', level: 20 },
    ]);

    renderHistory();
    await waitFor(() => expect(screen.getByTestId('hist-title')).toBeTruthy());

    // jsdom はレイアウトを持たないため onLayout を手動発火してプロット幅を与える。
    fireEvent(screen.getByTestId('hist-chart-plot-area'), 'layout', {
      nativeEvent: { layout: { width: 240, height: 180, x: 0, y: 0 } },
    });

    // 当日点には today サフィックスの testID が付く
    await waitFor(() =>
      expect(screen.getByTestId('hist-chart-point-today')).toBeTruthy(),
    );
    const todayPt = screen.getByTestId('hist-chart-point-today');
    // ◆ = 角丸 0（円ではない）+ 45 度回転で形を区別
    const flat = Array.isArray(todayPt.props.style)
      ? Object.assign({}, ...todayPt.props.style)
      : todayPt.props.style;
    expect(flat.borderRadius).toBe(0);
  });
});

describe('HistoryScreen バッジ部（S9、F-09 バッジ部 / screens.md S9-1）', () => {
  it('全 11 バッジを 3 軸見出し付きで表示する', async () => {
    renderHistory();
    await waitFor(() => expect(screen.getByTestId('hist-title')).toBeTruthy());
    expect(screen.getByText('バッジ')).toBeTruthy();

    // 3 軸見出し（色＋テキスト、NF-12）
    expect(screen.getByTestId('hist-badges-axis-streak')).toBeTruthy();
    expect(screen.getByTestId('hist-badges-axis-difficulty')).toBeTruthy();
    expect(screen.getByTestId('hist-badges-axis-level')).toBeTruthy();

    // 全 11 セル
    for (const id of [
      'B-01', 'B-02', 'B-03', 'B-04', 'B-05',
      'B-06', 'B-07', 'B-08', 'B-09', 'B-10', 'B-11',
    ]) {
      expect(screen.getByTestId(`hist-badges-cell-${id}`)).toBeTruthy();
    }
  });

  it('全未獲得（初期）は全セル 🔒 + ヒント、獲得済みは 🏅 + 獲得日', async () => {
    await saveBadgeStatus({
      badgeId: 'B-01',
      earned: true,
      earnedAt: '2026-06-10T03:00:00.000Z',
    });
    renderHistory();
    await waitFor(() => expect(screen.getByTestId('hist-title')).toBeTruthy());

    // 獲得済み B-01：aria-label が「獲得済み」を含み、status に獲得日。
    const earnedCell = screen.getByTestId('hist-badges-cell-B-01');
    expect(earnedCell.props.accessibilityLabel).toContain('獲得済み');
    expect(
      screen.getByTestId('hist-badges-cell-B-01-status').props.children,
    ).toContain('獲得');

    // 未獲得 B-02：aria-label が「未獲得」を含み、status にヒント（色のみ非依存、NF-12）。
    const lockedCell = screen.getByTestId('hist-badges-cell-B-02');
    expect(lockedCell.props.accessibilityLabel).toContain('未獲得');
    expect(
      screen.getByTestId('hist-badges-cell-B-02-status').props.children,
    ).toContain('3 日連続');
  });

  it('未獲得セルをタップすると条件全文が展開される（screens.md S9-1）', async () => {
    renderHistory();
    await waitFor(() => expect(screen.getByTestId('hist-title')).toBeTruthy());
    const cell = screen.getByTestId('hist-badges-cell-B-09');
    expect(screen.queryByTestId('hist-badges-cell-B-09-condition')).toBeNull();
    fireEvent.press(cell);
    expect(screen.getByTestId('hist-badges-cell-B-09-condition')).toBeTruthy();
  });
});
