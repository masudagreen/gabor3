/**
 * DataDeletionConfirmModal テスト（screens.md S7-04 + S7-05 / spec.md F-15）。
 *
 * 受け入れ：
 *   - 段階 1：「次へ進む」で段階 2 に進む
 *   - 段階 1：「キャンセル」で onCancel
 *   - 段階 2：「削除」と入力するまで confirm ボタン disabled
 *   - 段階 2：「削除」入力 + confirm で onConfirm
 *   - 段階 2：「キャンセル」で onCancel
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { DataDeletionConfirmModal } from '../../src/components/DataDeletionConfirmModal';
import { ThemeProvider } from '../../src/theme/ThemeProvider';

function renderModal(props?: {
  isOpen?: boolean;
  onCancel?: jest.Mock;
  onConfirm?: jest.Mock;
}) {
  const onCancel = props?.onCancel ?? jest.fn();
  const onConfirm = props?.onConfirm ?? jest.fn();
  const utils = render(
    <ThemeProvider preference="light">
      <DataDeletionConfirmModal
        isOpen={props?.isOpen ?? true}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    </ThemeProvider>,
  );
  return { ...utils, onCancel, onConfirm };
}

describe('DataDeletionConfirmModal', () => {
  it('段階 1：削除されるものの一覧と「この操作は取り消せません」が表示される', () => {
    const { getByText } = renderModal();
    expect(getByText(/すべての記録を削除しますか/)).toBeTruthy();
    expect(getByText('・セッション履歴')).toBeTruthy();
    expect(getByText('・難易度（staircase）の状態')).toBeTruthy();
    expect(getByText('・バッジ獲得状況')).toBeTruthy();
    expect(getByText('この操作は取り消せません。')).toBeTruthy();
  });

  it('段階 1：「キャンセル」で onCancel が呼ばれ、onConfirm は呼ばれない', () => {
    const { getByTestId, onCancel, onConfirm } = renderModal();
    fireEvent.press(getByTestId('data-deletion-cancel-1'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('段階 1：「次へ進む」で段階 2 に遷移、入力欄が表示される', () => {
    const { getByTestId, getByText } = renderModal();
    fireEvent.press(getByTestId('data-deletion-proceed'));
    expect(getByText('最終確認')).toBeTruthy();
    expect(getByTestId('data-deletion-input')).toBeTruthy();
  });

  it('段階 2：未入力では「削除」ボタンが disabled、押下しても onConfirm は呼ばれない', () => {
    const { getByTestId, onConfirm } = renderModal();
    fireEvent.press(getByTestId('data-deletion-proceed'));
    const confirm = getByTestId('data-deletion-confirm');
    expect(confirm.props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('段階 2：「削除」と入力すると onConfirm が呼ばれる', () => {
    const { getByTestId, onConfirm } = renderModal();
    fireEvent.press(getByTestId('data-deletion-proceed'));
    fireEvent.changeText(getByTestId('data-deletion-input'), '削除');
    fireEvent.press(getByTestId('data-deletion-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('段階 2：別の文字列（例「消す」）では confirm が disabled のまま', () => {
    const { getByTestId, onConfirm } = renderModal();
    fireEvent.press(getByTestId('data-deletion-proceed'));
    fireEvent.changeText(getByTestId('data-deletion-input'), '消す');
    const confirm = getByTestId('data-deletion-confirm');
    expect(confirm.props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('段階 2：「キャンセル」で onCancel が呼ばれ、再 open 時は段階 1 に戻る', () => {
    const onCancel = jest.fn();
    const onConfirm = jest.fn();
    const { getByTestId, rerender } = render(
      <ThemeProvider preference="light">
        <DataDeletionConfirmModal
          isOpen={true}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      </ThemeProvider>,
    );
    fireEvent.press(getByTestId('data-deletion-proceed'));
    fireEvent.press(getByTestId('data-deletion-cancel-2'));
    expect(onCancel).toHaveBeenCalledTimes(1);

    // 閉じてから再度開く → 段階 1 に戻っているはず（input は描画されない）
    rerender(
      <ThemeProvider preference="light">
        <DataDeletionConfirmModal
          isOpen={false}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      </ThemeProvider>,
    );
    rerender(
      <ThemeProvider preference="light">
        <DataDeletionConfirmModal
          isOpen={true}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      </ThemeProvider>,
    );
    expect(getByTestId('data-deletion-proceed')).toBeTruthy();
  });
});
