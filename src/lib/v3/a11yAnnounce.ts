/**
 * a11yAnnounce.ts — スクリーンリーダーへのアナウンス薄ラッパ（NF-10、S5）。
 *
 * ゲーム開始時に「レベル {n}。{count} 個の回転を探してください」を assertive で読み上げる
 *（F-02 / system §6）。AccessibilityInfo.announceForAccessibility は Web/Native とも
 * 安全に呼べるが、テストや古い環境での未定義に備えて try/catch でガードする。
 */

import { AccessibilityInfo } from 'react-native';

/** SR へ 1 度アナウンスする（失敗しても握りつぶす）。 */
export function announceForA11y(message: string): void {
  try {
    AccessibilityInfo.announceForAccessibility(message);
  } catch {
    // SR 環境がない/未対応のときは無視する（描画は継続）。
  }
}
