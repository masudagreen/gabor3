/**
 * useGameCountdown — 60 秒固定カウントダウン用の共通フック（v1.1 OPT-12）。
 *
 * 全ゲーム（G-01〜G-13）の Screen で同じパターンだった setInterval ベースの
 * カウントダウンをここに集約する。本フックは pause 制御もサポートする：
 *
 * 仕様：
 *   - `enabled === false` の間は何もしない（タイマー未起動、`remainingMs` は
 *     `totalDurationMs` のまま）。`enabled` の優先度は `paused` より上。
 *   - `enabled` が `true` になったタイミングで `Date.now()` を起点として計測開始。
 *   - `setInterval(tickMs)` ごとに `remainingMs` を `Math.max(0, total - elapsed)`
 *     で更新。
 *   - 残時間 0 到達で `setInterval` を `clearInterval` し、`onTimeUp` を **1 度だけ**
 *     呼ぶ（`onTimeUpFiredRef` で多重発火ガード）。
 *   - effect cleanup で必ず `clearInterval`（リーク防止）。
 *   - `onTimeUp` は `useRef` で stable 化し、effect 依存に含めない（既存実装と同等
 *     の挙動：onTimeUp を毎回作り直しても再マウントしない）。
 *   - **paused 機能**：`paused === true` の間は setInterval を停止し
 *     `remainingMs` を凍結する。`paused: true → false` に戻ったタイミングで、
 *     残時間（凍結時の値）を起点に再カウントを再開する（停止中の経過時間を
 *     elapsed に含めない）。`paused: true` のまま `totalDurationMs` を超える時間が
 *     経過しても `onTimeUp` は呼ばれない。`paused` を省略 / `false` のままなら
 *     従来挙動と完全に同じ（後方互換）。
 */

import React from 'react';

export type UseGameCountdownArgs = {
  /** カウントダウンの初期総時間（ms）。例：60_000 */
  totalDurationMs: number;
  /** タイマーを動かすか（false の間は何もしない）。phase 制御用 */
  enabled: boolean;
  /**
   * 真の間はタイマーを一時停止し、`remainingMs` を凍結する。
   * `false` に戻したタイミングで残時間を起点に再開する。
   * 既定 `false`（pause しない、=従来挙動）。
   */
  paused?: boolean;
  /** 残時間が 0 になったタイミングで 1 回だけ呼ばれる */
  onTimeUp: () => void;
  /** tick 間隔（ms）。既定 250。テスト用に短くできる */
  tickMs?: number;
};

export type UseGameCountdownReturn = {
  /** 現在の残 ms（クランプ済み 0 以上） */
  remainingMs: number;
};

const DEFAULT_TICK_MS = 250;

export function useGameCountdown(
  args: UseGameCountdownArgs,
): UseGameCountdownReturn {
  const {
    totalDurationMs,
    enabled,
    paused = false,
    onTimeUp,
    tickMs = DEFAULT_TICK_MS,
  } = args;

  const [remainingMs, setRemainingMs] =
    React.useState<number>(totalDurationMs);

  // onTimeUp を stable 化（既存の各 Screen の onCompleteRef と同じパターン）
  const onTimeUpRef = React.useRef(onTimeUp);
  React.useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  // 多重発火ガード（remainingMs <= 0 のときに onTimeUp を 1 度だけ）
  const onTimeUpFiredRef = React.useRef(false);

  // 開始時刻（pause 再開時に「停止中の経過時間」を相殺するため再設定する）
  const startedAtRef = React.useRef<number | null>(null);
  // pause 突入時点の残時間（再開時刻 - (total - savedRemaining) で起点を逆算）
  const pausedRemainingMsRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!enabled) {
      // enabled === false の間は何もしない（remainingMs は触らない）。
      // 次に enabled === true になったときに startedAtRef を再設定する。
      // pause 関連の ref もクリアして次回フレッシュに開始できるようにする。
      startedAtRef.current = null;
      pausedRemainingMsRef.current = null;
      return;
    }

    // paused === true の間は setInterval を起こさない。
    // ただし、すでに進行中（startedAtRef 確定済み）から paused に入った場合は
    // 「pause 突入瞬間の残時間」を保存しておいて、次の resume で startedAt を
    // 逆算する。残時間は state（remainingMs）ではなく Date.now() から直接導出
    // する方が、React の state 更新バッチによる stale を避けられる。
    if (paused) {
      if (startedAtRef.current !== null && pausedRemainingMsRef.current === null) {
        const elapsed = Date.now() - startedAtRef.current;
        const remaining = Math.max(0, totalDurationMs - elapsed);
        pausedRemainingMsRef.current = remaining;
        // UI 表示も同じ瞬間値に揃える（pause 直後の chip が古い値を表示しないよう）
        setRemainingMs(remaining);
      }
      // setInterval を立てない（cleanup 側で clearInterval される）。
      return;
    }

    // 起動 or 再開
    let startedAt: number;
    if (
      startedAtRef.current !== null &&
      pausedRemainingMsRef.current !== null
    ) {
      // paused からの再開：保存した残時間を起点に startedAt を逆算
      const savedRemaining = pausedRemainingMsRef.current;
      const elapsed = totalDurationMs - savedRemaining;
      startedAt = Date.now() - elapsed;
      startedAtRef.current = startedAt;
      pausedRemainingMsRef.current = null;
      // remainingMs は savedRemaining のまま（次の tick で再評価される）
    } else {
      // 通常の起動（enabled false→true、もしくは初回）
      startedAt = Date.now();
      startedAtRef.current = startedAt;
      pausedRemainingMsRef.current = null;
      onTimeUpFiredRef.current = false;
      setRemainingMs(totalDurationMs);
    }

    let intervalId: ReturnType<typeof setInterval> | null = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, totalDurationMs - elapsed);
      setRemainingMs(remaining);
      if (remaining <= 0) {
        if (intervalId !== null) {
          clearInterval(intervalId);
          intervalId = null;
        }
        if (!onTimeUpFiredRef.current) {
          onTimeUpFiredRef.current = true;
          onTimeUpRef.current();
        }
      }
    }, tickMs);

    return () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
    // remainingMs を依存に入れると毎 tick で effect が再実行されてしまうため除外。
    // pause 突入時の値は ref 経由でしか参照しないので、stale closure 問題は無い。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, paused, totalDurationMs, tickMs]);

  return { remainingMs };
}
