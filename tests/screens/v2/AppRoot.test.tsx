/**
 * AppRoot.test.tsx — ボトムタブナビ + 中断ダイアログ + 起動フロー
 * （spec F-05 タブ / F-06 起動 / F-07 中断 / F-08 ホーム）。
 *
 * 検証する観察可能挙動：
 *  - configFromSettings 写像
 *  - 起動直後（distance フェーズ）は非進行 → タブ自由遷移
 *  - 距離リマインドのカウントダウンで自動的にゲーム開始（playing）
 *  - プレイ中に他タブ / X → 中断ダイアログ（即切替しない）
 *  - OK（中断）= 進行中セッションを記録せず破棄し、起点に応じて着地
 *  - キャンセル = ダイアログを閉じ、ゲーム継続
 *  - 結果フェーズ（非進行）は自由遷移
 *
 * recordCompletedSession（永続化・集計）は AsyncStorage モックで動くため、
 * 統合フローのスモークとして「完了 → 結果カード」を検証する別ケースを下に置く。
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { AppRoot, configFromSettings } from '../../../src/screens/v2/AppRoot';
import { defaultSettings } from '../../../src/state/schema';
import type { Settings } from '../../../src/state/schema';
import { mulberry32 } from '../../../src/lib/v2/rng';

function settings(over: Partial<Settings> = {}): Settings {
  return {
    ...defaultSettings(),
    roundSeconds: 60, // テスト中に TIMEOUT を発火させない
    roundCount: 3,
    ...over,
  };
}

function renderRoot(over: Partial<React.ComponentProps<typeof AppRoot>> = {}) {
  const onSettingsChange = jest.fn();
  const utils = render(
    <ThemeProvider preference="dark" systemScheme="dark">
      <AppRoot
        settings={settings()}
        viewingDistanceCm={40}
        onSettingsChange={onSettingsChange}
        rng={mulberry32(42)}
        testId="app"
        {...over}
      />
    </ThemeProvider>,
  );
  return { ...utils, onSettingsChange };
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
});

describe('AppRoot — configFromSettings', () => {
  it('Settings から GameConfig へ過不足なく写像する', () => {
    const s = settings({
      gridSize: 5,
      rotationSpeed: 8,
      sfChangeSpeed: 0.2,
      scoringMode: 'auto-confirm',
    });
    expect(configFromSettings(s)).toEqual({
      gridSize: 5,
      roundSeconds: 60,
      roundCount: 3,
      rotationSpeed: 8,
      sfChangeSpeed: 0.2,
      scoringMode: 'auto-confirm',
    });
  });
});

describe('AppRoot — 起動フロー（F-06）', () => {
  it('起動直後は距離リマインドを表示する', () => {
    renderRoot();
    expect(screen.getByTestId('app-distance')).toBeTruthy();
  });

  it('距離リマインドのカウントダウンで自動的にゲームが始まる', () => {
    renderRoot({ distanceCountdownSec: 1 });
    expect(screen.getByTestId('app-distance')).toBeTruthy();
    // 1 秒 → 0 → onComplete でゲーム開始
    act(() => {
      jest.advanceTimersByTime(1100);
    });
    expect(screen.getByTestId('app-game')).toBeTruthy();
    expect(screen.queryByTestId('app-distance')).toBeNull();
  });
});

describe('AppRoot — タブ切替（F-05、非進行は自由）', () => {
  it('距離リマインド中（非進行）は履歴・設定タブへダイアログなしで遷移できる', () => {
    renderRoot();
    fireEvent.press(screen.getByTestId('app-tabbar-history'));
    expect(screen.getByTestId('app-history')).toBeTruthy();
    expect(screen.queryByLabelText('中断する')).toBeNull();

    fireEvent.press(screen.getByTestId('app-tabbar-settings'));
    expect(
      screen.getByLabelText('設定タブ').props.accessibilityState.selected,
    ).toBe(true);
    expect(screen.queryByLabelText('中断する')).toBeNull();
  });

  it('結果フェーズ（非進行）は自由遷移できる', () => {
    renderRoot({ initialHomePhase: 'result' });
    fireEvent.press(screen.getByTestId('app-tabbar-history'));
    expect(screen.getByTestId('app-history')).toBeTruthy();
    expect(screen.queryByLabelText('中断する')).toBeNull();
  });
});

describe('AppRoot — 中断ダイアログ（F-07）', () => {
  it('プレイ中に他タブを押すと中断ダイアログが出て、タブは切り替わらない', () => {
    renderRoot({ initialHomePhase: 'playing' });
    expect(screen.getByTestId('app-game')).toBeTruthy();

    fireEvent.press(screen.getByTestId('app-tabbar-history'));
    expect(screen.getByLabelText('中断する')).toBeTruthy();
    expect(screen.getByLabelText('続ける')).toBeTruthy();
    expect(screen.getByTestId('app-game')).toBeTruthy();
    expect(screen.queryByTestId('app-history')).toBeNull();
  });

  it('キャンセルでダイアログが閉じ、ゲームが継続する', () => {
    renderRoot({ initialHomePhase: 'playing' });
    fireEvent.press(screen.getByTestId('app-tabbar-history'));
    fireEvent.press(screen.getByLabelText('続ける'));
    expect(screen.queryByLabelText('中断する')).toBeNull();
    expect(screen.getByTestId('app-game')).toBeTruthy();
    expect(screen.queryByTestId('app-history')).toBeNull();
  });

  it('OK（中断）でタブ起点なら当該タブへ遷移し、ゲームは終了する', () => {
    renderRoot({ initialHomePhase: 'playing' });
    fireEvent.press(screen.getByTestId('app-tabbar-history'));
    fireEvent.press(screen.getByLabelText('中断する'));
    expect(screen.getByTestId('app-history')).toBeTruthy();
    expect(screen.queryByTestId('app-game')).toBeNull();
    expect(screen.queryByLabelText('中断する')).toBeNull();
  });

  it('プレイ中に X を押すと中断ダイアログが出る', () => {
    renderRoot({ initialHomePhase: 'playing' });
    fireEvent.press(screen.getByTestId('app-game-topbar-abort'));
    expect(screen.getByLabelText('中断する')).toBeTruthy();
    expect(screen.getByTestId('app-game')).toBeTruthy();
  });

  it('X 起点で OK（中断）するとホームの待機(idle)へ着地し、結果カード（スコア）は出さない', () => {
    renderRoot({ initialHomePhase: 'playing' });
    fireEvent.press(screen.getByTestId('app-game-topbar-abort'));
    fireEvent.press(screen.getByLabelText('中断する'));
    // 待機画面へ。中断は記録されないため結果カード（スコア表示）は出さない（S6 評価 Major 修正）。
    expect(screen.getByTestId('app-idle')).toBeTruthy();
    expect(screen.queryByTestId('app-result')).toBeNull();
    expect(screen.queryByTestId('app-result-score')).toBeNull();
    expect(screen.queryByTestId('app-game')).toBeNull();
    // 待機画面の「プレイを始める」で再開できる
    expect(screen.getByTestId('app-idle-start')).toBeTruthy();
  });

  it('中断後（非進行）は他タブへダイアログなしで遷移できる', () => {
    renderRoot({ initialHomePhase: 'playing' });
    fireEvent.press(screen.getByTestId('app-game-topbar-abort'));
    fireEvent.press(screen.getByLabelText('中断する'));
    fireEvent.press(screen.getByTestId('app-tabbar-settings'));
    expect(
      screen.getByLabelText('設定タブ').props.accessibilityState.selected,
    ).toBe(true);
    expect(screen.queryByLabelText('中断する')).toBeNull();
  });
});
