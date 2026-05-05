/**
 * ListItem — components.md §4 / screens.md S7-01。
 *
 * 設定画面の各行で使う行型コンポーネント。
 *
 * trailing：
 *   - "chevron"：右に「▸」、押下で onPress
 *   - "toggle"：右に Toggle（onToggleChange）
 *   - "value"：右にテキスト + chevron（onPress で詳細画面へ）
 *   - "checkmark"：選択中 → ✓
 *   - "none"：何も無し（情報行）
 *
 * 仕様：
 *   - minHeight 72px（OPT-2）
 *   - title 24px、subtitle 20px
 *   - destructive=true で title が semanticError 色
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { fontSize, fontWeight, spacing, tapTarget } from '../theme/tokens';
import { Toggle } from './Toggle';

export type ListItemTrailing =
  | 'chevron'
  | 'toggle'
  | 'value'
  | 'checkmark'
  | 'none';

export type ListItemProps = {
  title: string;
  subtitle?: string;
  /** 左側の絵文字／文字グリフ（暫定アイコン、SVG は Sprint 7 末尾で差し替え） */
  iconLeading?: string;
  trailing?: ListItemTrailing;
  /** trailing="value" 時の表示文字列 */
  trailingValue?: string;
  /** trailing="toggle" 時 */
  toggleValue?: boolean;
  onPress?: () => void;
  onToggleChange?: (v: boolean) => void;
  /** trailing="checkmark" 時に true で ✓ 表示 */
  checked?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  testId?: string;
  /** スクリーンリーダー読み上げ補助 */
  ariaLabel?: string;
};

export const ListItem: React.FC<ListItemProps> = ({
  title,
  subtitle,
  iconLeading,
  trailing = 'chevron',
  trailingValue,
  toggleValue,
  onPress,
  onToggleChange,
  checked,
  destructive,
  disabled,
  testId,
  ariaLabel,
}) => {
  const { colors } = useTheme();
  const titleColor = destructive ? colors.semanticError : colors.fgPrimary;
  const isPressable =
    !disabled && (trailing === 'chevron' || trailing === 'value' || trailing === 'checkmark') && !!onPress;

  const content = (
    <View
      style={[
        styles.row,
        { borderBottomColor: colors.borderDefault, backgroundColor: colors.bgSurface },
      ]}
    >
      {iconLeading ? (
        <Text style={[styles.icon, { color: titleColor }]} accessible={false}>
          {iconLeading}
        </Text>
      ) : null}
      <View style={styles.textBlock}>
        <Text
          style={[
            styles.title,
            { color: titleColor, fontWeight: fontWeight.medium as '600' },
          ]}
          numberOfLines={2}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.fgMuted }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.trailing}>
        {trailing === 'value' && trailingValue ? (
          <Text style={[styles.valueText, { color: colors.fgSecondary }]} numberOfLines={1}>
            {trailingValue}
          </Text>
        ) : null}
        {trailing === 'value' || trailing === 'chevron' ? (
          <Text style={[styles.chevron, { color: colors.fgMuted }]} accessible={false}>
            ›
          </Text>
        ) : null}
        {trailing === 'checkmark' && checked ? (
          <Text style={[styles.check, { color: colors.actionPrimary }]} accessible={false}>
            ✓
          </Text>
        ) : null}
        {trailing === 'toggle' ? (
          <Toggle
            value={!!toggleValue}
            onChange={(v) => onToggleChange?.(v)}
            ariaLabel={`${title} ${toggleValue ? 'オン' : 'オフ'}`}
            disabled={disabled}
            testId={testId ? `${testId}-toggle` : undefined}
          />
        ) : null}
      </View>
    </View>
  );

  if (isPressable) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ariaLabel ?? buildPressableLabel(title, trailingValue, checked)}
        accessibilityState={{ disabled: !!disabled }}
        onPress={onPress}
        disabled={!!disabled}
        testID={testId}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        {content}
      </Pressable>
    );
  }

  // toggle / none / disabled は非 Pressable コンテナ
  return (
    <View testID={testId} accessibilityLabel={ariaLabel}>
      {content}
    </View>
  );
};

function buildPressableLabel(
  title: string,
  trailingValue?: string,
  checked?: boolean,
): string {
  const parts = [title];
  if (trailingValue) parts.push(`現在 ${trailingValue}`);
  if (checked) parts.push('選択中');
  return parts.join('、');
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: tapTarget.listItem, // 72
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s3,
    gap: spacing.s3,
    borderBottomWidth: 1,
  },
  icon: {
    fontSize: fontSize.h3, // 26
    width: 32,
    textAlign: 'center',
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: fontSize.body, // 24（OPT-1 床）
  },
  subtitle: {
    fontSize: fontSize.caption, // 20（補足のみ）
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s2,
  },
  valueText: {
    fontSize: fontSize.body, // 24
  },
  chevron: {
    fontSize: 28,
    fontWeight: '600',
  },
  check: {
    fontSize: 28,
    fontWeight: '700',
  },
});
