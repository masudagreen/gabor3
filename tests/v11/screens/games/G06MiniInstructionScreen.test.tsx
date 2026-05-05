/**
 * G06MiniInstructionScreen — S14-01 受け入れテスト（screens.md §2）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { G06MiniInstructionScreen } from '../../../../src/screens/v11/games/G06MiniInstructionScreen';

describe('G06MiniInstructionScreen: S14-01', () => {
  it('描画クラッシュなし', () => {
    const { getByTestId } = render(
      <G06MiniInstructionScreen onStart={jest.fn()} onBack={jest.fn()} />,
    );
    expect(getByTestId('g06-mini-instruction-screen')).toBeTruthy();
  });

  it('「はじめる」ボタン押下で onStart が呼ばれる', () => {
    const onStart = jest.fn();
    const { getByTestId } = render(
      <G06MiniInstructionScreen onStart={onStart} onBack={jest.fn()} />,
    );
    fireEvent.press(getByTestId('g06-mini-instruction-start'));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('戻るボタン押下で onBack が呼ばれる', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(
      <G06MiniInstructionScreen onStart={jest.fn()} onBack={onBack} />,
    );
    fireEvent.press(getByTestId('g06-mini-instruction-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('4 つの箇条書きが表示される（screens.md S14-01）', () => {
    const { getByText } = render(
      <G06MiniInstructionScreen onStart={jest.fn()} onBack={jest.fn()} />,
    );
    expect(getByText(/60 秒間、両方をじーっと見比べる/)).toBeTruthy();
    expect(getByText(/縞が見える範囲（パッチの大きさ）が広い方を選ぶ/)).toBeTruthy();
    expect(getByText(/外側まで縞が伸びている方が「大きい」/)).toBeTruthy();
    expect(getByText(/気が変われば何度でも変えてよい/)).toBeTruthy();
  });

  it('画面タイトル「G-06 ガウス窓サイズ弁別」を表示', () => {
    const { getByText } = render(
      <G06MiniInstructionScreen onStart={jest.fn()} onBack={jest.fn()} />,
    );
    expect(getByText('G-06 ガウス窓サイズ弁別')).toBeTruthy();
  });
});
