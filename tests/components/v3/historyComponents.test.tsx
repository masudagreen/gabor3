/**
 * historyComponents.test.tsx — S8 履歴コンポーネント（CH-1 / ST-1 / EM-1、F-09）。
 *
 * LevelLineChart：aria 要約・最高到達レベル基準線/凡例ラベル・点滅なし。
 * StatTile：数値 + ラベル + aria・最高到達レベル強調・連続日数の炎。
 * EmptyState：案内文言の表示。
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { LevelLineChart } from '../../../src/components/v3/LevelLineChart';
import { StatTile } from '../../../src/components/v3/StatTile';
import { EmptyState } from '../../../src/components/v3/EmptyState';
import { buildHistoryView } from '../../../src/lib/v3/historyView';

function dark(ui: React.ReactElement) {
  return render(
    <ThemeProvider preference="dark" systemScheme="dark">
      {ui}
    </ThemeProvider>,
  );
}

describe('LevelLineChart（CH-1 / F-09）', () => {
  it('aria-label に過去日数・最新到達レベル・最高到達レベルを含む', () => {
    const view = buildHistoryView(
      [
        { date: '2026-06-09', highestLevelReached: 10, sessionCount: 1, roundCount: 1 },
        { date: '2026-06-10', highestLevelReached: 20, sessionCount: 1, roundCount: 1 },
      ],
      '2026-06-10',
    );
    dark(<LevelLineChart view={view} highestLevel={25} testId="ch" />);
    const chart = screen.getByTestId('ch');
    expect(chart.props.accessibilityLabel).toBe(
      '過去 2 日の到達レベル。最新 6/10 は レベル 20。最高到達レベル 25',
    );
  });

  it('highestLevel>0 で凡例ラベル「最高 {n}」を表示（色のみ非依存）', () => {
    const view = buildHistoryView(
      [{ date: '2026-06-10', highestLevelReached: 5, sessionCount: 1, roundCount: 1 }],
      '2026-06-10',
    );
    dark(<LevelLineChart view={view} highestLevel={5} testId="ch" />);
    expect(screen.getByText('最高 5')).toBeTruthy();
  });

  it('空系列・最高 0 → aria は空案内、凡例ラベルなし', () => {
    const view = buildHistoryView([], '2026-06-10');
    dark(<LevelLineChart view={view} highestLevel={0} testId="ch" />);
    expect(screen.getByTestId('ch').props.accessibilityLabel).toContain(
      'まだ到達レベルのデータがありません',
    );
    expect(screen.queryByTestId('ch-highest-label')).toBeNull();
  });
});

describe('StatTile（ST-1 / F-09）', () => {
  it('数値 + ラベル + aria-label を表示', () => {
    dark(
      <StatTile
        value={37}
        label="累計プレイ回数"
        accessibilityLabel="累計プレイ回数 37 回"
        testId="st"
      />,
    );
    expect(screen.getByTestId('st-value').props.children).toBe('37');
    expect(screen.getByText('累計プレイ回数')).toBeTruthy();
    expect(screen.getByLabelText('累計プレイ回数 37 回')).toBeTruthy();
  });

  it('flame=連続日数で炎アイコンを併記（色 + 形、NF-12）', () => {
    dark(
      <StatTile
        flame
        value={0}
        label="連続日数"
        accessibilityLabel="連続日数 0 日"
        testId="st"
      />,
    );
    // 0 日でも実値を表示
    expect(screen.getByTestId('st-value').props.children).toBe('0');
    // 炎アイコンは装飾のため a11y からは隠す（includeHiddenElements で取得）。
    expect(
      screen.getByTestId('st-flame', { includeHiddenElements: true }),
    ).toBeTruthy();
  });

  it('highlight=最高到達レベルで level.fg 強調色を使う', () => {
    dark(
      <StatTile
        highlight
        value={25}
        label="最高到達レベル"
        accessibilityLabel="最高到達レベル 25"
        testId="st"
      />,
    );
    const val = screen.getByTestId('st-value');
    const flat = Array.isArray(val.props.style)
      ? Object.assign({}, ...val.props.style)
      : val.props.style;
    // dark の level.fg = #A6CBFF
    expect(flat.color).toBe('#A6CBFF');
  });
});

describe('EmptyState（EM-1 / F-09）', () => {
  it('案内文言を表示', () => {
    dark(<EmptyState message="もう少しデータが集まると傾向が見えます" testId="em" />);
    expect(screen.getByText('もう少しデータが集まると傾向が見えます')).toBeTruthy();
  });
});
