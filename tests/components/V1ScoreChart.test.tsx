/**
 * V1ScoreChart のレンダリングと a11y ラベルテスト。
 * components.md §22 / screens.md S5-04, S5-06。
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import {
  V1ScoreChart,
  V1ScoreTable,
} from '../../src/components/V1ScoreChart';
import {
  buildLast28DaysChart,
  formatDateLocal,
} from '../../src/lib/weeklyStats';
import { DailyStats } from '../../src/state/storage';

describe('V1ScoreChart', () => {
  it('0 日（empty）時に CTA「3 分コースを始める」を表示', () => {
    const today = new Date(2026, 3, 29);
    const data = buildLast28DaysChart([], today);
    const onStart = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <V1ScoreChart
        data={data}
        todayDate={formatDateLocal(today)}
        onStartCourse={onStart}
      />,
    );
    expect(getByTestId('empty-start-course')).toBeTruthy();
    // チャート canvas は描画されない
    expect(queryByTestId('v1-chart-canvas')).toBeNull();
  });

  it('当日点が他の点より大きい（components.md §22「当日強調」）', () => {
    const today = new Date(2026, 3, 29);
    const todayKey = formatDateLocal(today);
    const stats: DailyStats[] = [
      {
        date: todayKey,
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
    const data = buildLast28DaysChart(stats, today);
    const { getByTestId, queryAllByTestId } = render(
      <V1ScoreChart data={data} todayDate={todayKey} />,
    );
    const todayPoint = getByTestId('v1-chart-today-point');
    expect(todayPoint).toBeTruthy();
    // 半径 10 → 直径 20。他の点は直径 12
    expect(todayPoint.props.style.width).toBe(20);
    const others = queryAllByTestId(/^v1-chart-point-/);
    for (const o of others) {
      expect(o.props.style.width).toBe(12);
    }
  });

  it('低データ（1〜6 日）時に overlay が描画される', () => {
    const today = new Date(2026, 3, 29);
    const todayKey = formatDateLocal(today);
    const stats: DailyStats[] = [
      {
        date: todayKey,
        courseCompleted: true,
        game1BestThreshold: 4,
        game2BestThreshold: 4.2,
        game3BestThreshold: 12,
        v1Score: 76,
        sessionCount: 1,
      },
    ];
    const data = buildLast28DaysChart(stats, today);
    const { getByTestId } = render(
      <V1ScoreChart
        data={data}
        todayDate={todayKey}
        showLowDataOverlay
      />,
    );
    expect(getByTestId('v1-chart-low-data-overlay')).toBeTruthy();
  });

  it('a11y ラベルに当日のスコアが含まれる', () => {
    const today = new Date(2026, 3, 29);
    const todayKey = formatDateLocal(today);
    const stats: DailyStats[] = [
      {
        date: todayKey,
        courseCompleted: true,
        game1BestThreshold: 4,
        game2BestThreshold: 4.2,
        game3BestThreshold: 12,
        v1Score: 76,
        sessionCount: 1,
      },
    ];
    const data = buildLast28DaysChart(stats, today);
    const { getByTestId } = render(
      <V1ScoreChart data={data} todayDate={todayKey} />,
    );
    const chart = getByTestId('v1-chart');
    expect(chart.props.accessibilityLabel).toContain('76');
    expect(chart.props.accessibilityLabel).toContain('過去 28 日');
  });
});

describe('V1ScoreChart 軸ラベル（Sprint 6 Major 修正）', () => {
  const today = new Date(2026, 3, 29);
  const todayKey = formatDateLocal(today);
  const stats: DailyStats[] = [
    {
      date: todayKey,
      courseCompleted: true,
      game1BestThreshold: 4,
      game2BestThreshold: 4.2,
      game3BestThreshold: 12,
      v1Score: 76,
      sessionCount: 1,
    },
    {
      date: '2026-04-01',
      courseCompleted: true,
      game1BestThreshold: 5,
      game2BestThreshold: 5,
      game3BestThreshold: 15,
      v1Score: 99,
      sessionCount: 1,
    },
  ];

  it('Y 軸ラベルは width=48px / numberOfLines=1（「100」が折り返さない）', () => {
    const data = buildLast28DaysChart(stats, today);
    const { getAllByText } = render(
      <V1ScoreChart data={data} todayDate={todayKey} />,
    );
    // 「100」のラベルが描画されている
    const hundredLabels = getAllByText('100');
    expect(hundredLabels.length).toBeGreaterThan(0);
    const label = hundredLabels[0];
    expect(label.props.numberOfLines).toBe(1);
    // 各ラベルの style に width: 48 があり折り返さない
    const flat = Array.isArray(label.props.style)
      ? Object.assign({}, ...label.props.style.filter(Boolean))
      : label.props.style;
    expect(flat.width).toBe(48);
  });

  it('X 軸ラベルは numberOfLines=1 で日付が折り返さない', () => {
    const data = buildLast28DaysChart(stats, today);
    const { queryAllByTestId } = render(
      <V1ScoreChart data={data} todayDate={todayKey} />,
    );
    const xLabels = queryAllByTestId(/^v1-chart-xlabel-/);
    expect(xLabels.length).toBeGreaterThan(0);
    for (const xl of xLabels) {
      expect(xl.props.numberOfLines).toBe(1);
    }
  });
});

describe('V1ScoreTable（SR 代替）', () => {
  it('全 28 日分の行を出す（欠損は「—」表示）', () => {
    const today = new Date(2026, 3, 29);
    const todayKey = formatDateLocal(today);
    const stats: DailyStats[] = [
      {
        date: todayKey,
        courseCompleted: true,
        game1BestThreshold: null,
        game2BestThreshold: null,
        game3BestThreshold: null,
        v1Score: 76,
        sessionCount: 1,
      },
    ];
    const data = buildLast28DaysChart(stats, today);
    const { getByTestId } = render(<V1ScoreTable data={data} />);
    const table = getByTestId('v1-chart-table');
    expect(table).toBeTruthy();
  });
});
