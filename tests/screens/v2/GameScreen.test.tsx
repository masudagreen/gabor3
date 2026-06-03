/**
 * GameScreen.test.tsx — S4-1/S4-2 統合（F-01 描画 / F-02 採点方式 / F-03 結果開示 / F-12）。
 *
 * 3 採点方式の UI 挙動、選択トグル、結果開示オーバーレイ（総合 ✅/❌・遷移）、
 * 中断委譲を、決定論 rng で検証する。タイマーは fake timers で進める。
 *
 * 変化パッチの index は、同一シードの mulberry32 を generateRound に通して
 * テスト側で再現し、UI 操作対象を特定する（screen は内部で同じ rng を消費）。
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { GameScreen } from '../../../src/screens/v2/GameScreen';
import { GameConfig } from '../../../src/lib/v2/gameMachine';
import { generateRound } from '../../../src/lib/v2/roundGen';
import { isChanging } from '../../../src/lib/v2/patch';
import { mulberry32 } from '../../../src/lib/v2/rng';

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

/** 同一シードで第 1 ラウンドの変化パッチ index を再現する。 */
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

function renderGame(props: Partial<React.ComponentProps<typeof GameScreen>> & {
  config: GameConfig;
}) {
  const onAbort = jest.fn();
  const onSessionComplete = jest.fn();
  const utils = render(
    <ThemeProvider preference="dark" systemScheme="dark">
      <GameScreen
        viewingDistanceCm={40}
        onAbort={onAbort}
        onSessionComplete={onSessionComplete}
        testId="game"
        {...props}
      />
    </ThemeProvider>,
  );
  return { ...utils, onAbort, onSessionComplete };
}

describe('GameScreen 共通描画（F-01/F-12）', () => {
  it('上部バーにカウントダウン・X、格子（n×n）を描画する', () => {
    renderGame({ config: baseConfig(), rng: mulberry32(1) });
    expect(screen.getByLabelText('ゲームを中断')).toBeTruthy();
    expect(screen.getByLabelText(/残り \d+ 秒/)).toBeTruthy();
    expect(screen.getByLabelText('変化しているパッチをすべて選んでください')).toBeTruthy();
    // 16 セル（4×4）
    expect(screen.getByLabelText('パッチ 1-1')).toBeTruthy();
    expect(screen.getByLabelText('パッチ 4-4')).toBeTruthy();
  });

  it('X 押下で onAbort を委譲する（中断ダイアログは S5）', () => {
    const { onAbort } = renderGame({ config: baseConfig(), rng: mulberry32(1) });
    fireEvent.press(screen.getByLabelText('ゲームを中断'));
    expect(onAbort).toHaveBeenCalledTimes(1);
  });

  it('パッチタップで選択トグルする（aria-checked）', () => {
    renderGame({ config: baseConfig(), rng: mulberry32(1) });
    const cell = screen.getByLabelText('パッチ 1-1');
    expect(cell.props.accessibilityState.checked).toBe(false);
    fireEvent.press(cell);
    expect(screen.getByLabelText('パッチ 1-1').props.accessibilityState.checked).toBe(true);
    fireEvent.press(screen.getByLabelText('パッチ 1-1'));
    expect(screen.getByLabelText('パッチ 1-1').props.accessibilityState.checked).toBe(false);
  });
});

describe('方式①（auto-no-confirm）', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('確定ボタンが存在しない', () => {
    renderGame({ config: baseConfig({ scoringMode: 'auto-no-confirm' }), rng: mulberry32(1) });
    expect(screen.queryByLabelText('回答を確定する')).toBeNull();
  });

  it('m 秒経過で自動採点 → 総合バッジが開示される', () => {
    renderGame({
      config: baseConfig({ scoringMode: 'auto-no-confirm', roundSeconds: 1 }),
      rng: mulberry32(1),
    });
    act(() => {
      jest.advanceTimersByTime(1100);
    });
    // 開示中：総合 ✅/❌ のどちらか（未選択なので不正解）
    expect(screen.getByLabelText('不正解')).toBeTruthy();
    // 開示中は格子タップ無効
    expect(screen.getByTestId('game-grid').props.pointerEvents).toBe('none');
  });

  it('開示 1.5 秒後に次ラウンドへ進む', () => {
    renderGame({
      config: baseConfig({ scoringMode: 'auto-no-confirm', roundSeconds: 1, roundCount: 2 }),
      rng: mulberry32(1),
    });
    act(() => {
      jest.advanceTimersByTime(1100);
    });
    expect(screen.getByLabelText('不正解')).toBeTruthy();
    act(() => {
      jest.advanceTimersByTime(1600); // REVEAL_INTERVAL_MS
    });
    // 次ラウンドは playing：格子が再びタップ可能
    expect(screen.getByTestId('game-grid').props.pointerEvents).toBe('auto');
  });
});

describe('方式②（auto-confirm）', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('確定ボタンが存在し、押すと m 秒前に採点・開示される', () => {
    renderGame({ config: baseConfig({ scoringMode: 'auto-confirm' }), rng: mulberry32(1) });
    const confirm = screen.getByLabelText('回答を確定する');
    expect(confirm).toBeTruthy();
    act(() => {
      fireEvent.press(confirm);
    });
    // 採点後：総合バッジ表示・確定ボタンは消える
    expect(screen.queryByLabelText('回答を確定する')).toBeNull();
    expect(screen.getByTestId('game-overlay-aggregate')).toBeTruthy();
    expect(screen.getByTestId('game-grid').props.pointerEvents).toBe('none');
  });
});

describe('方式③（all-correct-advance）', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('確定ボタンは存在しない', () => {
    renderGame({
      config: baseConfig({ scoringMode: 'all-correct-advance' }),
      rng: mulberry32(7),
    });
    expect(screen.queryByLabelText('回答を確定する')).toBeNull();
  });

  it('変化パッチを過不足なく選ぶと総合✅で即開示（0.6 秒で次へ）', () => {
    const config = baseConfig({ scoringMode: 'all-correct-advance', roundCount: 2 });
    const seed = 7;
    const changing = changingIndicesForSeed(config, seed);
    renderGame({ config, rng: mulberry32(seed) });

    act(() => {
      changing.forEach((idx) => {
        fireEvent.press(screen.getByLabelText(rowCol(idx, config.gridSize)));
      });
    });
    // 全問正解 → 総合 ✅
    expect(screen.getByLabelText('正解')).toBeTruthy();
    // 0.6 秒で次ラウンドへ
    act(() => {
      jest.advanceTimersByTime(700);
    });
    expect(screen.getByTestId('game-grid').props.pointerEvents).toBe('auto');
  });
});

describe('セッション完了（F-04 委譲）', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('全ラウンド完了で onSessionComplete を呼ぶ', () => {
    const { onSessionComplete } = renderGame({
      config: baseConfig({ scoringMode: 'auto-no-confirm', roundSeconds: 1, roundCount: 2 }),
      rng: mulberry32(1),
    });
    // R1: timeout → reveal → next
    act(() => jest.advanceTimersByTime(1100));
    act(() => jest.advanceTimersByTime(1600));
    // R2: timeout → reveal → next（最終 → complete）
    act(() => jest.advanceTimersByTime(1100));
    act(() => jest.advanceTimersByTime(1600));
    expect(onSessionComplete).toHaveBeenCalledTimes(1);
    const state = onSessionComplete.mock.calls[0][0];
    expect(state.phase).toBe('session-complete');
    expect(state.sessionScore).not.toBeNull();
  });
});
