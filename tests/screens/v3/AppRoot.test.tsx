/**
 * AppRoot.test.tsx — v3.1 アプリ骨格（spec F-01/F-03/F-04/F-05/F-06/F-07/F-08、§4.4/§4.6）。
 *
 * - 3 タブ常時表示・aria-selected・タブ切替（F-05）。
 * - プレイ中の他タブ / × → 中断ダイアログ（F-07）。キャンセル=継続 / OK=破棄。
 * - セッションループ：ラウンド → 締切 → 3 秒開示 → 次ラウンド（レベル変化）→ … →
 *   指定時間でセッション終了 → セッション要約カード（F-01/F-03/F-04/F-08）。
 * - セッション要約表示中（非進行中）はタブ移動が自由＝ダイアログなし（F-05/F-07）。
 * - クリアで +1（次ラウンドのレベルピルが変化、F-04）。
 * - 「もう一度」→ 距離リマインド経由で新セッション（F-08）。
 *
 * 決定論 rng + fake timers。セッションフローは onResolveRound / onFinalizeSession を注入。
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import {
  AppRoot,
  type ResolveRound,
  type FinalizeSession,
} from '../../../src/screens/v3/AppRoot';
import { generateRoundFromLevel } from '../../../src/lib/v3/roundGen';
import { isChanging } from '../../../src/lib/v3/patch';
import { levelToParams } from '../../../src/lib/v3/level';
import { completeRound } from '../../../src/lib/v3/sessionMachine';
import { mulberry32 } from '../../../src/lib/v2/rng';
import type { AudioBackend, SoundKind } from '../../../src/platform/audio';
import type { HapticKind, HapticsBackend } from '../../../src/platform/haptics';
import type { BadgeId } from '../../../src/state/v3/schema';

class FakeAudio implements AudioBackend {
  plays: SoundKind[] = [];
  async prime(): Promise<void> {}
  play(kind: SoundKind): void {
    this.plays.push(kind);
  }
  stop(): void {}
  isAvailable(): boolean {
    return true;
  }
}
class FakeHaptics implements HapticsBackend {
  triggers: HapticKind[] = [];
  trigger(kind: HapticKind): void {
    this.triggers.push(kind);
  }
  isAvailable(): boolean {
    return true;
  }
}

/** メモリ上で completeRound を適用する resolveRound（applyResult のみ、永続化なし）。 */
function memoryResolveRound(): ResolveRound {
  return async ({ session, result, roundPlaySec }) => {
    const { session: next } = completeRound(session, result, roundPlaySec);
    return { session: next, shouldContinue: !next.finished };
  };
}

function changingIndicesForSeed(level: number, seed: number): number[] {
  const rng = mulberry32(seed);
  const patches = generateRoundFromLevel(rng, levelToParams(level));
  return patches.filter(isChanging).map((p) => p.index);
}

function rowCol(index: number, n: number): string {
  return `パッチ ${Math.floor(index / n) + 1}-${(index % n) + 1}`;
}

function renderApp(props: Partial<React.ComponentProps<typeof AppRoot>> = {}) {
  return render(
    <ThemeProvider preference="dark" systemScheme="dark">
      <AppRoot
        viewingDistanceCm={40}
        testId="app"
        rng={mulberry32(1)}
        onResolveRound={memoryResolveRound()}
        {...props}
      />
    </ThemeProvider>,
  );
}

/**
 * 締切後の 3 秒開示カウントダウンを進める（1 秒刻みで次ラウンド/要約へ）。
 * onResolveRound は Promise を返すため、各遷移後にマイクロタスクをフラッシュする。
 */
async function advanceDisclosure() {
  // 3→2→1→0 の遷移を確実に跨ぐため 4 ステップ（最後の 1→0 で onResolved）。
  for (let i = 0; i < 4; i++) {
    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();
    });
  }
}

describe('AppRoot v3.1 タブナビ（F-05）', () => {
  it('3 タブが常時表示され、ホームが選択中（aria-selected）', () => {
    renderApp();
    expect(screen.getByLabelText('ホームタブ')).toBeTruthy();
    expect(screen.getByLabelText('履歴タブ')).toBeTruthy();
    expect(screen.getByLabelText('設定タブ')).toBeTruthy();
    expect(screen.getByLabelText('ホームタブ').props.accessibilityState).toEqual({
      selected: true,
    });
  });
});

describe('AppRoot v3.1 プレイ中の中断ダイアログ（F-07）', () => {
  it('プレイ中に履歴タブ → 中断ダイアログが出る', () => {
    renderApp({
      initialLevel: { currentLevel: 7, consecutiveFailures: 0, highestLevel: 6 },
    });
    fireEvent.press(screen.getByLabelText('履歴タブ'));
    expect(screen.getByText('プレイを中断しますか？')).toBeTruthy();
    // まだ履歴には遷移していない（ダイアログ待ち）。
    expect(
      screen.queryByText(
        '準備中です。プレイを続けると、ここに到達レベルの記録が表示されます。',
      ),
    ).toBeNull();
  });

  it('プレイ中に × → 同一ダイアログ', () => {
    renderApp();
    fireEvent.press(screen.getByLabelText('ゲームを中断'));
    expect(screen.getByText('プレイを中断しますか？')).toBeTruthy();
  });

  it('キャンセル（続ける）でダイアログが閉じ、ホームに留まる', () => {
    renderApp();
    fireEvent.press(screen.getByLabelText('履歴タブ'));
    fireEvent.press(screen.getByLabelText('続ける'));
    expect(screen.queryByText('プレイを中断しますか？')).toBeNull();
    expect(screen.getByLabelText('ホームタブ').props.accessibilityState).toEqual({
      selected: true,
    });
  });

  it('OK（中断する・タブ起点）で当該タブへ遷移する（未完ラウンド破棄、§4.4）', () => {
    renderApp({
      initialLevel: { currentLevel: 7, consecutiveFailures: 1, highestLevel: 6 },
    });
    fireEvent.press(screen.getByLabelText('履歴タブ'));
    fireEvent.press(screen.getByLabelText('中断する'));
    expect(screen.getByTestId('app-history-title')).toBeTruthy();
    // ホームに戻ると距離リマインドから再開（中断は記録/増減なし、§4.4）。
    fireEvent.press(screen.getByLabelText('ホームタブ'));
    expect(screen.getByText('画面から 40cm')).toBeTruthy();
  });
});

describe('AppRoot v3.1 起動フロー（F-06）', () => {
  it('距離リマインドを表示し、カウントダウン後にセッションが自動開始する', () => {
    jest.useFakeTimers();
    renderApp({
      initialHomePhase: 'distance',
      distanceCountdownSec: 3,
      initialLevel: { currentLevel: 7, consecutiveFailures: 0, highestLevel: 6 },
    });
    expect(screen.getByText('画面から 40cm')).toBeTruthy();
    for (let i = 0; i < 4; i++) {
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    }
    expect(screen.getByLabelText('レベル 7')).toBeTruthy();
    jest.useRealTimers();
  });
});

describe('AppRoot v3.1 セッションループ・要約（F-01/F-03/F-04/F-08/§4.6）', () => {
  it('1 分セッション：2 ラウンド（クリア→レベル変化→次ラウンド）後に要約カード', async () => {
    jest.useFakeTimers();
    const level = 7; // seconds=30, 3x3
    const seed = 5;
    const n = levelToParams(level).gridSize;
    renderApp({
      rng: mulberry32(seed),
      initialHomePhase: 'playing',
      sessionMinutes: 1, // 60 秒。30+30 でちょうど 2 ラウンドで終了。
      initialLevel: { currentLevel: level, consecutiveFailures: 0, highestLevel: level - 1 },
    });

    // 制限時間カウントダウンはメイン画面上部に表示（v3.1）。
    expect(screen.getByTestId('app-game-countdown')).toBeTruthy();
    // セッション残り時間は上部バーに mm:ss 表示（「あと」表記なし）。
    expect(screen.getByLabelText(/セッション残り時間/)).toBeTruthy();
    expect(screen.getByLabelText('レベル 7')).toBeTruthy();

    // ── ラウンド 1：全問正解 → 時間切れ締切 → clear。
    act(() => {
      for (const idx of changingIndicesForSeed(level, seed)) {
        fireEvent.press(screen.getByLabelText(rowCol(idx, n)));
      }
    });
    act(() => {
      jest.advanceTimersByTime(levelToParams(level).seconds * 1000 + 100);
    });
    // 開示カウントダウンが出る（3 秒）。
    expect(screen.getByTestId('app-game-disclosure')).toBeTruthy();
    await advanceDisclosure();

    // ラウンド 2 へ：クリアで +1 → 次ラウンドのレベルピルが 8 に変化（F-04 観察可能）。
    expect(screen.getByLabelText('レベル 8')).toBeTruthy();

    // ── ラウンド 2（L8, seconds=30）：何も選ばず時間切れ → fail → 累積 60 ≥ 60 で終了。
    act(() => {
      jest.advanceTimersByTime(levelToParams(8).seconds * 1000 + 100);
    });
    await advanceDisclosure();

    // セッション要約カードが表示される（F-08）。
    expect(screen.getByTestId('app-summary')).toBeTruthy();
    // 現在レベル（= 次セッション開始レベル）= 8（クリアで +1、失敗 1 回目は据え置き）。
    expect(screen.getByLabelText('現在のレベル 8')).toBeTruthy();
    // 集計：✅ クリア 1 / ❌ 失敗 1（ラウンド数は表示しない）。
    expect(screen.getByTestId('app-summary-clears-value').props.children).toBe('1');
    expect(screen.getByTestId('app-summary-fails-value').props.children).toBe('1');
    jest.useRealTimers();
  });

  it('セッション要約表示中はタブ移動でダイアログを出さない（F-05/F-07）', async () => {
    jest.useFakeTimers();
    const level = 7;
    renderApp({
      rng: mulberry32(5),
      initialHomePhase: 'playing',
      sessionMinutes: 1,
      initialLevel: { currentLevel: level, consecutiveFailures: 0, highestLevel: 6 },
    });
    // 2 ラウンド（どちらも未選択 fail）で 60 秒に到達 → 要約。
    for (let r = 0; r < 2; r++) {
      act(() => {
        jest.advanceTimersByTime(levelToParams(level).seconds * 1000 + 100);
      });
      await advanceDisclosure();
    }
    expect(screen.getByTestId('app-summary')).toBeTruthy();
    // 非進行中 → タブ移動自由（ダイアログなし）。
    act(() => {
      fireEvent.press(screen.getByLabelText('設定タブ'));
    });
    expect(screen.queryByText('プレイを中断しますか？')).toBeNull();
    expect(screen.getByTestId('app-settings')).toBeTruthy();
    jest.useRealTimers();
  });

  it('「もう一度」で距離リマインドへ戻り、新セッションが始められる（F-08）', async () => {
    jest.useFakeTimers();
    const level = 7;
    renderApp({
      rng: mulberry32(5),
      initialHomePhase: 'playing',
      sessionMinutes: 1,
      initialLevel: { currentLevel: level, consecutiveFailures: 0, highestLevel: 6 },
    });
    for (let r = 0; r < 2; r++) {
      act(() => {
        jest.advanceTimersByTime(levelToParams(level).seconds * 1000 + 100);
      });
      await advanceDisclosure();
    }
    expect(screen.getByTestId('app-summary')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('もう一度'));
    expect(screen.getByText('画面から 40cm')).toBeTruthy();
    jest.useRealTimers();
  });
});

describe('AppRoot v3.1 音・ハプティクス結線（F-14）', () => {
  function finalizeNoop(): FinalizeSession {
    return async () => ({ streak: 1, newlyEarnedBadges: [] as BadgeId[] });
  }

  it('クリアラウンドで clear 音 + light、レベルアップで levelup 音 + medium が発火する', async () => {
    jest.useFakeTimers();
    const audio = new FakeAudio();
    const haptics = new FakeHaptics();
    const level = 7;
    const seed = 5;
    const n = levelToParams(level).gridSize;
    render(
      <ThemeProvider preference="dark" systemScheme="dark">
        <AppRoot
          viewingDistanceCm={40}
          testId="app"
          rng={mulberry32(seed)}
          initialHomePhase="playing"
          sessionMinutes={1}
          initialLevel={{ currentLevel: level, consecutiveFailures: 0, highestLevel: 6 }}
          audioBackend={audio}
          hapticsBackend={haptics}
          onResolveRound={memoryResolveRound()}
          onFinalizeSession={finalizeNoop()}
        />
      </ThemeProvider>,
    );
    // ラウンド 1：全問正解 → 締切 clear。
    act(() => {
      for (const idx of changingIndicesForSeed(level, seed)) {
        fireEvent.press(screen.getByLabelText(rowCol(idx, n)));
      }
    });
    act(() => {
      jest.advanceTimersByTime(levelToParams(level).seconds * 1000 + 100);
    });
    await advanceDisclosure();
    expect(audio.plays).toEqual(expect.arrayContaining(['clear', 'levelup']));
    expect(haptics.triggers).toEqual(expect.arrayContaining(['light', 'medium']));
    jest.useRealTimers();
  });
});
