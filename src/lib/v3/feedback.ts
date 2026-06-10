/**
 * feedback.ts — v3.0 音・ハプティクス発火の決定（純関数）（spec F-14、system §10）。
 *
 * 「どのイベントで何を鳴らす／振動させるか」を React・副作用から切り離して決める。
 * 実際の再生は src/platform/audio.ts / haptics.ts（副作用層）が担い、本ファイルは
 * 「鳴らすべき音種・振動種・音量」を返すだけ（テストで決定論的に検証可能）。
 *
 * v3.0 のイベント（system §10.1、v2 の round-correct/round-wrong/session-complete を読み替え）：
 *  - clear         ：総合クリア確定（S5 結果開示時）。clear 音 + light 振動。
 *  - fail          ：総合失敗確定（S5 結果開示時）。fail 音 + medium 振動。
 *  - countdown-tick：カウントダウン残り 3/2/1 秒（毎秒）。tick 音のみ（振動なし）。
 *  - levelup       ：レベルアップ +1（S7 ホーム結果）。levelup 音 + medium 振動。
 *  - badge-earned  ：バッジ獲得（S9 BadgeAwardToast）。badge 音 + badge 振動（heavy+medium）。
 *
 * 規範（system §10.2 / F-14）：
 *  - 音 OFF → 音を出さない。振動 OFF → 振動しない（チャネル個別）。
 *  - サイレント時 → 音は出さずハプティクスのみ（振動 OFF でない限り、NF-33）。
 *    ※native では iOS が playsInSilentMode:false で OS 側も無音化するが、決定段階でも
 *      明示的に抑止して二重に担保する（Web/Android/テストでも一貫させる）。
 *  - 試行中（締め切り前の注視中）の抑制は「どのイベントを emit するか」の呼び出し側責務。
 *    本関数は渡されたイベントに対し設定・サイレントのみで判定する。
 *  - レベルダウン（−1）には専用音を足さない（spec F-14 は「レベルアップ時」のみ規定。
 *    失敗音で足りる。本決定関数にレベルダウン用イベントは存在しない）。
 */

import type { SoundKind } from '../../platform/audio';
import { DEFAULT_VOLUME } from '../../platform/audio';
import type { HapticKind } from '../../platform/haptics';

/** 発火しうるフィードバックイベント（system §10.1、v3.0）。 */
export type FeedbackEventV3 =
  /** 総合クリア確定（結果開示時）。 */
  | { type: 'clear' }
  /** 総合失敗確定（結果開示時）。 */
  | { type: 'fail' }
  /** カウントダウン残り 3/2/1 秒のティック。残り秒で音量が変わる。 */
  | { type: 'countdown-tick'; remainingSec: 1 | 2 | 3 }
  /** レベルアップ +1。 */
  | { type: 'levelup' }
  /** バッジ獲得。 */
  | { type: 'badge-earned' };

export type FeedbackSettingsV3 = {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
};

/** 発火すべき副作用の指示。null フィールドは「鳴らさない／振動させない」。 */
export type FeedbackPlanV3 = {
  sound: { kind: SoundKind; volume: number } | null;
  haptic: HapticKind | null;
};

const EMPTY_PLAN: FeedbackPlanV3 = { sound: null, haptic: null };

/** 残り秒ごとのティック音量（system §10.1：40/50/60%）。 */
const TICK_VOLUME: Record<1 | 2 | 3, number> = {
  3: 0.4,
  2: 0.5,
  1: 0.6,
};

/**
 * イベント・設定・サイレント状態から発火プランを決める（純関数）。
 *
 * @param event    フィードバックイベント
 * @param settings soundEnabled / hapticsEnabled
 * @param silent   OS サイレントモードか（true なら音は抑止、ハプティクスは継続）
 */
export function decideFeedbackV3(
  event: FeedbackEventV3,
  settings: FeedbackSettingsV3,
  silent = false,
): FeedbackPlanV3 {
  const soundOk = settings.soundEnabled && !silent;
  const hapticOk = settings.hapticsEnabled;

  switch (event.type) {
    case 'clear':
      return {
        sound: soundOk ? { kind: 'clear', volume: DEFAULT_VOLUME.clear } : null,
        haptic: hapticOk ? 'light' : null,
      };
    case 'fail':
      return {
        sound: soundOk ? { kind: 'fail', volume: DEFAULT_VOLUME.fail } : null,
        haptic: hapticOk ? 'medium' : null,
      };
    case 'countdown-tick':
      return {
        sound: soundOk
          ? { kind: 'tick', volume: TICK_VOLUME[event.remainingSec] }
          : null,
        haptic: null, // ティックにハプティクスはなし（system §10.1）
      };
    case 'levelup':
      return {
        sound: soundOk ? { kind: 'levelup', volume: DEFAULT_VOLUME.levelup } : null,
        haptic: hapticOk ? 'medium' : null,
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
