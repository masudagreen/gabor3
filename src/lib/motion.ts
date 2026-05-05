/**
 * motion.ts — Sprint 7-C / NF-11 / spec.md §11.3 / screens.md S7-11。
 *
 * `prefers-reduced-motion` を尊重し、アニメーションの長さや有無を切り替えるための
 * 共通ユーティリティ。Game 1 のモーフィング、Game 1/2/3 の正解アニメ（拡大ハイライト
 * 1.5 秒）など、視覚的な動きが多いコンポーネントは本フックの値で挙動を変える。
 *
 * - Web：`window.matchMedia('(prefers-reduced-motion: reduce)')` を購読
 * - Native：`AccessibilityInfo.isReduceMotionEnabled()` ＋ `reduceMotionChanged` 購読
 *
 * SSR / 未対応環境では false を返す（=動きあり、デフォルト）。
 */

import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * `prefers-reduced-motion: reduce` が有効かどうかを取得する純関数。
 *
 * Web では同期的に matchMedia を読む。Native では非同期 API しかないため
 * 本関数は false を返し、フック側で setState する。
 */
export function getPrefersReducedMotionSync(): boolean {
  if (Platform.OS !== 'web') return false;
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * usePrefersReducedMotion — `prefers-reduced-motion` を購読するフック。
 *
 * - 初期値は同期取得（Web のみ）。Native は false 始まりで非同期に更新。
 * - 値が変わったら自動で再レンダリングされる。
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() =>
    getPrefersReducedMotionSync(),
  );

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || !window.matchMedia) return;
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
      // Safari < 14 互換のため addListener も併用
      if (typeof mq.addEventListener === 'function') {
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
      } else if (typeof (mq as MediaQueryList).addListener === 'function') {
        // 旧 API
        (mq as MediaQueryList).addListener(handler);
        return () => (mq as MediaQueryList).removeListener(handler);
      }
      return;
    }
    // Native
    let cancelled = false;
    const maybePromise = AccessibilityInfo.isReduceMotionEnabled?.();
    if (maybePromise && typeof maybePromise.then === 'function') {
      maybePromise
        .then((v: boolean) => {
          if (!cancelled) setReduced(!!v);
        })
        .catch(() => {});
    }
    const sub = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      (v: boolean) => setReduced(!!v),
    );
    return () => {
      cancelled = true;
      sub?.remove?.();
    };
  }, []);

  return reduced;
}

/**
 * scaleDuration — `prefers-reduced-motion` を尊重して duration を縮める純関数。
 *
 * - reduced=true → 0（瞬時）
 * - reduced=false → 元の値
 *
 * `Animated.timing(..., { duration: scaleDuration(motion.durationGameFeedback, reduced) })`
 * のように使う。
 */
export function scaleDuration(durationMs: number, reduced: boolean): number {
  if (reduced) return 0;
  return durationMs;
}
