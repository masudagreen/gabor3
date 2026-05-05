/**
 * G08TiltAftereffectScreen — F-07 G-08 受け入れテスト（spec-v11.md §7.8、screens.md S20-G08-PLAY）。
 *
 * v1.1.1 Sprint 20-C 改訂：
 *   - horizontal-2 撤去、下部 2 テストパッチ直接タップで回答
 *   - adapter は disabled + dimOnDisabled=false で視覚維持、タップ不可
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { G08TiltAftereffectScreen } from '../../../../src/screens/v11/games/G08TiltAftereffectScreen';

beforeEach(async () => {
  jest.useFakeTimers();
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

const SHORT_DURATION = 1000;
const TICK_MS = 100;

describe('G08TiltAftereffectScreen: F-07 / OPT-12 / Sprint 20-C', () => {
  it('描画クラッシュなしでマウントできる', async () => {
    const { findByTestId } = render(
      <G08TiltAftereffectScreen
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
    await findByTestId('g08-tilt-aftereffect-screen');
  });

  it('「確定」「決定」ボタンは存在しない（OPT-12 確定ボタンなし）', async () => {
    const { queryByText, findByTestId } = render(
      <G08TiltAftereffectScreen
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
    await findByTestId('g08-tilt-aftereffect-screen');
    expect(queryByText(/^確定$/)).toBeNull();
    expect(queryByText(/^決定$/)).toBeNull();
    expect(queryByText(/^完了$/)).toBeNull();
  });

  it('GameStatusBarV11 が描画される', async () => {
    const { findByTestId } = render(
      <G08TiltAftereffectScreen
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
    await findByTestId('g08-tilt-aftereffect-screen');
    await findByTestId('game-status-bar-v11');
  });

  it('Sprint 20-C：guidance に「より時計回り」または「より反時計回り」「下から選んで」が表示される', async () => {
    const { findByTestId, queryAllByText } = render(
      <G08TiltAftereffectScreen
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
    await findByTestId('g08-tilt-aftereffect-screen');
    expect(
      queryAllByText(/より(時計回り|反時計回り).*下から選んで/).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('Sprint 20 ラウンド 2：guidance に role="status" / aria-live="polite"（screens.md §5.6）', async () => {
    const { findByTestId } = render(
      <G08TiltAftereffectScreen
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
    await findByTestId('g08-tilt-aftereffect-screen');
    const guidance = await findByTestId('game-play-surface-guidance');
    expect(guidance).toBeTruthy();
    expect(guidance.props.accessibilityLiveRegion).toBe('polite');
    expect(guidance.props.role).toBe('status');
  });

  it('Sprint 20-C：horizontal-2 テキスト 2 択ボタン（answer-choice-cw / ccw）は存在しない', async () => {
    const { queryByTestId, findByTestId } = render(
      <G08TiltAftereffectScreen
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
    await findByTestId('g08-tilt-aftereffect-screen');
    expect(queryByTestId('answer-choice-cw')).toBeNull();
    expect(queryByTestId('answer-choice-ccw')).toBeNull();
  });

  it('Sprint 20-C：adapter（上）+ 下部 2 テストパッチ（左右）が描画される', async () => {
    const { findByTestId } = render(
      <G08TiltAftereffectScreen
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
    await findByTestId('g08-tilt-aftereffect-screen');
    await findByTestId('g08-stimulus-adapter');
    await findByTestId('g08-stimulus-test-left');
    await findByTestId('g08-stimulus-test-right');
  });

  it('60 秒経過で onComplete が呼ばれる（未回答 → unattempted=true）', async () => {
    const onComplete = jest.fn();
    render(
      <G08TiltAftereffectScreen
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

  it('Sprint 20-C：左テストパッチをタップ → aria-checked=true、右は false', async () => {
    const { findByTestId } = render(
      <G08TiltAftereffectScreen
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
    fireEvent.press(await findByTestId('g08-stimulus-test-left'));
    const left = await findByTestId('g08-stimulus-test-left');
    expect(left.props.accessibilityState?.checked).toBe(true);
    const right = await findByTestId('g08-stimulus-test-right');
    expect(right.props.accessibilityState?.checked).toBe(false);
  });

  it('Sprint 20-C：右タップ後に左タップで切り替わる', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G08TiltAftereffectScreen
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
    fireEvent.press(await findByTestId('g08-stimulus-test-right'));
    fireEvent.press(await findByTestId('g08-stimulus-test-left'));
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(result.grading.userAnswerSide).toBe('left');
  });

  it('Sprint 20-C：左を 2 回タップで解除されて未回答', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G08TiltAftereffectScreen
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
    const left = await findByTestId('g08-stimulus-test-left');
    fireEvent.press(left);
    fireEvent.press(left); // 解除
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(result.grading.unattempted).toBe(true);
  });

  it('Sprint 20-C：adapter cell（disabled）はタップしても aria-checked が変化しない', async () => {
    const { findByTestId } = render(
      <G08TiltAftereffectScreen
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
    const adapterCell = await findByTestId('g08-stimulus-adapter-cell');
    fireEvent.press(adapterCell);
    const after = await findByTestId('g08-stimulus-adapter-cell');
    // adapter は radio で選択不能（disabled）：aria-checked は false 固定
    expect(after.props.accessibilityState?.checked).toBe(false);
  });

  it('Sprint 20-C：adapter cell は opacity=1（dimOnDisabled=false で視覚維持）', async () => {
    const { findByTestId } = render(
      <G08TiltAftereffectScreen
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
    const adapterCell = await findByTestId('g08-stimulus-adapter-cell');
    const styleProp = adapterCell.props.style;
    const style =
      typeof styleProp === 'function'
        ? (
            styleProp as (state: { pressed: boolean }) => Record<string, unknown>
          )({ pressed: false })
        : ((styleProp ?? {}) as Record<string, unknown>);
    expect(style.opacity).toBe(1);
  });

  it('staircase 5° 初期 → 採点後に staircase が更新される', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G08TiltAftereffectScreen
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
    fireEvent.press(await findByTestId('g08-stimulus-test-left'));
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(result.playedParam).toBe(5);
    const raw = await AsyncStorage.getItem('gaboreye:v1.1:staircase:G-08');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    // 正解で -1（4） / 不正解で +1（6） / 不変（5）のいずれか
    expect([4, 5, 6]).toContain(parsed.currentParam);
  });

  it('閾値（thresholdDeg）は整数（gameRegistry.step=1 と整合）', async () => {
    const onComplete = jest.fn();
    render(
      <G08TiltAftereffectScreen
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
    expect(result.thresholdDeg).toBe(Math.round(result.thresholdDeg));
  });

  it('staircase が max=10 上限を超えない', async () => {
    const existing = {
      gameId: 'G-08',
      currentParam: 10,
      consecutiveCorrect: 0,
      lastUpdated: '2026-04-30',
      recentResults: [10, 10, 10, 10, 10],
    };
    await AsyncStorage.setItem(
      'gaboreye:v1.1:staircase:G-08',
      JSON.stringify(existing),
    );
    const onComplete = jest.fn();
    render(
      <G08TiltAftereffectScreen
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
    const raw = await AsyncStorage.getItem('gaboreye:v1.1:staircase:G-08');
    const parsed = JSON.parse(raw as string);
    expect(parsed.currentParam).toBeLessThanOrEqual(10);
  });
});
