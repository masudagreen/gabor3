/**
 * G10TextureSegmentationScreen — F-07 G-10 受け入れテスト（spec-v11.md §7.10、screens.md S21-G10-PLAY）。
 *
 * v1.1.2 Sprint 21（直接選択化）：
 *   - grid-4 テキスト 4 択ボタン撤去
 *   - 8×8 grid を 4 象限の ImageChoiceCell でラップ → 各象限を直接タップ
 *   - data-target-id：`g10-tl` / `g10-tr` / `g10-bl` / `g10-br`
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { G10TextureSegmentationScreen } from '../../../../src/screens/v11/games/G10TextureSegmentationScreen';

beforeEach(async () => {
  jest.useFakeTimers();
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

const SHORT_DURATION = 1000;
const TICK_MS = 100;

describe('G10TextureSegmentationScreen: F-07 / OPT-12', () => {
  it('描画クラッシュなしでマウントできる', async () => {
    const { findByTestId } = render(
      <G10TextureSegmentationScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={jest.fn()}
        rng={() => 0.1}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    await findByTestId('g10-texture-segmentation-screen');
  });

  it('「確定」「決定」ボタンは存在しない（OPT-12）', async () => {
    const { queryByText, findByTestId } = render(
      <G10TextureSegmentationScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={jest.fn()}
        rng={() => 0.1}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    await findByTestId('g10-texture-segmentation-screen');
    expect(queryByText(/^確定$/)).toBeNull();
    expect(queryByText(/^決定$/)).toBeNull();
    expect(queryByText(/^完了$/)).toBeNull();
  });

  it('GameStatusBarV11 が描画される', async () => {
    const { findByTestId } = render(
      <G10TextureSegmentationScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={jest.fn()}
        rng={() => 0.1}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    await findByTestId('g10-texture-segmentation-screen');
    await findByTestId('game-status-bar-v11');
  });

  it('Sprint 21：ガイド文「違う向きのかたまりはどの象限？」を表示', async () => {
    const { findByTestId, queryAllByText } = render(
      <G10TextureSegmentationScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={jest.fn()}
        rng={() => 0.1}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    await findByTestId('g10-texture-segmentation-screen');
    expect(queryAllByText(/違う向きのかたまりはどの象限/).length).toBeGreaterThanOrEqual(1);
  });

  it('Sprint 21：grid-4 テキスト 4 択ボタンは存在しない', async () => {
    const { findByTestId, queryByTestId } = render(
      <G10TextureSegmentationScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={jest.fn()}
        rng={() => 0.1}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    await findByTestId('g10-texture-segmentation-screen');
    expect(queryByTestId('answer-choice-top-left')).toBeNull();
    expect(queryByTestId('answer-choice-top-right')).toBeNull();
    expect(queryByTestId('answer-choice-bottom-left')).toBeNull();
    expect(queryByTestId('answer-choice-bottom-right')).toBeNull();
    expect(queryByTestId('g10-answer-choice')).toBeNull();
    expect(queryByTestId('game-play-surface-answers')).toBeNull();
  });

  it('Sprint 21：4 象限 ImageChoiceCell（g10-quadrant-{tl|tr|bl|br}）が描画される', async () => {
    const { findByTestId } = render(
      <G10TextureSegmentationScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={jest.fn()}
        rng={() => 0.1}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    await findByTestId('g10-texture-segmentation-screen');
    await findByTestId('g10-quadrant-top-left');
    await findByTestId('g10-quadrant-top-right');
    await findByTestId('g10-quadrant-bottom-left');
    await findByTestId('g10-quadrant-bottom-right');
  });

  it('60 秒経過で onComplete が呼ばれる（未回答 → unattempted=true）', async () => {
    const onComplete = jest.fn();
    render(
      <G10TextureSegmentationScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0.1}
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

  it('Sprint 21：左上象限（g10-quadrant-top-left）をタップ → 60 秒経過で正解 top-left なら isCorrect=true', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G10TextureSegmentationScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0} // correctQuadrant = top-left（idx=0）
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    fireEvent.press(await findByTestId('g10-quadrant-top-left'));
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(result.grading.userAnswer).toBe('top-left');
    expect(result.grading.correctQuadrant).toBe('top-left');
    expect(result.isCorrectForStaircase).toBe(true);
  });

  it('Sprint 21：右上タップ後に左上を押すと最終回答が top-left に切り替わる（radio）', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G10TextureSegmentationScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    fireEvent.press(await findByTestId('g10-quadrant-top-right'));
    fireEvent.press(await findByTestId('g10-quadrant-top-left'));
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(result.grading.userAnswer).toBe('top-left');
  });

  it('Sprint 21：左上象限を 2 回押すと解除されて未回答に戻る', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G10TextureSegmentationScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    const cell = await findByTestId('g10-quadrant-top-left');
    fireEvent.press(cell);
    fireEvent.press(cell);
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(result.grading.unattempted).toBe(true);
  });

  it('staircase 30 初期 → 不正解で 35 方向（易、+step=5）に動く', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G10TextureSegmentationScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0} // top-left
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    fireEvent.press(await findByTestId('g10-quadrant-bottom-right')); // 不正解
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(result.playedParam).toBe(30);
    expect(result.isCorrectForStaircase).toBe(false);
    const raw = await AsyncStorage.getItem('gaboreye:v1.1:staircase:G-10');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.currentParam).toBe(35);
  });

  it('閾値（thresholdDeg）は整数', async () => {
    const onComplete = jest.fn();
    render(
      <G10TextureSegmentationScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0.1}
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
    expect(result.thresholdDeg).toBe(Math.round(result.thresholdDeg));
  });

  it('staircase が max=90 上限を超えない', async () => {
    const existing = {
      gameId: 'G-10',
      currentParam: 90,
      consecutiveCorrect: 0,
      lastUpdated: '2026-04-30',
      recentResults: [90, 90, 90, 90, 90],
    };
    await AsyncStorage.setItem(
      'gaboreye:v1.1:staircase:G-10',
      JSON.stringify(existing),
    );
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G10TextureSegmentationScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    fireEvent.press(await findByTestId('g10-quadrant-bottom-right'));
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const raw = await AsyncStorage.getItem('gaboreye:v1.1:staircase:G-10');
    const parsed = JSON.parse(raw as string);
    expect(parsed.currentParam).toBeLessThanOrEqual(90);
  });

  it('Sprint 21：プレイ中に象限を押すと aria-checked が更新される', async () => {
    const { findByTestId } = render(
      <G10TextureSegmentationScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={jest.fn()}
        rng={() => 0}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    const tl = await findByTestId('g10-quadrant-top-left');
    fireEvent.press(tl);
    const tlAfter = await findByTestId('g10-quadrant-top-left');
    expect(tlAfter.props.accessibilityState?.checked).toBe(true);
    fireEvent.press(tlAfter);
    const tlReset = await findByTestId('g10-quadrant-top-left');
    expect(tlReset.props.accessibilityState?.checked).toBe(false);
  });

  it('Sprint 21：画面全体が描画される（answer area は撤去）', async () => {
    const { findByTestId, queryByTestId } = render(
      <G10TextureSegmentationScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={jest.fn()}
        rng={() => 0}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    await findByTestId('g10-texture-segmentation-screen');
    await findByTestId('game-status-bar-v11');
    await findByTestId('g10-stimulus-wrapper');
    expect(queryByTestId('g10-answer-choice')).toBeNull();
  });
});
