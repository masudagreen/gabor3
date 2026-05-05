/**
 * useGameCountdown フック単体テスト（Sprint 19 リファクタ + paused 拡張）。
 *
 * 13 ゲーム共通の 60 秒カウントダウンを担う共通フック。
 *
 * 検証観点：
 *   - enabled: false の間は何もしない（remainingMs が初期値のまま）
 *   - enabled: true で remainingMs が tick ごとに減る
 *   - 残時間 0 で onTimeUp が 1 度だけ呼ばれる（多重発火ガード）
 *   - enabled を false → true に切替で再カウント開始（startedAt リセット）
 *   - unmount で setInterval が cleanup される（リーク防止）
 *   - tickMs を省略すると既定 250ms で動く
 *   - paused: true の間は remainingMs が変化せず onTimeUp も発火しない
 *   - paused: true → false 切替で残時間から再開（停止中の経過時間が elapsed
 *     に加算されない）
 *   - enabled: false の優先度が paused より上
 *   - paused 未指定（既定 false）で従来挙動が維持される
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { useGameCountdown } from '../../../src/hooks/v11/useGameCountdown';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useGameCountdown: enabled === false の挙動', () => {
  it('enabled=false の間は何もしない（remainingMs は totalDurationMs のまま）', () => {
    const onTimeUp = jest.fn();
    const { result } = renderHook(() =>
      useGameCountdown({
        totalDurationMs: 1000,
        enabled: false,
        onTimeUp,
        tickMs: 100,
      }),
    );

    expect(result.current.remainingMs).toBe(1000);

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // 何 tick 経っても remainingMs は変わらない
    expect(result.current.remainingMs).toBe(1000);
    expect(onTimeUp).not.toHaveBeenCalled();
  });
});

describe('useGameCountdown: enabled === true の挙動', () => {
  it('tick ごとに remainingMs が減る', () => {
    const onTimeUp = jest.fn();
    const { result } = renderHook(() =>
      useGameCountdown({
        totalDurationMs: 1000,
        enabled: true,
        onTimeUp,
        tickMs: 100,
      }),
    );

    // 初期値
    expect(result.current.remainingMs).toBe(1000);

    // 100ms 経過 → 残り 900ms
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current.remainingMs).toBe(900);

    // さらに 200ms 経過 → 残り 700ms
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current.remainingMs).toBe(700);

    // まだ onTimeUp は呼ばれない
    expect(onTimeUp).not.toHaveBeenCalled();
  });

  it('残時間 0 到達で onTimeUp が 1 度だけ呼ばれる（多重発火ガード）', () => {
    const onTimeUp = jest.fn();
    const { result } = renderHook(() =>
      useGameCountdown({
        totalDurationMs: 500,
        enabled: true,
        onTimeUp,
        tickMs: 100,
      }),
    );

    // 500ms 経過で残時間 0
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current.remainingMs).toBe(0);
    expect(onTimeUp).toHaveBeenCalledTimes(1);

    // それ以降タイマーを進めても onTimeUp は再発火しない
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(onTimeUp).toHaveBeenCalledTimes(1);
  });

  it('totalDurationMs を超えても remainingMs は 0 にクランプされる', () => {
    const onTimeUp = jest.fn();
    const { result } = renderHook(() =>
      useGameCountdown({
        totalDurationMs: 300,
        enabled: true,
        onTimeUp,
        tickMs: 100,
      }),
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.remainingMs).toBe(0);
    expect(result.current.remainingMs).toBeGreaterThanOrEqual(0);
  });
});

describe('useGameCountdown: enabled の切替', () => {
  it('enabled false → true で再カウント開始（startedAt リセット）', () => {
    const onTimeUp = jest.fn();
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useGameCountdown({
          totalDurationMs: 1000,
          enabled,
          onTimeUp,
          tickMs: 100,
        }),
      { initialProps: { enabled: false } },
    );

    // disabled の間は変化なし
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current.remainingMs).toBe(1000);

    // enabled に切替 → 開始
    rerender({ enabled: true });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current.remainingMs).toBe(800);
  });

  it('enabled true → false → true で再カウントが起点リセットされる', () => {
    const onTimeUp = jest.fn();
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useGameCountdown({
          totalDurationMs: 1000,
          enabled,
          onTimeUp,
          tickMs: 100,
        }),
      { initialProps: { enabled: true } },
    );

    // 300ms 経過で残 700
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current.remainingMs).toBe(700);

    // 一旦無効化
    rerender({ enabled: false });
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // 再度有効化 → remainingMs は totalDurationMs に戻り、再カウント開始
    rerender({ enabled: true });
    expect(result.current.remainingMs).toBe(1000);

    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current.remainingMs).toBe(800);

    // onTimeUp はまだ呼ばれていない
    expect(onTimeUp).not.toHaveBeenCalled();
  });
});

describe('useGameCountdown: cleanup', () => {
  it('unmount で setInterval が cleanup される（onTimeUp が呼ばれない）', () => {
    const onTimeUp = jest.fn();
    const { unmount } = renderHook(() =>
      useGameCountdown({
        totalDurationMs: 500,
        enabled: true,
        onTimeUp,
        tickMs: 100,
      }),
    );

    // 200ms 進めた時点では onTimeUp はまだ
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(onTimeUp).not.toHaveBeenCalled();

    // unmount してからタイマーを進めても onTimeUp は呼ばれない（リーク防止）
    unmount();
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(onTimeUp).not.toHaveBeenCalled();
  });
});

describe('useGameCountdown: tickMs', () => {
  it('tickMs を省略すると既定 250ms で動く', () => {
    const onTimeUp = jest.fn();
    const { result } = renderHook(() =>
      useGameCountdown({
        totalDurationMs: 1000,
        enabled: true,
        onTimeUp,
      }),
    );

    expect(result.current.remainingMs).toBe(1000);

    // 250ms 経過 → 残り 750ms
    act(() => {
      jest.advanceTimersByTime(250);
    });
    expect(result.current.remainingMs).toBe(750);
  });
});

describe('useGameCountdown: onTimeUp 参照の最新化', () => {
  it('onTimeUp を再レンダで差し替えても最新の関数が呼ばれる', () => {
    const first = jest.fn();
    const second = jest.fn();
    const { rerender } = renderHook(
      ({ cb }: { cb: () => void }) =>
        useGameCountdown({
          totalDurationMs: 300,
          enabled: true,
          onTimeUp: cb,
          tickMs: 100,
        }),
      { initialProps: { cb: first } },
    );

    // 100ms 経過
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // onTimeUp を別関数に差し替え
    rerender({ cb: second });

    // 残り 200ms 進めて 0 到達
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // 差し替え後の second だけが呼ばれる
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe('useGameCountdown: paused 機能（中断ダイアログ表示中などの一時停止）', () => {
  it('paused: true の間は remainingMs が変化しない', () => {
    const onTimeUp = jest.fn();
    const { result, rerender } = renderHook(
      ({ paused }: { paused: boolean }) =>
        useGameCountdown({
          totalDurationMs: 1000,
          enabled: true,
          paused,
          onTimeUp,
          tickMs: 100,
        }),
      { initialProps: { paused: false } },
    );

    // 300ms 経過 → 残 700
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current.remainingMs).toBe(700);

    // pause 突入
    rerender({ paused: true });
    const remainingAtPause = result.current.remainingMs;

    // 1 秒以上経過しても remainingMs は不変
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current.remainingMs).toBe(remainingAtPause);
    expect(onTimeUp).not.toHaveBeenCalled();
  });

  it('paused: true → false で残時間から再開（停止中の経過時間が elapsed に加算されない）', () => {
    const onTimeUp = jest.fn();
    const { result, rerender } = renderHook(
      ({ paused }: { paused: boolean }) =>
        useGameCountdown({
          totalDurationMs: 1000,
          enabled: true,
          paused,
          onTimeUp,
          tickMs: 100,
        }),
      { initialProps: { paused: false } },
    );

    // 300ms 経過 → 残 700
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current.remainingMs).toBe(700);

    // pause 突入。1500ms 待たせる（この間カウントは進まないはず）
    rerender({ paused: true });
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(result.current.remainingMs).toBe(700);

    // resume。再開後 200ms で残 500 になるはず（=停止中の 1500ms は加算されない）
    rerender({ paused: false });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current.remainingMs).toBe(500);
    expect(onTimeUp).not.toHaveBeenCalled();

    // さらに 500ms で残 0 → onTimeUp 発火
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current.remainingMs).toBe(0);
    expect(onTimeUp).toHaveBeenCalledTimes(1);
  });

  it('paused: true のまま totalDurationMs を超える時間が経過しても onTimeUp が呼ばれない', () => {
    const onTimeUp = jest.fn();
    const { result, rerender } = renderHook(
      ({ paused }: { paused: boolean }) =>
        useGameCountdown({
          totalDurationMs: 500,
          enabled: true,
          paused,
          onTimeUp,
          tickMs: 100,
        }),
      { initialProps: { paused: false } },
    );

    // 100ms だけ進めて即 pause
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current.remainingMs).toBe(400);

    rerender({ paused: true });

    // totalDurationMs を大幅に超える時間が経過しても onTimeUp は呼ばれない
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(onTimeUp).not.toHaveBeenCalled();
    expect(result.current.remainingMs).toBe(400);
  });

  it('enabled: false の優先度は paused より上（enabled false なら paused に関わらず何もしない）', () => {
    const onTimeUp = jest.fn();
    const { result } = renderHook(() =>
      useGameCountdown({
        totalDurationMs: 1000,
        enabled: false,
        paused: true,
        onTimeUp,
        tickMs: 100,
      }),
    );
    // enabled が優先 → 何もしない（remainingMs は totalDurationMs のまま）
    expect(result.current.remainingMs).toBe(1000);
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current.remainingMs).toBe(1000);
    expect(onTimeUp).not.toHaveBeenCalled();
  });

  it('paused 未指定（既定 false）で従来挙動が維持される（リグレッション保険）', () => {
    const onTimeUp = jest.fn();
    const { result } = renderHook(() =>
      useGameCountdown({
        totalDurationMs: 500,
        enabled: true,
        // paused を渡さない（既定 false）
        onTimeUp,
        tickMs: 100,
      }),
    );

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current.remainingMs).toBe(0);
    expect(onTimeUp).toHaveBeenCalledTimes(1);
  });

  it('pause → resume → 再 pause の連続でも残時間が正しく保持される', () => {
    const onTimeUp = jest.fn();
    const { result, rerender } = renderHook(
      ({ paused }: { paused: boolean }) =>
        useGameCountdown({
          totalDurationMs: 1000,
          enabled: true,
          paused,
          onTimeUp,
          tickMs: 100,
        }),
      { initialProps: { paused: false } },
    );

    // 200ms 進める → 残 800
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current.remainingMs).toBe(800);

    // pause → 待つ → resume
    rerender({ paused: true });
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    rerender({ paused: false });

    // resume 後 100ms → 残 700
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current.remainingMs).toBe(700);

    // 再度 pause → 待つ → resume
    rerender({ paused: true });
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    rerender({ paused: false });

    // resume 後 100ms → 残 600
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current.remainingMs).toBe(600);
    expect(onTimeUp).not.toHaveBeenCalled();
  });
});
