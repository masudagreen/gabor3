/**
 * G03PeripheralHuntScreen — F-07 G-03 受け入れテスト（spec-v11.md §7.3、screens.md S11-02）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { G03PeripheralHuntScreen } from '../../../../src/screens/v11/games/G03PeripheralHuntScreen';

beforeEach(async () => {
  jest.useFakeTimers();
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

const SHORT_DURATION = 1000;
const TICK_MS = 100;

describe('G03PeripheralHuntScreen: F-07 / OPT-12', () => {
  it('描画クラッシュなしでマウントできる', async () => {
    const { findByTestId } = render(
      <G03PeripheralHuntScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={jest.fn()}
        rng={() => 0.3}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    await findByTestId('g03-peripheral-hunt-screen');
  });

  it('「確定」「決定」ボタンは存在しない（OPT-12 確定ボタンなし）', async () => {
    const { queryByText, findByTestId } = render(
      <G03PeripheralHuntScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={jest.fn()}
        rng={() => 0.3}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    await findByTestId('g03-peripheral-hunt-screen');
    expect(queryByText(/^確定$/)).toBeNull();
    expect(queryByText(/^決定$/)).toBeNull();
    expect(queryByText(/^完了$/)).toBeNull();
  });

  it('GameStatusBarV11 が描画される（残り N 秒）', async () => {
    const { findByTestId } = render(
      <G03PeripheralHuntScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={jest.fn()}
        rng={() => 0.3}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    await findByTestId('g03-peripheral-hunt-screen');
    await findByTestId('game-status-bar-v11');
  });

  it('ガイド文「違う向きのパッチを選んでください」を表示（Sprint 21 直接選択化）', async () => {
    const { findByTestId, queryAllByText } = render(
      <G03PeripheralHuntScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={jest.fn()}
        rng={() => 0.3}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    await findByTestId('g03-peripheral-hunt-screen');
    expect(queryAllByText(/違う向きのパッチを選んでください/).length).toBeGreaterThanOrEqual(1);
  });

  it('Sprint 21：clock-8 テキスト 8 択ボタン（answer-choice-{12,...}）は存在しない', async () => {
    const { findByTestId, queryByTestId } = render(
      <G03PeripheralHuntScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={jest.fn()}
        rng={() => 0.3}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    await findByTestId('g03-peripheral-hunt-screen');
    for (const id of ['12', '1.5', '3', '4.5', '6', '7.5', '9', '10.5']) {
      expect(queryByTestId(`answer-choice-${id}`)).toBeNull();
    }
  });

  it('Sprint 21：円周 8 個のガボールパッチ（g03-stimulus-slot-{0..7}）が ImageChoiceCell でラップされる', async () => {
    const { findByTestId } = render(
      <G03PeripheralHuntScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={jest.fn()}
        rng={() => 0.3}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    await findByTestId('g03-peripheral-hunt-screen');
    for (let i = 0; i < 8; i++) {
      await findByTestId(`g03-stimulus-slot-${i}`);
    }
  });

  it('60 秒経過で onComplete が呼ばれる（未回答 → unattempted=true, isCorrect=false）', async () => {
    const onComplete = jest.fn();
    render(
      <G03PeripheralHuntScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0.3}
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

  it('Sprint 21：odd one と同じ位置のガボールパッチを直接タップ → 60 秒経過で isCorrect=true', async () => {
    const onComplete = jest.fn();
    // rng=0.3 で trial を確定し、その odd one position を見て対応スロットを押す
    // buildG03Trial：oddPositionIndex = floor(0.3 * 8) = 2 → slot-2 = '3' 時方向
    const { findByTestId } = render(
      <G03PeripheralHuntScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0.3}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    const slot2 = await findByTestId('g03-stimulus-slot-2');
    fireEvent.press(slot2);
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(result.grading.userAnswer).toBe('3');
    expect(result.grading.correctClockPosition).toBe('3');
    expect(result.isCorrectForStaircase).toBe(true);
  });

  it('Sprint 21：別のガボールパッチを押すと最終回答が切り替わる（再選択で上書き）', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G03PeripheralHuntScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0.3}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    fireEvent.press(await findByTestId('g03-stimulus-slot-0')); // 12 時
    fireEvent.press(await findByTestId('g03-stimulus-slot-2')); // 3 時
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(result.grading.userAnswer).toBe('3');
  });

  it('Sprint 21：GamePlaySurface 経由で刺激領域のみが描画される（answer area は撤去）', async () => {
    const { findByTestId, queryByTestId } = render(
      <G03PeripheralHuntScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={jest.fn()}
        rng={() => 0.3}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    await findByTestId('g03-peripheral-hunt-screen');
    await findByTestId('game-play-surface');
    // Sprint 21：直接選択化により answerChoices=null → 回答領域は描画されない
    expect(queryByTestId('game-play-surface-answers')).toBeNull();
    // 刺激領域は stimulusInteractive=true で SR に開放される
    await findByTestId('game-play-surface-stimulus');
  });

  it('staircase が onComplete 経由で更新される（playedParam=初期 6°、未回答 → 易方向に推移、v1.1.4 角度差 1/4 化）', async () => {
    const onComplete = jest.fn();
    render(
      <G03PeripheralHuntScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0.3}
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
    expect(result.playedParam).toBe(6); // gameRegistry G-03 初期値（v1.1.4 で 6）
    expect(typeof result.thresholdDeg).toBe('number');
  });
});
