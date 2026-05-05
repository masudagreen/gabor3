/**
 * AgeWarningModal テスト（screens.md S4-08 / spec.md A-9）。
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { AgeWarningModal } from '../../src/components/AgeWarningModal';

describe('AgeWarningModal', () => {
  it('isOpen=true でタイトルと医師相談文言が表示される', () => {
    const { getByText } = render(
      <AgeWarningModal isOpen onContinue={() => {}} onBack={() => {}} />,
    );
    expect(getByText(/ご注意ください/)).toBeTruthy();
    expect(getByText(/眼科医にご相談/)).toBeTruthy();
  });

  it('「戻る」で onBack が呼ばれる', () => {
    const onBack = jest.fn();
    const onContinue = jest.fn();
    const { getByTestId } = render(
      <AgeWarningModal isOpen onContinue={onContinue} onBack={onBack} />,
    );
    fireEvent.press(getByTestId('age-warning-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('「理解した上で続ける」で onContinue が呼ばれる', () => {
    const onBack = jest.fn();
    const onContinue = jest.fn();
    const { getByTestId } = render(
      <AgeWarningModal isOpen onContinue={onContinue} onBack={onBack} />,
    );
    fireEvent.press(getByTestId('age-warning-continue'));
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onBack).not.toHaveBeenCalled();
  });
});
