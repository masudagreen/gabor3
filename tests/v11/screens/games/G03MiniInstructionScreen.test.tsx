/**
 * G03MiniInstructionScreen — S11-01 受け入れテスト（screens.md §2）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { G03MiniInstructionScreen } from '../../../../src/screens/v11/games/G03MiniInstructionScreen';

describe('G03MiniInstructionScreen', () => {
  it('「G-03 周辺視野ハント」ヘッダーを表示', () => {
    const { getByText } = render(
      <G03MiniInstructionScreen onStart={jest.fn()} onBack={jest.fn()} />,
    );
    expect(getByText('G-03 周辺視野ハント')).toBeTruthy();
  });

  it('5 つのリスト項目（注視 / 周辺視 / 時計方向 / 60 秒 / 何度でも変更）', () => {
    const { getByText, getByTestId } = render(
      <G03MiniInstructionScreen onStart={jest.fn()} onBack={jest.fn()} />,
    );
    expect(getByTestId('g03-mini-instruction-list')).toBeTruthy();
    expect(getByText('中央の十字をじーっと見続ける')).toBeTruthy();
    expect(getByText('周辺視で違う向きを探す')).toBeTruthy();
    expect(getByText('時計の方向で答える')).toBeTruthy();
    expect(getByText('60 秒間ずっと表示される')).toBeTruthy();
    expect(getByText('気が変われば何度でも変えてよい')).toBeTruthy();
  });

  it('「はじめる」ボタンタップで onStart が呼ばれる', () => {
    const onStart = jest.fn();
    const { getByTestId } = render(
      <G03MiniInstructionScreen onStart={onStart} onBack={jest.fn()} />,
    );
    fireEvent.press(getByTestId('g03-mini-instruction-start'));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('戻るボタンタップで onBack が呼ばれる', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(
      <G03MiniInstructionScreen onStart={jest.fn()} onBack={onBack} />,
    );
    fireEvent.press(getByTestId('g03-mini-instruction-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
