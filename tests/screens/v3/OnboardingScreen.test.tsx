/**
 * OnboardingScreen.test.tsx — S7-1 オンボーディング（F-06 / F-10）v3.0。
 *
 * - 初回表示（ステップ 1：免責同意）。
 * - 免責同意ゲート：理解チェック前は「同意する」disabled、チェックで進める（F-10）。
 * - 70 代以上申告で追加警告（F-10）。
 * - 4 ステップを最小タップ（≤6、F-06）で完了し、結果（同意日時/年齢/距離）が onComplete に渡る。
 * - 概要は回転のみ（空間周波数の言及なし、spec §0）。
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { OnboardingScreen } from '../../../src/screens/v3/OnboardingScreen';

function renderOnboarding(onComplete = jest.fn()) {
  render(
    <ThemeProvider preference="light" systemScheme="light">
      <OnboardingScreen
        onComplete={onComplete}
        now={() => new Date('2026-06-10T09:00:00.000Z')}
        testId="ob"
      />
    </ThemeProvider>,
  );
  return { onComplete };
}

describe('OnboardingScreen v3 — 初回表示と免責ゲート（F-10）', () => {
  it('ステップ 1（免責同意）が表示され、免責本文が出る', () => {
    renderOnboarding();
    expect(screen.getByTestId('ob-step-1')).toBeTruthy();
    expect(screen.getByTestId('ob-disclaimer')).toBeTruthy();
    expect(screen.getByText('GaborEye へようこそ')).toBeTruthy();
  });

  it('理解チェック前は「同意する」が disabled で進めない', () => {
    renderOnboarding();
    const agree = screen.getByTestId('ob-agree');
    expect(agree.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(agree);
    expect(screen.getByTestId('ob-step-1')).toBeTruthy();
  });

  it('理解チェック後は「同意する」で次ステップへ進める', () => {
    renderOnboarding();
    fireEvent.press(screen.getByTestId('ob-understand'));
    const agree = screen.getByTestId('ob-agree');
    expect(agree.props.accessibilityState.disabled).toBe(false);
    fireEvent.press(agree);
    expect(screen.getByTestId('ob-step-2')).toBeTruthy();
  });
});

describe('OnboardingScreen v3 — 70 代警告（F-10）', () => {
  it('70 代以上を選ぶと追加警告が表示され、自動進行しない', () => {
    renderOnboarding();
    fireEvent.press(screen.getByTestId('ob-understand'));
    fireEvent.press(screen.getByTestId('ob-agree'));
    fireEvent.press(screen.getByLabelText('70代以上'));
    expect(screen.getByTestId('ob-age-warning')).toBeTruthy();
    expect(screen.getByTestId('ob-step-2')).toBeTruthy();
    fireEvent.press(screen.getByTestId('ob-age-continue'));
    expect(screen.getByTestId('ob-step-3')).toBeTruthy();
  });

  it('40 代を選ぶと警告は出ず自動進行する', () => {
    renderOnboarding();
    fireEvent.press(screen.getByTestId('ob-understand'));
    fireEvent.press(screen.getByTestId('ob-agree'));
    fireEvent.press(screen.getByLabelText('40代'));
    expect(screen.queryByTestId('ob-age-warning')).toBeNull();
    expect(screen.getByTestId('ob-step-3')).toBeTruthy();
  });
});

describe('OnboardingScreen v3 — 完了（F-06）', () => {
  it('4 ステップを最小タップで完了し、結果が onComplete に渡る', () => {
    const { onComplete } = renderOnboarding();
    // 1: 理解チェック(1) + 同意(2)
    fireEvent.press(screen.getByTestId('ob-understand'));
    fireEvent.press(screen.getByTestId('ob-agree'));
    // 2: 年齢（50 代 → 自動進行）(3)
    fireEvent.press(screen.getByLabelText('50代'));
    // 3: 距離（50cm → 自動進行）(4)
    fireEvent.press(screen.getByLabelText('50cm'));
    // 4: はじめる(5) ≤ 6 タップ
    fireEvent.press(screen.getByTestId('ob-start'));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({
      ageGroup: '50s',
      viewingDistanceCm: 50,
      disclaimerAgreedAt: '2026-06-10T09:00:00.000Z',
    });
  });

  it('概要は回転のみ（空間周波数の言及なし）', () => {
    renderOnboarding();
    fireEvent.press(screen.getByTestId('ob-understand'));
    fireEvent.press(screen.getByTestId('ob-agree'));
    fireEvent.press(screen.getByLabelText('40代'));
    fireEvent.press(screen.getByLabelText('40cm'));
    expect(screen.getByText('ゆっくり回転するパッチを見つけてタップ。')).toBeTruthy();
  });
});
