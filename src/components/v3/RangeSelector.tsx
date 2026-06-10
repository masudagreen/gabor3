/**
 * RangeSelector.tsx — RG-1（components.md / screens.md S3-1）v3.0、F-13。
 *
 * 1 変数の有効値部分集合（振れ幅）をチップ複数選択で指定する（spec §4.1 値集合の部分集合）。
 * 各チップ：選択=塗り action.primary + 白文字 + 太字 + ✓（色+形で非依存、NF-12）、
 * 非選択=border.input 枠 + fg.primary。タップ領域 48pt 以上。
 *
 * 制約（F-13 受け入れ基準）：各変数は少なくとも 1 値を有効。最後の 1 値を外そうとする
 * 操作はブロックし、その旨を font.caption で案内する（呼び出し側で onMinViolation を表示）。
 *
 * a11y（screens.md S3-1）：グループ role="group" aria-label「{変数名}の範囲」、
 * 各チップ role="checkbox" + aria-checked。
 *
 * 値の同一性は文字列化（String(value)）で判定するため number / string いずれの値集合も扱える。
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useFocusStyle } from '../../theme/focusStyle';
import { webAria } from '../../theme/ariaWeb';
import { webSpaceActivation } from '../../theme/keyActivation';
import { fontSize, fontWeight, radius, spacing, tapTarget } from '../../theme/tokens';

export type RangeChip<T> = {
  value: T;
  label: string;
};

export type RangeSelectorProps<T> = {
  /** 変数名（「個数の範囲」等、グループ aria-label）。 */
  groupLabel: string;
  /** チップ一覧（§4.1 値集合の全要素、易→難順）。 */
  chips: ReadonlyArray<RangeChip<T>>;
  /** 現在有効な値（部分集合）。 */
  selected: ReadonlyArray<T>;
  /** トグル結果（有効値の新部分集合）を通知。最低 1 値はコンポーネントが保証する。 */
  onChange: (next: T[]) => void;
  /** 最後の 1 値を外そうとした（最低 1 値違反）ときに呼ばれる。案内表示用。 */
  onMinViolation?: () => void;
  testId?: string;
};

export function RangeSelector<T extends string | number>({
  groupLabel,
  chips,
  selected,
  onChange,
  onMinViolation,
  testId,
}: RangeSelectorProps<T>) {
  const { colors } = useTheme();
  const focus = useFocusStyle();

  const selectedKeys = React.useMemo(
    () => new Set(selected.map((v) => String(v))),
    [selected],
  );

  const handlePress = React.useCallback(
    (value: T) => {
      const key = String(value);
      const isSelected = selectedKeys.has(key);
      if (isSelected) {
        // 最後の 1 値は外せない（F-13：最低 1 値必須）。
        if (selectedKeys.size <= 1) {
          onMinViolation?.();
          return;
        }
        onChange(selected.filter((v) => String(v) !== key));
      } else {
        // チップ並び（易→難）を保った部分集合を返す。
        const nextKeys = new Set(selectedKeys);
        nextKeys.add(key);
        onChange(
          chips.map((c) => c.value).filter((v) => nextKeys.has(String(v))),
        );
      }
    },
    [chips, onChange, onMinViolation, selected, selectedKeys],
  );

  return (
    <View
      accessibilityRole="none"
      // RN-web：role=group + aria-label（screens.md S3-1）
      {...webAria('group', undefined, groupLabel)}
      style={styles.group}
      testID={testId}
    >
      {chips.map((chip) => {
        const checked = selectedKeys.has(String(chip.value));
        return (
          <Pressable
            key={String(chip.value)}
            onPress={() => handlePress(chip.value)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            accessibilityLabel={`${groupLabel} ${chip.label}`}
            {...webAria(
              'checkbox',
              { checked },
              `${groupLabel} ${chip.label}`,
            )}
            // NF-9：Space で選択切替（Enter は RN-Web 既定。checkbox は Space 未対応のため補完）
            {...webSpaceActivation(() => handlePress(chip.value))}
            style={({ pressed }) => [
              styles.chip,
              {
                borderColor: checked ? colors.actionPrimary : colors.borderInput,
                backgroundColor: checked ? colors.actionPrimary : 'transparent',
              },
              focus,
              pressed && styles.pressed,
            ]}
            testID={testId ? `${testId}-chip-${String(chip.value)}` : undefined}
          >
            {checked && (
              <Text
                style={[styles.check, { color: colors.fgOnPrimary }]}
                accessibilityElementsHidden
              >
                ✓
              </Text>
            )}
            <Text
              style={[
                styles.label,
                {
                  color: checked ? colors.fgOnPrimary : colors.fgPrimary,
                  fontWeight: checked ? fontWeight.bold : fontWeight.medium,
                },
              ]}
              numberOfLines={1}
            >
              {chip.label}
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
    flexWrap: 'wrap',
    gap: spacing.s2,
    paddingVertical: spacing.s2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: tapTarget.min,
    minWidth: tapTarget.min,
    paddingHorizontal: spacing.s4,
    borderWidth: 2,
    borderRadius: radius.pill,
    gap: 6,
  },
  pressed: { opacity: 0.7 },
  check: {
    fontSize: fontSize.body,
    fontWeight: '900',
    lineHeight: fontSize.body + 2,
  },
  label: {
    fontSize: fontSize.body,
    textAlign: 'center',
  },
});
