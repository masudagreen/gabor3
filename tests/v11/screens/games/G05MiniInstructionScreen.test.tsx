/**
 * G05MiniInstructionScreen — S13-01 受け入れテスト（screens.md §2）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { G05MiniInstructionScreen } from '../../../../src/screens/v11/games/G05MiniInstructionScreen';

describe('G05MiniInstructionScreen: S13-01', () => {
  it('描画クラッシュなし', () => {
    const { getByTestId } = render(
      <G05MiniInstructionScreen onStart={jest.fn()} onBack={jest.fn()} />,
    );
    expect(getByTestId('g05-mini-instruction-screen')).toBeTruthy();
  });

  it('「はじめる」ボタン押下で onStart が呼ばれる', () => {
    const onStart = jest.fn();
    const { getByTestId } = render(
      <G05MiniInstructionScreen onStart={onStart} onBack={jest.fn()} />,
    );
    fireEvent.press(getByTestId('g05-mini-instruction-start'));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('戻るボタン押下で onBack が呼ばれる', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(
      <G05MiniInstructionScreen onStart={jest.fn()} onBack={onBack} />,
    );
    fireEvent.press(getByTestId('g05-mini-instruction-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('4 つの箇条書きが表示される（screens.md S13-01）', () => {
    const { getByText } = render(
      <G05MiniInstructionScreen onStart={jest.fn()} onBack={jest.fn()} />,
    );
    expect(getByText(/60 秒間、両方をじーっと見比べる/)).toBeTruthy();
    expect(getByText(/「左が細かい」「右が細かい」を選ぶ/)).toBeTruthy();
    expect(getByText(/気が変われば何度でも変えてよい/)).toBeTruthy();
    expect(getByText(/縞の太さの差は微妙でも、じっと見ると掴める/)).toBeTruthy();
  });

  it('画面タイトル「G-05 空間周波数弁別」を表示', () => {
    const { getByText } = render(
      <G05MiniInstructionScreen onStart={jest.fn()} onBack={jest.fn()} />,
    );
    expect(getByText('G-05 空間周波数弁別')).toBeTruthy();
  });
});
