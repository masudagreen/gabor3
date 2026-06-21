/**
 * OnboardingScreen.test.tsx — オンボーディング（F-06 / F-10）v3.2 2 ページ版。
 *
 * - [1/2] 使用上の注意（免責文）→「次へ」で進む。
 * - [2/2] 視聴距離：既定は非選択。選択するまで「はじめる」disabled。選択で活性化し、
 *          その距離での cpd=3 プレビューパッチが表示される。「はじめる」で onComplete。
 * - 旧 3 ページ目（遊び方チュートリアル）はチュートリアル Lv0（§4.8）と重複のため廃止。
 *   年代設問は廃止（ageGroup は 'unspecified' 固定）。
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

describe('OnboardingScreen — [1/2] 使用上の注意', () => {
  it('ステップ 1 が表示され、免責タイトルと本文が出る', () => {
    renderOnboarding();
    expect(screen.getByTestId('ob-step-1')).toBeTruthy();
    expect(screen.getByTestId('ob-disclaimer')).toBeTruthy();
    expect(screen.getByText('使用上の注意')).toBeTruthy();
    expect(
      screen.getByText(
        '本アプリは医療機器ではありません。目に痛みや違和感を感じたら、ただちに使用を中止してください。',
      ),
    ).toBeTruthy();
  });

  it('進捗は「ステップ 1/2」を表示する（2 ページ構成）', () => {
    renderOnboarding();
    expect(screen.getByText('ステップ 1/2')).toBeTruthy();
  });

  it('「次へ」でステップ 2 へ進む', () => {
    renderOnboarding();
    fireEvent.press(screen.getByTestId('ob-next-1'));
    expect(screen.getByTestId('ob-step-2')).toBeTruthy();
  });
});

describe('OnboardingScreen — [2/2] 視聴距離（既定非選択・プレビュー・完了）', () => {
  function gotoStep2() {
    renderOnboarding();
    fireEvent.press(screen.getByTestId('ob-next-1'));
  }

  it('既定では距離未選択・「はじめる」disabled・プレビューパッチなし', () => {
    gotoStep2();
    expect(screen.getByLabelText('40cm').props.accessibilityState.selected).toBe(
      false,
    );
    expect(screen.getByTestId('ob-start').props.accessibilityState.disabled).toBe(
      true,
    );
    expect(screen.queryByTestId('ob-preview-patch')).toBeNull();
  });

  it('距離を選ぶと「はじめる」活性化＋プレビューパッチ表示', () => {
    gotoStep2();
    fireEvent.press(screen.getByLabelText('40cm'));
    expect(
      screen.getByLabelText('40cm').props.accessibilityState.selected,
    ).toBe(true);
    expect(
      screen.getByTestId('ob-start').props.accessibilityState.disabled,
    ).toBe(false);
    expect(screen.getByTestId('ob-preview-patch')).toBeTruthy();
  });

  it('3 ページ目（チュートリアル）は存在しない（廃止）', () => {
    gotoStep2();
    fireEvent.press(screen.getByLabelText('40cm'));
    expect(screen.queryByTestId('ob-step-3')).toBeNull();
  });

  it('「はじめる」で onComplete（選択距離・同意日時を返す）', () => {
    const onComplete = jest.fn();
    renderOnboarding(onComplete);
    fireEvent.press(screen.getByTestId('ob-next-1'));
    fireEvent.press(screen.getByLabelText('50cm'));
    fireEvent.press(screen.getByTestId('ob-start'));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({
      ageGroup: 'unspecified',
      viewingDistanceCm: 50,
      disclaimerAgreedAt: '2026-06-10T09:00:00.000Z',
    });
  });
});
