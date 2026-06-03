/**
 * OnboardingScreen.test.tsx — S6-1 オンボーディング（F-06 / F-10）。
 *
 * 検証する観察可能挙動：
 *  - 初回表示（ステップ 1：免責同意）
 *  - 免責同意ゲート：理解チェック前は「同意する」が disabled、チェックで進める
 *  - 70 代以上申告で追加警告が出る
 *  - 4 ステップを最小タップで完了し、結果（同意日時/年齢/距離）が onComplete に渡る
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { OnboardingScreen } from '../../../src/screens/v2/OnboardingScreen';

function renderOnboarding(onComplete = jest.fn()) {
  render(
    <ThemeProvider preference="light" systemScheme="light">
      <OnboardingScreen
        onComplete={onComplete}
        now={() => new Date('2026-05-30T09:00:00.000Z')}
        testId="ob"
      />
    </ThemeProvider>,
  );
  return { onComplete };
}

describe('OnboardingScreen — 初回表示と免責ゲート（F-10）', () => {
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
    // 押しても進まない（ステップ 1 のまま）
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

describe('OnboardingScreen — 70 代警告（F-10/AS-22）', () => {
  it('70 代以上を選ぶと追加警告が表示され、自動進行しない', () => {
    renderOnboarding();
    fireEvent.press(screen.getByTestId('ob-understand'));
    fireEvent.press(screen.getByTestId('ob-agree'));
    // ステップ 2 で 70 代以上を選択
    fireEvent.press(screen.getByLabelText('70代以上'));
    expect(screen.getByTestId('ob-age-warning')).toBeTruthy();
    // 警告中はまだステップ 2（別タップ＝続行で進む）
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

describe('OnboardingScreen — 完了（F-06）', () => {
  it('4 ステップを進めて完了すると結果が onComplete に渡る', () => {
    const { onComplete } = renderOnboarding();
    // 1: 同意
    fireEvent.press(screen.getByTestId('ob-understand'));
    fireEvent.press(screen.getByTestId('ob-agree'));
    // 2: 年齢（50 代 → 自動進行）
    fireEvent.press(screen.getByLabelText('50代'));
    // 3: 距離（50cm → 自動進行）
    fireEvent.press(screen.getByLabelText('50cm'));
    // 4: はじめる
    fireEvent.press(screen.getByTestId('ob-start'));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({
      ageGroup: '50s',
      viewingDistanceCm: 50,
      disclaimerAgreedAt: '2026-05-30T09:00:00.000Z',
    });
  });

  it('既定の視聴距離は 40cm（距離選択をスキップせず明示選択）', () => {
    const { onComplete } = renderOnboarding();
    fireEvent.press(screen.getByTestId('ob-understand'));
    fireEvent.press(screen.getByTestId('ob-agree'));
    fireEvent.press(screen.getByLabelText('40代'));
    fireEvent.press(screen.getByLabelText('40cm'));
    fireEvent.press(screen.getByTestId('ob-start'));
    expect(onComplete.mock.calls[0][0].viewingDistanceCm).toBe(40);
  });
});
