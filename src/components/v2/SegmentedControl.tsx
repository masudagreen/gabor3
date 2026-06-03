/**
 * SegmentedControl.tsx — FT-3（components.md）。択一コントロール。
 *
 * 用途：n（3/4/5）、視聴距離（30/40/50）、ダークモード（OS連動/明/暗）、片眼（なし/左/右/交互）。
 * 各セグメント 48pt 以上。選択中は bg + fg 白 + 太字（色+太字+塗りで非依存、NF-12）。
 * role=radiogroup / 各 role=radio + aria-checked。
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useFocusStyle } from '../../theme/focusStyle';
import { webAria } from '../../theme/ariaWeb';
import { fontSize, fontWeight, radius, tapTarget } from '../../theme/tokens';

export type SegmentOption<T> = {
  value: T;
  label: string;
};

export type SegmentedControlProps<T extends string | number> = {
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (next: T) => void;
  accessibilityLabel: string;
};

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  const focus = useFocusStyle();

  return (
    <View
      style={[styles.group, { borderColor: colors.borderInput }]}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      {...webAria('radiogroup', undefined, accessibilityLabel)}
    >
      {options.map((opt, i) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => onChange(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            accessibilityLabel={opt.label}
            {...webAria('radio', { checked: selected, selected }, opt.label)}
            style={({ pressed }) => [
              styles.segment,
              i > 0 && { borderLeftWidth: 1, borderLeftColor: colors.borderInput },
              selected && { backgroundColor: colors.actionPrimary },
              focus,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: selected ? colors.fgOnPrimary : colors.fgPrimary,
                  fontWeight: selected ? fontWeight.bold : fontWeight.medium,
                },
              ]}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  segment: {
    minHeight: tapTarget.min,
    minWidth: tapTarget.min,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    flexShrink: 1,
  },
  pressed: { opacity: 0.7 },
  label: {
    fontSize: fontSize.body,
    textAlign: 'center',
  },
});
