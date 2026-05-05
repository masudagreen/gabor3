/**
 * G07MiniInstructionScreen — S14-04 受け入れテスト（screens.md §3）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { G07MiniInstructionScreen } from '../../../../src/screens/v11/games/G07MiniInstructionScreen';

describe('G07MiniInstructionScreen: S14-04', () => {
  it('描画クラッシュなし', () => {
    const { getByTestId } = render(
      <G07MiniInstructionScreen onStart={jest.fn()} onBack={jest.fn()} />,
    );
    expect(getByTestId('g07-mini-instruction-screen')).toBeTruthy();
  });

  it('「はじめる」ボタン押下で onStart が呼ばれる', () => {
    const onStart = jest.fn();
    const { getByTestId } = render(
      <G07MiniInstructionScreen onStart={onStart} onBack={jest.fn()} />,
    );
    fireEvent.press(getByTestId('g07-mini-instruction-start'));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('戻るボタン押下で onBack が呼ばれる', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(
      <G07MiniInstructionScreen onStart={jest.fn()} onBack={onBack} />,
    );
    fireEvent.press(getByTestId('g07-mini-instruction-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('4 つの箇条書きが表示される（screens.md S14-04）', () => {
    const { getByText } = render(
      <G07MiniInstructionScreen onStart={jest.fn()} onBack={jest.fn()} />,
    );
    expect(getByText(/縞の向きがそろっていて、一列に並んでいる 3 個を見つける/)).toBeTruthy();
    expect(getByText(/60 秒間、グリッド全体をゆっくり見渡す/)).toBeTruthy();
    expect(getByText(/3 個全部をタップ。1 個でも違ったり足りなかったりすると不正解/)).toBeTruthy();
    expect(getByText(/タップで選択／再タップで解除/)).toBeTruthy();
  });

  it('画面タイトル「G-07 ガボールエッジ検出」を表示', () => {
    const { getByText } = render(
      <G07MiniInstructionScreen onStart={jest.fn()} onBack={jest.fn()} />,
    );
    expect(getByText('G-07 ガボールエッジ検出')).toBeTruthy();
  });
});
