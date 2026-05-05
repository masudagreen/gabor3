/**
 * G13MiniInstructionScreen — S17-04 受け入れテスト（screens.md §3）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { G13MiniInstructionScreen } from '../../../../src/screens/v11/games/G13MiniInstructionScreen';

describe('G13MiniInstructionScreen', () => {
  it('描画クラッシュなしでマウントできる', () => {
    const { getByTestId } = render(
      <G13MiniInstructionScreen
        onStart={jest.fn()}
        onBack={jest.fn()}
      />,
    );
    expect(getByTestId('g13-mini-instruction-screen')).toBeTruthy();
  });

  it('「はじめる」ボタンを押すと onStart が呼ばれる', () => {
    const onStart = jest.fn();
    const { getByTestId } = render(
      <G13MiniInstructionScreen onStart={onStart} onBack={jest.fn()} />,
    );
    fireEvent.press(getByTestId('g13-mini-instruction-start'));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('戻るボタンを押すと onBack が呼ばれる', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(
      <G13MiniInstructionScreen onStart={jest.fn()} onBack={onBack} />,
    );
    fireEvent.press(getByTestId('g13-mini-instruction-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('リスト 3 項目を表示する（60 秒見続け / 0〜9 / 何度でも変えてよい）', () => {
    const { getByTestId, queryAllByText } = render(
      <G13MiniInstructionScreen onStart={jest.fn()} onBack={jest.fn()} />,
    );
    expect(getByTestId('g13-mini-instruction-list')).toBeTruthy();
    expect(queryAllByText(/60 秒/).length).toBeGreaterThanOrEqual(1);
    expect(queryAllByText(/「0」〜「9」/).length).toBeGreaterThanOrEqual(1);
    expect(queryAllByText(/何度でも/).length).toBeGreaterThanOrEqual(1);
  });

  it('ヘッダーに「G-13 数字探し」を表示', () => {
    const { queryAllByText } = render(
      <G13MiniInstructionScreen onStart={jest.fn()} onBack={jest.fn()} />,
    );
    expect(queryAllByText(/G-13 数字探し/).length).toBeGreaterThanOrEqual(1);
  });
});
