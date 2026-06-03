/**
 * LineChart.test.tsx — CH-1（S7、F-09）。
 *
 * 検証：グラフ aria-label 要約（最新点）、空系列の代替テキスト、軸ラベル、
 * 当日点の描画（testID）。座標計算は chartGeometry.test.ts でカバー済み。
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { LineChart } from '../../../src/components/v2/LineChart';
import { buildHistoryView } from '../../../src/lib/v2/historyView';

function renderChart(today: string, daily: { date: string; bestSessionScore: number }[]) {
  const view = buildHistoryView(
    daily.map((d) => ({ ...d, sessionCount: 1 })),
    today,
  );
  render(
    <ThemeProvider preference="light" systemScheme="light">
      <LineChart view={view} testId="chart" />
    </ThemeProvider>,
  );
  return view;
}

describe('LineChart — 代替テキスト（a11y）', () => {
  it('最新点を含む要約を aria-label に与える', () => {
    renderChart('2026-05-30', [
      { date: '2026-05-28', bestSessionScore: 70 },
      { date: '2026-05-30', bestSessionScore: 86 },
    ]);
    // 「過去 2 日の日次スコア。最新 5/30 は 86 点」
    expect(
      screen.getByLabelText('過去 2 日の日次スコア。最新 5/30 は 86 点'),
    ).toBeTruthy();
  });

  it('データ空のときは「データがありません」要約', () => {
    renderChart('2026-05-30', []);
    expect(
      screen.getByLabelText('まだ日次スコアのデータがありません'),
    ).toBeTruthy();
  });
});

describe('LineChart — 軸ラベル（18pt 以上＝24px）', () => {
  it('Y 軸 100 / 50 / 0 を表示する', () => {
    renderChart('2026-05-30', [{ date: '2026-05-30', bestSessionScore: 80 }]);
    expect(screen.getByText('100')).toBeTruthy();
    expect(screen.getByText('50')).toBeTruthy();
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('X 軸に日付ラベル（M/D）を表示する', () => {
    renderChart('2026-05-30', [{ date: '2026-05-30', bestSessionScore: 80 }]);
    expect(screen.getByText('5/30')).toBeTruthy();
  });
});

describe('LineChart — 当日強調（色 + 形）', () => {
  it('レイアウト確定後、当日点（◆）と他日点を描画する', () => {
    renderChart('2026-05-30', [
      { date: '2026-05-28', bestSessionScore: 70 },
      { date: '2026-05-30', bestSessionScore: 86 },
    ]);
    // jsdom はレイアウトを持たないため onLayout を手動発火してプロット幅を与える。
    fireEvent(screen.getByTestId('chart-plot-area'), 'layout', {
      nativeEvent: { layout: { width: 240, height: 180, x: 0, y: 0 } },
    });
    // 当日点（◆）と他日点（●）がそれぞれ描画される。
    expect(screen.getByTestId('chart-point-today')).toBeTruthy();
    expect(screen.getByTestId('chart-point-0')).toBeTruthy();
  });
});
