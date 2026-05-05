/**
 * DisclaimerScreen テスト（screens.md S4-02 / spec.md F-02）。
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { DisclaimerScreen } from '../../../src/screens/Onboarding/DisclaimerScreen';

describe('DisclaimerScreen（オンボーディング）', () => {
  it('チェック未投入では「同意する」が disabled、押下しても onAgreed が呼ばれない', () => {
    const onAgreed = jest.fn();
    const { getByTestId } = render(
      <DisclaimerScreen onAgreed={onAgreed} onBack={() => {}} />,
    );
    // スクロールゲートを通すために scroll イベントを発火
    fireEvent.scroll(getByTestId('disclaimer-scroll'), {
      nativeEvent: {
        contentOffset: { x: 0, y: 600 },
        contentSize: { width: 300, height: 800 },
        layoutMeasurement: { width: 300, height: 220 },
      },
    });
    const btn = getByTestId('disclaimer-agree-button');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(btn);
    expect(onAgreed).not.toHaveBeenCalled();
  });

  it('スクロール末尾＋チェック ON で「同意する」押下時に ISO 文字列で onAgreed が呼ばれる', () => {
    const onAgreed = jest.fn();
    const { getByTestId } = render(
      <DisclaimerScreen onAgreed={onAgreed} onBack={() => {}} />,
    );
    fireEvent.scroll(getByTestId('disclaimer-scroll'), {
      nativeEvent: {
        contentOffset: { x: 0, y: 600 },
        contentSize: { width: 300, height: 800 },
        layoutMeasurement: { width: 300, height: 220 },
      },
    });
    fireEvent.press(getByTestId('disclaimer-agree-checkbox'));
    fireEvent.press(getByTestId('disclaimer-agree-button'));
    expect(onAgreed).toHaveBeenCalledTimes(1);
    const arg = onAgreed.mock.calls[0][0];
    // ISO 8601 形式（T を含み、Z 終端）
    expect(typeof arg).toBe('string');
    expect(arg).toMatch(/T.*Z$/);
  });

  it('戻る矢印で onBack が呼ばれる', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(
      <DisclaimerScreen onAgreed={() => {}} onBack={onBack} />,
    );
    fireEvent.press(getByTestId('disclaimer-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
