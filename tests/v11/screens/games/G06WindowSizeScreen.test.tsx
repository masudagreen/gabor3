/**
 * G06WindowSizeScreen — F-07 G-06 受け入れテスト（spec-v11.md §7.6、screens.md S14-02）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { G06WindowSizeScreen } from '../../../../src/screens/v11/games/G06WindowSizeScreen';

beforeEach(async () => {
  jest.useFakeTimers();
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

const SHORT_DURATION = 1000;
const TICK_MS = 100;

describe('G06WindowSizeScreen: F-07 / OPT-12', () => {
  it('描画クラッシュなしでマウントできる', async () => {
    const { findByTestId } = render(
      <G06WindowSizeScreen
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
    await findByTestId('g06-window-size-screen');
  });

  it('「確定」「決定」ボタンは存在しない（OPT-12 確定ボタンなし）', async () => {
    const { queryByText, findByTestId } = render(
      <G06WindowSizeScreen
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
    await findByTestId('g06-window-size-screen');
    expect(queryByText(/^確定$/)).toBeNull();
    expect(queryByText(/^決定$/)).toBeNull();
    expect(queryByText(/^完了$/)).toBeNull();
  });

  it('GameStatusBarV11 が描画される（残り N 秒）', async () => {
    const { findByTestId } = render(
      <G06WindowSizeScreen
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
    await findByTestId('g06-window-size-screen');
    await findByTestId('game-status-bar-v11');
  });

  it('Sprint 21：ガイド文「縞模様が大きく見えるのはどっち？」を表示', async () => {
    const { findByTestId, queryAllByText } = render(
      <G06WindowSizeScreen
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
    await findByTestId('g06-window-size-screen');
    expect(queryAllByText(/縞模様が大きく見えるのはどっち/).length).toBeGreaterThanOrEqual(1);
  });

  it('Sprint 21：horizontal-2 テキスト 2 択ボタン（answer-choice-left / right）は存在しない', async () => {
    const { findByTestId, queryByTestId } = render(
      <G06WindowSizeScreen
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
    await findByTestId('g06-window-size-screen');
    expect(queryByTestId('answer-choice-left')).toBeNull();
    expect(queryByTestId('answer-choice-right')).toBeNull();
    expect(queryByTestId('game-play-surface-answers')).toBeNull();
  });

  it('Sprint 21：左右ガボールパッチ（g06-stimulus-left / right）が ImageChoiceCell でラップされる', async () => {
    const { findByTestId } = render(
      <G06WindowSizeScreen
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
    await findByTestId('g06-window-size-screen');
    await findByTestId('g06-stimulus-left');
    await findByTestId('g06-stimulus-right');
  });

  it('60 秒経過で onComplete が呼ばれる（未回答 → unattempted=true, isCorrect=false）', async () => {
    const onComplete = jest.fn();
    render(
      <G06WindowSizeScreen
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
    expect(typeof result.thresholdRatio).toBe('number');
  });

  it('「左」ボタンを押下後 60 秒経過で正解側=left なら isCorrect=true', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G06WindowSizeScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0.4} // correctSide=left
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    const leftBtn = await findByTestId('g06-stimulus-left');
    fireEvent.press(leftBtn);
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(result.grading.userAnswer).toBe('left');
    expect(result.grading.correctSide).toBe('left');
    expect(result.isCorrectForStaircase).toBe(true);
  });

  it('「右」ボタンタップ後に「左」を押すと最終回答が左に切り替わる', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G06WindowSizeScreen
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
    fireEvent.press(await findByTestId('g06-stimulus-right'));
    fireEvent.press(await findByTestId('g06-stimulus-left'));
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(result.grading.userAnswer).toBe('left');
  });

  it('60 秒経過時点でユーザー回答が無くても採点される（OPT-11 強制 60 秒視聴）', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G06WindowSizeScreen
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
    await findByTestId('g06-window-size-screen');
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(onComplete.mock.calls[0][0].grading.unattempted).toBe(true);
  });

  it('「左」を 2 回押すと解除されて未回答に戻る', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G06WindowSizeScreen
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
    const leftBtn = await findByTestId('g06-stimulus-left');
    fireEvent.press(leftBtn);
    fireEvent.press(leftBtn); // 解除
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(result.grading.unattempted).toBe(true);
  });

  it('staircase 1.2 初期（v1.1.4）→ 不正解で 1.25 方向（易、+step=0.05）に動く', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G06WindowSizeScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0.4} // correctSide=left
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    fireEvent.press(await findByTestId('g06-stimulus-right'));
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(result.playedParam).toBeCloseTo(1.2, 5);
    expect(result.isCorrectForStaircase).toBe(false);
    const raw = await AsyncStorage.getItem('gaboreye:v1.1:staircase:G-06');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.currentParam).toBeCloseTo(1.25, 5);
  });

  it('閾値（thresholdRatio）は小数 1 桁の数値', async () => {
    const onComplete = jest.fn();
    render(
      <G06WindowSizeScreen
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
    const rounded = Math.round(result.thresholdRatio * 10) / 10;
    expect(result.thresholdRatio).toBeCloseTo(rounded, 5);
  });

  it('staircase が max=2.0 上限を超えない（連続不正解しても max でクランプ）', async () => {
    const existing = {
      gameId: 'G-06',
      currentParam: 2.0,
      consecutiveCorrect: 0,
      lastUpdated: '2026-04-30',
      recentResults: [2.0, 2.0, 2.0, 2.0, 2.0],
    };
    await AsyncStorage.setItem(
      'gaboreye:v1.1:staircase:G-06',
      JSON.stringify(existing),
    );
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G06WindowSizeScreen
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
    fireEvent.press(await findByTestId('g06-stimulus-right'));
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const raw = await AsyncStorage.getItem('gaboreye:v1.1:staircase:G-06');
    const parsed = JSON.parse(raw as string);
    expect(parsed.currentParam).toBeLessThanOrEqual(2.0);
  });
});
