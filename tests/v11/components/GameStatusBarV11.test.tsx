/**
 * GameStatusBarV11 — GD-1 受け入れテスト（components.md §2、system.md §1.1）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { GameStatusBarV11 } from '../../../src/components/v11/GameStatusBarV11';

describe('GameStatusBarV11: GD-1', () => {
  it('「残り N 秒」を表示', () => {
    const { getByText } = render(
      <GameStatusBarV11 remainingSeconds={47} onAbort={jest.fn()} />,
    );
    expect(getByText(/残り 47 秒/)).toBeTruthy();
  });

  it('小数秒は ceil で丸める（46.3 → 47）', () => {
    const { getByText } = render(
      <GameStatusBarV11 remainingSeconds={46.3} onAbort={jest.fn()} />,
    );
    expect(getByText(/残り 47 秒/)).toBeTruthy();
  });

  it('0 秒以下は 0 と表示（OPT-12 自動採点直前）', () => {
    const { getByText } = render(
      <GameStatusBarV11 remainingSeconds={-1} onAbort={jest.fn()} />,
    );
    expect(getByText(/残り 0 秒/)).toBeTruthy();
  });

  it('5 秒以下は 🕐 装飾を追加（NF-12 テキスト本体は変えない）', () => {
    const { getByText } = render(
      <GameStatusBarV11 remainingSeconds={3} onAbort={jest.fn()} />,
    );
    // 「🕐 残り 3 秒」を 1 ノードに含む
    expect(getByText(/🕐.*残り 3 秒/)).toBeTruthy();
  });

  it('6 秒以上は 🕐 装飾を出さない', () => {
    const { queryByText } = render(
      <GameStatusBarV11 remainingSeconds={6} onAbort={jest.fn()} />,
    );
    expect(queryByText(/🕐/)).toBeNull();
  });

  it('5 秒以下のとき aria-live=polite', () => {
    const { getByTestId } = render(
      <GameStatusBarV11 remainingSeconds={4} onAbort={jest.fn()} />,
    );
    const node = getByTestId('game-status-bar-v11-countdown');
    expect(node.props.accessibilityLiveRegion).toBe('polite');
  });

  it('6 秒以上のとき aria-live=none', () => {
    const { getByTestId } = render(
      <GameStatusBarV11 remainingSeconds={10} onAbort={jest.fn()} />,
    );
    const node = getByTestId('game-status-bar-v11-countdown');
    expect(node.props.accessibilityLiveRegion).toBe('none');
  });

  it('× ボタンで onAbort が呼ばれる', () => {
    const onAbort = jest.fn();
    const { getByTestId } = render(
      <GameStatusBarV11 remainingSeconds={30} onAbort={onAbort} />,
    );
    fireEvent.press(getByTestId('game-status-bar-v11-abort'));
    expect(onAbort).toHaveBeenCalledTimes(1);
  });

  it('× ボタンの aria-label は「ゲームを中断」（v1 の「中断する」と差別化）', () => {
    const { getByTestId } = render(
      <GameStatusBarV11 remainingSeconds={30} onAbort={jest.fn()} />,
    );
    const close = getByTestId('game-status-bar-v11-abort');
    expect(close.props.accessibilityLabel).toBe('ゲームを中断');
  });

  it('「N / M 試行」表記は存在しない（OPT-12：1 セッション 1 試行）', () => {
    const { queryByText } = render(
      <GameStatusBarV11 remainingSeconds={30} onAbort={jest.fn()} />,
    );
    expect(queryByText(/試行/)).toBeNull();
  });
});
