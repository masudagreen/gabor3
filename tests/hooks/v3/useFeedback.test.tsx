/**
 * useFeedback.test.tsx — v3.0 音・ハプティクス発火の配線（spec F-14、system §10）。
 *
 * 決定（lib/v3/feedback.ts）と再生（platform バックエンド）の橋渡しを、フェイク
 * バックエンドで検証する：
 *  - 設定 ON 時に emit で音・ハプティクスが正しい種別/音量で発火する
 *  - 音 OFF / 振動 OFF で当該チャネルのみ無発火
 *  - 設定変更が emit の安定参照を保ったまま反映される
 *  - 初回マウントで audio.prime が呼ばれる
 */

import { act, renderHook } from '@testing-library/react-native';
import { useFeedback } from '../../../src/hooks/v3/useFeedback';
import type { AudioBackend, SoundKind } from '../../../src/platform/audio';
import type { HapticKind, HapticsBackend } from '../../../src/platform/haptics';

class FakeAudio implements AudioBackend {
  primeCount = 0;
  plays: { kind: SoundKind; volume?: number }[] = [];
  async prime(): Promise<void> {
    this.primeCount++;
  }
  play(kind: SoundKind, volume?: number): void {
    this.plays.push({ kind, volume });
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

describe('useFeedback (v3)', () => {
  it('初回マウントで audio.prime を呼ぶ', async () => {
    const audio = new FakeAudio();
    const haptics = new FakeHaptics();
    renderHook(() =>
      useFeedback({
        settings: { soundEnabled: true, hapticsEnabled: true },
        audio,
        haptics,
      }),
    );
    // useEffect 内 prime を反映
    await act(async () => {});
    expect(audio.primeCount).toBe(1);
  });

  it('設定 ON：clear で clear 音 + light 振動が発火', () => {
    const audio = new FakeAudio();
    const haptics = new FakeHaptics();
    const { result } = renderHook(() =>
      useFeedback({
        settings: { soundEnabled: true, hapticsEnabled: true },
        audio,
        haptics,
      }),
    );
    act(() => result.current.emit({ type: 'clear' }));
    expect(audio.plays).toEqual([{ kind: 'clear', volume: 0.6 }]);
    expect(haptics.triggers).toEqual(['light']);
  });

  it('levelup / badge も種別どおり発火する', () => {
    const audio = new FakeAudio();
    const haptics = new FakeHaptics();
    const { result } = renderHook(() =>
      useFeedback({
        settings: { soundEnabled: true, hapticsEnabled: true },
        audio,
        haptics,
      }),
    );
    act(() => result.current.emit({ type: 'levelup' }));
    act(() => result.current.emit({ type: 'badge-earned' }));
    expect(audio.plays).toEqual([
      { kind: 'levelup', volume: 0.65 },
      { kind: 'badge', volume: 0.7 },
    ]);
    expect(haptics.triggers).toEqual(['medium', 'badge']);
  });

  it('音 OFF：音は鳴らさずハプティクスのみ発火', () => {
    const audio = new FakeAudio();
    const haptics = new FakeHaptics();
    const { result } = renderHook(() =>
      useFeedback({
        settings: { soundEnabled: false, hapticsEnabled: true },
        audio,
        haptics,
      }),
    );
    act(() => result.current.emit({ type: 'fail' }));
    expect(audio.plays).toEqual([]);
    expect(haptics.triggers).toEqual(['medium']);
  });

  it('振動 OFF：ハプティクスは発火せず音のみ', () => {
    const audio = new FakeAudio();
    const haptics = new FakeHaptics();
    const { result } = renderHook(() =>
      useFeedback({
        settings: { soundEnabled: true, hapticsEnabled: false },
        audio,
        haptics,
      }),
    );
    act(() => result.current.emit({ type: 'fail' }));
    expect(audio.plays).toEqual([{ kind: 'fail', volume: 0.5 }]);
    expect(haptics.triggers).toEqual([]);
  });

  it('ティックは音のみ・ハプティクスなし（残り秒で音量変化）', () => {
    const audio = new FakeAudio();
    const haptics = new FakeHaptics();
    const { result } = renderHook(() =>
      useFeedback({
        settings: { soundEnabled: true, hapticsEnabled: true },
        audio,
        haptics,
      }),
    );
    act(() => result.current.emit({ type: 'countdown-tick', remainingSec: 3 }));
    act(() => result.current.emit({ type: 'countdown-tick', remainingSec: 1 }));
    expect(audio.plays).toEqual([
      { kind: 'tick', volume: 0.4 },
      { kind: 'tick', volume: 0.6 },
    ]);
    expect(haptics.triggers).toEqual([]);
  });

  it('設定変更が反映される（OFF→ON で発火するようになる）', () => {
    const audio = new FakeAudio();
    const haptics = new FakeHaptics();
    const { result, rerender } = renderHook(
      ({ sound }: { sound: boolean }) =>
        useFeedback({
          settings: { soundEnabled: sound, hapticsEnabled: true },
          audio,
          haptics,
        }),
      { initialProps: { sound: false } },
    );
    act(() => result.current.emit({ type: 'clear' }));
    expect(audio.plays).toEqual([]);

    rerender({ sound: true });
    act(() => result.current.emit({ type: 'clear' }));
    expect(audio.plays).toEqual([{ kind: 'clear', volume: 0.6 }]);
  });
});
