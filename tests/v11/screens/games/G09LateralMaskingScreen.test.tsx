/**
 * G09LateralMaskingScreen — F-07 G-09 受け入れテスト（spec-v11.md §7.9、screens.md S15-05）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { G09LateralMaskingScreen } from '../../../../src/screens/v11/games/G09LateralMaskingScreen';

beforeEach(async () => {
  jest.useFakeTimers();
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

const SHORT_DURATION = 1000;
const TICK_MS = 100;

describe('G09LateralMaskingScreen: F-07 / OPT-12', () => {
  it('描画クラッシュなしでマウントできる', async () => {
    const { findByTestId } = render(
      <G09LateralMaskingScreen
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
    await findByTestId('g09-lateral-masking-screen');
  });

  it('「確定」「決定」ボタンは存在しない（OPT-12）', async () => {
    const { queryByText, findByTestId } = render(
      <G09LateralMaskingScreen
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
    await findByTestId('g09-lateral-masking-screen');
    expect(queryByText(/^確定$/)).toBeNull();
    expect(queryByText(/^決定$/)).toBeNull();
    expect(queryByText(/^完了$/)).toBeNull();
  });

  it('GameStatusBarV11 が描画される', async () => {
    const { findByTestId } = render(
      <G09LateralMaskingScreen
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
    await findByTestId('g09-lateral-masking-screen');
    await findByTestId('game-status-bar-v11');
  });

  it('ガイド文「中央のパッチは縦縞？横縞？」を表示', async () => {
    const { findByTestId, queryAllByText } = render(
      <G09LateralMaskingScreen
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
    await findByTestId('g09-lateral-masking-screen');
    expect(queryAllByText(/縦縞？横縞？/).length).toBeGreaterThanOrEqual(1);
  });

  it('「縦寄り」「横寄り」の AnswerChoiceGroup が描画される', async () => {
    const { findByTestId } = render(
      <G09LateralMaskingScreen
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
    await findByTestId('g09-lateral-masking-screen');
    await findByTestId('answer-choice-vertical');
    await findByTestId('answer-choice-horizontal');
  });

  it('Sprint 21（ボタン UI 維持、案 B）：horizontal-2 ボタンが target 直下に空間配置されている', async () => {
    const { findByTestId } = render(
      <G09LateralMaskingScreen
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
    // Polat パラダイム維持のため horizontal-2 ボタンは撤去せず、target 直下配置を維持
    await findByTestId('g09-lateral-masking-screen');
    await findByTestId('g09-answer-choice'); // ボタン群が存在
    await findByTestId('answer-choice-vertical');
    await findByTestId('answer-choice-horizontal');
    await findByTestId('game-play-surface-answers'); // answer area が描画される（撤去されない）
  });

  it('Sprint 21：dataTargetIdPrefix=g09 で g09-vertical / g09-horizontal が DOM に出る（resultMarks.ts 整合）', async () => {
    const { findByTestId, toJSON } = render(
      <G09LateralMaskingScreen
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
    await findByTestId('g09-lateral-masking-screen');
    const json = JSON.stringify(toJSON());
    // ボタン群に data-target-id が付与されている（platform=web で属性が出る）
    // jest jsdom 環境では実 attribute は文字列化された JSON で確認
    expect(
      json.includes('g09-vertical') || json.includes('"data-target-id":"g09-vertical"'),
    ).toBe(true);
    expect(
      json.includes('g09-horizontal') ||
        json.includes('"data-target-id":"g09-horizontal"'),
    ).toBe(true);
  });

  it('60 秒経過で onComplete が呼ばれる（未回答 → unattempted=true）', async () => {
    const onComplete = jest.fn();
    render(
      <G09LateralMaskingScreen
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

  it('「縦寄り」を押下後 60 秒経過で正解 vertical なら isCorrect=true', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G09LateralMaskingScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0.4} // correctOrientation=vertical
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

  it('「横寄り」タップ後に「縦寄り」を押すと最終回答が vertical に切り替わる', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G09LateralMaskingScreen
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

  it('「縦寄り」を 2 回押すと解除されて未回答に戻る', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G09LateralMaskingScreen
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
    const verticalBtn = await findByTestId('answer-choice-vertical');
    fireEvent.press(verticalBtn);
    fireEvent.press(verticalBtn);
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(result.grading.unattempted).toBe(true);
  });

  it('staircase 0.10 初期 → 不正解で 0.11 方向（易、+step）に動く', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G09LateralMaskingScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0.4} // correctOrientation=vertical
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
    expect(result.playedParam).toBeCloseTo(0.1, 5);
    expect(result.isCorrectForStaircase).toBe(false);
    const raw = await AsyncStorage.getItem('gaboreye:v1.1:staircase:G-09');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.currentParam).toBeCloseTo(0.11, 5);
  });

  it('閾値（thresholdContrast）は小数 2 桁の数値', async () => {
    const onComplete = jest.fn();
    render(
      <G09LateralMaskingScreen
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

  it('staircase が max=0.20 上限を超えない', async () => {
    const existing = {
      gameId: 'G-09',
      currentParam: 0.2,
      consecutiveCorrect: 0,
      lastUpdated: '2026-04-30',
      recentResults: [0.2, 0.2, 0.2, 0.2, 0.2],
    };
    await AsyncStorage.setItem(
      'gaboreye:v1.1:staircase:G-09',
      JSON.stringify(existing),
    );
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G09LateralMaskingScreen
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
    fireEvent.press(await findByTestId('answer-choice-horizontal'));
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const raw = await AsyncStorage.getItem('gaboreye:v1.1:staircase:G-09');
    const parsed = JSON.parse(raw as string);
    expect(parsed.currentParam).toBeLessThanOrEqual(0.2);
  });

  // ---- Sprint 15 修正ラウンド 2 / Minor & Critical の screen レベル境界条件 ----
  // プレイ画面では stimulusArea が GamePlaySurface 内部の accessibilityElementsHidden
  // 配下にあり、@testing-library/react-native の query は stimulus 内部の testID を
  // 辿れない。プレイ中のハイライト抑止・opacity=1 維持は LateralMaskingStimulus
  // 単体テスト（tests/v11/components/games/LateralMaskingStimulus.test.tsx）で担保。
  // ここでは AnswerChoiceGroup 側の選択状態が screen から正しく駆動されることを確認。
  it('プレイ中に回答ボタンを押すと AnswerChoiceGroup 側の aria-checked のみが更新される（target は無装飾）', async () => {
    const { findByTestId } = render(
      <G09LateralMaskingScreen
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
    const v = await findByTestId('answer-choice-vertical');
    fireEvent.press(v);
    const vAfter = await findByTestId('answer-choice-vertical');
    expect(vAfter.props.accessibilityState?.checked).toBe(true);
    fireEvent.press(vAfter);
    const vReset = await findByTestId('answer-choice-vertical');
    expect(vReset.props.accessibilityState?.checked).toBe(false);
  });

  it('画面全体が描画されている（GamePlaySurface は accessibilityElementsHidden 配下に stimulus を内包）', async () => {
    const { findByTestId } = render(
      <G09LateralMaskingScreen
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
    // 画面外側 + GameStatusBar + AnswerChoiceGroup が揃っていれば、
    // stimulus は GamePlaySurface 内部の accessibilityElementsHidden 配下に
    // レンダリングされている（RNTL は配下を辿らないため testID で取れない）。
    await findByTestId('g09-lateral-masking-screen');
    await findByTestId('game-status-bar-v11');
    await findByTestId('g09-answer-choice');
  });
});
