/**
 * useGameTimer.ts — ラウンドのタイマー駆動（spec F-01 / F-12、S4）。
 *
 * `active`（=playing フェーズ）のとき requestAnimationFrame で経過秒 elapsedSec を
 * 連続更新し（ガボール回転・周波数変化アニメの駆動）、残り秒 remainingSec（整数、
 * カウントダウン表示用）を導出する。残り 0 で onTimeout を 1 度だけ発火する。
 *
 * 描画戦略（S1 申し送り）：
 * - elapsedSec は rAF で滑らかに進める（回転は transform で安価、cpd は cell 側で量子化）。
 * - rAF が無い環境（テスト/古い Web）では setInterval(≈16ms) にフォールバック。
 *
 * roundKey が変わる（次ラウンドへ進む）とタイマーを 0 から再スタートする。
 */

import { useEffect, useRef, useState } from 'react';

export type UseGameTimerArgs = {
  /** 1 ラウンドの制限秒数 m */
  durationSec: number;
  /** playing フェーズのときのみ true。false で停止（開示中・完了後） */
  active: boolean;
  /** ラウンド識別子。変わるとタイマーを 0 から再開 */
  roundKey: number | string;
  /** 残り 0 到達時に 1 度だけ発火 */
  onTimeout: () => void;
  /**
   * 一時停止フラグ（S5 中断ダイアログ表示中）。
   * true の間は経過時間が進まず、解除すると停止前の残り時間から再開する
   *（F-07：キャンセルで「残り時間が保持される」）。
   */
  paused?: boolean;
};

export type UseGameTimerResult = {
  /** ラウンド開始からの経過秒（小数、アニメ駆動用） */
  elapsedSec: number;
  /** 残り秒（整数、カウントダウン表示用）。0 で停止 */
  remainingSec: number;
};

function now(): number {
  return typeof performance !== 'undefined' && performance.now
    ? performance.now()
    : Date.now();
}

export function useGameTimer({
  durationSec,
  active,
  roundKey,
  onTimeout,
  paused = false,
}: UseGameTimerArgs): UseGameTimerResult {
  const [elapsedSec, setElapsedSec] = useState(0);
  const startRef = useRef<number>(now());
  const firedRef = useRef(false);
  // 一時停止に入った時刻（解除時に経過分を startRef に巻き戻すために保持）
  const pausedAtRef = useRef<number | null>(null);
  // onTimeout の最新参照を保持（依存に入れず stale closure を避ける）
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  // roundKey が変わったら 0 から再開
  useEffect(() => {
    startRef.current = now();
    firedRef.current = false;
    pausedAtRef.current = null;
    setElapsedSec(0);
  }, [roundKey]);

  // 一時停止の出入りで startRef を補正し、停止中の経過を時計に含めない。
  useEffect(() => {
    if (paused) {
      if (pausedAtRef.current === null) pausedAtRef.current = now();
    } else if (pausedAtRef.current !== null) {
      // 停止していた分だけ開始時刻を後ろにずらす（=残り時間を保持）。
      startRef.current += now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
  }, [paused]);

  useEffect(() => {
    if (!active || paused) return;

    let rafId: number | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let stopped = false;
    const hasRaf = typeof requestAnimationFrame === 'function';

    const tick = () => {
      if (stopped) return;
      const elapsed = (now() - startRef.current) / 1000;
      // 満了を先に判定：満了フレームでは state を更新せず onTimeout のみ発火し
      // ループを停止する（満了後の余分な setState を避け、teardown を綺麗にする）。
      if (elapsed >= durationSec) {
        stopped = true;
        if (!firedRef.current) {
          firedRef.current = true;
          onTimeoutRef.current();
        }
        return;
      }
      setElapsedSec(elapsed);
      if (hasRaf) {
        rafId = requestAnimationFrame(tick);
      }
    };

    if (hasRaf) {
      rafId = requestAnimationFrame(tick);
    } else {
      intervalId = setInterval(tick, 16);
    }

    return () => {
      stopped = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (intervalId !== null) clearInterval(intervalId);
    };
  }, [active, paused, durationSec, roundKey]);

  // 残り秒（整数）。満了で 0、上限は durationSec。
  const remainingSec = Math.max(
    0,
    Math.min(durationSec, Math.ceil(durationSec - elapsedSec)),
  );

  return { elapsedSec, remainingSec };
}
