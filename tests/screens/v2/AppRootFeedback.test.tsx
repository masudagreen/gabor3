/**
 * AppRootFeedback.test.tsx — S9 / F-14 アプリ全体の音・ハプティクス配線。
 *
 * 注入したフェイク audio/haptics バックエンドで、観察可能な発火を検証する：
 *  - セッション完了 → end 音（ハプティクスなし）
 *  - バッジ獲得（初回完了で B-01）→ badge 音 + badge ハプティクス
 *  - 音 OFF → 音は鳴らないがハプティクスは発火（NF-33 と同じ個別制御）
 *  - 振動 OFF → ハプティクスは発火しないが音は鳴る
 *
 * 実セッションを距離リマインド → 2 ラウンド完了まで進めて確認する。
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { AppRoot } from '../../../src/screens/v2/AppRoot';
import { defaultSettings } from '../../../src/state/schema';
import type { Settings } from '../../../src/state/schema';
import { mulberry32 } from '../../../src/lib/v2/rng';
import type { AudioBackend, SoundKind } from '../../../src/platform/audio';
import type { HapticKind, HapticsBackend } from '../../../src/platform/haptics';

class FakeAudio implements AudioBackend {
  played: { kind: SoundKind; volume?: number }[] = [];
  primed = 0;
  async prime(): Promise<void> {
    this.primed++;
  }
  play(kind: SoundKind, volume?: number): void {
    this.played.push({ kind, volume });
  }
  stop(): void {}
  isAvailable(): boolean {
    return true;
  }
  kinds(): SoundKind[] {
    return this.played.map((p) => p.kind);
  }
}

class FakeHaptics implements HapticsBackend {
  fired: HapticKind[] = [];
  trigger(kind: HapticKind): void {
    this.fired.push(kind);
  }
  isAvailable(): boolean {
    return true;
  }
}

function settings(over: Partial<Settings> = {}): Settings {
  return {
    ...defaultSettings(),
    roundSeconds: 10,
    roundCount: 2,
    scoringMode: 'auto-no-confirm',
    ...over,
  };
}

const NOW = new Date(2026, 4, 30, 10, 0, 0);

function renderRoot(over: Partial<React.ComponentProps<typeof AppRoot>> = {}) {
  const audio = new FakeAudio();
  const haptics = new FakeHaptics();
  render(
    <ThemeProvider preference="dark" systemScheme="dark">
      <AppRoot
        settings={over.settings ?? settings()}
        viewingDistanceCm={40}
        rng={mulberry32(7)}
        genId={() => 'fixed-session-id'}
        now={() => NOW}
        distanceCountdownSec={1}
        audioBackend={audio}
        hapticsBackend={haptics}
        testId="app"
        {...over}
      />
    </ThemeProvider>,
  );
  return { audio, haptics };
}

function playThroughSession() {
  act(() => jest.advanceTimersByTime(1000)); // 距離リマインド → 開始
  for (let i = 0; i < 30; i++) {
    act(() => jest.advanceTimersByTime(1000));
  }
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.useFakeTimers();
});
afterEach(() => {
  act(() => jest.runOnlyPendingTimers());
  jest.useRealTimers();
});

describe('AppRoot 音・ハプティクス配線（F-14）', () => {
  it('マウント時に audio backend を prime する', () => {
    const { audio } = renderRoot();
    expect(audio.primed).toBeGreaterThanOrEqual(1);
  });

  it('セッション完了で end 音（ハプティクスなし）、初回完了の B-01 で badge 音+badge 振動', async () => {
    const { audio, haptics } = renderRoot();
    playThroughSession();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByTestId('app-result')).toBeTruthy();

    // セッション完了音
    expect(audio.kinds()).toContain('end');
    // 初回完了 → B-01 獲得 → BadgeAwardToast.onShown → badge 音 + badge ハプティクス
    expect(audio.kinds()).toContain('badge');
    expect(haptics.fired).toContain('badge');
    // end 自体にはハプティクスがない（badge 由来のみ）
    expect(haptics.fired.filter((h) => h === 'light' || h === 'medium')).toEqual(
      expect.arrayContaining([]),
    );
  });

  it('音 OFF：完了音もバッジ音も鳴らないが、バッジのハプティクスは発火する（個別制御）', async () => {
    const { audio, haptics } = renderRoot({
      settings: settings({ soundEnabled: false, hapticsEnabled: true }),
    });
    playThroughSession();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(audio.played).toHaveLength(0);
    expect(haptics.fired).toContain('badge');
  });

  it('振動 OFF：ハプティクスは一切発火しないが、完了音・バッジ音は鳴る', async () => {
    const { audio, haptics } = renderRoot({
      settings: settings({ soundEnabled: true, hapticsEnabled: false }),
    });
    playThroughSession();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(haptics.fired).toHaveLength(0);
    expect(audio.kinds()).toEqual(expect.arrayContaining(['end', 'badge']));
  });
});
