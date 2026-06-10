/**
 * gameView.ts — v3.0 ゲーム描画の純粋な表示ロジック（spec F-03 / F-12、S5）。
 *
 * 描画コンポーネント（GaborGridV3 / CountdownTimerV3 / ResultOverlayLayerV3）が参照する
 * 「見た目の決定」を React 非依存の純関数に切り出す。色段階・aria-live レベル・
 * 結果開示中の遷移時間を決定論的にテストできるようにする。
 *
 * v2 の gameView との差分：
 * - 結果マーク分類（correct/missed/wrong）は gameMachine.deriveReveal に集約済みのため
 *   ここでは再定義しない（部分点 TP/FP/FN・0〜100 スコアは v3 に存在しない）。
 * - 総合判定は GameState.result（clear/fail の 2 値）をそのまま使う（aggregateKind 不要）。
 */

// ---------------------------------------------------------------------------
// カウントダウン色段階（F-12 / CD-1）
// ---------------------------------------------------------------------------

/** カウントダウンの色段階。色＋太字補強で情報を伝える（NF-12）。 */
export type CountdownTier = 'normal' | 'warn' | 'danger';

/** ≤3 秒 = danger（赤・Black）、≤5 秒 = warn（黄・Bold）、それ以外 = normal（白・Bold）。 */
export function countdownTier(remainingSec: number): CountdownTier {
  if (remainingSec <= 3) return 'danger';
  if (remainingSec <= 5) return 'warn';
  return 'normal';
}

/**
 * カウントダウンの aria-live レベル（CD-1 / system §6）。
 * 残り 6 秒以上は polite、5 秒以下は assertive。
 */
export function countdownAriaLive(remainingSec: number): 'polite' | 'assertive' {
  return remainingSec <= 5 ? 'assertive' : 'polite';
}

// ---------------------------------------------------------------------------
// 結果開示後のカウントダウン（spec §4.6 / F-03、v3.1）
// ---------------------------------------------------------------------------

/**
 * v3.1：締切後の結果開示カウントダウン秒数（spec §4.6 / AS-25、F-12 準拠）。
 * **3 秒は確定値**（白→黄→赤の色変化は F-12、点滅なし）。3 秒後に自動で次ラウンド
 * またはセッション要約へ進む。Designer/Generator は変更しない。
 */
export const REVEAL_COUNTDOWN_SEC = 3 as const;
