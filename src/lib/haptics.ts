/**
 * ハプティクスレイヤー（Sprint 7-B / spec.md F-15）。
 *
 * - lightImpact() API（軽い振動 30-50ms 相当）
 * - Web：navigator.vibrate(50) を呼ぶ。対応していない端末では no-op
 * - ネイティブ：expo-haptics 未導入（Sprint 7-B では Web のみ。ネイティブは v1.1）
 *   現状はネイティブ環境では no-op
 * - Settings.hapticsEnabled で完全停止
 *
 * テストではモジュール変数 isHapticsEnabled() をリセットできるよう setHapticsEnabled() を export。
 */
import { Platform } from 'react-native';

let _hapticsEnabled = true;

/** Settings 変更時に呼ぶ（AppRouter / SettingsScreen から） */
export function setHapticsEnabled(enabled: boolean): void {
  _hapticsEnabled = enabled;
}

export function isHapticsEnabled(): boolean {
  return _hapticsEnabled;
}

/** Web 専用：navigator.vibrate(ms) を呼ぶ。非対応 / ネイティブは no-op */
export function lightImpact(): void {
  if (!_hapticsEnabled) return;
  if (Platform.OS !== 'web') return;
  if (typeof navigator === 'undefined') return;
  const nav = navigator as Navigator & {
    vibrate?: (pattern: number | number[]) => boolean;
  };
  if (typeof nav.vibrate !== 'function') return;
  try {
    nav.vibrate(50);
  } catch {
    // 一部の SafariView などで TypeError → no-op
  }
}

/** テスト用：内部状態をリセット */
export function _resetHapticsForTest(): void {
  _hapticsEnabled = true;
}
