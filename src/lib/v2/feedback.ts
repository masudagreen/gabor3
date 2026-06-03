/**
 * feedback.ts — 音・ハプティクス発火の決定（純関数）（spec F-14、system §10）。
 *
 * 「どのイベントで何を鳴らす/振動させるか」を React・副作用から切り離して決める。
 * 実際の再生は src/platform/audio.ts / haptics.ts（副作用層）が担い、本ファイルは
 * 「鳴らすべき音種・振動種・音量」を返すだけ（テストで決定論的に検証可能）。
 *
 * 入力：
 *  - イベント種別（FeedbackEvent）
 *  - 設定（soundEnabled / hapticsEnabled）
 *  - OS サイレントモード状態（silent）
 *
 * 規範（system §10.2 / F-14）：
 *  - 音 OFF → 音を出さない。振動 OFF → 振動しない（チャネル個別）。
 *  - サイレント時 → 音は出さずハプティクスのみ（振動 OFF でない限り、NF-33）。
 *    ※native では iOS が playsInSilentMode:false で OS 側も無音化するが、決定段階でも
 *      明示的に抑止して二重に担保する（Web/Android/テストでも一貫させる）。
 *  - 試行中（採点前）のフィードバック抑制は「どのイベントを発火するか」の呼び出し側責務。
 *    本関数は渡されたイベントに対し設定・サイレントのみで判定する。
 */

import type { SoundKind } from '../../platform/audio';
import { DEFAULT_VOLUME } from '../../platform/audio';
import type { HapticKind } from '../../platform/haptics';

/** 発火しうるフィードバックイベント（system §10.1）。 */
export type FeedbackEvent =
  | { type: 'round-correct' }
  | { type: 'round-wrong' }
  /** カウントダウン残り 3/2/1 秒のティック。残り秒で音量が変わる。 */
  | { type: 'countdown-tick'; remainingSec: 1 | 2 | 3 }
  | { type: 'session-complete' }
  | { type: 'badge-earned' };

export type FeedbackSettings = {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
};

/** 発火すべき副作用の指示。null フィールドは「鳴らさない/振動させない」。 */
export type FeedbackPlan = {
  sound: { kind: SoundKind; volume: number } | null;
  haptic: HapticKind | null;
};

const EMPTY_PLAN: FeedbackPlan = { sound: null, haptic: null };

/** 残り秒ごとのティック音量（system §10.1：40/50/60%）。 */
const TICK_VOLUME: Record<1 | 2 | 3, number> = {
  3: 0.4,
  2: 0.5,
  1: 0.6,
};

/**
 * イベント・設定・サイレント状態から発火プランを決める（純関数）。
 *
 * @param event   フィードバックイベント
 * @param settings soundEnabled / hapticsEnabled
 * @param silent  OS サイレントモードか（true なら音は抑止、ハプティクスは継続）
 */
export function decideFeedback(
  event: FeedbackEvent,
  settings: FeedbackSettings,
  silent = false,
): FeedbackPlan {
  const soundOk = settings.soundEnabled && !silent;
  const hapticOk = settings.hapticsEnabled;

  switch (event.type) {
    case 'round-correct':
      return {
        sound: soundOk ? { kind: 'correct', volume: DEFAULT_VOLUME.correct } : null,
        haptic: hapticOk ? 'light' : null,
      };
    case 'round-wrong':
      return {
        sound: soundOk ? { kind: 'wrong', volume: DEFAULT_VOLUME.wrong } : null,
        haptic: hapticOk ? 'medium' : null,
      };
    case 'countdown-tick':
      return {
        sound: soundOk
          ? { kind: 'tick', volume: TICK_VOLUME[event.remainingSec] }
          : null,
        haptic: null, // ティックにハプティクスはなし（system §10.1）
      };
    case 'session-complete':
      return {
        sound: soundOk ? { kind: 'end', volume: DEFAULT_VOLUME.end } : null,
        haptic: null, // 完了音にハプティクスはなし
      };
    case 'badge-earned':
      return {
        sound: soundOk ? { kind: 'badge', volume: DEFAULT_VOLUME.badge } : null,
        haptic: hapticOk ? 'badge' : null,
      };
    default:
      return EMPTY_PLAN;
  }
}
