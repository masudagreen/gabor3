/**
 * G04MiniInstructionScreen — S12-01 受け入れテスト（screens.md §2）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { G04MiniInstructionScreen } from '../../../../src/screens/v11/games/G04MiniInstructionScreen';

describe('G04MiniInstructionScreen: S12-01', () => {
  it('描画クラッシュなし', () => {
    const { getByTestId } = render(
      <G04MiniInstructionScreen onStart={jest.fn()} onBack={jest.fn()} />,
    );
    expect(getByTestId('g04-mini-instruction-screen')).toBeTruthy();
  });

  it('「はじめる」ボタン押下で onStart が呼ばれる', () => {
    const onStart = jest.fn();
    const { getByTestId } = render(
      <G04MiniInstructionScreen onStart={onStart} onBack={jest.fn()} />,
    );
    fireEvent.press(getByTestId('g04-mini-instruction-start'));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('戻るボタン押下で onBack が呼ばれる', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(
      <G04MiniInstructionScreen onStart={jest.fn()} onBack={onBack} />,
    );
    fireEvent.press(getByTestId('g04-mini-instruction-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('4 つの箇条書きが表示される（screens.md S12-01）', () => {
    const { getByText } = render(
      <G04MiniInstructionScreen onStart={jest.fn()} onBack={jest.fn()} />,
    );
    expect(getByText(/60 秒間、両方をじーっと見比べる/)).toBeTruthy();
    expect(getByText(/縞のメリハリがはっきりしている方を選ぶ/)).toBeTruthy();
    expect(getByText(/気が変われば何度でも変えてよい/)).toBeTruthy();
    expect(getByText(/じっと見ていると差が消える錯視も/)).toBeTruthy();
  });

  it('画面タイトル「G-04 コントラスト弁別」を表示', () => {
    const { getByText } = render(
      <G04MiniInstructionScreen onStart={jest.fn()} onBack={jest.fn()} />,
    );
    expect(getByText('G-04 コントラスト弁別')).toBeTruthy();
  });
});
