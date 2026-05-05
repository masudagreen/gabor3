/**
 * Checkbox — Sprint 4 で追加（screens.md S4-02 / components.md §13）。
 *
 * デザイン：28×28px のボックス + 24px Body ラベル。タップ領域は外周に余白を持たせて 48pt 床。
 * a11y：accessibilityRole="checkbox"、accessibilityState.checked、ariaRequired。
 *
 * disabled 時はオーバーレイ表示（画面側で「最後まで読んでください」のヒントを別途出す）。
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  ViewStyle,
} from 'react-native';
import {
  fontSize,
  fontWeight,
  getColors,
  spacing,
  tapTarget,
} from '../theme/tokens';

export type CheckboxProps = {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaRequired?: boolean;
  testId?: string;
};

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  label,
  onChange,
  disabled,
  ariaRequired,
  testId,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  const boxBg = checked ? colors.actionPrimary : colors.bgSurface;
  const boxBorder = checked ? colors.actionPrimary : colors.borderInput;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled: !!disabled }}
      aria-required={ariaRequired ? true : undefined}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      testID={testId}
      style={({ pressed }) => {
        const style: ViewStyle = {
          minHeight: tapTarget.min,
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing.s2,
          paddingHorizontal: spacing.s2,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          gap: spacing.s3,
        };
        return style;
      }}
    >
      <View
        style={[
          styles.box,
          {
            backgroundColor: boxBg,
            borderColor: boxBorder,
          },
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {checked ? (
          <Text style={[styles.check, { color: colors.fgOnPrimary }]}>✓</Text>
        ) : null}
      </View>
      <Text
        style={[
          styles.label,
          {
            color: colors.fgPrimary,
            fontSize: fontSize.body,
            fontWeight: fontWeight.medium as '600',
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  box: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 22,
  },
  label: {
    flexShrink: 1,
  },
});
