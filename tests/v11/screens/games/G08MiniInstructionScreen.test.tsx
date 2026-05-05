/**
 * G08MiniInstructionScreen — S15-01 受け入れテスト（screens.md §2）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { G08MiniInstructionScreen } from '../../../../src/screens/v11/games/G08MiniInstructionScreen';

describe('G08MiniInstructionScreen', () => {
  it('描画クラッシュなしでマウントできる', () => {
    const { getByTestId } = render(
      <G08MiniInstructionScreen
        onStart={jest.fn()}
        onBack={jest.fn()}
      />,
    );
    expect(getByTestId('g08-mini-instruction-screen')).toBeTruthy();
  });

  it('「はじめる」ボタンを押すと onStart が呼ばれる', () => {
    const onStart = jest.fn();
    const { getByTestId } = render(
      <G08MiniInstructionScreen onStart={onStart} onBack={jest.fn()} />,
    );
    fireEvent.press(getByTestId('g08-mini-instruction-start'));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('戻るボタンを押すと onBack が呼ばれる', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(
      <G08MiniInstructionScreen onStart={jest.fn()} onBack={onBack} />,
    );
    fireEvent.press(getByTestId('g08-mini-instruction-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('リスト 4 項目を表示する（60 秒注視 / adapter 一定 / 時計回り反時計回り / 何度でも変更可）', () => {
    const { getByTestId, queryAllByText } = render(
      <G08MiniInstructionScreen onStart={jest.fn()} onBack={jest.fn()} />,
    );
    expect(getByTestId('g08-mini-instruction-list')).toBeTruthy();
    expect(queryAllByText(/60 秒/).length).toBeGreaterThanOrEqual(1);
    expect(queryAllByText(/adapter/).length).toBeGreaterThanOrEqual(1);
    expect(queryAllByText(/時計回り/).length).toBeGreaterThanOrEqual(1);
  });

  it('ヘッダーに「G-08 残像方位弁別」を表示', () => {
    const { queryAllByText } = render(
      <G08MiniInstructionScreen onStart={jest.fn()} onBack={jest.fn()} />,
    );
    expect(queryAllByText(/G-08 残像方位弁別/).length).toBeGreaterThanOrEqual(1);
  });
});
