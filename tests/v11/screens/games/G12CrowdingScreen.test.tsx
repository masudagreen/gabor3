/**
 * G12CrowdingScreen — F-07 G-12 受け入れテスト（spec-v11.md §7.12、screens.md S17-02）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { G12CrowdingScreen } from '../../../../src/screens/v11/games/G12CrowdingScreen';

beforeEach(async () => {
  jest.useFakeTimers();
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

const SHORT_DURATION = 1000;
const TICK_MS = 100;

describe('G12CrowdingScreen: F-07 / OPT-12', () => {
  it('描画クラッシュなしでマウントできる', async () => {
    const { findByTestId } = render(
      <G12CrowdingScreen
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
    await findByTestId('g12-crowding-screen');
  });

  it('「確定」「決定」ボタンは存在しない（OPT-12）', async () => {
    const { queryByText, findByTestId } = render(
      <G12CrowdingScreen
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
    await findByTestId('g12-crowding-screen');
    expect(queryByText(/^確定$/)).toBeNull();
    expect(queryByText(/^決定$/)).toBeNull();
    expect(queryByText(/^完了$/)).toBeNull();
  });

  it('GameStatusBarV11 が描画される', async () => {
    const { findByTestId } = render(
      <G12CrowdingScreen
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
    await findByTestId('g12-crowding-screen');
    await findByTestId('game-status-bar-v11');
  });

  it('ガイド文「中央のパッチの向きは？」を表示', async () => {
    const { findByTestId, queryAllByText } = render(
      <G12CrowdingScreen
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
    await findByTestId('g12-crowding-screen');
    expect(queryAllByText(/向き/).length).toBeGreaterThanOrEqual(1);
  });

  it('4 択 AnswerChoiceGroup（垂直 / 水平 / 斜め右 / 斜め左）が描画される', async () => {
    const { findByTestId } = render(
      <G12CrowdingScreen
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
    await findByTestId('g12-crowding-screen');
    await findByTestId('answer-choice-vertical');
    await findByTestId('answer-choice-horizontal');
    await findByTestId('answer-choice-diagonalRight');
    await findByTestId('answer-choice-diagonalLeft');
  });

  it('Sprint 21（ボタン UI 維持、案 B）：horizontal-4 ボタンが target 直下に維持されている', async () => {
    const { findByTestId } = render(
      <G12CrowdingScreen
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
    // Crowding パラダイムの注視構造維持のため horizontal-4 ボタンは撤去せず、target 直下に配置
    await findByTestId('g12-crowding-screen');
    await findByTestId('g12-answer-choice');
    await findByTestId('answer-choice-vertical');
    await findByTestId('answer-choice-horizontal');
    await findByTestId('answer-choice-diagonalRight');
    await findByTestId('answer-choice-diagonalLeft');
    await findByTestId('game-play-surface-answers');
  });

  it('Sprint 21：dataTargetIdPrefix=g12 で g12-{vertical|horizontal|diagonalRight|diagonalLeft} が DOM に出る', async () => {
    const { findByTestId, toJSON } = render(
      <G12CrowdingScreen
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
    await findByTestId('g12-crowding-screen');
    const json = JSON.stringify(toJSON());
    for (const id of ['g12-vertical', 'g12-horizontal', 'g12-diagonalRight', 'g12-diagonalLeft']) {
      expect(json.includes(id)).toBe(true);
    }
  });

  it('60 秒経過で onComplete が呼ばれる（未回答 → unattempted=true）', async () => {
    const onComplete = jest.fn();
    render(
      <G12CrowdingScreen
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
    expect(typeof result.thresholdSpacing).toBe('number');
  });

  it('「垂直」を押下後 60 秒経過で正解 vertical なら isCorrect=true', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G12CrowdingScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0.05} // pickRandomOrientation(0.05) → vertical (idx=0)
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    fireEvent.press(await findByTestId('answer-choice-vertical'));
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(result.grading.userAnswer).toBe('vertical');
    expect(result.grading.correctOrientation).toBe('vertical');
    expect(result.isCorrectForStaircase).toBe(true);
  });

  it('「水平」タップ後に「垂直」を押すと最終回答が vertical に切り替わる（radio）', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G12CrowdingScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0.05}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    fireEvent.press(await findByTestId('answer-choice-horizontal'));
    fireEvent.press(await findByTestId('answer-choice-vertical'));
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(result.grading.userAnswer).toBe('vertical');
  });

  it('「垂直」を 2 回押すと解除されて未回答に戻る', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G12CrowdingScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0.05}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    const btn = await findByTestId('answer-choice-vertical');
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

  it('staircase 2.0 初期 → 不正解で 2.2 方向（易、+step=0.2）に動く', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G12CrowdingScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0.05} // correctOrientation=vertical
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    fireEvent.press(await findByTestId('answer-choice-horizontal'));
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(result.playedParam).toBeCloseTo(2.0, 5);
    expect(result.isCorrectForStaircase).toBe(false);
    const raw = await AsyncStorage.getItem('gaboreye:v1.1:staircase:G-12');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.currentParam).toBeCloseTo(2.2, 4);
  });

  it('閾値（thresholdSpacing）は小数 1 桁の数値', async () => {
    const onComplete = jest.fn();
    render(
      <G12CrowdingScreen
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
    const rounded = Math.round(result.thresholdSpacing * 10) / 10;
    expect(result.thresholdSpacing).toBeCloseTo(rounded, 5);
  });

  it('staircase が max=4 上限を超えない', async () => {
    const existing = {
      gameId: 'G-12',
      currentParam: 4,
      consecutiveCorrect: 0,
      lastUpdated: '2026-04-30',
      recentResults: [4, 4, 4, 4, 4],
    };
    await AsyncStorage.setItem(
      'gaboreye:v1.1:staircase:G-12',
      JSON.stringify(existing),
    );
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G12CrowdingScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0.05}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    fireEvent.press(await findByTestId('answer-choice-horizontal')); // 不正解
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const raw = await AsyncStorage.getItem('gaboreye:v1.1:staircase:G-12');
    const parsed = JSON.parse(raw as string);
    expect(parsed.currentParam).toBeLessThanOrEqual(4);
  });

  it('プレイ中に回答ボタンを押すと AnswerChoiceGroup の aria-checked が更新される', async () => {
    const { findByTestId } = render(
      <G12CrowdingScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={jest.fn()}
        rng={() => 0.05}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    const v = await findByTestId('answer-choice-vertical');
    fireEvent.press(v);
    const vAfter = await findByTestId('answer-choice-vertical');
    expect(vAfter.props.accessibilityState?.checked).toBe(true);
    fireEvent.press(vAfter);
    const vReset = await findByTestId('answer-choice-vertical');
    expect(vReset.props.accessibilityState?.checked).toBe(false);
  });

  it('画面全体が描画されている', async () => {
    const { findByTestId } = render(
      <G12CrowdingScreen
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
    await findByTestId('g12-crowding-screen');
    await findByTestId('game-status-bar-v11');
    await findByTestId('g12-answer-choice');
  });
});
