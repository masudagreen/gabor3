/**
 * GameScreenFeedback.test.tsx — S9 / F-14 ゲーム内の音・ハプティクス発火点。
 *
 * GameScreen が onFeedback で発火するイベントを検証する：
 *  - 採点（開示）時に総合 ✅→round-correct / ❌→round-wrong を 1 度だけ
 *  - カウントダウン残り 3/2/1 秒で countdown-tick を各 1 度
 *  - 試行中（採点前）は採点 FB 以外（=tick 以外）を発火しない
 *
 * 実際の音/振動再生はここでは検証せず（platform テスト担当）、決定は decideFeedback、
 * 配線は本テストで切り分ける。
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { GameScreen } from '../../../src/screens/v2/GameScreen';
import { GameConfig } from '../../../src/lib/v2/gameMachine';
import { generateRound } from '../../../src/lib/v2/roundGen';
import { isChanging } from '../../../src/lib/v2/patch';
import { mulberry32 } from '../../../src/lib/v2/rng';
import type { FeedbackEvent } from '../../../src/lib/v2/feedback';

function baseConfig(over: Partial<GameConfig> = {}): GameConfig {
  return {
    gridSize: 4,
    roundSeconds: 5,
    roundCount: 2,
    rotationSpeed: 6,
    sfChangeSpeed: 0.15,
    scoringMode: 'auto-no-confirm',
    ...over,
  };
}

function changingIndicesForSeed(config: GameConfig, seed: number): number[] {
  const rng = mulberry32(seed);
  const patches = generateRound(rng, {
    gridSize: config.gridSize,
    rotationSpeed: config.rotationSpeed,
    sfChangeSpeed: config.sfChangeSpeed,
  });
  return patches.filter(isChanging).map((p) => p.index);
}

function rowCol(index: number, n: number): string {
  return `パッチ ${Math.floor(index / n) + 1}-${(index % n) + 1}`;
}

function renderGame(
  config: GameConfig,
  seed: number,
): { onFeedback: jest.Mock; types: () => string[] } {
  const onFeedback = jest.fn();
  render(
    <ThemeProvider preference="dark" systemScheme="dark">
      <GameScreen
        config={config}
        viewingDistanceCm={40}
        rng={mulberry32(seed)}
        onAbort={jest.fn()}
        onSessionComplete={jest.fn()}
        onFeedback={onFeedback}
        testId="game"
      />
    </ThemeProvider>,
  );
  const types = () =>
    onFeedback.mock.calls.map((c) => (c[0] as FeedbackEvent).type);
  return { onFeedback, types };
}

describe('採点フィードバック（F-14）', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('未選択で m 秒経過 → 総合 ❌ → round-wrong を 1 度発火', () => {
    const { onFeedback, types } = renderGame(
      baseConfig({ roundSeconds: 1 }),
      1,
    );
    act(() => jest.advanceTimersByTime(1100));
    expect(screen.getByLabelText('不正解')).toBeTruthy();
    const wrong = onFeedback.mock.calls.filter(
      (c) => (c[0] as FeedbackEvent).type === 'round-wrong',
    );
    expect(wrong).toHaveLength(1);
    expect(types()).not.toContain('round-correct');
  });

  it('全問正解（方式③）→ 総合 ✅ → round-correct を発火', () => {
    const config = baseConfig({ scoringMode: 'all-correct-advance' });
    const seed = 7;
    const changing = changingIndicesForSeed(config, seed);
    const { types } = renderGame(config, seed);
    act(() => {
      changing.forEach((idx) =>
        fireEvent.press(screen.getByLabelText(rowCol(idx, config.gridSize))),
      );
    });
    expect(screen.getByLabelText('正解')).toBeTruthy();
    expect(types()).toContain('round-correct');
    expect(types()).not.toContain('round-wrong');
  });

  it('試行中（採点前）は round-correct/round-wrong を発火しない', () => {
    const { types } = renderGame(baseConfig({ roundSeconds: 5 }), 1);
    // タップしても採点前は採点 FB なし（tick は残り 3 秒未満でないので無し）
    act(() => {
      fireEvent.press(screen.getByLabelText('パッチ 1-1'));
    });
    expect(types()).not.toContain('round-correct');
    expect(types()).not.toContain('round-wrong');
  });
});

describe('カウントダウンティック（F-14）', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('残り 3/2/1 秒で countdown-tick を各 1 度ずつ発火（採点直前の予告）', () => {
    // roundSeconds=4：開始 4→3→2→1 と進む。3/2/1 でティック。
    const { onFeedback } = renderGame(baseConfig({ roundSeconds: 4 }), 1);
    // 残り 3 秒到達（経過 ~1.05s）
    act(() => jest.advanceTimersByTime(1050));
    // 残り 2 秒（経過 ~2.05s）
    act(() => jest.advanceTimersByTime(1000));
    // 残り 1 秒（経過 ~3.05s）
    act(() => jest.advanceTimersByTime(1000));

    const ticks = onFeedback.mock.calls
      .map((c) => c[0] as FeedbackEvent)
      .filter((e) => e.type === 'countdown-tick');
    const secs = ticks.map((t) =>
      t.type === 'countdown-tick' ? t.remainingSec : null,
    );
    // 3,2,1 が各 1 回ずつ（順不同重複なし）
    expect(new Set(secs)).toEqual(new Set([3, 2, 1]));
    expect(secs.filter((s) => s === 3)).toHaveLength(1);
    expect(secs.filter((s) => s === 2)).toHaveLength(1);
    expect(secs.filter((s) => s === 1)).toHaveLength(1);
  });

  it('残り 4 秒以上ではティックを発火しない', () => {
    const { onFeedback } = renderGame(baseConfig({ roundSeconds: 8 }), 1);
    // 残り 5 秒（経過 ~3.05s）までは tick なし
    act(() => jest.advanceTimersByTime(3050));
    const ticks = onFeedback.mock.calls
      .map((c) => c[0] as FeedbackEvent)
      .filter((e) => e.type === 'countdown-tick');
    expect(ticks).toHaveLength(0);
  });
});
