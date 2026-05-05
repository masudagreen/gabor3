/**
 * G13EmbeddedNumeralScreen — F-07 G-13 受け入れテスト（spec-v11.md §7.13、screens.md S17-05）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { G13EmbeddedNumeralScreen } from '../../../../src/screens/v11/games/G13EmbeddedNumeralScreen';

beforeEach(async () => {
  jest.useFakeTimers();
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

const SHORT_DURATION = 1000;
const TICK_MS = 100;

describe('G13EmbeddedNumeralScreen: F-07 / OPT-12', () => {
  it('描画クラッシュなしでマウントできる', async () => {
    const { findByTestId } = render(
      <G13EmbeddedNumeralScreen
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
    await findByTestId('g13-embedded-numeral-screen');
  });

  it('「確定」「決定」ボタンは存在しない（OPT-12）', async () => {
    const { queryByText, findByTestId } = render(
      <G13EmbeddedNumeralScreen
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
    await findByTestId('g13-embedded-numeral-screen');
    expect(queryByText(/^確定$/)).toBeNull();
    expect(queryByText(/^決定$/)).toBeNull();
    expect(queryByText(/^完了$/)).toBeNull();
  });

  it('GameStatusBarV11 が描画される', async () => {
    const { findByTestId } = render(
      <G13EmbeddedNumeralScreen
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
    await findByTestId('g13-embedded-numeral-screen');
    await findByTestId('game-status-bar-v11');
  });

  it('ガイド文「何の数字が埋まっている？」を表示', async () => {
    const { findByTestId, queryAllByText } = render(
      <G13EmbeddedNumeralScreen
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
    await findByTestId('g13-embedded-numeral-screen');
    expect(queryAllByText(/数字/).length).toBeGreaterThanOrEqual(1);
  });

  it('10 ボタン（0〜9）の AnswerChoiceGroup keypad-10 が描画される', async () => {
    const { findByTestId } = render(
      <G13EmbeddedNumeralScreen
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
    await findByTestId('g13-embedded-numeral-screen');
    for (let i = 0; i <= 9; i++) {
      await findByTestId(`answer-choice-${i}`);
    }
  });

  it('Sprint 21（ボタン UI 維持、案 B）：keypad-10 が刺激領域直下に維持されている（5×2 配置）', async () => {
    const { findByTestId } = render(
      <G13EmbeddedNumeralScreen
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
    // 数字 0〜9 を刺激上で直接選択するのは物理的に不可能のため keypad-10 は維持
    await findByTestId('g13-embedded-numeral-screen');
    await findByTestId('g13-answer-choice');
    for (let i = 0; i <= 9; i++) {
      await findByTestId(`answer-choice-${i}`);
    }
    await findByTestId('game-play-surface-answers');
  });

  it('Sprint 21：dataTargetIdPrefix=g13-key で g13-key-{0..9} が DOM に出る（resultMarks.ts 整合）', async () => {
    const { findByTestId, toJSON } = render(
      <G13EmbeddedNumeralScreen
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
    await findByTestId('g13-embedded-numeral-screen');
    const json = JSON.stringify(toJSON());
    for (let i = 0; i <= 9; i++) {
      expect(json.includes(`g13-key-${i}`)).toBe(true);
    }
  });

  it('60 秒経過で onComplete が呼ばれる（未回答 → unattempted=true）', async () => {
    const onComplete = jest.fn();
    render(
      <G13EmbeddedNumeralScreen
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
    expect(typeof result.thresholdContrast).toBe('number');
  });

  it('「3」を押下後 60 秒経過で正解 3 なら isCorrect=true', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G13EmbeddedNumeralScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0.35} // pickRandomDigit(0.35) → idx=3
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    fireEvent.press(await findByTestId('answer-choice-3'));
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(result.grading.userAnswer).toBe(3);
    expect(result.grading.embeddedDigit).toBe(3);
    expect(result.isCorrectForStaircase).toBe(true);
  });

  it('「3」タップ後に「7」を押すと最終回答が 7 に切り替わる（radio）', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G13EmbeddedNumeralScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0.35}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    fireEvent.press(await findByTestId('answer-choice-3'));
    fireEvent.press(await findByTestId('answer-choice-7'));
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(result.grading.userAnswer).toBe(7);
  });

  it('「3」を 2 回押すと解除されて未回答に戻る', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G13EmbeddedNumeralScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0.35}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    const btn = await findByTestId('answer-choice-3');
    fireEvent.press(btn);
    fireEvent.press(btn);
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(result.grading.unattempted).toBe(true);
  });

  it('staircase 0.05 初期（v1.1.4）→ 不正解で 0.06 方向（易、+step=0.01）に動く', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G13EmbeddedNumeralScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0.35} // embeddedDigit=3
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    fireEvent.press(await findByTestId('answer-choice-7')); // 不正解（target=3）
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(result.playedParam).toBeCloseTo(0.05, 5);
    expect(result.isCorrectForStaircase).toBe(false);
    const raw = await AsyncStorage.getItem('gaboreye:v1.1:staircase:G-13');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.currentParam).toBeCloseTo(0.06, 4);
  });

  it('閾値（thresholdContrast）は小数 2 桁の数値', async () => {
    const onComplete = jest.fn();
    render(
      <G13EmbeddedNumeralScreen
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
    const rounded = Math.round(result.thresholdContrast * 100) / 100;
    expect(result.thresholdContrast).toBeCloseTo(rounded, 5);
  });

  it('staircase が max=0.30 上限を超えない', async () => {
    const existing = {
      gameId: 'G-13',
      currentParam: 0.30,
      consecutiveCorrect: 0,
      lastUpdated: '2026-04-30',
      recentResults: [0.30, 0.30, 0.30, 0.30, 0.30],
    };
    await AsyncStorage.setItem(
      'gaboreye:v1.1:staircase:G-13',
      JSON.stringify(existing),
    );
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G13EmbeddedNumeralScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0.35}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    fireEvent.press(await findByTestId('answer-choice-7')); // 不正解
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const raw = await AsyncStorage.getItem('gaboreye:v1.1:staircase:G-13');
    const parsed = JSON.parse(raw as string);
    expect(parsed.currentParam).toBeLessThanOrEqual(0.30);
  });

  it('プレイ中に回答ボタンを押すと AnswerChoiceGroup の aria-checked が更新される', async () => {
    const { findByTestId } = render(
      <G13EmbeddedNumeralScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={jest.fn()}
        rng={() => 0.35}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    const three = await findByTestId('answer-choice-3');
    fireEvent.press(three);
    const threeAfter = await findByTestId('answer-choice-3');
    expect(threeAfter.props.accessibilityState?.checked).toBe(true);
    fireEvent.press(threeAfter);
    const threeReset = await findByTestId('answer-choice-3');
    expect(threeReset.props.accessibilityState?.checked).toBe(false);
  });

  it('画面全体が描画されている', async () => {
    const { findByTestId } = render(
      <G13EmbeddedNumeralScreen
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
    await findByTestId('g13-embedded-numeral-screen');
    await findByTestId('game-status-bar-v11');
    await findByTestId('g13-answer-choice');
  });
});
