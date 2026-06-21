/**
 * GameScreen.test.tsx — S5 v3 ゲーム画面統合（F-01 描画 / F-02 / F-03 / F-12）。
 *
 * レベル/個数表示・選択トグル・全問正解での即時クリア・時間切れ失敗・結果開示後の
 * onResolved 通知・中断委譲を、決定論 rng + fake timers で検証する。
 *
 * 回転パッチ index は同一シードの mulberry32 を generateRoundFromLevel に通して
 * テスト側で再現する（screen は内部で同じ rng を消費）。
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { GameScreen } from '../../../src/screens/v3/GameScreen';
import type { GameConfig } from '../../../src/lib/v3/gameMachine';
import { generateRoundFromLevel } from '../../../src/lib/v3/roundGen';
import { isChanging } from '../../../src/lib/v3/patch';
import { levelToParams } from '../../../src/lib/v3/level';
import { mulberry32 } from '../../../src/lib/v2/rng';

/** L で gridSize・seconds 等の難易度変数を決める config を作る（個数はレベル外・§4.9）。 */
function configForLevel(level: number): GameConfig {
  return { level, params: levelToParams(level) };
}

/** 同一シードで回転パッチ index を再現する。 */
function changingIndicesForSeed(config: GameConfig, seed: number): number[] {
  const rng = mulberry32(seed);
  const patches = generateRoundFromLevel(rng, config.params);
  return patches.filter(isChanging).map((p) => p.index);
}

function rowCol(index: number, n: number): string {
  return `パッチ ${Math.floor(index / n) + 1}-${(index % n) + 1}`;
}

function renderGame(
  props: Partial<React.ComponentProps<typeof GameScreen>> & { config: GameConfig },
) {
  const onAbort = jest.fn();
  const onResolved = jest.fn();
  const onFeedback = jest.fn();
  const utils = render(
    <ThemeProvider preference="dark" systemScheme="dark">
      <GameScreen
        viewingDistanceCm={40}
        onAbort={onAbort}
        onResolved={onResolved}
        onFeedback={onFeedback}
        testId="game"
        {...props}
      />
    </ThemeProvider>,
  );
  return { ...utils, onAbort, onResolved, onFeedback };
}

describe('GameScreen v3 共通描画（F-01/F-02/F-12）', () => {
  it('上部バーにカウントダウン・X・レベル番号、本番「全て探せ」教示、格子を描画する', () => {
    // L7（デフォルト梯子：repeat3・時間30・一方向・3x3・速度6）。本番は個数非表示（§4.9）。
    const config = configForLevel(7);
    renderGame({ config, rng: mulberry32(1) });
    expect(screen.getByLabelText('ゲームを中断')).toBeTruthy();
    expect(screen.getByLabelText(/残り \d+ 秒/)).toBeTruthy();
    expect(screen.getByLabelText('レベル 7')).toBeTruthy();
    // v3.2：本番は個数を出さず「回転しているものを全て探せ」（find_all・ja）。
    expect(screen.getByText('回転しているものを全て探せ')).toBeTruthy();
  });

  it('本番教示は「回転しているパッチをすべて探してください」を読み上げる（個数非開示・F-02）', () => {
    const config = configForLevel(41); // 振動域
    renderGame({ config, rng: mulberry32(2) });
    expect(screen.getByLabelText('レベル 41')).toBeTruthy();
    expect(screen.getByLabelText('回転しているパッチをすべて探してください')).toBeTruthy();
  });
});

describe('GameScreen v3.1 締切時判定（F-01/F-03/§4.3・AS-24）', () => {
  it('回転パッチを過不足なく選んでも即時終了せず、時間切れ締切で onResolved("clear")', () => {
    jest.useFakeTimers();
    const seed = 5;
    const config = configForLevel(7); // count=3, 3x3
    const changing = changingIndicesForSeed(config, seed);
    const n = config.params.gridSize;
    const { onResolved } = renderGame({ config, rng: mulberry32(seed) });

    // 回転パッチをすべて選択。v3.1：全問正解でも即時締め切りしない。
    act(() => {
      for (const idx of changing) {
        fireEvent.press(screen.getByLabelText(rowCol(idx, n)));
      }
    });
    // 締め切り前なので onResolved はまだ呼ばれない。
    expect(onResolved).not.toHaveBeenCalled();

    // 制限時間到達（TIMEOUT）で締切 → 全問正解なら clear。開示（revealed）に入る。
    act(() => {
      jest.advanceTimersByTime((config.params.seconds + 1) * 1000);
    });
    // v3.1：締切後 3 秒開示カウントダウン中はまだ onResolved を呼ばない。
    expect(screen.getByTestId('game-disclosure')).toBeTruthy();
    expect(onResolved).not.toHaveBeenCalled();

    // 3 秒開示カウントダウン経過後に onResolved が clear で発火する（§4.6 / AS-25）。
    // 1 秒ずつ進め、各秒で次の setTimeout が再スケジュールされる（rAF 近似）。
    for (let i = 0; i < 3; i++) {
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    }
    expect(onResolved).toHaveBeenCalledTimes(1);
    expect(onResolved.mock.calls[0][0]).toBe('clear');
    jest.useRealTimers();
  });
});

describe('GameScreen v3 時間切れ失敗（F-03/F-12）', () => {
  it('未選択のまま時間切れで onResolved("fail")', () => {
    jest.useFakeTimers();
    const config = configForLevel(7);
    const { onResolved } = renderGame({ config, rng: mulberry32(9) });

    // seconds 経過で TIMEOUT → fail。タイマーは内部 setInterval(16ms) フォールバック。
    act(() => {
      jest.advanceTimersByTime((config.params.seconds + 1) * 1000);
    });
    // v3.1：締切後 3 秒開示カウントダウン経過で onResolved("fail")。
    for (let i = 0; i < 3; i++) {
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    }
    expect(onResolved).toHaveBeenCalledTimes(1);
    expect(onResolved.mock.calls[0][0]).toBe('fail');
    jest.useRealTimers();
  });
});

describe('GameScreen v3.1 締切後 3 秒開示カウントダウン（F-03/AS-25）', () => {
  it('締切後に disclosure カウントダウンを表示し、開示中はティック音なし、0 で onResolved', () => {
    jest.useFakeTimers();
    const config = configForLevel(7);
    const { onResolved, onFeedback } = renderGame({
      config,
      rng: mulberry32(9),
    });
    // 締切まで進める。
    act(() => {
      jest.advanceTimersByTime((config.params.seconds + 1) * 1000);
    });
    // 開示カウントダウンが出ている（disclosure variant）。
    const disclosure = screen.getByTestId('game-disclosure');
    expect(disclosure).toBeTruthy();
    // 開示中はまだ onResolved なし。
    expect(onResolved).not.toHaveBeenCalled();

    // 1 秒ずつ進め、3 秒で自動遷移。
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onResolved).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onResolved).toHaveBeenCalledTimes(1);

    // 開示（次ラウンドへの）カウントダウン中はティック音を出さない（ユーザー要望、GameScreen 参照）。
    // 締切時の clear/fail フィードバックとは別系統で、countdown-tick はこの区間で発火しない。
    const discTicks = onFeedback.mock.calls
      .filter((c) => c[0].type === 'countdown-tick')
      .map((c) => c[0].remainingSec);
    expect(discTicks).toEqual([]);
    jest.useRealTimers();
  });
});

describe('GameScreen v3 音・ハプティクス発火（F-14）', () => {
  it('締切（時間切れ）で clear イベントを emit（試行中は clear/fail を出さない）', () => {
    jest.useFakeTimers();
    const seed = 5;
    const config = configForLevel(7);
    const changing = changingIndicesForSeed(config, seed);
    const n = config.params.gridSize;
    const { onFeedback } = renderGame({ config, rng: mulberry32(seed) });

    // 全問正解に達しても締切前は clear/fail を emit しない（試行中、v3.1）。
    act(() => {
      for (const idx of changing) {
        fireEvent.press(screen.getByLabelText(rowCol(idx, n)));
      }
    });
    expect(
      onFeedback.mock.calls.filter(
        (c) => c[0].type === 'clear' || c[0].type === 'fail',
      ),
    ).toHaveLength(0);

    // 制限時間到達（TIMEOUT）で締切 → clear emit。
    act(() => {
      jest.advanceTimersByTime((config.params.seconds + 1) * 1000);
    });
    const clearCalls = onFeedback.mock.calls.filter((c) => c[0].type === 'clear');
    expect(clearCalls).toHaveLength(1);
    expect(onFeedback.mock.calls.some((c) => c[0].type === 'fail')).toBe(false);
    jest.useRealTimers();
  });

  it('時間切れの締め切りで fail イベントを emit する', () => {
    jest.useFakeTimers();
    const config = configForLevel(7);
    const { onFeedback } = renderGame({ config, rng: mulberry32(9) });
    act(() => {
      jest.advanceTimersByTime((config.params.seconds + 1) * 1000);
    });
    const failCalls = onFeedback.mock.calls.filter((c) => c[0].type === 'fail');
    expect(failCalls).toHaveLength(1);
    expect(onFeedback.mock.calls.some((c) => c[0].type === 'clear')).toBe(false);
    jest.useRealTimers();
  });

  it('カウントダウン残り 3/2/1 秒で tick を毎秒 1 度ずつ emit する', () => {
    // useGameTimer は performance.now を基準に残り秒を算出するため、rAF を無効化し
    // performance.now を制御して setInterval フォールバック経路を fake timers で進める
    //（useGameTimer.test.tsx と同じ手法）。
    jest.useFakeTimers();
    let nowMs = 0;
    const originalRaf = globalThis.requestAnimationFrame;
    const originalPerf = globalThis.performance;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).requestAnimationFrame = undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).performance = { now: () => nowMs };
    // 1 秒ずつ別々の act で進め、各秒境界で React にコミットさせる（実機の rAF 毎フレーム
    // コミットを近似。1 つの act 内に複数秒を詰めるとバッチングで中間の残り秒が観測できない）。
    const advanceOneSecond = () => {
      let remaining = 1000;
      act(() => {
        while (remaining > 0) {
          const d = Math.min(16, remaining);
          nowMs += d;
          jest.advanceTimersByTime(d);
          remaining -= d;
        }
      });
    };

    try {
      const config = configForLevel(7);
      const { onFeedback } = renderGame({ config, rng: mulberry32(9) });
      // seconds 秒間、1 秒ずつ進めて締め切りまで到達させる。
      for (let i = 0; i < config.params.seconds; i++) {
        advanceOneSecond();
      }

      const ticks: number[] = onFeedback.mock.calls
        .filter((c) => c[0].type === 'countdown-tick')
        .map((c) => c[0].remainingSec);
      // ティックは残り 3/2/1 秒の範囲のみ（4 秒以上は出さない＝試行中の通常時は無発火）。
      expect(ticks.length).toBeGreaterThan(0);
      for (const s of ticks) {
        expect([1, 2, 3]).toContain(s);
      }
      // 同じ残り秒で重複発火しない（毎秒 1 度。lastTickRef による抑止）。
      expect(new Set(ticks).size).toBe(ticks.length);
    } finally {
      jest.useRealTimers();
      globalThis.requestAnimationFrame = originalRaf;
      globalThis.performance = originalPerf;
    }
  });
});

describe('GameScreen v3 中断委譲（F-07 接続）', () => {
  it('X 押下で onAbort を呼ぶ（ダイアログ自体は S6）', () => {
    const config = configForLevel(7);
    const { onAbort } = renderGame({ config, rng: mulberry32(1) });
    fireEvent.press(screen.getByLabelText('ゲームを中断'));
    expect(onAbort).toHaveBeenCalledTimes(1);
  });
});
