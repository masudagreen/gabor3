/**
 * VariableOrderList.tsx — OR-1（components.md / screens.md S3-1）v3.0、F-13。
 *
 * 5 変数の変化順（最内側 LSB → 最外側 MSB）を上下ボタンで組み替える並べ替えリスト。
 * 先頭ほど「先に（頻繁に）変化する」（spec §4.2）。各行 56pt 以上、上下ボタン 48pt 以上。
 *
 * 手動スライダーではない（F-13：レベル自動決定 5 変数の手動値固定 UI は存在しない）。
 * これは「梯子の作り方」を変えるだけで、個別レベルの値を直接固定するものではない。
 *
 * a11y（screens.md S3-1）：role="list"、各 role="listitem"、上下ボタン aria-label
 * 「{変数名}を 1 つ上へ / 下へ」、順序変更を aria-live で読み上げ（呼び出し側がトースト等）。
 * 先頭は上ボタン disabled、末尾は下ボタン disabled。
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { useFocusStyle } from '../../theme/focusStyle';
import { webAria } from '../../theme/ariaWeb';
import { fontSize, fontWeight, radius, spacing, tapTarget } from '../../theme/tokens';

export type OrderItem<K extends string> = {
  key: K;
  label: string;
};

export type VariableOrderListProps<K extends string> = {
  /** 現在の並び（最内側 → 最外側）。 */
  items: ReadonlyArray<OrderItem<K>>;
  /** 並び替え結果（キー配列、最内側 → 最外側）を通知。 */
  onReorder: (nextKeys: K[]) => void;
  /** 1 行を上/下へ動かしたときの案内（aria-live トースト）用。 */
  onMoved?: (label: string, position: number) => void;
  testId?: string;
};

export function VariableOrderList<K extends string>({
  items,
  onReorder,
  onMoved,
  testId,
}: VariableOrderListProps<K>) {
  const { colors } = useTheme();

  const move = React.useCallback(
    (index: number, dir: -1 | 1) => {
      const target = index + dir;
      if (target < 0 || target >= items.length) return;
      const next = [...items];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      onReorder(next.map((it) => it.key));
      onMoved?.(moved.label, target + 1);
    },
    [items, onReorder, onMoved],
  );

  return (
    <View
      accessibilityRole="list"
      {...webAria('group')}
      style={[styles.list, { borderColor: colors.borderDefault, backgroundColor: colors.bgSurface }]}
      testID={testId}
    >
      {items.map((item, index) => {
        const first = index === 0;
        const last = index === items.length - 1;
        return (
          <View
            key={item.key}
            accessibilityRole="none"
            style={[
              styles.row,
              !last && { borderBottomWidth: 1, borderBottomColor: colors.borderDefault },
            ]}
            testID={testId ? `${testId}-row-${item.key}` : undefined}
          >
            <Text style={[styles.position, { color: colors.fgMuted }]}>
              {index + 1}.
            </Text>
            <Text style={[styles.label, { color: colors.fgPrimary }]}>
              {item.label}
            </Text>
            <View style={styles.buttons}>
              <MoveButton
                icon="chevron-up"
                label={`${item.label}を 1 つ上へ`}
                disabled={first}
                onPress={() => move(index, -1)}
                testId={testId ? `${testId}-up-${item.key}` : undefined}
              />
              <MoveButton
                icon="chevron-down"
                label={`${item.label}を 1 つ下へ`}
                disabled={last}
                onPress={() => move(index, 1)}
                testId={testId ? `${testId}-down-${item.key}` : undefined}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const MoveButton: React.FC<{
  icon: 'chevron-up' | 'chevron-down';
  label: string;
  disabled: boolean;
  onPress: () => void;
  testId?: string;
}> = ({ icon, label, disabled, onPress, testId }) => {
  const { colors } = useTheme();
  const focus = useFocusStyle();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={label}
      {...webAria('button', { disabled }, label)}
      style={({ pressed }) => [
        styles.moveButton,
        { borderColor: colors.borderInput },
        focus,
        pressed && !disabled && styles.pressed,
      ]}
      testID={testId}
    >
      <Ionicons
        name={icon}
        size={24}
        color={disabled ? colors.borderDefault : colors.actionPrimary}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  list: {
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: tapTarget.recommended,
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s2,
    gap: spacing.s3,
  },
  position: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    minWidth: 28,
  },
  label: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    flex: 1,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.s2,
  },
  moveButton: {
    width: tapTarget.min,
    height: tapTarget.min,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
});
