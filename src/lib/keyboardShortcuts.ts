/**
 * Web キーボードショートカット（Sprint 7-B / spec.md §11.5 Web）。
 *
 * - Game 2（amendment 後）：← / → で「左ガボール／右ガボール」を選択
 *   2AFC「どちらが時計回りに傾いていますか？」に対応。
 * - Game 3：1〜8 で 8 個の時計方向ボタンに対応
 *   1=12, 2=1:30, 3=3, 4=4:30, 5=6, 6=7:30, 7=9, 8=10:30
 *   （screens.md S3-01 / lib/game3.ts CLOCK_POSITIONS と同順）
 * - Esc：モーダル閉じる（呼び出し側でハンドラ提供）
 *
 * Platform.OS === 'web' でガード。ネイティブには影響しない。
 *
 * 純関数（mapKeyToGame2 / mapKeyToGame3）+ React hook（useKeyboardShortcut）の二段構成。
 * 純関数はテスト容易性のため独立 export。
 */
import React from 'react';
import { Platform } from 'react-native';
import { ClockPosition, CLOCK_POSITIONS } from './game3';

/** Game 2 の回答（左右どちらのガボールが時計回りか） */
export type Game2Side = 'left' | 'right';

/**
 * Game 2 のキー入力を回答（左右）に変換する純関数。
 * - ArrowLeft → left
 * - ArrowRight → right
 * - それ以外 → null
 */
export function mapKeyToGame2(key: string): Game2Side | null {
  if (key === 'ArrowLeft') return 'left';
  if (key === 'ArrowRight') return 'right';
  return null;
}

/**
 * Game 3 のキー入力を ClockPosition に変換する純関数。
 * 1-8 → CLOCK_POSITIONS[0..7]
 */
export function mapKeyToGame3(key: string): ClockPosition | null {
  const idx = '12345678'.indexOf(key);
  if (idx < 0) return null;
  return CLOCK_POSITIONS[idx];
}

export type UseGame2KeyboardOptions = {
  /** 回答ハンドラ。disabled 中は呼ばれない */
  onAnswer: (side: Game2Side) => void;
  /** 回答無効中は false */
  enabled: boolean;
};

/** Web 環境で keydown を購読できる対象を返す（window または globalThis）。 */
function getKeydownTarget(): {
  addEventListener: (type: string, listener: (e: KeyboardEvent) => void) => void;
  removeEventListener: (type: string, listener: (e: KeyboardEvent) => void) => void;
} | null {
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    return window as unknown as ReturnType<typeof getKeydownTarget>;
  }
  // jest の node 環境では globalThis を購読対象にする
  if (
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as { addEventListener?: unknown }).addEventListener === 'function'
  ) {
    return globalThis as unknown as ReturnType<typeof getKeydownTarget>;
  }
  return null;
}

/** Game 2：← / → で左右ガボールを回答するキーボードフック。Web 専用。 */
export function useGame2Keyboard({
  onAnswer,
  enabled,
}: UseGame2KeyboardOptions): void {
  const onAnswerRef = React.useRef(onAnswer);
  React.useEffect(() => {
    onAnswerRef.current = onAnswer;
  }, [onAnswer]);

  React.useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!enabled) return;
    const target = getKeydownTarget();
    if (!target) return;
    const handler = (e: KeyboardEvent) => {
      const side = mapKeyToGame2(e.key);
      if (side) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        onAnswerRef.current(side);
      }
    };
    target.addEventListener('keydown', handler);
    return () => target.removeEventListener('keydown', handler);
  }, [enabled]);
}

export type UseGame3KeyboardOptions = {
  onAnswer: (pos: ClockPosition) => void;
  enabled: boolean;
};

/** Game 3：1-8 で回答するキーボードフック。Web 専用。 */
export function useGame3Keyboard({
  onAnswer,
  enabled,
}: UseGame3KeyboardOptions): void {
  const onAnswerRef = React.useRef(onAnswer);
  React.useEffect(() => {
    onAnswerRef.current = onAnswer;
  }, [onAnswer]);

  React.useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!enabled) return;
    const target = getKeydownTarget();
    if (!target) return;
    const handler = (e: KeyboardEvent) => {
      const pos = mapKeyToGame3(e.key);
      if (pos) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        onAnswerRef.current(pos);
      }
    };
    target.addEventListener('keydown', handler);
    return () => target.removeEventListener('keydown', handler);
  }, [enabled]);
}

export type UseEscapeKeyOptions = {
  onEscape: () => void;
  enabled: boolean;
};

/** Esc キーでモーダル閉じる用フック。Web 専用。 */
export function useEscapeKey({ onEscape, enabled }: UseEscapeKeyOptions): void {
  const onEscapeRef = React.useRef(onEscape);
  React.useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  React.useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!enabled) return;
    const target = getKeydownTarget();
    if (!target) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        onEscapeRef.current();
      }
    };
    target.addEventListener('keydown', handler);
    return () => target.removeEventListener('keydown', handler);
  }, [enabled]);
}
