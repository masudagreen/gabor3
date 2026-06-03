/**
 * s10FullFlow.test.tsx — S10 全体結合（spec §7 / screens.md S10 §5）。
 *
 * 既存 startupFlow（方式①）の延長として、S10 で求められる横断動線を結合検証する：
 *  - 方式②（auto-confirm）：確定ボタン押下で採点 → 開示 → 完了 → 結果カード。
 *  - タブ切替：プレイ中に他タブ選択 → 中断ダイアログ。キャンセルで継続、確定で当該タブへ。
 *  - 非進行（idle / result）：タブ切替が自由（ダイアログなし）。
 *  - 設定変更がセッションに反映：roundCount を変えると完了までのラウンド数が変わる。
 *  - Skip link（NF-14）：Web では AppRoot 先頭に role=link を描画。
 */

import React from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../src/theme/ThemeProvider';
import { AppRoot } from '../../src/screens/v2/AppRoot';
import { defaultSettings } from '../../src/state/schema';
import type { Settings } from '../../src/state/schema';
import { mulberry32 } from '../../src/lib/v2/rng';
import { loadAllSessions } from '../../src/state/repository';

function asWeb<T>(fn: () => T): T {
  const original = Platform.OS;
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'web' });
  try {
    return fn();
  } finally {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => original,
    });
  }
}

function settings(over: Partial<Settings> = {}): Settings {
  return {
    ...defaultSettings(),
    roundSeconds: 10,
    roundCount: 1,
    scoringMode: 'auto-confirm',
    ...over,
  };
}

const NOW = new Date(2026, 4, 30, 10, 0, 0);

function renderRoot(over: Partial<React.ComponentProps<typeof AppRoot>> = {}) {
  return render(
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

describe('方式②（auto-confirm）結合（F-02/F-08）', () => {
  it('距離リマインド → 自動開始 → 確定ボタンで採点 → 完了で結果カード', async () => {
    renderRoot();
    expect(screen.getByTestId('app-distance')).toBeTruthy();
    // 距離リマインド完了 → ゲーム開始
    act(() => jest.advanceTimersByTime(1000));
    // 方式② は確定ボタンが出る
    const confirm = screen.getByLabelText('回答を確定する');
    expect(confirm).toBeTruthy();
    // 確定 → 採点・開示
    act(() => {
      fireEvent.press(confirm);
    });
    // 開示 1.5 秒で 1 ラウンド（roundCount=1）完了 → 結果カード
    act(() => jest.advanceTimersByTime(1600));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByTestId('app-result')).toBeTruthy();
    const sessions = await loadAllSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].completedAt).not.toBeNull();
  });
});

describe('タブ切替の中断制御（F-07）', () => {
  it('プレイ中に履歴タブ選択 → 中断ダイアログ、キャンセルでゲーム継続', () => {
    renderRoot({ initialHomePhase: 'playing' });
    fireEvent.press(screen.getByTestId('app-tabbar-history'));
    // 中断ダイアログ表示
    expect(screen.getByLabelText('中断する')).toBeTruthy();
    // キャンセル → ゲームに留まる
    fireEvent.press(screen.getByLabelText('続ける'));
    expect(screen.getByTestId('app-game')).toBeTruthy();
  });

  it('プレイ中に設定タブ選択 → 中断確定で設定タブへ着地し、セッションは記録されない', async () => {
    renderRoot({ initialHomePhase: 'playing', genId: () => 'aborted' });
    fireEvent.press(screen.getByTestId('app-tabbar-settings'));
    fireEvent.press(screen.getByLabelText('中断する'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByTestId('app-settings')).toBeTruthy();
    const sessions = await loadAllSessions();
    expect(sessions).toHaveLength(0);
  });

  it('非進行（idle）ではタブ切替が自由（ダイアログなし）', () => {
    renderRoot({ initialHomePhase: 'idle' });
    fireEvent.press(screen.getByTestId('app-tabbar-history'));
    // ダイアログは出ず、履歴タブへ直接遷移
    expect(screen.queryByLabelText('中断する')).toBeNull();
    expect(screen.getByTestId('app-history')).toBeTruthy();
  });
});

describe('設定がセッションに反映（F-13 → F-08）', () => {
  it('roundCount=2 では 1 ラウンドの確定では完了しない（2 ラウンド必要）', async () => {
    renderRoot({ settings: settings({ roundCount: 2 }) });
    act(() => jest.advanceTimersByTime(1000));
    // 1 ラウンド目を確定
    act(() => {
      fireEvent.press(screen.getByLabelText('回答を確定する'));
    });
    act(() => jest.advanceTimersByTime(1600));
    // まだ 1 ラウンド目開示後 → 2 ラウンド目（結果カードにはならない）
    expect(screen.queryByTestId('app-result')).toBeNull();
    expect(screen.getByTestId('app-game')).toBeTruthy();
  });
});

describe('Skip link（NF-14）結合', () => {
  it('Web では AppRoot 先頭にスキップリンク（role=button、Enter/Space 起動）を描画する', () => {
    asWeb(() => {
      renderRoot({ initialHomePhase: 'idle' });
      const link = screen.getByTestId('app-skip');
      // role=button 化で Enter/Space 起動を担保（S10 評価 Major 修正、NF-9）
      expect(link.props.role).toBe('button');
      expect(link.props.accessibilityLabel).toBe('メインコンテンツへスキップ');
    });
  });

  it('Native ではスキップリンクを描画しない', () => {
    renderRoot({ initialHomePhase: 'idle' });
    expect(screen.queryByTestId('app-skip')).toBeNull();
  });
});
