/**
 * SinglePlayPostFooter — FT-1 受け入れテスト（components.md §22、F-06）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SinglePlayPostFooter } from '../../../src/components/v11/SinglePlayPostFooter';

describe('SinglePlayPostFooter: FT-1', () => {
  it('3 ボタンすべて表示（同じゲームをもう一度 / ゲーム一覧へ戻る / ホームへ）', () => {
    const { getByText } = render(
      <SinglePlayPostFooter
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
      />,
    );
    expect(getByText('同じゲームをもう一度')).toBeTruthy();
    expect(getByText('ゲーム一覧へ戻る')).toBeTruthy();
    expect(getByText('ホームへ')).toBeTruthy();
  });

  it('Primary：もう一度 → onPlayAgain', () => {
    const onPlayAgain = jest.fn();
    const { getByTestId } = render(
      <SinglePlayPostFooter
        onPlayAgain={onPlayAgain}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
      />,
    );
    fireEvent.press(getByTestId('single-play-post-play-again'));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });

  it('Secondary：一覧へ戻る → onBackToList', () => {
    const onBackToList = jest.fn();
    const { getByTestId } = render(
      <SinglePlayPostFooter
        onPlayAgain={jest.fn()}
        onBackToList={onBackToList}
        onGoHome={jest.fn()}
      />,
    );
    fireEvent.press(getByTestId('single-play-post-back-to-list'));
    expect(onBackToList).toHaveBeenCalledTimes(1);
  });

  it('Tertiary：ホームへ → onGoHome', () => {
    const onGoHome = jest.fn();
    const { getByTestId } = render(
      <SinglePlayPostFooter
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={onGoHome}
      />,
    );
    fireEvent.press(getByTestId('single-play-post-go-home'));
    expect(onGoHome).toHaveBeenCalledTimes(1);
  });

  it('onPlayAgain が undefined ならその行のみ非表示', () => {
    const { queryByTestId, queryByText } = render(
      <SinglePlayPostFooter
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
      />,
    );
    expect(queryByTestId('single-play-post-play-again')).toBeNull();
    expect(queryByText('同じゲームをもう一度')).toBeNull();
    // 残りは表示される
    expect(queryByTestId('single-play-post-back-to-list')).toBeTruthy();
    expect(queryByTestId('single-play-post-go-home')).toBeTruthy();
  });

  it('もう一度の aria-label に gameNameJa を含む', () => {
    const { getByTestId } = render(
      <SinglePlayPostFooter
        onPlayAgain={jest.fn()}
        gameNameJa="G-01 変化察知"
      />,
    );
    const btn = getByTestId('single-play-post-play-again');
    expect(btn.props.accessibilityLabel).toMatch(/G-01 変化察知/);
  });
});
