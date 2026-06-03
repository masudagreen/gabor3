/**
 * useGameTimer.test.tsx — タイマー駆動（F-01 / F-12、S4）。
 *
 * - playing 中に経過秒が進み、残り秒が整数で減る
 * - 残り 0 で onTimeout を 1 度だけ発火する
 * - active=false（開示中）では進まない
 * - roundKey 変化で 0 から再開
 *
 * 決定論のため performance.now をモックし、rAF を無効化して setInterval
 * フォールバック経路を fake timers で進める。
 */

import { act, renderHook } from '@testing-library/react-native';
import { useGameTimer } from '../../../src/hooks/v2/useGameTimer';

describe('useGameTimer', () => {
  let nowMs = 0;
  let originalRaf: typeof globalThis.requestAnimationFrame;
  let originalPerf: typeof globalThis.performance;

  beforeEach(() => {
    jest.useFakeTimers();
    nowMs = 0;
    originalRaf = globalThis.requestAnimationFrame;
    originalPerf = globalThis.performance;
    // rAF を無効化して setInterval フォールバックを使わせる
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).requestAnimationFrame = undefined;
    // performance.now を制御
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).performance = { now: () => nowMs };
  });

  afterEach(() => {
    jest.useRealTimers();
    globalThis.requestAnimationFrame = originalRaf;
    globalThis.performance = originalPerf;
  });

  function advance(ms: number) {
    act(() => {
      nowMs += ms;
      jest.advanceTimersByTime(ms);
    });
  }

  it('開始直後は経過 0・残り = m', () => {
    const { result } = renderHook(() =>
      useGameTimer({
        durationSec: 5,
        active: true,
        roundKey: 1,
        onTimeout: jest.fn(),
      }),
    );
    expect(result.current.elapsedSec).toBe(0);
    expect(result.current.remainingSec).toBe(5);
  });

  it('時間経過で残り秒が整数で減る', () => {
    const { result } = renderHook(() =>
      useGameTimer({
        durationSec: 5,
        active: true,
        roundKey: 1,
        onTimeout: jest.fn(),
      }),
    );
    advance(1000);
    expect(result.current.remainingSec).toBe(4);
    advance(2500); // 計 3.5 秒経過 → 残り ceil(1.5)=2
    expect(result.current.remainingSec).toBe(2);
  });

  it('残り 0 到達で onTimeout を 1 度だけ発火する', () => {
    const onTimeout = jest.fn();
    renderHook(() =>
      useGameTimer({ durationSec: 2, active: true, roundKey: 1, onTimeout }),
    );
    advance(2000);
    expect(onTimeout).toHaveBeenCalledTimes(1);
    advance(2000); // 満了後さらに進めても再発火しない
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('active=false（開示中）では時間が進まず onTimeout も発火しない', () => {
    const onTimeout = jest.fn();
    const { result } = renderHook(() =>
      useGameTimer({ durationSec: 2, active: false, roundKey: 1, onTimeout }),
    );
    advance(5000);
    expect(result.current.elapsedSec).toBe(0);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('roundKey が変わるとタイマーが 0 から再開する', () => {
    let roundKey = 1;
    const { result, rerender } = renderHook(() =>
      useGameTimer({
        durationSec: 10,
        active: true,
        roundKey,
        onTimeout: jest.fn(),
      }),
    );
    advance(3000);
    expect(result.current.remainingSec).toBe(7);
    roundKey = 2;
    act(() => {
      rerender({});
    });
    expect(result.current.elapsedSec).toBe(0);
    expect(result.current.remainingSec).toBe(10);
  });
});
