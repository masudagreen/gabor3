/**
 * DisclaimerScreen テスト — S19-04 / F-02。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { DisclaimerScreen } from '../../../../src/screens/v11/settings/DisclaimerScreen';

describe('DisclaimerScreen: 表示', () => {
  it('visible=false なら何も描画しない', () => {
    const { queryByTestId } = render(
      <DisclaimerScreen
        visible={false}
        disclaimerAgreedAt="2026-04-30T10:00:00.000Z"
        onClose={jest.fn()}
      />,
    );
    expect(queryByTestId('disclaimer-screen-v11')).toBeNull();
  });

  it('visible=true で描画', () => {
    const { getByTestId } = render(
      <DisclaimerScreen
        visible
        disclaimerAgreedAt="2026-04-30T10:00:00.000Z"
        onClose={jest.fn()}
      />,
    );
    expect(getByTestId('disclaimer-screen-v11')).toBeTruthy();
  });

  it('同意日 2026-04-30 を表示', () => {
    const { getByText } = render(
      <DisclaimerScreen
        visible
        disclaimerAgreedAt="2026-04-30T10:00:00.000Z"
        onClose={jest.fn()}
      />,
    );
    expect(getByText(/同意日 2026-04-30/)).toBeTruthy();
  });

  it('disclaimerAgreedAt=null なら「同意日 ―」', () => {
    const { getByText } = render(
      <DisclaimerScreen
        visible
        disclaimerAgreedAt={null}
        onClose={jest.fn()}
      />,
    );
    expect(getByText(/同意日 ―/)).toBeTruthy();
  });
});

describe('DisclaimerScreen: インタラクション', () => {
  it('「OK / 閉じる」で onClose', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <DisclaimerScreen
        visible
        disclaimerAgreedAt="2026-04-30T10:00:00.000Z"
        onClose={onClose}
      />,
    );
    fireEvent.press(getByTestId('disclaimer-ok'));
    expect(onClose).toHaveBeenCalled();
  });

  it('閉じる IconButton で onClose', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <DisclaimerScreen
        visible
        disclaimerAgreedAt="2026-04-30T10:00:00.000Z"
        onClose={onClose}
      />,
    );
    fireEvent.press(getByTestId('disclaimer-close'));
    expect(onClose).toHaveBeenCalled();
  });
});
