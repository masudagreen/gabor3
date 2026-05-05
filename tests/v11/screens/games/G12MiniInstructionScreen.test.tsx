/**
 * G12MiniInstructionScreen — S17-01 受け入れテスト（screens.md §2）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { G12MiniInstructionScreen } from '../../../../src/screens/v11/games/G12MiniInstructionScreen';

describe('G12MiniInstructionScreen', () => {
  it('描画クラッシュなしでマウントできる', () => {
    const { getByTestId } = render(
      <G12MiniInstructionScreen
        onStart={jest.fn()}
        onBack={jest.fn()}
      />,
    );
    expect(getByTestId('g12-mini-instruction-screen')).toBeTruthy();
  });

  it('「はじめる」ボタンを押すと onStart が呼ばれる', () => {
    const onStart = jest.fn();
    const { getByTestId } = render(
      <G12MiniInstructionScreen onStart={onStart} onBack={jest.fn()} />,
    );
    fireEvent.press(getByTestId('g12-mini-instruction-start'));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('戻るボタンを押すと onBack が呼ばれる', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(
      <G12MiniInstructionScreen onStart={jest.fn()} onBack={onBack} />,
    );
    fireEvent.press(getByTestId('g12-mini-instruction-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('リスト 4 項目を表示する（中央 target 判定 / 周囲のパッチ / 4 択 / 60 秒見続け）', () => {
    const { getByTestId, queryAllByText } = render(
      <G12MiniInstructionScreen onStart={jest.fn()} onBack={jest.fn()} />,
    );
    expect(getByTestId('g12-mini-instruction-list')).toBeTruthy();
    expect(queryAllByText(/中央 target/).length).toBeGreaterThanOrEqual(1);
    expect(queryAllByText(/周囲/).length).toBeGreaterThanOrEqual(1);
    expect(queryAllByText(/垂直 \/ 水平/).length).toBeGreaterThanOrEqual(1);
    expect(queryAllByText(/60 秒/).length).toBeGreaterThanOrEqual(1);
  });

  it('ヘッダーに「G-12 クラウディング」を表示', () => {
    const { queryAllByText } = render(
      <G12MiniInstructionScreen onStart={jest.fn()} onBack={jest.fn()} />,
    );
    expect(queryAllByText(/G-12 クラウディング/).length).toBeGreaterThanOrEqual(
      1,
    );
  });
});
