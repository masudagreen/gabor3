/**
 * DistanceReminderScreen.test.tsx — S6-2 距離リマインド（F-06 / OPT-10 / F-12）。
 *
 * 検証する観察可能挙動：
 *  - 「画面から {n}cm 離れてください」を設定距離で表示
 *  - カウントダウンで自動進行（ユーザー操作不要で onComplete）
 *  - X で中断（onAbort）
 *  - 片眼ガイダンス時のみ補助文を表示
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { DistanceReminderScreen } from '../../../src/screens/v2/DistanceReminderScreen';

function renderReminder(
  over: Partial<React.ComponentProps<typeof DistanceReminderScreen>> = {},
) {
  const onComplete = jest.fn();
  const onAbort = jest.fn();
  render(
    <ThemeProvider preference="light" systemScheme="light">
      <DistanceReminderScreen
        viewingDistanceCm={40}
        onComplete={onComplete}
        onAbort={onAbort}
        testId="dr"
        {...over}
      />
    </ThemeProvider>,
  );
  return { onComplete, onAbort };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  act(() => jest.runOnlyPendingTimers());
  jest.useRealTimers();
});

describe('DistanceReminderScreen — 表示（F-06/OPT-10）', () => {
  it('設定距離を含む案内文を表示する', () => {
    renderReminder({ viewingDistanceCm: 50 });
    expect(screen.getByText('画面から 50cm')).toBeTruthy();
    expect(screen.getByText('離れてください')).toBeTruthy();
  });

  it('片眼 off では補助文を出さない', () => {
    renderReminder({ oneEyeGuidance: 'off' });
    expect(screen.queryByTestId('dr-one-eye')).toBeNull();
  });

  it('片眼 left では補助文を出す', () => {
    renderReminder({ oneEyeGuidance: 'left' });
    expect(screen.getByTestId('dr-one-eye')).toBeTruthy();
  });
});

describe('DistanceReminderScreen — 自動進行（F-06）', () => {
  it('カウントダウン満了で onComplete が 1 度だけ呼ばれる（操作不要）', () => {
    const { onComplete } = renderReminder({ countdownSec: 3 });
    expect(onComplete).not.toHaveBeenCalled();
    // 1 秒ごとにティック（実機挙動に合わせて段階的に進める）
    for (let i = 0; i < 3; i++) {
      act(() => jest.advanceTimersByTime(1000));
    }
    expect(onComplete).toHaveBeenCalledTimes(1);
    // 余分に進めても二重発火しない
    act(() => jest.advanceTimersByTime(2000));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('X 押下で onAbort が呼ばれ、自動進行はしない', () => {
    const { onComplete, onAbort } = renderReminder({ countdownSec: 3 });
    fireEvent.press(screen.getByTestId('dr-abort'));
    expect(onAbort).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();
  });
});
