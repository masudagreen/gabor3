/**
 * useFeedback.ts — 音・ハプティクス発火の副作用配線（spec F-14、system §10）。
 *
 * 決定（lib/v2/feedback.ts の純関数）と再生（platform/audio.ts・haptics.ts の副作用）を
 * 橋渡しする薄いコントローラ。コンポーネントは `emit(event)` を呼ぶだけでよい。
 *
 * - 初回マウントで audio backend を prime（自動再生制限・プレイヤー生成）。
 *   prime はユーザージェスチャ内が理想だが、起動フロー上ゲーム画面到達時点で既に
 *   オンボ/距離リマインドのタップを経ているため実用上問題ない。失敗しても silent fail。
 * - サイレントモード尊重（NF-33）：iOS は audio backend が playsInSilentMode:false で
 *   OS 側無音化を担保するため、決定段階の silent は false 固定（OS に委ねる）。
 *   決定関数自体は silent 引数をサポートし、テストで明示検証する。
 * - 設定（soundEnabled / hapticsEnabled）は emit 呼び出し時点の最新値を参照する。
 */

import { useCallback, useEffect, useRef } from 'react';
import {
  decideFeedback,
  type FeedbackEvent,
  type FeedbackSettings,
} from '../../lib/v2/feedback';
import {
  getDefaultAudioBackend,
  type AudioBackend,
} from '../../platform/audio';
import {
  getDefaultHapticsBackend,
  type HapticsBackend,
} from '../../platform/haptics';

export type UseFeedbackArgs = {
  settings: FeedbackSettings;
  /** テスト用：音バックエンド差し替え。未指定はプラットフォーム既定。 */
  audio?: AudioBackend;
  /** テスト用：触覚バックエンド差し替え。未指定はプラットフォーム既定。 */
  haptics?: HapticsBackend;
};

export type FeedbackEmitter = {
  /** 指定イベントの音・ハプティクスを設定に従って発火する。 */
  emit: (event: FeedbackEvent) => void;
};

export function useFeedback({
  settings,
  audio,
  haptics,
}: UseFeedbackArgs): FeedbackEmitter {
  const audioRef = useRef<AudioBackend>(audio ?? getDefaultAudioBackend());
  const hapticsRef = useRef<HapticsBackend>(
    haptics ?? getDefaultHapticsBackend(),
  );
  // 差し替えが渡されたら追従（テスト・再構成）
  if (audio && audioRef.current !== audio) audioRef.current = audio;
  if (haptics && hapticsRef.current !== haptics) hapticsRef.current = haptics;

  // 最新の設定を参照（emit を安定参照にしたまま設定変更を反映）
  const settingsRef = useRef<FeedbackSettings>(settings);
  settingsRef.current = settings;

  // 初回マウントで prime（失敗は silent fail）。
  useEffect(() => {
    void audioRef.current.prime().catch(() => {});
  }, []);

  const emit = useCallback((event: FeedbackEvent) => {
    // OS サイレントは native の audio session に委ねるため決定段階では false。
    const plan = decideFeedback(event, settingsRef.current, false);
    if (plan.sound) {
      audioRef.current.play(plan.sound.kind, plan.sound.volume);
    }
    if (plan.haptic) {
      hapticsRef.current.trigger(plan.haptic);
    }
  }, []);

  return { emit };
}
