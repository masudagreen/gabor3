/**
 * DataResetNotice — F-17 受け入れテスト（spec-v11.md §F-17）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { DataResetNotice } from '../../../src/components/v11/DataResetNotice';

describe('DataResetNotice: F-17', () => {
  it('タイトル「最新版へのアップデート」を表示', () => {
    const { getByText } = render(
      <DataResetNotice onAcknowledge={jest.fn()} />,
    );
    expect(getByText('最新版へのアップデート')).toBeTruthy();
  });

  it('本文に「過去のデータをリセットしました」を含む', () => {
    const { getByText } = render(
      <DataResetNotice onAcknowledge={jest.fn()} />,
    );
    expect(getByText(/過去のデータをリセットしました/)).toBeTruthy();
  });

  it('補足に「視聴距離・年齢層・免責同意は新たに設定し直して」を含む', () => {
    const { getByText } = render(
      <DataResetNotice onAcknowledge={jest.fn()} />,
    );
    expect(getByText(/視聴距離・年齢層・免責同意は新たに設定し直して/)).toBeTruthy();
  });

  it('OK ボタンを押すと onAcknowledge が呼ばれる', () => {
    const onAck = jest.fn();
    const { getByTestId } = render(<DataResetNotice onAcknowledge={onAck} />);
    fireEvent.press(getByTestId('data-reset-notice-ok'));
    expect(onAck).toHaveBeenCalledTimes(1);
  });

  it('OK ボタンの aria-label に「OK ボタン」を含む（SR 配慮）', () => {
    const { getByTestId } = render(
      <DataResetNotice onAcknowledge={jest.fn()} />,
    );
    const okBtn = getByTestId('data-reset-notice-ok');
    expect(okBtn.props.accessibilityLabel).toMatch(/OK/);
  });
});
