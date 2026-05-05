/**
 * G02MiniInstructionScreen — S10-01 受け入れテスト（screens.md §2）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { G02MiniInstructionScreen } from '../../../../src/screens/v11/games/G02MiniInstructionScreen';

describe('G02MiniInstructionScreen: S10-01', () => {
  it('描画クラッシュなし', () => {
    const { getByTestId } = render(
      <G02MiniInstructionScreen onStart={jest.fn()} onBack={jest.fn()} />,
    );
    expect(getByTestId('g02-mini-instruction-screen')).toBeTruthy();
  });

  it('「はじめる」ボタン押下で onStart が呼ばれる', () => {
    const onStart = jest.fn();
    const { getByTestId } = render(
      <G02MiniInstructionScreen onStart={onStart} onBack={jest.fn()} />,
    );
    fireEvent.press(getByTestId('g02-mini-instruction-start'));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('戻るボタン押下で onBack が呼ばれる', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(
      <G02MiniInstructionScreen onStart={jest.fn()} onBack={onBack} />,
    );
    fireEvent.press(getByTestId('g02-mini-instruction-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('5 つの箇条書きが表示される', () => {
    const { getByText } = render(
      <G02MiniInstructionScreen onStart={jest.fn()} onBack={jest.fn()} />,
    );
    expect(getByText(/60 秒間、両方をじーっと見比べる/)).toBeTruthy();
    expect(getByText(/「左」「右」のどちらかをタップ/)).toBeTruthy();
    expect(getByText(/気が変われば何度でも変えてよい/)).toBeTruthy();
    expect(getByText(/確定ボタンはない/)).toBeTruthy();
    expect(getByText(/60 秒経過時の選択が回答になる/)).toBeTruthy();
  });
});
