/**
 * ImageChoiceCell — AC-2（components.md §4）。
 *
 * G-01 / G-07 / G-10 のグリッド型ゲームでパッチ自体を選択肢にするセル。
 *
 * - セルサイズ：最小 56px（OPT-2、5×5 グリッドでも維持）
 * - 選択中：黄色 4px 枠（color.highlight.correct）
 * - focus-visible：青 3px outline（黄色枠と区別、両立可能）
 * - セル全体がタップ可能、Space / Enter でトグル
 * - role="checkbox"（複数選択可、G-01 と G-07）/ "radio"（G-10 / G-02）を呼び出し側で指定
 *
 * 子要素として GaborPatch などを受け取り、本コンポーネントは枠線とトグル制御だけを
 * 担当する（ガボール描画ロジックには立ち入らない）。
 *
 * Sprint 10 修正ラウンド 2 の M-1 真正修正：
 *   `accessibilityState.checked` だけでは react-native-web 0.19 系の `createDOMProps`
 *   が `aria-checked` 属性を実 DOM に出力しない問題があった。`buildChoiceAccessibility
 *   Props` 経由で Web 環境では `aria-checked` を直接付与し、SR ユーザーが選択状態を
 *   読み上げ認識できるようにする。
 *
 * Sprint 10 修正ラウンド 2 の G-02 G-2 修正：
 *   role="radio" / "checkbox" の Pressable は react-native-web 0.19 系の挙動として
 *   Space キーでは onPress が発火しない（Space は role="button" でのみ発火）。
 *   Enter は発火するが念のため両キーともキーボードハンドラで onPress を起動する。
 *
 * Sprint 15 修正ラウンド 2 の Critical 修正：
 *   `dimOnDisabled` prop を導入。既定 true（既存挙動を完全保持）。
 *   GE-08 / GE-09 のように「タップ不可（disabled）だが視覚的にはフルコントラストで
 *   描画したい刺激パッチ」用に false 指定可能にする。disabled = タップ抑制、
 *   opacity 0.5 = 視覚的減衰、の 2 つの責務を分離する。
 */

import React from 'react';
import {
  GestureResponderEvent,
  Platform,
  Pressable,
  StyleSheet,
  useColorScheme,
  View,
  ViewStyle,
} from 'react-native';
import { getColors, palette, radius } from '../../theme/tokens';
import { buildChoiceAccessibilityProps } from '../../lib/v11/accessibilityProps';

export type ImageChoiceCellProps = {
  id: string;
  isSelected: boolean;
  onToggle: () => void;
  ariaLabel: string;
  /** "checkbox"（複数選択可）/ "radio"（4 択など 1 つだけ）。デフォルト checkbox */
  role?: 'checkbox' | 'radio';
  cellSizePx: number;
  disabled?: boolean;
  /**
   * disabled=true 時にセル全体に視覚的減衰（opacity 0.5）を適用するか。
   * 既定 true（UI ボタン無効化など、視覚的に「押せない」フィードバックが望ましい場合）。
   * GE-08 テストパッチ / GE-09 中央 target のような刺激は「タップ不可」だが
   * 「視覚的にはフルコントラスト維持」が必要なので false を指定する（spec §7.8 / §7.9
   * の刺激パラメータ忠実性のため）。
   */
  dimOnDisabled?: boolean;
  /**
   * v1.1.1：data-target-id 属性を Web で付与する（ResultOverlay の MarkBadge 配置探索用）。
   * 省略時は付与しない（既存ゲームの後方互換）。
   */
  dataTargetId?: string;
  /**
   * v1.1.2 Sprint 21：セル背景を透明にする。既定 false（既存挙動を完全保持）。
   * G-10 で 8×8 grid の上に 4 象限のクリッカブル領域を重畳するときに使う
   * （ガボール本体は下層で描画するため、上層セルは枠とタップ判定のみ持つ）。
   */
  transparentBackground?: boolean;
  testId?: string;
  children?: React.ReactNode;
};

export const ImageChoiceCell: React.FC<ImageChoiceCellProps> = ({
  id,
  isSelected,
  onToggle,
  ariaLabel,
  role = 'checkbox',
  cellSizePx,
  disabled,
  dimOnDisabled = true,
  dataTargetId,
  transparentBackground = false,
  testId,
  children,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const [focused, setFocused] = React.useState(false);

  const a11yProps = buildChoiceAccessibilityProps({
    role,
    label: ariaLabel,
    isSelected,
    disabled,
    platform: Platform.OS === 'web' ? 'web' : 'native',
  });

  // Web 用キーボードハンドラ：role=radio / checkbox の場合、react-native-web の
  // PressResponder は Space キーで onPress を発火しない（role=button のみ）。
  // Enter / Space ともに onToggle を起動する。
  const handleKeyDown = React.useCallback(
    (e: { key?: string; preventDefault?: () => void }) => {
      if (disabled) return;
      const key = e.key;
      if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
        e.preventDefault?.();
        onToggle();
      }
    },
    [disabled, onToggle],
  );

  const handlePress = React.useCallback(
    (_e?: GestureResponderEvent) => {
      onToggle();
    },
    [onToggle],
  );

  const webExtraProps =
    Platform.OS === 'web'
      ? {
          onKeyDown: handleKeyDown,
          // tabIndex は Pressable がデフォルトで 0 を付与するが明示しておく
          tabIndex: (disabled ? -1 : 0) as -1 | 0,
        }
      : {};
  // v1.1.1：ResultOverlay が data-target-id ベースで配置探索する。
  // Sprint 20 ラウンド 3：Platform.OS ガードを外し、jest 環境（Native）でも
  // props として保持されるようにする（テストで `cell.props['data-target-id']`
  // および `cell.props.dataSet?.targetId` を検証可能にする）。
  // ネイティブ環境では React Native が未知 prop を View に転送しないため副作用なし。
  const dataTargetProps = dataTargetId
    ? {
        'data-target-id': dataTargetId,
        dataSet: { targetId: dataTargetId },
      }
    : {};

  // v1.1.1（Sprint 20）：選択枠を黄色 4px → 中性グレー 2px / 1px に切替
  // disabled で枠なし。selected 2px / idle 1px、色は color.selection.subtle 系
  const showBorder = !disabled;
  const borderWidth = !showBorder ? 0 : isSelected ? 2 : 1;
  const borderColor = !showBorder
    ? 'transparent'
    : isSelected
      ? colors.selectionSubtle
      : colors.selectionSubtleIdle;

  return (
    <Pressable
      {...a11yProps}
      {...webExtraProps}
      {...dataTargetProps}
      disabled={disabled}
      onPress={handlePress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      testID={testId ?? `image-choice-cell-${id}`}
      style={({ pressed }) => {
        const style: ViewStyle = {
          width: cellSizePx,
          height: cellSizePx,
          borderRadius: radius.sm,
          borderWidth,
          borderColor,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: transparentBackground
            ? 'transparent'
            : palette.gabor.bg, // ガボール背景は #808080 固定（system.md §7）
          opacity: disabled && dimOnDisabled ? 0.5 : pressed ? 0.92 : 1,
          ...(Platform.OS === 'web' && focused
            ? ({
                outlineColor: colors.focusRing,
                outlineWidth: 3,
                outlineStyle: 'solid',
                outlineOffset: 2,
              } as object)
            : {}),
        };
        return style;
      }}
    >
      {children}
    </Pressable>
  );
};

// View import は今後の拡張余地として保持（unused 警告抑止）
void View;

// styles unused export prevention（tsc strict 環境では不要）
const _unused = StyleSheet.create({});
void _unused;
