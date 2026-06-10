/**
 * DistanceReminderScreen.test.tsx — S7-2 距離リマインド（DR-1、F-06 / OPT-10 / F-12）v3.0。
 *
 * - 「画面から {n}cm 離れてください」を設定距離で表示（18pt 以上）。
 * - カウントダウンで自動進行（ユーザー操作不要で onComplete、F-06）。
 * - X で中断（onAbort）。
 * - 片眼ガイダンス時のみ補助文を表示。
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { DistanceReminderScreen } from '../../../src/screens/v3/DistanceReminderScreen';

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

describe('DistanceReminderScreen v3 — 表示（F-06/OPT-10）', () => {
  it('設定距離を含む案内文を表示する（「自動で始まります」の文言は出さない）', () => {
    renderReminder({ viewingDistanceCm: 50 });
    expect(screen.getByText('画面から 50cm')).toBeTruthy();
    expect(screen.getByText('離れてください')).toBeTruthy();
    // v3.1 改訂：数字カウントダウンのみ（文言なし、ユーザー要望）。
    expect(screen.queryByText(/自動で始まります/)).toBeNull();
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

describe('DistanceReminderScreen v3 — 自動進行（F-06）', () => {
  it('カウントダウン満了で onComplete が 1 度だけ呼ばれる（操作不要）', () => {
    const { onComplete } = renderReminder({ countdownSec: 3 });
    expect(onComplete).not.toHaveBeenCalled();
    for (let i = 0; i < 3; i++) {
      act(() => jest.advanceTimersByTime(1000));
    }
    expect(onComplete).toHaveBeenCalledTimes(1);
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
