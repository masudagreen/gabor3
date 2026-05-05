/**
 * StaircaseResetConfirmDialog テスト — S19-05 / F-14。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StaircaseResetConfirmDialog } from '../../../../src/screens/v11/settings/StaircaseResetConfirmDialog';

describe('StaircaseResetConfirmDialog', () => {
  it('visible=true で表示', () => {
    const { getByTestId } = render(
      <StaircaseResetConfirmDialog
        visible
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(getByTestId('staircase-reset-confirm-dialog')).toBeTruthy();
  });

  it('「リセット」ボタンで onConfirm', () => {
    const onConfirm = jest.fn();
    const { getByTestId } = render(
      <StaircaseResetConfirmDialog
        visible
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />,
    );
    fireEvent.press(getByTestId('staircase-reset-confirm'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('「キャンセル」ボタンで onCancel', () => {
    const onCancel = jest.fn();
    const { getByTestId } = render(
      <StaircaseResetConfirmDialog
        visible
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.press(getByTestId('staircase-reset-cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('文言に「全ゲームの難易度を初期値に戻します」を含む（v1.1.4：13 ゲーム明記をやめゲーム数中立表現に）', () => {
    const { getByText } = render(
      <StaircaseResetConfirmDialog
        visible
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(getByText(/全ゲームの難易度を初期値に戻します/)).toBeTruthy();
  });
});
