/**
 * keyActivation.ts — NF-9（Web のキーボード起動：Enter / Space 両対応）。
 *
 * 背景（S5 申し送り / RN-Web 0.21 PressResponder の実測）：
 * react-native-web の `Pressable` は内部 `isValidKeyPress` で
 *   - Enter は role を問わず onPress を発火する
 *   - Space は role が 'button'（または menuitem）の要素でのみ onPress を発火する
 * という挙動を持つ。よって role=checkbox（ガボールパッチ）/ role=tab / role=radio など
 * 非 button ロールでは **Space で起動できない**（Enter のみ）。
 *
 * 本ヘルパーは「非 button ロールに Space 起動を補う」ためのもの。Enter は RN-Web 既定が
 * 既に処理するため**ここでは Space のみ**を処理し、Enter の二重発火を避ける。
 * Space の既定ページスクロールは preventDefault で抑止する。
 *
 * Native では `onKeyDown` は存在しないため空オブジェクトを返す（document に触れない）。
 * スプレッドして使う：`<Pressable {...webSpaceActivation(onActivate)} />`
 */

import { Platform } from 'react-native';

type KeyEventLike = {
  key?: string;
  preventDefault?: () => void;
};

/**
 * Web のとき Space キーで onActivate を呼ぶ onKeyDown を返す（Enter は RN-Web 既定に委ねる）。
 * Native では空オブジェクト。disabled のときは何も発火しない。
 *
 * 非 button ロール（checkbox / tab / radio など）の Space 起動補完に使う（NF-9）。
 */
export function webSpaceActivation(
  onActivate: () => void,
  disabled?: boolean,
): Record<string, unknown> {
  if (Platform.OS !== 'web') return {};
  return {
    onKeyDown: (e: KeyEventLike) => {
      if (disabled) return;
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault?.();
        onActivate();
      }
    },
  };
}
