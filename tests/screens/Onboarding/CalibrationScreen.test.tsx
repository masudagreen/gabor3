/**
 * CalibrationScreen テスト（screens.md S4-04 / spec.md F-03）。
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CalibrationScreen } from '../../../src/screens/Onboarding/CalibrationScreen';

describe('CalibrationScreen', () => {
  it('既定の initialValue=40cm が表示され、3 ノッチが描画される', () => {
    const { getByTestId } = render(
      <CalibrationScreen onNext={() => {}} onBack={() => {}} />,
    );
    expect(getByTestId('distance-notch-30')).toBeTruthy();
    expect(getByTestId('distance-notch-40')).toBeTruthy();
    expect(getByTestId('distance-notch-50')).toBeTruthy();
    // 40 が selected
    const n40 = getByTestId('distance-notch-40');
    expect(n40.props.accessibilityState?.selected).toBe(true);
  });

  it('スライダー値変更後に「次へ」で onNext(value) が呼ばれる', () => {
    const onNext = jest.fn();
    const { getByTestId } = render(
      <CalibrationScreen onNext={onNext} onBack={() => {}} />,
    );
    // 30cm に変更
    fireEvent.press(getByTestId('distance-notch-30'));
    fireEvent.press(getByTestId('calibration-next'));
    expect(onNext).toHaveBeenCalledWith(30);
  });

  it('initialValue=50 を渡すと 50cm が selected で開始', () => {
    const { getByTestId } = render(
      <CalibrationScreen
        initialValue={50}
        onNext={() => {}}
        onBack={() => {}}
      />,
    );
    const n50 = getByTestId('distance-notch-50');
    expect(n50.props.accessibilityState?.selected).toBe(true);
  });

  it('戻る矢印で onBack が呼ばれる', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(
      <CalibrationScreen onNext={() => {}} onBack={onBack} />,
    );
    fireEvent.press(getByTestId('calibration-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
