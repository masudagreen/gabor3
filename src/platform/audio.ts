/**
 * audio.ts — 効果音再生バックエンド（spec F-14 / NF-31/33、system §10）。
 *
 * `../rapidreading2/src/platform/audio.ts` の AudioBackend 抽象を流用し、本アプリの
 * 5 音種（correct / wrong / tick / end / badge）に適合させた。
 *
 * - Web：Web Audio API（OscillatorNode）で音種ごとの短い合成音を生成。音源ファイル
 *   不要でバンドルへの影響なし。`document`/`window` を直接叩かず `globalThis` 経由で
 *   AudioContext を取得するため native ビルドに Web 専用 API が混入しない（Platform ガード）。
 * - Native (iOS / Android)：expo-audio で `assets/audio/<kind>.mp3` を再生。
 *   prime() で 5 プレイヤーを 1 度だけ生成。iOS は `playsInSilentMode: false` を渡すため
 *   サイレントスイッチ時は OS が自動で無音化する（NF-33：音は鳴らさずハプティクスのみ）。
 *
 * いずれのバックエンドもアセット欠落・API 不在でクラッシュせず silent fail する。
 */

import { Platform } from 'react-native';

/** 再生可能な効果音の種別（system §10.1）。 */
export type SoundKind = 'correct' | 'wrong' | 'tick' | 'end' | 'badge';

export const SOUND_KINDS: readonly SoundKind[] = [
  'correct',
  'wrong',
  'tick',
  'end',
  'badge',
];

export interface AudioBackend {
  /**
   * オーディオを使用可能にする（ブラウザの自動再生制限・プレイヤー生成）。
   * ユーザーのタップ・クリックなどのジェスチャ内で 1 度だけ呼ぶ。
   */
  prime(): Promise<void>;
  /** 指定種別の効果音を 1 発鳴らす。volume は 0..1（省略時は音種既定）。 */
  play(kind: SoundKind, volume?: number): void;
  /** 後始末。 */
  stop(): void;
  /** 利用可能か。 */
  isAvailable(): boolean;
}

/** 音種ごとの既定音量（system §10.1）。tick は秒ごとに上書きされる。 */
export const DEFAULT_VOLUME: Record<SoundKind, number> = {
  correct: 0.6,
  wrong: 0.6,
  tick: 0.5,
  end: 0.5,
  badge: 0.7,
};

/** 何もしないバックエンド（テスト・SSR・未対応プラットフォーム）。 */
export class NoopAudioBackend implements AudioBackend {
  async prime(): Promise<void> {}
  play(_kind: SoundKind, _volume?: number): void {}
  stop(): void {}
  isAvailable(): boolean {
    return false;
  }
}

/**
 * 音種ごとの合成音定義（Web）。
 * 周波数列を順に短く鳴らすことで「上行 2 音」「3 音」等を近似する。
 */
type ToneSpec = {
  /** 各音の周波数（Hz）と相対開始オフセット（秒）。 */
  notes: readonly { freq: number; at: number; dur: number }[];
  type: OscillatorType;
};

const WEB_TONES: Record<SoundKind, ToneSpec> = {
  // 明るい上行 2 音
  correct: {
    type: 'sine',
    notes: [
      { freq: 880, at: 0, dur: 0.09 },
      { freq: 1320, at: 0.1, dur: 0.11 },
    ],
  },
  // やや低音 1 音
  wrong: {
    type: 'sine',
    notes: [{ freq: 220, at: 0, dur: 0.2 }],
  },
  // 短い tic
  tick: {
    type: 'square',
    notes: [{ freq: 1500, at: 0, dur: 0.06 }],
  },
  // 柔らかい完了音（下→上）
  end: {
    type: 'sine',
    notes: [
      { freq: 523, at: 0, dur: 0.18 },
      { freq: 784, at: 0.18, dur: 0.22 },
    ],
  },
  // 達成感のある上行 3 音
  badge: {
    type: 'triangle',
    notes: [
      { freq: 659, at: 0, dur: 0.16 },
      { freq: 880, at: 0.18, dur: 0.16 },
      { freq: 1175, at: 0.36, dur: 0.24 },
    ],
  },
};

/**
 * Web Audio API ベースの実装。音源ファイルを持たず Oscillator で合成する。
 * AudioContext は globalThis 経由で取得し、native に Web 専用 API を持ち込まない。
 */
class WebAudioBackend implements AudioBackend {
  private ctx: AudioContext | null = null;
  private primed = false;

  async prime(): Promise<void> {
    if (this.primed) return;
    try {
      const Ctor: typeof AudioContext | undefined =
        typeof globalThis !== 'undefined'
          ? // @ts-expect-error webkitAudioContext は Safari 互換
            (globalThis.AudioContext ?? globalThis.webkitAudioContext)
          : undefined;
      if (!Ctor) return;
      this.ctx = new Ctor();
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      this.primed = true;
    } catch {
      this.ctx = null;
      this.primed = false;
    }
  }

  play(kind: SoundKind, volume?: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.primed) return;
    try {
      const spec = WEB_TONES[kind];
      const v = clamp01(volume ?? DEFAULT_VOLUME[kind]);
      const base = ctx.currentTime;
      for (const note of spec.notes) {
        const start = base + note.at;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = spec.type;
        osc.frequency.setValueAtTime(note.freq, start);
        // attack/decay envelope（クリックノイズ回避）
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(Math.max(v, 0.0002), start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + note.dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + note.dur + 0.02);
      }
    } catch {
      // 再生失敗でも UI を落とさない
    }
  }

  stop(): void {
    const ctx = this.ctx;
    this.ctx = null;
    this.primed = false;
    try {
      void ctx?.close?.();
    } catch {
      // ignore
    }
  }

  isAvailable(): boolean {
    if (typeof globalThis === 'undefined') return false;
    // @ts-expect-error webkitAudioContext は Safari 互換
    return !!(globalThis.AudioContext ?? globalThis.webkitAudioContext);
  }
}

interface NativeAudioPlayer {
  volume: number;
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => Promise<void>;
}

/**
 * Native (iOS / Android) 用バックエンド。expo-audio で 5 つの mp3 を再生する。
 *
 * - prime() で setAudioModeAsync（iOS は playsInSilentMode:false でサイレント尊重、
 *   Android は既定 null）後、音種ごとに AudioPlayer を 1 つ生成する。
 * - require('expo-audio') / require('../../assets/audio/*.mp3') はネイティブでのみ評価。
 *   アセット欠落時も catch して該当プレイヤーを null のまま保持（クラッシュしない）。
 */
class NativeAudioBackend implements AudioBackend {
  private players: Partial<Record<SoundKind, NativeAudioPlayer>> = {};
  private primed = false;

  async prime(): Promise<void> {
    if (this.primed) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const expoAudio: typeof import('expo-audio') = require('expo-audio');
      // iOS は playsInSilentMode:false でサイレントスイッチ時に OS が無音化する
      //（NF-33：音なし・ハプティクスあり）。Android 1.1.x は interruptionMode の
      // String→Enum 変換が壊れているため iOS のときだけ詳細フィールドを送る。
      const baseMode: Parameters<typeof expoAudio.setAudioModeAsync>[0] = {
        shouldPlayInBackground: false,
      };
      const mode =
        Platform.OS === 'ios'
          ? {
              ...baseMode,
              allowsRecording: false,
              playsInSilentMode: false,
              shouldRouteThroughEarpiece: false,
              interruptionMode: 'mixWithOthers' as const,
            }
          : baseMode;
      await expoAudio.setAudioModeAsync(mode);
      await expoAudio.setIsAudioActiveAsync(true);

      const sources = loadNativeSources();
      for (const kind of SOUND_KINDS) {
        const src = sources[kind];
        if (src == null) continue;
        try {
          this.players[kind] = expoAudio.createAudioPlayer(src);
        } catch (e) {
          // 個別アセット失敗は他の音種に波及させない
          console.warn(`[audio] createAudioPlayer(${kind}) failed:`, e);
        }
      }
      this.primed = true;
    } catch (e) {
      console.warn('[audio] NativeAudioBackend.prime failed:', e);
      this.players = {};
      this.primed = false;
    }
  }

  play(kind: SoundKind, volume?: number): void {
    const p = this.players[kind];
    if (!p || !this.primed) return;
    try {
      p.volume = clamp01(volume ?? DEFAULT_VOLUME[kind]);
      // seekTo 完了後に play（Android は STATE_ENDED から再生するため順序保証が必要）
      p.seekTo(0)
        .then(() => p.play())
        .catch((err) => {
          console.warn(`[audio] play(${kind}) seek/play failed:`, err);
        });
    } catch (e) {
      console.warn(`[audio] play(${kind}) failed:`, e);
    }
  }

  stop(): void {
    const players = this.players;
    this.players = {};
    this.primed = false;
    for (const kind of SOUND_KINDS) {
      try {
        players[kind]?.pause();
      } catch {
        // ignore
      }
    }
  }

  isAvailable(): boolean {
    return true;
  }
}

/**
 * ネイティブ音源を require する。metro が静的に解決するため、各 require は
 * リテラルパスで個別に書く必要がある（動的パスは不可）。欠落時は undefined。
 */
function loadNativeSources(): Partial<Record<SoundKind, number>> {
  const out: Partial<Record<SoundKind, number>> = {};
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    out.correct = require('../../assets/audio/correct.mp3');
  } catch {
    /* missing */
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    out.wrong = require('../../assets/audio/wrong.mp3');
  } catch {
    /* missing */
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    out.tick = require('../../assets/audio/tick.mp3');
  } catch {
    /* missing */
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    out.end = require('../../assets/audio/end.mp3');
  } catch {
    /* missing */
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    out.badge = require('../../assets/audio/badge.mp3');
  } catch {
    /* missing */
  }
  return out;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

let cached: AudioBackend | null = null;

/** プラットフォーム既定の AudioBackend を返す（Web=合成音 / native=expo-audio）。 */
export function getDefaultAudioBackend(): AudioBackend {
  if (cached) return cached;
  cached = Platform.OS === 'web' ? new WebAudioBackend() : new NativeAudioBackend();
  return cached;
}

/** テスト・差し替え用。 */
export function setDefaultAudioBackend(backend: AudioBackend | null): void {
  cached = backend;
}

export { NativeAudioBackend, WebAudioBackend };
