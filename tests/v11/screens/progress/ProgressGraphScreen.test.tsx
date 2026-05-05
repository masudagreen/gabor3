/**
 * ProgressGraphScreen — S18-07 / S18-08 / F-11 受け入れテスト。
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import {
  ProgressGraphScreen,
  buildDateRange,
  buildGameThresholdSeries,
  buildWideScoreSeries,
} from '../../../../src/screens/v11/progress/ProgressGraphScreen';
import { DailyStatsV11 } from '../../../../src/state/storage-v11';
import { GAME_REGISTRY, getEnabledGames } from '../../../../src/state/gameRegistry';

const TODAY = '2026-04-30';

function mkStats(
  date: string,
  wideScore: number | null,
  bestThresholds: Partial<Record<string, number>> = {},
): DailyStatsV11 {
  return {
    date,
    fullCourseCompleted: wideScore !== null,
    gameBestThresholds: bestThresholds as DailyStatsV11['gameBestThresholds'],
    wideScore,
    sessionCount: 1,
  };
}

describe('ProgressGraphScreen — シリーズ整形 純関数', () => {
  it('buildDateRange：28 日昇順、末尾は today', () => {
    const range = buildDateRange(TODAY, 28);
    expect(range).toHaveLength(28);
    expect(range[27]).toBe(TODAY);
    expect(range[0]).toBe('2026-04-03');
  });

  it('buildWideScoreSeries：欠損は null', () => {
    const stats = [mkStats(TODAY, 70), mkStats('2026-04-29', 65)];
    const series = buildWideScoreSeries(stats, TODAY);
    expect(series).toHaveLength(28);
    expect(series[27].value).toBe(70);
    expect(series[26].value).toBe(65);
    expect(series[0].value).toBeNull();
  });

  it('buildGameThresholdSeries：指定ゲームのベスト閾値のみ抽出', () => {
    const stats = [
      mkStats(TODAY, 70, { 'G-01': 4.5, 'G-04': 0.1 }),
      mkStats('2026-04-29', 65, { 'G-01': 5 }),
    ];
    const seriesG01 = buildGameThresholdSeries(stats, TODAY, 'G-01');
    expect(seriesG01[27].value).toBe(4.5);
    expect(seriesG01[26].value).toBe(5);
    const seriesG04 = buildGameThresholdSeries(stats, TODAY, 'G-04');
    expect(seriesG04[27].value).toBe(0.1);
    expect(seriesG04[26].value).toBeNull();
  });
});

describe('ProgressGraphScreen — UI', () => {
  it('初期表示：ワイドスコアタブが選択中', () => {
    const { getByTestId } = render(
      <ProgressGraphScreen
        todayDate={TODAY}
        onBack={() => {}}
        preloadedStatsForTest={[]}
      />,
    );
    const wide = getByTestId('progress-tab-wide');
    expect(wide.props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );
  });

  it('タブ切替：ワイドスコア → ゲーム別', () => {
    const { getByTestId } = render(
      <ProgressGraphScreen
        todayDate={TODAY}
        onBack={() => {}}
        preloadedStatsForTest={[]}
      />,
    );
    fireEvent.press(getByTestId('progress-tab-game'));
    const game = getByTestId('progress-tab-game');
    expect(game.props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );
  });

  it('ワイドスコアタブで折れ線グラフが描画される', () => {
    const stats: DailyStatsV11[] = [];
    for (let i = 0; i < 28; i++) {
      const day = String(i + 3).padStart(2, '0');
      stats.push(mkStats(`2026-04-${day}`, 50 + i));
    }
    const { getByTestId } = render(
      <ProgressGraphScreen
        todayDate={TODAY}
        onBack={() => {}}
        preloadedStatsForTest={stats}
      />,
    );
    expect(getByTestId('progress-wide-chart')).toBeTruthy();
  });

  it('「本日のスコア」表示が当日の wideScore を反映', () => {
    const stats = [mkStats(TODAY, 72)];
    const { getByText } = render(
      <ProgressGraphScreen
        todayDate={TODAY}
        onBack={() => {}}
        preloadedStatsForTest={stats}
      />,
    );
    expect(getByText(/本日のスコア：\s*72\s*点/)).toBeTruthy();
  });

  it('データ < 7 日：「もう少しデータが集まると」オーバーレイ', () => {
    const stats = [
      mkStats(TODAY, 60),
      mkStats('2026-04-29', 55),
      mkStats('2026-04-28', 50),
    ];
    const { getByText } = render(
      <ProgressGraphScreen
        todayDate={TODAY}
        onBack={() => {}}
        preloadedStatsForTest={stats}
      />,
    );
    expect(getByText(/もう少しデータが集まると/)).toBeTruthy();
  });

  it('データ ≥ 7 日：オーバーレイは出ない', () => {
    const stats: DailyStatsV11[] = [];
    for (let i = 0; i < 10; i++) {
      const day = String(i + 21).padStart(2, '0');
      stats.push(mkStats(`2026-04-${day}`, 50 + i));
    }
    const { queryByText } = render(
      <ProgressGraphScreen
        todayDate={TODAY}
        onBack={() => {}}
        preloadedStatsForTest={stats}
      />,
    );
    expect(queryByText(/もう少しデータが集まると/)).toBeNull();
  });

  it('ゲーム別タブで子タブ（13 ゲーム）すべて表示', () => {
    const { getByTestId } = render(
      <ProgressGraphScreen
        todayDate={TODAY}
        onBack={() => {}}
        preloadedStatsForTest={[]}
      />,
    );
    fireEvent.press(getByTestId('progress-tab-game'));
    for (const g of getEnabledGames()) {
      expect(getByTestId(`progress-subtab-${g.gameId}`)).toBeTruthy();
    }
  });

  it('ゲーム別タブで子タブ切替（G-04）→ G-04 のチャート見出しに切替', () => {
    const stats = [
      mkStats(TODAY, 70, { 'G-04': 0.1, 'G-01': 4 }),
    ];
    const { getByTestId, getByText } = render(
      <ProgressGraphScreen
        todayDate={TODAY}
        onBack={() => {}}
        preloadedStatsForTest={stats}
      />,
    );
    fireEvent.press(getByTestId('progress-tab-game'));
    fireEvent.press(getByTestId('progress-subtab-G-04'));
    expect(getByText(/G-04\s*コントラスト弁別/)).toBeTruthy();
  });

  it('ゲーム別タブ：「値が小さいほど良い」注記がある', () => {
    const { getByTestId } = render(
      <ProgressGraphScreen
        todayDate={TODAY}
        onBack={() => {}}
        preloadedStatsForTest={[]}
      />,
    );
    fireEvent.press(getByTestId('progress-tab-game'));
    const cap = getByTestId('progress-game-caption');
    expect(cap.props.children).toContain('値が小さいほど良い');
  });

  it('戻るボタンで onBack 発火', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(
      <ProgressGraphScreen
        todayDate={TODAY}
        onBack={onBack}
        preloadedStatsForTest={[]}
      />,
    );
    fireEvent.press(getByTestId('progress-graph-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('a11y：親タブは role=tablist + role=tab', () => {
    const { getByTestId } = render(
      <ProgressGraphScreen
        todayDate={TODAY}
        onBack={() => {}}
        preloadedStatsForTest={[]}
      />,
    );
    const tabs = getByTestId('progress-graph-tabs');
    expect(tabs.props.accessibilityRole).toBe('tablist');
    const wide = getByTestId('progress-tab-wide');
    expect(wide.props.accessibilityRole).toBe('tab');
  });
});

describe('ProgressGraphScreen — F-18 enabled フィルタ', () => {
  it('全 13 ゲームが enabled なら 13 子タブ', () => {
    const { getByTestId } = render(
      <ProgressGraphScreen
        todayDate={TODAY}
        onBack={() => {}}
        preloadedStatsForTest={[]}
      />,
    );
    fireEvent.press(getByTestId('progress-tab-game'));
    let count = 0;
    for (const g of GAME_REGISTRY) {
      try {
        getByTestId(`progress-subtab-${g.gameId}`);
        count++;
      } catch {
        // 該当タブがない
      }
    }
    expect(count).toBe(GAME_REGISTRY.filter((g) => g.releaseEnabled).length);
  });
});
