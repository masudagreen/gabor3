/**
 * Game1Screen のレンダリングと未挑戦判定の動作確認。
 *
 * spec.md §7.1 / screens.md S2-03 §4（仕様改訂：強制 60 秒視聴）：
 *   - 完了ボタンは存在しない
 *   - 60 秒経過まで自動採点は走らない
 *   - 60 秒経過で自動採点 → 結果を onComplete に通知
 *   - タップ無しで時間切れ → 未挑戦判定 → staircase up（易方向）
 *   - パッチを再タップで選択解除できる
 *   - × ボタンによる中断は引き続き動く
 */

import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Game1Screen } from '../../src/screens/Game1Screen';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.useFakeTimers();

/** 非同期 staircase 読み込みを fake timer 環境下で解決させる */
async function flushAsync() {
  for (let i = 0; i < 5; i += 1) {
    await Promise.resolve();
  }
}

describe('Game1Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('描画でき、abort/complete コールバックがコンポーネントに渡る（クラッシュしない）', async () => {
    const onAbort = jest.fn();
    const onComplete = jest.fn();

    render(
      <Game1Screen
        distanceCm={40}
        onAbort={onAbort}
        onComplete={onComplete}
      />,
    );

    // staircase の非同期 load を解決させる
    await act(async () => {
      await flushAsync();
      jest.advanceTimersByTime(0);
    });

    expect(onAbort).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('完了ボタンは DOM に存在しない（仕様改訂：強制 60 秒視聴）', async () => {
    const { queryByTestId, queryByText } = render(
      <Game1Screen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={jest.fn()}
      />,
    );

    await act(async () => {
      await flushAsync();
      jest.advanceTimersByTime(0);
    });

    expect(queryByTestId('game1-complete')).toBeNull();
    expect(queryByText('完了')).toBeNull();
  });

  it('60 秒経過前は onComplete が呼ばれない', async () => {
    const onComplete = jest.fn();

    const baseTime = new Date('2026-04-29T00:00:00Z').getTime();
    jest.setSystemTime(baseTime);

    render(
      <Game1Screen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
      />,
    );

    await act(async () => {
      await flushAsync();
      jest.advanceTimersByTime(0);
    });

    // 30 秒経過しても残り時間 30 秒（>0）なので採点に入らない
    await act(async () => {
      jest.setSystemTime(baseTime + 30_000);
      jest.advanceTimersByTime(250);
      await flushAsync();
    });

    expect(onComplete).not.toHaveBeenCalled();
  });

  it('60 秒経過 + ハイライト 1.5 秒後に onComplete が呼ばれる（自動採点）', async () => {
    const onComplete = jest.fn();

    // Date.now ベースの startedAtRef を制御するため固定時刻から開始
    const baseTime = new Date('2026-04-29T00:00:00Z').getTime();
    jest.setSystemTime(baseTime);

    render(
      <Game1Screen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
      />,
    );

    // staircase 読み込み + 試行生成を解決
    await act(async () => {
      await flushAsync();
      jest.advanceTimersByTime(0);
    });

    // 60 秒経過：システム時刻を進めてから 250ms ticker を発火させる
    await act(async () => {
      jest.setSystemTime(baseTime + 60_500);
      jest.advanceTimersByTime(250); // ticker が remaining<=0 を検出 → finalizeTrial
      await flushAsync();
    });

    // ハイライト 1.5 秒（setTimeout）を消化
    await act(async () => {
      jest.advanceTimersByTime(1_500);
      await flushAsync();
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    const result = onComplete.mock.calls[0][0];
    // タップ無しで時間切れ → 未挑戦
    expect(result.unattempted).toBe(true);
    expect(result.grading).toBeNull();
  });

  it('× ボタン押下 → 確認ダイアログ → 中断確定で onAbort が呼ばれる', async () => {
    const onAbort = jest.fn();

    const { getByTestId, getByText } = render(
      <Game1Screen
        distanceCm={40}
        onAbort={onAbort}
        onComplete={jest.fn()}
      />,
    );

    await act(async () => {
      await flushAsync();
      jest.advanceTimersByTime(0);
    });

    // × ボタン押下 → ConfirmDialog 表示
    fireEvent.press(getByTestId('status-abort'));

    // 「中断する」ボタンを押す
    await act(async () => {
      fireEvent.press(getByText('中断する'));
      await flushAsync();
    });

    expect(onAbort).toHaveBeenCalledTimes(1);
  });
});
