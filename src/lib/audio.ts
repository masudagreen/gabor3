/**
 * 音声レイヤー（Sprint 7-B / spec.md F-15、§10、§11.5 Web）。
 *
 * - 正解時の短い効果音（playCorrect）と不正解時の控えめな音（playIncorrect）
 * - Web：Web Audio API（外部音源不要、シンセサイズ）。AudioContext は遅延作成して
 *   ユーザー操作時に resume する（autoplay 制限への配慮）。
 * - ネイティブ：本タスクでは expo-av 等を導入せず no-op（Web 専用、ネイティブは v1.1）
 * - Settings.soundEnabled で完全 mute（呼ぶたびにチェックする運用：呼び出し側で
 *   `if (settings.soundEnabled) playCorrect()` ではなく、本モジュール内 isAudioEnabled()
 *   をモジュール変数で保持して、呼び出し側はパフォーマンス気にせず呼べる）
 *
 * テストではモジュール変数 isAudioEnabled() をリセットできるよう setSoundEnabled() を export。
 */
import { Platform } from 'react-native';

let _soundEnabled = true;

/** Settings 変更時に呼ぶ（AppRouter / SettingsScreen から）。デフォルト ON */
export function setSoundEnabled(enabled: boolean): void {
  _soundEnabled = enabled;
}

/** 現在の有効状態（テスト用） */
export function isSoundEnabled(): boolean {
  return _soundEnabled;
}

/** Web Audio API を保持するシングルトン。lazy init して autoplay 制限を回避 */
let _ctx: AudioContext | null = null;
let _ctxFailed = false;

function getAudioContext(): AudioContext | null {
  if (_ctxFailed) return null;
  if (_ctx) return _ctx;
  if (Platform.OS !== 'web') return null;
  if (typeof globalThis === 'undefined') return null;
  const w: { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext } = globalThis as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) {
    _ctxFailed = true;
    return null;
  }
  try {
    _ctx = new Ctor();
    return _ctx;
  } catch {
    _ctxFailed = true;
    return null;
  }
}

/**
 * 短い tone をシンセサイズして再生する。
 *
 * @param freq Hz
 * @param durationMs 再生長
 * @param volume 0-1
 */
function playTone(freq: number, durationMs: number, volume: number): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    // 短い ADSR 風エンベロープ（ぷつ音回避）
    const now = ctx.currentTime;
    const dur = durationMs / 1000;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.linearRampToValueAtTime(volume * 0.6, now + dur * 0.6);
    gain.gain.linearRampToValueAtTime(0, now + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur);
  } catch {
    // 失敗時は黙って no-op（テスト環境など）
  }
}

/**
 * 正解時の効果音（screens.md S2-04 等）。
 * 2 つの音（C5 → E5、各 ~120ms）でポジティブな印象。合計 240ms。
 */
export function playCorrect(): void {
  if (!_soundEnabled) return;
  if (Platform.OS !== 'web') return; // ネイティブは v1.1
  playTone(523.25, 120, 0.18); // C5
  setTimeout(() => playTone(659.25, 140, 0.18), 110); // E5
}

/**
 * 不正解時の控えめな音（短い 1 音、低めの周波数）。Sprint 7-B では正解側のみ
 * 各ゲームから呼ぶ運用だが、API としては提供する。
 */
export function playIncorrect(): void {
  if (!_soundEnabled) return;
  if (Platform.OS !== 'web') return;
  playTone(220, 200, 0.12); // A3
}

/**
 * テスト用：内部状態をリセット（AudioContext を捨てる）。
 */
export function _resetAudioForTest(): void {
  _ctx = null;
  _ctxFailed = false;
  _soundEnabled = true;
}
