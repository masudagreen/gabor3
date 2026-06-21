/**
 * integration.test.tsx — v3.1 全体結合（通し動線）。
 *
 * 起動後（オンボ済み）の現実的な 1 セッションを、**AppRoot + 実永続化（sessionFlow）+
 * 実 SettingsScreen** を結線して通す：
 *
 *   距離リマインド → セッション開始（ラウンド反復）→ 締切 → 3 秒開示 → 次ラウンド … →
 *   指定時間でセッション終了 → セッション要約 → 履歴タブ → 設定タブ →
 *   範囲変更（クランプ）→ ホームへ戻り「もう一度」→ 新セッション
 *
 * 永続化は AsyncStorage インメモリモック。ラウンドごとのレベル増減・LevelState 永続・
 * SessionRecord 記録・クランプ・タブ遷移が 1 つの動線で破綻しないことを検証する
 *（F-01/F-03/F-04/F-05/F-06/F-08/F-13、§4.4/§4.5/§4.6）。
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import {
  AppRoot,
  type ResolveRound,
  type FinalizeSession,
} from '../../../src/screens/v3/AppRoot';
import {
  resolveCompletedRound,
  finalizeSession,
  abortSession,
} from '../../../src/state/v3/sessionFlow';
import { saveLevelState, loadLevelState } from '../../../src/state/v3/repository';
import { generateRoundFromLevel } from '../../../src/lib/v3/roundGen';
import { isChanging } from '../../../src/lib/v3/patch';
import { levelToParams } from '../../../src/lib/v3/level';
import { mulberry32 } from '../../../src/lib/v2/rng';
import type { LevelState } from '../../../src/lib/v3/level';

beforeEach(async () => {
  await AsyncStorage.clear();
});

function changingIndices(level: number, seed: number): number[] {
  const rng = mulberry32(seed);
  const patches = generateRoundFromLevel(rng, levelToParams(level));
  return patches.filter(isChanging).map((p) => p.index);
}

function rowCol(index: number, n: number): string {
  return `パッチ ${Math.floor(index / n) + 1}-${(index % n) + 1}`;
}

/** 実永続化を介したラウンド解決（App.tsx と同じ配線）。 */
function makeResolveRound(): ResolveRound {
  return async ({ session, result, roundPlaySec }) => {
    const out = await resolveCompletedRound({ session, result, roundPlaySec });
    return { session: out.session, shouldContinue: out.shouldContinue };
  };
}

/** 実永続化を介したセッション確定（SessionRecord・日次・累計・バッジ）。 */
function makeFinalize(): FinalizeSession {
  let n = 0;
  return async ({ session, abort }) => {
    const input = {
      session,
      sessionId: `itest-${n++}`,
      startedAt: new Date('2026-06-10T09:00:00.000Z').toISOString(),
      now: new Date('2026-06-10T09:05:00.000Z'),
    };
    const record = abort ? await abortSession(input) : await finalizeSession(input);
    return {
      streak: record?.streak.currentStreak ?? 0,
      newlyEarnedBadges: record?.newlyEarnedBadges ?? [],
    };
  };
}

function renderApp(initialLevel: LevelState) {
  return render(
    <ThemeProvider preference="light" systemScheme="light">
      <AppRoot
        viewingDistanceCm={40}
        testId="app"
        rng={mulberry32(5)}
        initialHomePhase="distance"
        distanceCountdownSec={3}
        sessionMinutes={1}
        initialLevel={initialLevel}
        onResolveRound={makeResolveRound()}
        onFinalizeSession={makeFinalize()}
      />
    </ThemeProvider>,
  );
}

function advanceDistance() {
  for (let i = 0; i < 4; i++) {
    act(() => {
      jest.advanceTimersByTime(1000);
    });
  }
}

async function advanceDisclosure() {
  for (let i = 0; i < 4; i++) {
    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();
    });
  }
}

describe('v3.1 全体結合：起動→距離→セッション（ラウンド反復）→要約→履歴→設定→範囲変更', () => {
  it('クリア→+1・LevelState 永続、2 ラウンドで終了→要約、範囲変更クランプが一連で破綻しない', async () => {
    jest.useFakeTimers();
    const startLevel = 7; // seconds=30。sessionMinutes=1（60秒）で 2 ラウンド。
    await act(async () => {
      await saveLevelState({ currentLevel: startLevel, consecutiveFailures: 0, highestLevel: 6 });
    });

    renderApp({ currentLevel: startLevel, consecutiveFailures: 0, highestLevel: 6 });

    // 1) 距離リマインド → セッション自動開始。
    expect(screen.getByText('画面から 40cm')).toBeTruthy();
    advanceDistance();

    // 2) ラウンド 1（L7）：全問正解 → 時間切れ締切 → clear。
    expect(screen.getByLabelText('レベル 7')).toBeTruthy();
    const n7 = levelToParams(7).gridSize;
    act(() => {
      for (const idx of changingIndices(7, 5)) {
        fireEvent.press(screen.getByLabelText(rowCol(idx, n7)));
      }
    });
    act(() => {
      jest.advanceTimersByTime(levelToParams(7).seconds * 1000 + 100);
    });
    await advanceDisclosure();

    // 3) クリアで +1 → ラウンド 2 のレベルピルが 8（F-04 観察可能）。
    await waitFor(() => expect(screen.getByLabelText('レベル 8')).toBeTruthy());
    // LevelState がラウンドごとに永続化されている（再起動跨ぎ保持、F-04）。
    const afterRound1 = await loadLevelState();
    expect(afterRound1.currentLevel).toBe(8);

    // 4) ラウンド 2（L8）：未選択で時間切れ → fail → 累積 60 ≥ 60 でセッション終了。
    act(() => {
      jest.advanceTimersByTime(levelToParams(8).seconds * 1000 + 100);
    });
    await advanceDisclosure();

    // 5) セッション要約：現在レベル 8・✅ クリア 1・❌ 失敗 1（ラウンド数は非表示）。
    await waitFor(() => expect(screen.getByTestId('app-summary')).toBeTruthy());
    expect(screen.getByLabelText('現在のレベル 8')).toBeTruthy();
    expect(screen.getByTestId('app-summary-clears-value').props.children).toBe('1');
    expect(screen.getByTestId('app-summary-fails-value').props.children).toBe('1');

    // 6) 履歴タブ（非進行中＝要約表示中なので自由遷移）。
    fireEvent.press(screen.getByLabelText('履歴タブ'));
    await waitFor(() => expect(screen.getByTestId('app-history-title')).toBeTruthy());

    // 7) 設定タブ → sessionMinutes ステッパーが見える（v3.1）。
    //    梯子変更：繰り返し回数 n を 4→3 に減らす（総レベル数 720→540・v3.2）。
    fireEvent.press(screen.getByLabelText('設定タブ'));
    await waitFor(() => expect(screen.getByTestId('app-settings-total')).toBeTruthy());
    expect(screen.getByTestId('app-settings-session-minutes')).toBeTruthy();
    expect(screen.getByTestId('app-settings-total').props.children).toContain('720');
    fireEvent.press(screen.getByTestId('app-settings-repeat-count-dec'));
    await waitFor(() =>
      expect(screen.getByTestId('app-settings-total').props.children).toContain('540'),
    );

    // 8) ホームへ戻る → 要約が残る（非進行・自由遷移）。範囲変更後の現在レベル再読込。
    fireEvent.press(screen.getByLabelText('ホームタブ'));
    await waitFor(() => expect(screen.getByLabelText('もう一度')).toBeTruthy());
    expect(screen.getByLabelText('現在のレベル 8')).toBeTruthy();

    // 9) もう一度 → 距離 → 新セッション。範囲変更後も動線が継続する。
    fireEvent.press(screen.getByLabelText('もう一度'));
    await waitFor(() => expect(screen.getByText('画面から 40cm')).toBeTruthy());
    advanceDistance();
    expect(screen.getByLabelText('レベル 8')).toBeTruthy();

    jest.useRealTimers();
  });

  it('中断（タブ起点）：完了済みラウンドのレベル変化は保持、未完ラウンドは破棄（AS-30）', async () => {
    jest.useFakeTimers();
    const startLevel = 7;
    await act(async () => {
      await saveLevelState({ currentLevel: startLevel, consecutiveFailures: 0, highestLevel: 6 });
    });
    renderApp({ currentLevel: startLevel, consecutiveFailures: 0, highestLevel: 6 });

    expect(screen.getByText('画面から 40cm')).toBeTruthy();
    advanceDistance();

    // ラウンド 1（L7）クリア → L8 永続。
    const n7 = levelToParams(7).gridSize;
    act(() => {
      for (const idx of changingIndices(7, 5)) {
        fireEvent.press(screen.getByLabelText(rowCol(idx, n7)));
      }
    });
    act(() => {
      jest.advanceTimersByTime(levelToParams(7).seconds * 1000 + 100);
    });
    await advanceDisclosure();
    await waitFor(() => expect(screen.getByLabelText('レベル 8')).toBeTruthy());

    // ラウンド 2（L8）進行中（締切前）に履歴タブ → 中断ダイアログ → OK で中断。
    fireEvent.press(screen.getByLabelText('履歴タブ'));
    expect(screen.getByText('プレイを中断しますか？')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('中断する'));
      await Promise.resolve();
      await Promise.resolve();
    });

    // 完了済みラウンド 1 のレベル変化（L8）は永続保持（巻き戻さない、AS-30）。
    const persisted = await loadLevelState();
    expect(persisted.currentLevel).toBe(8);

    jest.useRealTimers();
  });
});
