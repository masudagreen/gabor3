/**
 * focusStyle.ts — Sprint 7-C / NF-7 / spec.md §11.3 / screens.md S7-11。
 *
 * Web の `focus-visible` 用に **3px outline + offset** のスタイルを返す。
 * react-native-web は Pressable / View の style に `outlineColor` / `outlineWidth` /
 * `outlineOffset` / `outlineStyle` を付けると CSS の outline として透過させる。
 *
 * 過去スプリントの a11y Minor 1（focus outline 1px と細い）→ 3px に強化。
 *
 * 使い方：
 *   const focus = useFocusStyle();
 *   <Pressable style={[..., focus]} />
 *
 * Native では outline 系プロパティは無視されるため、本ヘルパーを呼んでも害はない。
 */

import { Platform, ViewStyle } from 'react-native';
import { useTheme } from './ThemeProvider';

/**
 * 3px outline スタイルを返す純関数。
 * Web では outlineColor / outlineWidth / outlineStyle / outlineOffset が CSS として効く。
 */
export function buildFocusStyle(focusRingColor: string): ViewStyle {
  if (Platform.OS !== 'web') return {};
  // react-native-web は ViewStyle に outline 系を許可していないため as object でキャスト
  return {
    ...({
      outlineColor: focusRingColor,
      outlineWidth: 3,
      outlineStyle: 'solid',
      outlineOffset: 2,
    } as object),
  };
}

/**
 * useFocusStyle — テーマから focus ring 色を取り、focus-visible 用の outline スタイルを返す。
 *
 * Web は CSS の `:focus-visible` セレクタが outline-* プロパティを処理する。
 * 本フックは「どんな色／太さで outline を表示するか」のスタイルだけ提供する。
 */
export function useFocusStyle(): ViewStyle {
  const { colors } = useTheme();
  return buildFocusStyle(colors.focusRing);
}
