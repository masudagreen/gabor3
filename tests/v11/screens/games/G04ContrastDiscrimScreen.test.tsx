/**
 * G04ContrastDiscrimScreen — F-07 G-04 受け入れテスト（spec-v11.md §7.4、screens.md S12-02）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { G04ContrastDiscrimScreen } from '../../../../src/screens/v11/games/G04ContrastDiscrimScreen';

beforeEach(async () => {
  jest.useFakeTimers();
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

const SHORT_DURATION = 1000;
const TICK_MS = 100;

describe('G04ContrastDiscrimScreen: F-07 / OPT-12', () => {
  it('描画クラッシュなしでマウントできる', async () => {
    const { findByTestId } = render(
      <G04ContrastDiscrimScreen
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
    await findByTestId('g04-contrast-discrim-screen');
  });

  it('「確定」「決定」ボタンは存在しない（OPT-12 確定ボタンなし）', async () => {
    const { queryByText, findByTestId } = render(
      <G04ContrastDiscrimScreen
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
    await findByTestId('g04-contrast-discrim-screen');
    expect(queryByText(/^確定$/)).toBeNull();
    expect(queryByText(/^決定$/)).toBeNull();
    expect(queryByText(/^完了$/)).toBeNull();
  });

  it('GameStatusBarV11 が描画される（残り N 秒）', async () => {
    const { findByTestId } = render(
      <G04ContrastDiscrimScreen
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
    await findByTestId('g04-contrast-discrim-screen');
    await findByTestId('game-status-bar-v11');
  });

  it('Sprint 20 ラウンド 2：guidanceLiveRegion が無効（G-02 / G-08 のみ true、screens.md §3.6 / §5.6 の要求対象外）', async () => {
    const { findByTestId, queryByTestId } = render(
      <G04ContrastDiscrimScreen
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
    await findByTestId('g04-contrast-discrim-screen');
    // game-play-surface-guidance testID は guidanceLiveRegion=true の時のみ付く
    // G-04 は要求対象外なので testID 無し（通常 Text として描画される）
    expect(queryByTestId('game-play-surface-guidance')).toBeNull();
  });

  it('Sprint 21 直接選択化：刺激領域が SR に開放される（stimulusInteractive=true）', async () => {
    const { findByTestId, queryByTestId } = render(
      <G04ContrastDiscrimScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={jest.fn()}
        rng={() => 0.4}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        jest.advanceTimersByTime(50);
        await Promise.resolve();
      });
    }
    await findByTestId('g04-contrast-discrim-screen');
    const stim = queryByTestId('game-play-surface-stimulus');
    if (stim) {
      // Sprint 21：直接選択化に伴い SR から隔離せず開放（左右パッチが radio として SR から到達可能）
      expect(stim.props.accessibilityElementsHidden).toBeFalsy();
    }
  });

  it('Sprint 21：ガイド文「コントラストが強いのはどっち？」を表示', async () => {
    const { findByTestId, queryAllByText } = render(
      <G04ContrastDiscrimScreen
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
    await findByTestId('g04-contrast-discrim-screen');
    expect(queryAllByText(/コントラストが強いのはどっち/).length).toBeGreaterThanOrEqual(1);
  });

  it('Sprint 21：horizontal-2 テキスト 2 択ボタン（answer-choice-left / right）は存在しない', async () => {
    const { findByTestId, queryByTestId } = render(
      <G04ContrastDiscrimScreen
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
    await findByTestId('g04-contrast-discrim-screen');
    expect(queryByTestId('answer-choice-left')).toBeNull();
    expect(queryByTestId('answer-choice-right')).toBeNull();
    // 回答領域そのものも描画されない（answerChoices=null）
    expect(queryByTestId('game-play-surface-answers')).toBeNull();
  });

  it('Sprint 21：左右ガボールパッチ（g04-stimulus-left / right）が ImageChoiceCell でラップされる', async () => {
    const { findByTestId } = render(
      <G04ContrastDiscrimScreen
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
    await findByTestId('g04-contrast-discrim-screen');
    await findByTestId('g04-stimulus-left');
    await findByTestId('g04-stimulus-right');
  });

  it('60 秒経過で onComplete が呼ばれる（未回答 → unattempted=true, isCorrect=false）', async () => {
    const onComplete = jest.fn();
    render(
      <G04ContrastDiscrimScreen
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

  it('「左」ボタンを押下後 60 秒経過で正解側=left なら isCorrect=true', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G04ContrastDiscrimScreen
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
    const leftBtn = await findByTestId('g04-stimulus-left');
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
      <G04ContrastDiscrimScreen
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
    fireEvent.press(await findByTestId('g04-stimulus-right'));
    fireEvent.press(await findByTestId('g04-stimulus-left'));
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
      <G04ContrastDiscrimScreen
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
    await findByTestId('g04-contrast-discrim-screen');
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
      <G04ContrastDiscrimScreen
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
    const leftBtn = await findByTestId('g04-stimulus-left');
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

  it('staircase 0.06 初期（v1.1.4）→ 不正解で 0.07 方向（易、+step=0.01）に動く', async () => {
    // 過去の永続化なし：初期 currentParam=0.06（gameRegistry より、v1.1.4 難化）
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G04ContrastDiscrimScreen
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
    // 「右」を選んで不正解にする
    fireEvent.press(await findByTestId('g04-stimulus-right'));
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(result.playedParam).toBeCloseTo(0.06, 5); // initial（v1.1.4）
    expect(result.isCorrectForStaircase).toBe(false);
    // staircase が易方向（max 方向 +1 step=0.01）に動いた状態が AsyncStorage に保存されている
    const raw = await AsyncStorage.getItem('gaboreye:v1.1:staircase:G-04');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    // 0.06 + 0.01 = 0.07（浮動小数誤差は toBeCloseTo で許容）
    expect(parsed.currentParam).toBeCloseTo(0.07, 5);
  });

  it('閾値（thresholdContrast）は小数 2 桁の数値（例 0.15）', async () => {
    const onComplete = jest.fn();
    render(
      <G04ContrastDiscrimScreen
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
    // round2 されているため小数点以下 2 桁以内に収まる
    const rounded = Math.round(result.thresholdContrast * 100) / 100;
    expect(result.thresholdContrast).toBeCloseTo(rounded, 5);
  });
});
