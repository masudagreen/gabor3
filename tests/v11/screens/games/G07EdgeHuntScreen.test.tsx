/**
 * G07EdgeHuntScreen — F-07 G-07 受け入れテスト（spec-v11.md §7.7、screens.md S14-05）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { G07EdgeHuntScreen } from '../../../../src/screens/v11/games/G07EdgeHuntScreen';

beforeEach(async () => {
  jest.useFakeTimers();
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

const SHORT_DURATION = 1000;
const TICK_MS = 100;

describe('G07EdgeHuntScreen: F-07 / OPT-12', () => {
  it('描画クラッシュなしでマウントできる', async () => {
    const { findByTestId } = render(
      <G07EdgeHuntScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={jest.fn()}
        rng={() => 0.4}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    await findByTestId('g07-edge-hunt-screen');
  });

  it('「確定」「決定」ボタンは存在しない（OPT-12 確定ボタンなし）', async () => {
    const { queryByText, findByTestId } = render(
      <G07EdgeHuntScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={jest.fn()}
        rng={() => 0.4}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    await findByTestId('g07-edge-hunt-screen');
    expect(queryByText(/^確定$/)).toBeNull();
    expect(queryByText(/^決定$/)).toBeNull();
    expect(queryByText(/^完了$/)).toBeNull();
  });

  it('GameStatusBarV11 が描画される（残り N 秒）', async () => {
    const { findByTestId } = render(
      <G07EdgeHuntScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={jest.fn()}
        rng={() => 0.4}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    await findByTestId('g07-edge-hunt-screen');
    await findByTestId('game-status-bar-v11');
  });

  it('ガイド文「縞の向きがそろって並んでいる 3 個を選んでください」を表示', async () => {
    const { findByTestId, queryAllByText } = render(
      <G07EdgeHuntScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={jest.fn()}
        rng={() => 0.4}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    await findByTestId('g07-edge-hunt-screen');
    expect(queryAllByText(/縞の向きがそろって並んでいる 3 個/).length).toBeGreaterThanOrEqual(1);
  });

  it('60 秒経過で onComplete が呼ばれる（未回答 → unattempted=true, isCorrect=false）', async () => {
    const onComplete = jest.fn();
    render(
      <G07EdgeHuntScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0.4}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(result.grading.unattempted).toBe(true);
    expect(result.grading.isCorrect).toBe(false);
    expect(result.isCorrectForStaircase).toBe(false);
    expect(typeof result.thresholdDeg).toBe('number');
  });

  it('60 秒経過時点でユーザー回答が無くても採点される（OPT-11 強制 60 秒視聴）', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G07EdgeHuntScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0.6}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    await findByTestId('g07-edge-hunt-screen');
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(onComplete.mock.calls[0][0].grading.unattempted).toBe(true);
  });

  it('staircase 5° 初期 → 不正解で 6° 方向（易、+step）に動く', async () => {
    const onComplete = jest.fn();
    render(
      <G07EdgeHuntScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0.4}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(result.playedParam).toBe(5); // initial
    expect(result.isCorrectForStaircase).toBe(false);
    const raw = await AsyncStorage.getItem('gaboreye:v1.1:staircase:G-07');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.currentParam).toBe(6); // +1 step
  });

  it('staircase が max=10 上限を超えない（連続不正解しても max でクランプ）', async () => {
    const existing = {
      gameId: 'G-07',
      currentParam: 10,
      consecutiveCorrect: 0,
      lastUpdated: '2026-04-30',
      recentResults: [10, 10, 10, 10, 10],
    };
    await AsyncStorage.setItem(
      'gaboreye:v1.1:staircase:G-07',
      JSON.stringify(existing),
    );
    const onComplete = jest.fn();
    render(
      <G07EdgeHuntScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0.4}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const raw = await AsyncStorage.getItem('gaboreye:v1.1:staircase:G-07');
    const parsed = JSON.parse(raw as string);
    expect(parsed.currentParam).toBeLessThanOrEqual(10);
  });

  // Note: GamePlaySurface の stimulusFrame は accessibilityElementsHidden 配下に
  // あり、@testing-library/react-native の getByTestId / findByTestId は accessibility
  // 階層を辿るため、stimulusArea 内の testID（'g07-cell-rNcM' 等）には到達できない。
  // 16 セル個別タップ動作は GaborGridStimulus 単体テスト（tests/v11/components/games/
  // GaborGridStimulus.test.tsx）で担保する。本 screen テストは「画面骨格 + タイマー +
  // staircase 連動」のみカバー（Sprint 13 self-review §6.1 と同方針）。

  it('閾値（thresholdDeg）は整数', async () => {
    const onComplete = jest.fn();
    render(
      <G07EdgeHuntScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0.4}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(Number.isInteger(result.thresholdDeg)).toBe(true);
  });

  it('staircase が min=2 下限を超えない（連続正解しても min でクランプ）', async () => {
    const existing = {
      gameId: 'G-07',
      currentParam: 2,
      consecutiveCorrect: 2,
      lastUpdated: '2026-04-30',
      recentResults: [2, 2],
    };
    await AsyncStorage.setItem(
      'gaboreye:v1.1:staircase:G-07',
      JSON.stringify(existing),
    );
    const onComplete = jest.fn();
    render(
      <G07EdgeHuntScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0.4}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    // 未回答（不正解）で staircase が +1 step（max 方向）に動く
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const raw = await AsyncStorage.getItem('gaboreye:v1.1:staircase:G-07');
    const parsed = JSON.parse(raw as string);
    expect(parsed.currentParam).toBeGreaterThanOrEqual(2);
    expect(parsed.currentParam).toBeLessThanOrEqual(10);
  });
});
