/**
 * LineChart — F-11 進捗グラフ用折れ線グラフ コンポーネントテスト。
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { render } from '@testing-library/react-native';
import { LineChart, LineChartPoint } from '../../../../src/components/v11/charts/LineChart';

function mkSeries(days: number, valueFn: (i: number) => number | null): LineChartPoint[] {
  const out: LineChartPoint[] = [];
  for (let i = 0; i < days; i++) {
    const date = `2026-04-${String(i + 1).padStart(2, '0')}`;
    out.push({ date, value: valueFn(i) });
  }
  return out;
}

describe('LineChart', () => {
  it('当日点が強調（today-point testID）', () => {
    const data = mkSeries(28, (i) => 50 + i);
    const todayDate = '2026-04-28';
    const { queryByTestId } = render(
      <LineChart data={data} todayDate={todayDate} />,
    );
    expect(queryByTestId('v11-chart-today-point')).toBeTruthy();
  });

  it('当日が data になければ today-point は描画されない', () => {
    const data = mkSeries(10, () => 50);
    const { queryByTestId } = render(
      <LineChart data={data} todayDate="2026-05-30" />,
    );
    expect(queryByTestId('v11-chart-today-point')).toBeNull();
  });

  it('valid データが点・セグメントで描画される', () => {
    const data: LineChartPoint[] = [
      { date: '2026-04-01', value: 50 },
      { date: '2026-04-02', value: 60 },
      { date: '2026-04-03', value: 55 },
    ];
    const { queryAllByTestId } = render(
      <LineChart data={data} todayDate="2026-04-03" />,
    );
    // 3 点（うち 1 つは today）+ 2 セグメント
    expect(queryAllByTestId(/v11-chart-segment-/).length).toBe(2);
  });

  it('null 値の点はスキップされる', () => {
    const data: LineChartPoint[] = [
      { date: '2026-04-01', value: 50 },
      { date: '2026-04-02', value: null },
      { date: '2026-04-03', value: 55 },
    ];
    const { queryAllByTestId } = render(
      <LineChart data={data} todayDate="2026-04-03" />,
    );
    // null をまたぐセグメントは描画しない（null 始点 / null 終点 で描画スキップ）
    // 期待：i=1 は prev valid だが p.value null → スキップ
    //       i=2 は prev null → スキップ
    expect(queryAllByTestId(/v11-chart-segment-/).length).toBe(0);
  });

  it('showLowDataOverlay=true でオーバーレイ表示', () => {
    const data = mkSeries(3, (i) => 40 + i);
    const { getByText } = render(
      <LineChart data={data} todayDate="2026-04-03" showLowDataOverlay />,
    );
    expect(getByText(/もう少しデータが集まると/)).toBeTruthy();
  });

  it('showLowDataOverlay=false でオーバーレイ非表示', () => {
    const data = mkSeries(20, (i) => 40 + i);
    const { queryByText } = render(
      <LineChart data={data} todayDate="2026-04-20" showLowDataOverlay={false} />,
    );
    expect(queryByText(/もう少しデータが集まると/)).toBeNull();
  });

  it('Y 軸範囲をカスタマイズできる（ゲーム別 0〜10°）', () => {
    const data = mkSeries(28, (i) => i % 10);
    const { getByTestId } = render(
      <LineChart
        data={data}
        todayDate="2026-04-28"
        yMin={0}
        yMax={10}
        yUnit="°"
        lowerIsBetter
        testId="game-chart"
      />,
    );
    expect(getByTestId('game-chart')).toBeTruthy();
  });

  it('a11y label のフォールバック', () => {
    const data = mkSeries(28, (i) => 50 + i);
    const { getByLabelText } = render(
      <LineChart data={data} todayDate="2026-04-28" />,
    );
    // フォールバックラベルが付与される
    expect(getByLabelText(/過去\s*28\s*日推移/)).toBeTruthy();
  });

  it('独自 ariaLabel を渡すと優先される', () => {
    const data = mkSeries(28, (i) => 50 + i);
    const { getByLabelText } = render(
      <LineChart
        data={data}
        todayDate="2026-04-28"
        ariaLabel="ワイドスコア過去 28 日"
      />,
    );
    expect(getByLabelText('ワイドスコア過去 28 日')).toBeTruthy();
  });

  it('全データ null（empty）：crash しない', () => {
    const data = mkSeries(28, () => null);
    const { getByTestId } = render(
      <LineChart data={data} todayDate="2026-04-28" />,
    );
    expect(getByTestId('v11-line-chart')).toBeTruthy();
  });
});
