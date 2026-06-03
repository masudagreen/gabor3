/**
 * haptics.ts — 触覚フィードバックバックエンド（spec F-14 / NF-32、system §10）。
 *
 * expo-haptics をラップし、本アプリの 3 種別（light / medium / badge）に適合させる。
 * rapidreading2 には haptics 抽象が無かったため、audio.ts と同じ AudioBackend 流の
 * 「getDefault / setDefault でテスト差し替え可能」な薄い抽象として新規に置く。
 *
 * - Native (iOS / Android)：expo-haptics の impactAsync。badge は heavy+medium の 2 連。
 * - Web：触覚 API は基本未対応のため Noop（navigator.vibrate も縞模様体験に不要なので使わない）。
 * - サイレントモード尊重（NF-33）は呼び出し側の責務外（ハプティクスは OS サイレントの影響を
 *   受けない）。本層は「振動 OFF なら呼ばれない」を前提に、呼ばれたら必ず振動を試みる。
 *
 * いずれも API 不在・失敗でクラッシュせず silent fail する。
 */

import { Platform } from 'react-native';

/** 発火する触覚パターンの種別（system §10.1）。 */
export type HapticKind = 'light' | 'medium' | 'badge';

export const HAPTIC_KINDS: readonly HapticKind[] = ['light', 'medium', 'badge'];

export interface HapticsBackend {
  /** 指定種別の触覚を発火する。 */
  trigger(kind: HapticKind): void;
  /** 利用可能か。 */
  isAvailable(): boolean;
}

/** 何もしないバックエンド（テスト・Web・未対応プラットフォーム）。 */
export class NoopHapticsBackend implements HapticsBackend {
  trigger(_kind: HapticKind): void {}
  isAvailable(): boolean {
    return false;
  }
}

/**
 * Native (iOS / Android) 用バックエンド。expo-haptics の impactAsync を使う。
 * badge は達成感を出すため heavy → medium の 2 連（system §10.1）。
 */
class NativeHapticsBackend implements HapticsBackend {
  private mod: typeof import('expo-haptics') | null = null;

  private load(): typeof import('expo-haptics') | null {
    if (this.mod) return this.mod;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.mod = require('expo-haptics');
      return this.mod;
    } catch (e) {
      console.warn('[haptics] expo-haptics unavailable:', e);
      return null;
    }
  }

  trigger(kind: HapticKind): void {
    const H = this.load();
    if (!H) return;
    try {
      const Style = H.ImpactFeedbackStyle;
      if (kind === 'light') {
        void H.impactAsync(Style.Light).catch(noop);
      } else if (kind === 'medium') {
        void H.impactAsync(Style.Medium).catch(noop);
      } else {
        // badge：heavy → medium の 2 連（短い遅延で達成感）
        void H.impactAsync(Style.Heavy).catch(noop);
        setTimeout(() => {
          void H.impactAsync(Style.Medium).catch(noop);
        }, 90);
      }
    } catch (e) {
      console.warn(`[haptics] trigger(${kind}) failed:`, e);
    }
  }

  isAvailable(): boolean {
    return true;
  }
}

function noop(): void {}

let cached: HapticsBackend | null = null;

/** プラットフォーム既定の HapticsBackend を返す（Web=Noop / native=expo-haptics）。 */
export function getDefaultHapticsBackend(): HapticsBackend {
  if (cached) return cached;
  cached =
    Platform.OS === 'web'
      ? new NoopHapticsBackend()
      : new NativeHapticsBackend();
  return cached;
}

/** テスト・差し替え用。 */
export function setDefaultHapticsBackend(backend: HapticsBackend | null): void {
  cached = backend;
}

export { NativeHapticsBackend };
