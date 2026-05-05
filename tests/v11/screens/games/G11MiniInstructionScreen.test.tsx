/**
 * G11MiniInstructionScreen — S16-04 受け入れテスト（screens.md §3）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { G11MiniInstructionScreen } from '../../../../src/screens/v11/games/G11MiniInstructionScreen';

describe('G11MiniInstructionScreen', () => {
  it('描画クラッシュなしでマウントできる', () => {
    const { getByTestId } = render(
      <G11MiniInstructionScreen
        onStart={jest.fn()}
        onBack={jest.fn()}
      />,
    );
    expect(getByTestId('g11-mini-instruction-screen')).toBeTruthy();
  });

  it('「はじめる」ボタンを押すと onStart が呼ばれる', () => {
    const onStart = jest.fn();
    const { getByTestId } = render(
      <G11MiniInstructionScreen onStart={onStart} onBack={jest.fn()} />,
    );
    fireEvent.press(getByTestId('g11-mini-instruction-start'));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('戻るボタンを押すと onBack が呼ばれる', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(
      <G11MiniInstructionScreen onStart={jest.fn()} onBack={onBack} />,
    );
    fireEvent.press(getByTestId('g11-mini-instruction-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('リスト 4 項目を表示する（上下を見比べ / 左右ズレ選択 / じっと見ると精度UP / 微小なズレ）', () => {
    const { getByTestId, queryAllByText } = render(
      <G11MiniInstructionScreen onStart={jest.fn()} onBack={jest.fn()} />,
    );
    expect(getByTestId('g11-mini-instruction-list')).toBeTruthy();
    expect(queryAllByText(/上下/).length).toBeGreaterThanOrEqual(1);
    expect(queryAllByText(/ずれ/).length).toBeGreaterThanOrEqual(1);
    expect(queryAllByText(/微小/).length).toBeGreaterThanOrEqual(1);
  });

  it('ヘッダーに「G-11 Vernier 整列判定」を表示', () => {
    const { queryAllByText } = render(
      <G11MiniInstructionScreen onStart={jest.fn()} onBack={jest.fn()} />,
    );
    expect(queryAllByText(/G-11 Vernier 整列判定/).length).toBeGreaterThanOrEqual(1);
  });
});
