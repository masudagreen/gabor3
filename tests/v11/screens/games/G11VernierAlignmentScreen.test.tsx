/**
 * G11VernierAlignmentScreen — F-07 G-11 受け入れテスト（spec-v11.md §7.11、screens.md S21-G11-PLAY）。
 *
 * v1.1.2 Sprint 21（直接選択化）：
 *   - horizontal-2 テキスト 2 択ボタン撤去
 *   - 上 reference + 下に左右 2 テストパッチ（G11VernierStimulus）構造
 *   - data-target-id：`g11-test-left` / `g11-test-right`
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { G11VernierAlignmentScreen } from '../../../../src/screens/v11/games/G11VernierAlignmentScreen';

beforeEach(async () => {
  jest.useFakeTimers();
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

const SHORT_DURATION = 1000;
const TICK_MS = 100;

describe('G11VernierAlignmentScreen: F-07 / OPT-12', () => {
  it('描画クラッシュなしでマウントできる', async () => {
    const { findByTestId } = render(
      <G11VernierAlignmentScreen
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
    await findByTestId('g11-vernier-alignment-screen');
  });

  it('「確定」「決定」ボタンは存在しない（OPT-12）', async () => {
    const { queryByText, findByTestId } = render(
      <G11VernierAlignmentScreen
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
    await findByTestId('g11-vernier-alignment-screen');
    expect(queryByText(/^確定$/)).toBeNull();
    expect(queryByText(/^決定$/)).toBeNull();
    expect(queryByText(/^完了$/)).toBeNull();
  });

  it('GameStatusBarV11 が描画される', async () => {
    const { findByTestId } = render(
      <G11VernierAlignmentScreen
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
    await findByTestId('g11-vernier-alignment-screen');
    await findByTestId('game-status-bar-v11');
  });

  it('Sprint 21：ガイド文「下のパッチのうち上と整列しているものを選んでください」を表示', async () => {
    const { findByTestId, queryAllByText } = render(
      <G11VernierAlignmentScreen
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
    await findByTestId('g11-vernier-alignment-screen');
    expect(queryAllByText(/上と整列しているものを選んでください/).length).toBeGreaterThanOrEqual(1);
  });

  it('Sprint 21：horizontal-2 テキスト 2 択ボタン（answer-choice-left / right）は存在しない', async () => {
    const { findByTestId, queryByTestId } = render(
      <G11VernierAlignmentScreen
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
    await findByTestId('g11-vernier-alignment-screen');
    expect(queryByTestId('answer-choice-left')).toBeNull();
    expect(queryByTestId('answer-choice-right')).toBeNull();
    expect(queryByTestId('game-play-surface-answers')).toBeNull();
  });

  it('Sprint 21：上 reference + 下左右 2 テストパッチが G11VernierStimulus で描画される', async () => {
    const { findByTestId } = render(
      <G11VernierAlignmentScreen
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
    await findByTestId('g11-vernier-alignment-screen');
    await findByTestId('g11-stimulus');
    await findByTestId('g11-stimulus-reference');
    await findByTestId('g11-stimulus-test-left');
    await findByTestId('g11-stimulus-test-right');
  });

  it('60 秒経過で onComplete が呼ばれる（未回答 → unattempted=true）', async () => {
    const onComplete = jest.fn();
    render(
      <G11VernierAlignmentScreen
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
    expect(typeof result.thresholdArcmin).toBe('number');
  });

  it('Sprint 21：correctSide 側のテストパッチをタップ → isCorrect=true', async () => {
    const onComplete = jest.fn();
    // rng=0.3 → correctSide='left'
    const { findByTestId } = render(
      <G11VernierAlignmentScreen
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
    fireEvent.press(await findByTestId('g11-stimulus-test-left'));
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(result.grading.userAnswerSide).toBe('left');
    expect(result.grading.correctSide).toBe('left');
    expect(result.isCorrectForStaircase).toBe(true);
  });

  it('Sprint 21：右テストパッチタップ後に左テストパッチを押すと最終回答が left に切り替わる', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G11VernierAlignmentScreen
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
    fireEvent.press(await findByTestId('g11-stimulus-test-right'));
    fireEvent.press(await findByTestId('g11-stimulus-test-left'));
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(result.grading.userAnswerSide).toBe('left');
  });

  it('Sprint 21：左テストパッチを 2 回押すと解除されて未回答に戻る', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G11VernierAlignmentScreen
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
    const cell = await findByTestId('g11-stimulus-test-left');
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

  it('Sprint 21：reference（上）はタップ反応しない（disabled）', async () => {
    const onComplete = jest.fn();
    // rng=0.3 → correctSide='left'
    const { findByTestId } = render(
      <G11VernierAlignmentScreen
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
    // reference をタップしても何も起きない
    const ref = await findByTestId('g11-stimulus-reference-cell');
    fireEvent.press(ref);
    // reference は disabled なので「未回答」のまま 60 秒経過
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(result.grading.unattempted).toBe(true);
  });

  it('staircase 2.0 初期 → 不正解で 2.2 方向（易、+step=0.2）に動く', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G11VernierAlignmentScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0.3} // correctSide='left'
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    // 'right' を押して不正解にする
    fireEvent.press(await findByTestId('g11-stimulus-test-right'));
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(result.playedParam).toBeCloseTo(2.0, 5);
    expect(result.isCorrectForStaircase).toBe(false);
    const raw = await AsyncStorage.getItem('gaboreye:v1.1:staircase:G-11');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.currentParam).toBeCloseTo(2.2, 4);
  });

  it('閾値（thresholdArcmin）は小数 1 桁の数値', async () => {
    const onComplete = jest.fn();
    render(
      <G11VernierAlignmentScreen
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
    const rounded = Math.round(result.thresholdArcmin * 10) / 10;
    expect(result.thresholdArcmin).toBeCloseTo(rounded, 5);
  });

  it('staircase が max=5 上限を超えない', async () => {
    const existing = {
      gameId: 'G-11',
      currentParam: 5,
      consecutiveCorrect: 0,
      lastUpdated: '2026-04-30',
      recentResults: [5, 5, 5, 5, 5],
    };
    await AsyncStorage.setItem(
      'gaboreye:v1.1:staircase:G-11',
      JSON.stringify(existing),
    );
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G11VernierAlignmentScreen
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
    fireEvent.press(await findByTestId('g11-stimulus-test-right')); // 不正解
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const raw = await AsyncStorage.getItem('gaboreye:v1.1:staircase:G-11');
    const parsed = JSON.parse(raw as string);
    expect(parsed.currentParam).toBeLessThanOrEqual(5);
  });

  it('Sprint 21：プレイ中にテストパッチを押すと aria-checked が更新される', async () => {
    const { findByTestId } = render(
      <G11VernierAlignmentScreen
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
    const left = await findByTestId('g11-stimulus-test-left');
    fireEvent.press(left);
    const leftAfter = await findByTestId('g11-stimulus-test-left');
    expect(leftAfter.props.accessibilityState?.checked).toBe(true);
    fireEvent.press(leftAfter);
    const leftReset = await findByTestId('g11-stimulus-test-left');
    expect(leftReset.props.accessibilityState?.checked).toBe(false);
  });

  it('Sprint 21：画面全体の主要要素が描画される（answer area は撤去）', async () => {
    const { findByTestId, queryByTestId } = render(
      <G11VernierAlignmentScreen
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
    await findByTestId('g11-vernier-alignment-screen');
    await findByTestId('game-status-bar-v11');
    await findByTestId('g11-stimulus');
    expect(queryByTestId('g11-answer-choice')).toBeNull();
  });
});
