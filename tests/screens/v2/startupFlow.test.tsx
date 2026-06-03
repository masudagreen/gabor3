/**
 * startupFlow.test.tsx — 起動フロー統合（spec F-06 / F-08 / F-04）。
 *
 * 距離リマインド → 自動開始 → r ラウンド完了 → セッション結果カード → 「もう一度」で
 * 距離リマインドへ戻る、という一連の動線を fake timers で通す。
 * 加えて：
 *  - 完了セッションが永続化され DailyStats/Streak/PlayStats が更新される（F-04）
 *  - 中断（X → 中断する）したセッションは永続化されない（F-07）
 */

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { AppRoot } from '../../../src/screens/v2/AppRoot';
import { defaultSettings } from '../../../src/state/schema';
import type { Settings } from '../../../src/state/schema';
import { mulberry32 } from '../../../src/lib/v2/rng';
import {
  loadAllSessions,
  loadStreak,
  loadPlayStats,
  loadDailyStats,
} from '../../../src/state/repository';
import { localDateString } from '../../../src/lib/v2/dateUtil';

function settings(over: Partial<Settings> = {}): Settings {
  return {
    ...defaultSettings(),
    roundSeconds: 10,
    roundCount: 2,
    scoringMode: 'auto-no-confirm', // TIMEOUT のみで採点（確定ボタン不要）
    ...over,
  };
}

const NOW = new Date(2026, 4, 30, 10, 0, 0);

function renderRoot(over: Partial<React.ComponentProps<typeof AppRoot>> = {}) {
  render(
    <ThemeProvider preference="dark" systemScheme="dark">
      <AppRoot
        settings={settings()}
        viewingDistanceCm={40}
        rng={mulberry32(7)}
        genId={() => 'fixed-session-id'}
        now={() => NOW}
        distanceCountdownSec={1}
        testId="app"
        {...over}
      />
    </ThemeProvider>,
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.useFakeTimers();
});
afterEach(() => {
  act(() => jest.runOnlyPendingTimers());
  jest.useRealTimers();
});

/** 距離リマインド → ゲーム開始 → r ラウンド完了まで時間を進める。 */
function playThroughSession() {
  // 距離リマインド 1 秒 → 自動開始（1 秒ティック）
  act(() => jest.advanceTimersByTime(1000));
  // 2 ラウンド：各ラウンド m=10 秒で TIMEOUT → 1.5 秒開示 → NEXT。
  // タイマーが段階的に再スケジュールされるため、小刻みに進める。
  for (let i = 0; i < 30; i++) {
    act(() => jest.advanceTimersByTime(1000));
  }
}

describe('起動フロー統合（F-06/F-08）', () => {
  it('距離リマインド → 自動開始 → 完了で結果カードが表示される', async () => {
    renderRoot();
    expect(screen.getByTestId('app-distance')).toBeTruthy();
    playThroughSession();
    // 完了 effect 内の永続化 Promise を flush（setStreak の act 警告回避）
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByTestId('app-result')).toBeTruthy();
    expect(screen.getByTestId('app-result-score')).toBeTruthy();
  });

  it('「もう一度」で距離リマインドへ戻り再プレイできる（回数制限なし）', async () => {
    renderRoot();
    playThroughSession();
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByTestId('app-result')).toBeTruthy();
    fireEvent.press(screen.getByTestId('app-result-replay'));
    expect(screen.getByTestId('app-distance')).toBeTruthy();
  });
});

describe('セッション記録の永続化（F-04/§6）', () => {
  it('完了セッションが保存され DailyStats/Streak/PlayStats が更新される', async () => {
    renderRoot();
    playThroughSession();
    // recordCompletedSession は完了 effect 内の Promise。flush する。
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const sessions = await loadAllSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].completedAt).not.toBeNull();

    const play = await loadPlayStats();
    expect(play.totalSessions).toBe(1);

    const streak = await loadStreak();
    expect(streak.currentStreak).toBe(1);

    const daily = await loadDailyStats(localDateString(NOW));
    expect(daily).not.toBeNull();
    expect(daily!.sessionCount).toBe(1);
  });

  it('中断（X → 中断する）したセッションは記録されない', async () => {
    renderRoot({ initialHomePhase: 'playing', genId: () => 'aborted-id' });
    // ゲーム表示中に X → 中断する
    fireEvent.press(screen.getByTestId('app-game-topbar-abort'));
    fireEvent.press(screen.getByLabelText('中断する'));
    await act(async () => {
      await Promise.resolve();
    });
    const sessions = await loadAllSessions();
    expect(sessions).toHaveLength(0);
    const play = await loadPlayStats();
    expect(play.totalSessions).toBe(0);
  });
});
