/**
 * OnboardingScreen.test.tsx — オンボーディング（F-06 / F-10）3 ページ刷新版。
 *
 * - [1/3] 使用上の注意（免責文）→「次へ」で進む。
 * - [2/3] 視聴距離：既定は非選択。選択するまで「次へ」disabled。選択で活性化し、
 *          その距離での cpd=3 プレビューパッチが表示される。
 * - [3/3] チュートリアル：3x3 の 1 つが回転。タップで完了 → onComplete。
 *          年代設問は廃止（ageGroup は 'unspecified' 固定）。
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { OnboardingScreen } from '../../../src/screens/v3/OnboardingScreen';

const TARGET: number = 4; // チュートリアルで回転させるセル（決定論）。

function renderOnboarding(onComplete = jest.fn()) {
  render(
    <ThemeProvider preference="light" systemScheme="light">
      <OnboardingScreen
        onComplete={onComplete}
        now={() => new Date('2026-06-10T09:00:00.000Z')}
        tutorialTargetIndex={TARGET}
        testId="ob"
      />
    </ThemeProvider>,
  );
  return { onComplete };
}

describe('OnboardingScreen — [1/3] 使用上の注意', () => {
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

  it('「次へ」でステップ 2 へ進む', () => {
    renderOnboarding();
    fireEvent.press(screen.getByTestId('ob-next-1'));
    expect(screen.getByTestId('ob-step-2')).toBeTruthy();
  });
});

describe('OnboardingScreen — [2/3] 視聴距離（既定非選択・プレビュー）', () => {
  function gotoStep2() {
    renderOnboarding();
    fireEvent.press(screen.getByTestId('ob-next-1'));
  }

  it('既定では距離未選択・「次へ」disabled・プレビューパッチなし', () => {
    gotoStep2();
    expect(screen.getByLabelText('40cm').props.accessibilityState.selected).toBe(
      false,
    );
    expect(screen.getByTestId('ob-next-2').props.accessibilityState.disabled).toBe(
      true,
    );
    expect(screen.queryByTestId('ob-preview-patch')).toBeNull();
  });

  it('距離を選ぶと「次へ」活性化＋プレビューパッチ表示', () => {
    gotoStep2();
    fireEvent.press(screen.getByLabelText('40cm'));
    expect(
      screen.getByLabelText('40cm').props.accessibilityState.selected,
    ).toBe(true);
    expect(
      screen.getByTestId('ob-next-2').props.accessibilityState.disabled,
    ).toBe(false);
    expect(screen.getByTestId('ob-preview-patch')).toBeTruthy();
  });

  it('選択後の「次へ」でステップ 3 へ進む', () => {
    gotoStep2();
    fireEvent.press(screen.getByLabelText('40cm'));
    fireEvent.press(screen.getByTestId('ob-next-2'));
    expect(screen.getByTestId('ob-step-3')).toBeTruthy();
  });
});

describe('OnboardingScreen — [3/3] チュートリアルと完了（F-06）', () => {
  function gotoStep3(distanceLabel: string) {
    renderOnboarding();
    fireEvent.press(screen.getByTestId('ob-next-1'));
    fireEvent.press(screen.getByLabelText(distanceLabel));
    fireEvent.press(screen.getByTestId('ob-next-2'));
  }

  it('チュートリアルが表示され、回転パッチをタップで完了 → onComplete', () => {
    const onComplete = jest.fn();
    render(
      <ThemeProvider preference="light" systemScheme="light">
        <OnboardingScreen
          onComplete={onComplete}
          now={() => new Date('2026-06-10T09:00:00.000Z')}
          tutorialTargetIndex={TARGET}
          testId="ob"
        />
      </ThemeProvider>,
    );
    fireEvent.press(screen.getByTestId('ob-next-1'));
    fireEvent.press(screen.getByLabelText('50cm'));
    fireEvent.press(screen.getByTestId('ob-next-2'));

    expect(screen.getByTestId('ob-step-3')).toBeTruthy();
    // 回転対象セルのみが testId とタップ可能（他 8 つは装飾で SR 非対象）。
    fireEvent.press(screen.getByTestId(`ob-tutorial-cell-${TARGET}`));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({
      ageGroup: 'unspecified',
      viewingDistanceCm: 50,
      disclaimerAgreedAt: '2026-06-10T09:00:00.000Z',
    });
  });

  it('回転対象以外のセルには testID が付かない（タップ対象は 1 つ）', () => {
    gotoStep3('40cm');
    // 対象セルは存在し、非対象セルは testID を持たない。
    expect(screen.getByTestId(`ob-tutorial-cell-${TARGET}`)).toBeTruthy();
    const nonTarget = TARGET === 0 ? 1 : 0;
    expect(screen.queryByTestId(`ob-tutorial-cell-${nonTarget}`)).toBeNull();
  });
});
