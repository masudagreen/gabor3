/**
 * ariaWeb.ts — react-native-web の DOM へ確実に WAI-ARIA 状態を出力するためのヘルパー（NF-15）。
 *
 * 背景（S10 評価 Minor 1〜4）：
 * react-native-web 0.21 は `accessibilityState`（checked/expanded/selected）を
 * DOM の `aria-checked` / `aria-expanded` / `aria-selected` へ自動透過しない。
 * 一方 W3C プロパティ（`role` / `aria-checked` 等）は createDOMProps が直接 DOM 属性へ写す。
 * よって Web では明示的に `role` + `aria-*` を渡す必要がある（Native は accessibilityRole/State が担う）。
 *
 * Native では `aria-*` / `role` は無害（react-native コアが解釈する／無視する）が、
 * 役割の二重指定で混乱しないよう Web のときだけ付与する。
 */

import { Platform } from 'react-native';

type AriaRole =
  | 'radio'
  | 'switch'
  | 'checkbox'
  | 'button'
  | 'group'
  | 'radiogroup'
  | 'spinbutton';

type AriaState = {
  checked?: boolean;
  expanded?: boolean;
  selected?: boolean;
  pressed?: boolean;
  disabled?: boolean;
};

/**
 * Web のとき role + aria-* を DOM 透過するための props を返す。Native では空オブジェクト。
 * スプレッドして使う：`<Pressable {...webAria('radio', { checked })} />`
 */
export function webAria(
  role: AriaRole,
  state?: AriaState,
  label?: string,
): Record<string, unknown> {
  if (Platform.OS !== 'web') return {};
  const out: Record<string, unknown> = { role };
  if (state) {
    if (state.checked !== undefined) out['aria-checked'] = state.checked;
    if (state.expanded !== undefined) out['aria-expanded'] = state.expanded;
    if (state.selected !== undefined) out['aria-selected'] = state.selected;
    if (state.pressed !== undefined) out['aria-pressed'] = state.pressed;
    if (state.disabled !== undefined) out['aria-disabled'] = state.disabled;
  }
  if (label !== undefined) out['aria-label'] = label;
  return out;
}
