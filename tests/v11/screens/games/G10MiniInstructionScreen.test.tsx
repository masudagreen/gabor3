/**
 * G10MiniInstructionScreen — S16-01 受け入れテスト（screens.md §2）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { G10MiniInstructionScreen } from '../../../../src/screens/v11/games/G10MiniInstructionScreen';

describe('G10MiniInstructionScreen', () => {
  it('描画クラッシュなしでマウントできる', () => {
    const { getByTestId } = render(
      <G10MiniInstructionScreen
        onStart={jest.fn()}
        onBack={jest.fn()}
      />,
    );
    expect(getByTestId('g10-mini-instruction-screen')).toBeTruthy();
  });

  it('「はじめる」ボタンを押すと onStart が呼ばれる', () => {
    const onStart = jest.fn();
    const { getByTestId } = render(
      <G10MiniInstructionScreen onStart={onStart} onBack={jest.fn()} />,
    );
    fireEvent.press(getByTestId('g10-mini-instruction-start'));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('戻るボタンを押すと onBack が呼ばれる', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(
      <G10MiniInstructionScreen onStart={jest.fn()} onBack={onBack} />,
    );
    fireEvent.press(getByTestId('g10-mini-instruction-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('リスト 4 項目を表示する（grid 全体 60 秒 / 違う向きのかたまり / 4 象限選択 / 何度でも変更可）', () => {
    const { getByTestId, queryAllByText } = render(
      <G10MiniInstructionScreen onStart={jest.fn()} onBack={jest.fn()} />,
    );
    expect(getByTestId('g10-mini-instruction-list')).toBeTruthy();
    expect(queryAllByText(/60 秒/).length).toBeGreaterThanOrEqual(1);
    expect(queryAllByText(/違う向き/).length).toBeGreaterThanOrEqual(1);
    expect(queryAllByText(/左上/).length).toBeGreaterThanOrEqual(1);
  });

  it('ヘッダーに「G-10 テクスチャ分離」を表示', () => {
    const { queryAllByText } = render(
      <G10MiniInstructionScreen onStart={jest.fn()} onBack={jest.fn()} />,
    );
    expect(queryAllByText(/G-10 テクスチャ分離/).length).toBeGreaterThanOrEqual(1);
  });
});
