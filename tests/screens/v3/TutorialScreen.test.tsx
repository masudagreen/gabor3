/**
 * TutorialScreen.test.tsx — v3.2 チュートリアルレベル Lv0（spec §4.8 / F-15）。
 *
 * - 3 ラウンド固定（個数 1→2→3・30秒・3x3・一方向・速度5）。個数を明示する。
 * - 正誤に関わらず順に進み、3 ラウンド完了で onComplete。
 * - × で即スキップ（onComplete）。
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import {
  TutorialScreen,
  TUTORIAL_COUNTS,
} from '../../../src/screens/v3/TutorialScreen';
import { mulberry32 } from '../../../src/lib/v2/rng';

function renderTutorial(
  props?: Partial<React.ComponentProps<typeof TutorialScreen>>,
) {
  const onComplete = jest.fn();
  const utils = render(
    <ThemeProvider preference="dark" systemScheme="dark">
      <TutorialScreen
        viewingDistanceCm={40}
        rng={mulberry32(3)}
        onComplete={onComplete}
        testId="tut"
        {...props}
      />
    </ThemeProvider>,
  );
  return { ...utils, onComplete };
}

/** 1 ラウンド分（30 秒制限 + 3 秒開示）を進め、次ラウンドへ自動遷移させる。 */
function advanceOneRound() {
  // 締切（seconds=30）。
  act(() => {
    jest.advanceTimersByTime((30 + 1) * 1000);
  });
  // 3 秒開示カウントダウン → onResolved。
  act(() => {
    jest.advanceTimersByTime(1000);
  });
  act(() => {
    jest.advanceTimersByTime(1000);
  });
  act(() => {
    jest.advanceTimersByTime(1000);
  });
}

describe('TutorialScreen v3.2（§4.8/F-15）', () => {
  it('3 ラウンド固定の個数は 1→2→3 である', () => {
    expect([...TUTORIAL_COUNTS]).toEqual([1, 2, 3]);
  });

  it('R1 は「レベル 0」・個数 1 を明示（1 個探せ）し、3x3 格子を描画する', () => {
    renderTutorial();
    expect(screen.getByLabelText('レベル 0')).toBeTruthy();
    // 個数を明示（本番の「全て探せ」ではない）。CountBanner count バリアントの a11y ラベル。
    expect(screen.getByLabelText('1 個の回転を探してください')).toBeTruthy();
    // 3x3 = 9 パッチ。
    expect(screen.getByLabelText('パッチ 1-1')).toBeTruthy();
    expect(screen.getByLabelText('パッチ 3-3')).toBeTruthy();
  });

  it('正誤に関わらず R1→R2→R3 と進み、3 ラウンド完了で onComplete を呼ぶ', () => {
    jest.useFakeTimers();
    const { onComplete } = renderTutorial();

    // R1：個数 1。
    expect(screen.getByLabelText('1 個の回転を探してください')).toBeTruthy();
    advanceOneRound();
    // R2：個数 2（誤答せず＝無選択でも次へ進む）。
    expect(screen.getByLabelText('2 個の回転を探してください')).toBeTruthy();
    expect(onComplete).not.toHaveBeenCalled();
    advanceOneRound();
    // R3：個数 3。
    expect(screen.getByLabelText('3 個の回転を探してください')).toBeTruthy();
    expect(onComplete).not.toHaveBeenCalled();
    advanceOneRound();
    // 3 ラウンド完了 → onComplete。
    expect(onComplete).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  it('× でチュートリアルをスキップでき onComplete を呼ぶ', () => {
    const { onComplete } = renderTutorial();
    fireEvent.press(screen.getByLabelText('ゲームを中断'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
