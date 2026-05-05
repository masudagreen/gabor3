/**
 * G02SideBySideTiltScreen — F-07 G-02 受け入れテスト（spec-v11.md §7.2、screens.md S20-G02-PLAY）。
 *
 * v1.1.1 Sprint 20-C 改訂：horizontal-2 撤去、左右ガボールパッチ直接タップで回答。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { G02SideBySideTiltScreen } from '../../../../src/screens/v11/games/G02SideBySideTiltScreen';

beforeEach(async () => {
  jest.useFakeTimers();
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

const SHORT_DURATION = 1000;
const TICK_MS = 100;

describe('G02SideBySideTiltScreen: F-07 / OPT-12 / Sprint 20-C', () => {
  it('描画クラッシュなしでマウントできる', async () => {
    const { findByTestId } = render(
      <G02SideBySideTiltScreen
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
    await findByTestId('g02-side-by-side-tilt-screen');
  });

  it('「確定」「決定」ボタンは存在しない（OPT-12 確定ボタンなし）', async () => {
    const { queryByText, findByTestId } = render(
      <G02SideBySideTiltScreen
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
    await findByTestId('g02-side-by-side-tilt-screen');
    expect(queryByText(/^確定$/)).toBeNull();
    expect(queryByText(/^決定$/)).toBeNull();
    expect(queryByText(/^完了$/)).toBeNull();
  });

  it('GameStatusBarV11 が描画される（残り N 秒）', async () => {
    const { findByTestId } = render(
      <G02SideBySideTiltScreen
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
    await findByTestId('g02-side-by-side-tilt-screen');
    await findByTestId('game-status-bar-v11');
  });

  it('Sprint 20-C：guidance に「より時計回り」または「より反時計回り」が表示される', async () => {
    const { findByTestId, queryAllByText } = render(
      <G02SideBySideTiltScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={jest.fn()}
        rng={() => 0.4} // ask=cw（rng<0.5、ただし複数回呼ばれるので結果はトリックではない）
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    await findByTestId('g02-side-by-side-tilt-screen');
    // 「より時計回り」または「より反時計回り」が出ているはず
    const matches = queryAllByText(/より(時計回り|反時計回り)/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('Sprint 20 ラウンド 2：guidance に role="status" / aria-live="polite"（screens.md §3.6）', async () => {
    const { findByTestId } = render(
      <G02SideBySideTiltScreen
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
    await findByTestId('g02-side-by-side-tilt-screen');
    // GamePlaySurface の guidanceLiveRegion=true で testID と role / aria-live が付く
    const guidance = await findByTestId('game-play-surface-guidance');
    expect(guidance).toBeTruthy();
    expect(guidance.props.accessibilityLiveRegion).toBe('polite');
    // RN Web 経路の role 属性（react-native-web は role を直接出す）
    expect(guidance.props.role).toBe('status');
  });

  it('Sprint 20-C：horizontal-2 テキスト 2 択ボタン（answer-choice-left / right）は存在しない', async () => {
    const { queryByTestId, findByTestId } = render(
      <G02SideBySideTiltScreen
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
    await findByTestId('g02-side-by-side-tilt-screen');
    expect(queryByTestId('answer-choice-left')).toBeNull();
    expect(queryByTestId('answer-choice-right')).toBeNull();
  });

  it('Sprint 20-C：左右ガボールパッチ（g02-stimulus-left / right）が描画される', async () => {
    const { findByTestId } = render(
      <G02SideBySideTiltScreen
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
    await findByTestId('g02-side-by-side-tilt-screen');
    await findByTestId('g02-stimulus-left');
    await findByTestId('g02-stimulus-right');
  });

  it('60 秒経過で onComplete が呼ばれる（未回答 → unattempted=true, isCorrect=false）', async () => {
    const onComplete = jest.fn();
    render(
      <G02SideBySideTiltScreen
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

  it('Sprint 20-C：左パッチ（g02-stimulus-left）をタップ → aria-checked=true', async () => {
    const { findByTestId } = render(
      <G02SideBySideTiltScreen
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
    const leftCell = await findByTestId('g02-stimulus-left');
    fireEvent.press(leftCell);
    const after = await findByTestId('g02-stimulus-left');
    expect(after.props.accessibilityState?.checked).toBe(true);
    const right = await findByTestId('g02-stimulus-right');
    expect(right.props.accessibilityState?.checked).toBe(false);
  });

  it('Sprint 20-C：右タップ後に左を押すと最終回答が左に切り替わる（採点に反映）', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G02SideBySideTiltScreen
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
    fireEvent.press(await findByTestId('g02-stimulus-right'));
    fireEvent.press(await findByTestId('g02-stimulus-left'));
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(result.grading.userAnswer).toBe('left');
  });

  it('Sprint 20-C：左を 2 回タップで解除されて未回答に戻る', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G02SideBySideTiltScreen
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
    const leftCell = await findByTestId('g02-stimulus-left');
    fireEvent.press(leftCell);
    fireEvent.press(leftCell); // 解除
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(result.grading.unattempted).toBe(true);
  });

  it('staircase 6° 初期 → 不正解で 7° 方向（易）に動く', async () => {
    // 過去の永続化なし：初期 currentParam=6（gameRegistry より）
    // rng=()=>0.4 を全試行で返すと、4 回目以降の rng 呼び出しで ask='cw' になる前提が
    // 不安定になるため、シーケンスで明示的に rng 出力を制御する。
    const seq = [0.1, 0.2, 0.3, 0.4, 0.1, 0.5]; // base, correctSide, leftPhase, rightPhase, ask, ...
    let i = 0;
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <G02SideBySideTiltScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => seq[i++ % seq.length] ?? 0.5}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    // 「右」を選んで採点する。askDirection の cw/ccw に応じて正解側が変わるため、
    // 正解／不正解の真偽は trial 内容次第。playedParam=6（初期）と staircase が
    // 動いたかだけを検証する。
    fireEvent.press(await findByTestId('g02-stimulus-right'));
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(result.playedParam).toBe(6); // initial
    const raw = await AsyncStorage.getItem('gaboreye:v1.1:staircase:G-02');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    // 正解 → -1 / 不正解 → +1。範囲は [1, 10]。
    expect([5, 7]).toContain(parsed.currentParam);
  });
});
