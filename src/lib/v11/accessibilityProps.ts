/**
 * accessibilityProps.ts — 全ゲーム共通コンポーネントの a11y プロパティ組立ヘルパー。
 *
 * react-native-web 0.19 系の `createDOMProps` は `accessibilityState.checked` を
 * `aria-checked` 属性に変換しない（変換対象は `accessibilityChecked` または
 * `aria-checked` の直接指定のみ）。そのため、`accessibilityState.checked` を
 * 渡しているだけだと、Web の実 DOM 上に `aria-checked` 属性が一切出力されず、
 * SR ユーザーが選択状態を全く認識できない。
 *
 * 本モジュールはこの問題を解消するため、`Pressable` に渡す aria 系プロパティを
 * Platform に応じて組み立てる純関数を提供する。Native 側は React Native の
 * `accessibilityState` が SR ノードに正しく反映されるためそちらを使い、
 * Web 側は `aria-checked`（直接）を併用する。
 *
 * 純関数として切り出しているのは、テストで「Web プラットフォームで aria-checked
 * 属性が選択状態に応じて切り替わる」ことを単体検証するため（@testing-library/
 * react-native では実 DOM 属性検証が困難なため、ロジックを抽出して assert する）。
 */

import { AccessibilityRole, AccessibilityState } from 'react-native';

/** どのプラットフォームに向けて props を組み立てるか */
export type AccessibilityPlatform = 'web' | 'native';

export type ChoiceAccessibilityProps = {
  /** RN 共通 props（native でも web でも渡してよい） */
  accessibilityRole: AccessibilityRole;
  accessibilityLabel: string;
  accessibilityState: AccessibilityState;
  /**
   * Web 限定の追加属性（react-native-web の createDOMProps が DOM へ反映）。
   *
   * RN の Pressable 型は `aria-checked: boolean | 'mixed'` を期待する。
   * react-native-web は値をそのまま `domProps['aria-checked']` に渡し、React が
   * boolean を ARIA 属性向けに自動で `"true"` / `"false"` 文字列へ変換する。
   * よってここでは boolean を返す（DOM 側では文字列属性として観測される）。
   */
  'aria-checked'?: boolean;
};

export type BuildChoiceAccessibilityPropsArgs = {
  role: 'checkbox' | 'radio';
  label: string;
  isSelected: boolean;
  disabled?: boolean;
  platform: AccessibilityPlatform;
};

/**
 * 「チェック可能な選択肢」（role=checkbox / radio）の a11y プロパティを組み立てる。
 *
 * - Web：`accessibilityState`（互換のため残す）に加えて `aria-checked` を直接付与
 * - Native：`accessibilityState.checked` のみ（RN がプラットフォーム a11y ノードに伝達）
 *
 * これにより react-native-web 0.19 系の制約下でも DOM の `aria-checked` 属性が
 * 動的に切り替わり、SR ユーザーが選択状態を読み上げで認識できる。
 */
export function buildChoiceAccessibilityProps(
  args: BuildChoiceAccessibilityPropsArgs,
): ChoiceAccessibilityProps {
  const accessibilityState: AccessibilityState = {
    checked: args.isSelected,
    selected: args.isSelected,
    disabled: !!args.disabled,
  };

  const props: ChoiceAccessibilityProps = {
    accessibilityRole: args.role,
    accessibilityLabel: args.label,
    accessibilityState,
  };

  if (args.platform === 'web') {
    props['aria-checked'] = args.isSelected;
  }
  return props;
}
