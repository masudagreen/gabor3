/**
 * G09MiniInstructionScreen — S15-04 受け入れテスト（screens.md §3）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { G09MiniInstructionScreen } from '../../../../src/screens/v11/games/G09MiniInstructionScreen';

describe('G09MiniInstructionScreen', () => {
  it('描画クラッシュなしでマウントできる', () => {
    const { getByTestId } = render(
      <G09MiniInstructionScreen onStart={jest.fn()} onBack={jest.fn()} />,
    );
    expect(getByTestId('g09-mini-instruction-screen')).toBeTruthy();
  });

  it('「はじめる」ボタンを押すと onStart が呼ばれる', () => {
    const onStart = jest.fn();
    const { getByTestId } = render(
      <G09MiniInstructionScreen onStart={onStart} onBack={jest.fn()} />,
    );
    fireEvent.press(getByTestId('g09-mini-instruction-start'));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('戻るボタンを押すと onBack が呼ばれる', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(
      <G09MiniInstructionScreen onStart={jest.fn()} onBack={onBack} />,
    );
    fireEvent.press(getByTestId('g09-mini-instruction-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('リスト 4 項目を表示する（60 秒注視 / flanker / 縦縞横縞 / 何度でも変更可）', () => {
    const { getByTestId, queryAllByText } = render(
      <G09MiniInstructionScreen onStart={jest.fn()} onBack={jest.fn()} />,
    );
    expect(getByTestId('g09-mini-instruction-list')).toBeTruthy();
    expect(queryAllByText(/60 秒/).length).toBeGreaterThanOrEqual(1);
    expect(queryAllByText(/縦縞/).length).toBeGreaterThanOrEqual(1);
    expect(queryAllByText(/横縞/).length).toBeGreaterThanOrEqual(1);
  });

  it('ヘッダーに「G-09 側方マスキング」を表示', () => {
    const { queryAllByText } = render(
      <G09MiniInstructionScreen onStart={jest.fn()} onBack={jest.fn()} />,
    );
    expect(queryAllByText(/G-09 側方マスキング/).length).toBeGreaterThanOrEqual(
      1,
    );
  });
});
