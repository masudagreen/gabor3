/**
 * badgeToast.test.tsx — v3.1：バッジ獲得トーストは一定時間で自動的に消える。
 */

import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { BadgeAwardToast } from '../../../src/components/v3/BadgeAwardToast';

function dark(ui: React.ReactElement) {
  return render(
    <ThemeProvider preference="dark" systemScheme="dark">
      {ui}
    </ThemeProvider>,
  );
}

describe('BadgeAwardToast 自動消滅（v3.1）', () => {
  beforeEach(() => {
    // reduced-motion 経路（アニメーション無し）でタイマー挙動だけを確認する。
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('表示後、一定時間（保持時間）を過ぎると消える', async () => {
    jest.useFakeTimers();
    dark(<BadgeAwardToast badgeIds={['B-09']} testId="bt" />);

    // 初期は表示されている。
    expect(screen.getByTestId('bt')).toBeTruthy();

    // reduce-motion 判定（Promise）を解決させてから保持時間を経過させる。
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    act(() => {
      jest.advanceTimersByTime(2600);
    });

    // 自動消滅してアンマウントされる。
    expect(screen.queryByTestId('bt')).toBeNull();
  });
});
