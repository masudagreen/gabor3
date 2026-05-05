/**
 * DataDeleteScreen テスト — S19-06 / F-14（2 段階確認）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { DataDeleteScreen } from '../../../../src/screens/v11/settings/DataDeleteScreen';

describe('DataDeleteScreen: 1 段目（意図確認）', () => {
  it('visible=true で意図確認の文言を表示', () => {
    const { getByText } = render(
      <DataDeleteScreen visible onCancel={jest.fn()} onConfirm={jest.fn()} />,
    );
    expect(getByText(/全データを削除しますか？/)).toBeTruthy();
  });

  it('1 段目「キャンセル」で onCancel', () => {
    const onCancel = jest.fn();
    const { getByTestId } = render(
      <DataDeleteScreen visible onCancel={onCancel} onConfirm={jest.fn()} />,
    );
    fireEvent.press(getByTestId('data-delete-cancel-1'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('1 段目「次へ進む」では onConfirm を呼ばない（2 段目へ遷移のみ）', () => {
    const onConfirm = jest.fn();
    const { getByTestId } = render(
      <DataDeleteScreen visible onCancel={jest.fn()} onConfirm={onConfirm} />,
    );
    fireEvent.press(getByTestId('data-delete-next'));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe('DataDeleteScreen: 2 段目（最終確認）', () => {
  it('「次へ進む」後、入力欄が表示される', () => {
    const { getByTestId } = render(
      <DataDeleteScreen visible onCancel={jest.fn()} onConfirm={jest.fn()} />,
    );
    fireEvent.press(getByTestId('data-delete-next'));
    expect(getByTestId('data-delete-input')).toBeTruthy();
  });

  it('入力欄が空のとき、削除ボタンは disabled', () => {
    const { getByTestId } = render(
      <DataDeleteScreen visible onCancel={jest.fn()} onConfirm={jest.fn()} />,
    );
    fireEvent.press(getByTestId('data-delete-next'));
    const confirmBtn = getByTestId('data-delete-confirm');
    // disabled は accessibilityState.disabled で表現されているはず（Button コンポーネント）
    expect(
      confirmBtn.props.accessibilityState?.disabled ??
        confirmBtn.props['aria-disabled'],
    ).toBeTruthy();
  });

  it('「削除」と入力すると削除ボタンが enable になり、押すと onConfirm', () => {
    const onConfirm = jest.fn();
    const { getByTestId } = render(
      <DataDeleteScreen visible onCancel={jest.fn()} onConfirm={onConfirm} />,
    );
    fireEvent.press(getByTestId('data-delete-next'));
    fireEvent.changeText(getByTestId('data-delete-input'), '削除');
    fireEvent.press(getByTestId('data-delete-confirm'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('「削除」以外（"消去"）を入力しても削除ボタンは disabled、押しても onConfirm 不呼び出し', () => {
    const onConfirm = jest.fn();
    const { getByTestId } = render(
      <DataDeleteScreen visible onCancel={jest.fn()} onConfirm={onConfirm} />,
    );
    fireEvent.press(getByTestId('data-delete-next'));
    fireEvent.changeText(getByTestId('data-delete-input'), '消去');
    fireEvent.press(getByTestId('data-delete-confirm'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('2 段目「キャンセル」で onCancel', () => {
    const onCancel = jest.fn();
    const { getByTestId } = render(
      <DataDeleteScreen visible onCancel={onCancel} onConfirm={jest.fn()} />,
    );
    fireEvent.press(getByTestId('data-delete-next'));
    fireEvent.press(getByTestId('data-delete-cancel-2'));
    expect(onCancel).toHaveBeenCalled();
  });
});
