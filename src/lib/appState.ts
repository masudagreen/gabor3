/**
 * AppState 検知（spec.md A-8 中断 / Sprint 7-B）。
 *
 * - Web：document.visibilitychange イベント
 * - ネイティブ：AppState.addEventListener('change', ...)
 *
 * 用途：ゲーム中にバックグラウンドへ遷移したら「未完了試行」として記録し、
 *      復帰時はホームへ戻す（簡易対応）。staircase の更新には含めない。
 *
 * useAppForeground フックで Game1/2/3 から購読する。
 */
import React from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';

export type AppForegroundState = 'active' | 'background';

/**
 * document（ブラウザ環境）または globalThis.document（テスト環境のシム）を返す。
 * jest の node 環境では document が無いので polyfill 用に globalThis を見る。
 */
function getDocument(): {
  visibilityState: 'visible' | 'hidden' | 'prerender' | string;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
} | null {
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    return document as unknown as ReturnType<typeof getDocument>;
  }
  const g = globalThis as unknown as {
    document?: {
      visibilityState: string;
      addEventListener?: (type: string, listener: () => void) => void;
      removeEventListener?: (type: string, listener: () => void) => void;
    };
  };
  if (g.document && typeof g.document.addEventListener === 'function') {
    return g.document as unknown as ReturnType<typeof getDocument>;
  }
  return null;
}

/**
 * 現在の前面状態を取得（純関数、テスト用にも export）。
 *   Web：document.visibilityState で判定
 *   ネイティブ：AppState.currentState
 */
export function getCurrentForegroundState(): AppForegroundState {
  if (Platform.OS === 'web') {
    const doc = getDocument();
    if (!doc) return 'active';
    return doc.visibilityState === 'visible' ? 'active' : 'background';
  }
  return AppState.currentState === 'active' ? 'active' : 'background';
}

/**
 * 前面 / 背面の遷移を購読する低レベル API。
 * @returns 解除関数
 */
export function subscribeAppForeground(
  listener: (state: AppForegroundState) => void,
): () => void {
  if (Platform.OS === 'web') {
    const doc = getDocument();
    if (!doc) return () => {};
    const handler = () => {
      listener(doc.visibilityState === 'visible' ? 'active' : 'background');
    };
    doc.addEventListener('visibilitychange', handler);
    return () => doc.removeEventListener('visibilitychange', handler);
  }
  // ネイティブ
  const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
    listener(status === 'active' ? 'active' : 'background');
  });
  return () => sub.remove();
}

export type UseAppForegroundOptions = {
  /** active → background 遷移時のコールバック（中断扱い） */
  onBackground?: () => void;
  /** background → active 遷移時のコールバック（復帰時） */
  onForeground?: () => void;
};

/**
 * Game 画面から購読するフック。
 * - active → background：onBackground を呼ぶ（未完了試行記録 + ホームへ）
 * - background → active：onForeground を呼ぶ（必要なら）
 *
 * 注意：useEffect cleanup で listener を解除する。callbacks は ref に閉じ込めて
 * 依存配列を最小化する（再購読での flicker 防止）。
 */
export function useAppForeground({
  onBackground,
  onForeground,
}: UseAppForegroundOptions): void {
  const onBgRef = React.useRef(onBackground);
  const onFgRef = React.useRef(onForeground);
  React.useEffect(() => {
    onBgRef.current = onBackground;
    onFgRef.current = onForeground;
  }, [onBackground, onForeground]);

  React.useEffect(() => {
    let prev: AppForegroundState = getCurrentForegroundState();
    const unsubscribe = subscribeAppForeground((state) => {
      if (state === prev) return;
      if (prev === 'active' && state === 'background') {
        onBgRef.current?.();
      } else if (prev === 'background' && state === 'active') {
        onFgRef.current?.();
      }
      prev = state;
    });
    return unsubscribe;
  }, []);
}
