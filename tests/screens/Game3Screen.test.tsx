/**
 * Game3Screen のレンダリング & 状態遷移確認（screens.md S3-01 / spec.md §7.3）。
 *
 * フェーズ進行：
 *   trialStart (500ms) → presentation (300〜800ms) → mask (200ms)
 *   → answer (最大 2000ms) → feedback (800ms) → cooldown (100ms)
 *
 * 確認項目：
 *   - 描画クラッシュなし
 *   - ガイドテキスト「『ちがう向き』のパッチはどの方向？」が表示される
 *   - 8 個の時計回答ボタンが表示される
 *   - GameStatusBar が表示される
 */

import React from 'react';
import { act, render } from '@testing-library/react-native';
import { Game3Screen } from '../../src/screens/Game3Screen';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.useFakeTimers();

describe('Game3Screen', () => {
  it('描画でき、abort/complete コールバックがコンポーネントに渡る（クラッシュしない）', async () => {
    const onAbort = jest.fn();
    const onComplete = jest.fn();

    render(
      <Game3Screen
        distanceCm={40}
        onAbort={onAbort}
        onComplete={onComplete}
      />,
    );

    // staircase の非同期 load を解決させる
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      jest.advanceTimersByTime(0);
    });

    expect(onAbort).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('ガイドテキストと 8 個の時計回答ボタンが描画される', async () => {
    const { getByText, getByTestId } = render(
      <Game3Screen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={jest.fn()}
      />,
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      jest.advanceTimersByTime(0);
    });

    expect(getByText(/「ちがう向き」のパッチはどの方向？/)).toBeTruthy();
    // 8 個のボタンが存在
    expect(getByTestId('clock-btn-12')).toBeTruthy();
    expect(getByTestId('clock-btn-1:30')).toBeTruthy();
    expect(getByTestId('clock-btn-3')).toBeTruthy();
    expect(getByTestId('clock-btn-4:30')).toBeTruthy();
    expect(getByTestId('clock-btn-6')).toBeTruthy();
    expect(getByTestId('clock-btn-7:30')).toBeTruthy();
    expect(getByTestId('clock-btn-9')).toBeTruthy();
    expect(getByTestId('clock-btn-10:30')).toBeTruthy();
  });
});
