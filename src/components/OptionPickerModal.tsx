/**
 * OptionPickerModal — screens.md S7-09（ダークモード切替モーダル）等で使う汎用ピッカー。
 *
 * 動作：
 *   - title 表示 + 各 option を Pressable リストで描画
 *   - 選択中の option には ✓ を表示
 *   - option タップ → onSelect(value) → モーダルは呼び出し元で閉じる
 *   - 「閉じる」ボタンで cancel
 *
 * a11y：
 *   - role="dialog"、aria-modal=true
 *   - 各 option は role="radio"
 */

import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fontSize, fontWeight, radius, spacing, tapTarget } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from './Button';

export type OptionItem<V extends string> = {
  value: V;
  label: string;
  description?: string;
  icon?: string;
};

export type OptionPickerModalProps<V extends string> = {
  isOpen: boolean;
  title: string;
  options: ReadonlyArray<OptionItem<V>>;
  selected: V;
  onSelect: (v: V) => void;
  onClose: () => void;
  testId?: string;
};

export function OptionPickerModal<V extends string>({
  isOpen,
  title,
  options,
  selected,
  onSelect,
  onClose,
  testId,
}: OptionPickerModalProps<V>): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <Modal
      visible={isOpen}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="none">
        <Pressable
          style={[
            styles.dialog,
            { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
          ]}
          onPress={() => {}}
          accessibilityRole="none"
          testID={testId}
        >
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: colors.fgPrimary }]}
          >
            {title}
          </Text>

          <View
            style={styles.optionList}
            accessibilityRole="radiogroup"
            accessibilityLabel={title}
          >
            {options.map((opt) => {
              const isSelected = opt.value === selected;
              return (
                <Pressable
                  key={opt.value}
                  accessibilityRole="radio"
                  accessibilityLabel={opt.label}
                  accessibilityState={{ selected: isSelected, checked: isSelected }}
                  onPress={() => onSelect(opt.value)}
                  testID={testId ? `${testId}-opt-${opt.value}` : undefined}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      borderColor: isSelected ? colors.actionPrimary : colors.borderDefault,
                      backgroundColor: isSelected ? colors.bgSurfaceRaised : 'transparent',
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  {opt.icon ? (
                    <Text
                      style={[styles.optionIcon, { color: colors.fgPrimary }]}
                      accessible={false}
                    >
                      {opt.icon}
                    </Text>
                  ) : null}
                  <View style={styles.optionTextBlock}>
                    <Text
                      style={[
                        styles.optionLabel,
                        {
                          color: colors.fgPrimary,
                          fontWeight: isSelected
                            ? (fontWeight.bold as '700')
                            : (fontWeight.medium as '600'),
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {opt.description ? (
                      <Text style={[styles.optionDesc, { color: colors.fgMuted }]}>
                        {opt.description}
                      </Text>
                    ) : null}
                  </View>
                  {isSelected ? (
                    <Text
                      style={[styles.checkmark, { color: colors.actionPrimary }]}
                      accessible={false}
                    >
                      ✓
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <Button
            variant="secondary"
            size="md"
            label="閉じる"
            onPress={onClose}
            fullWidth
            testId={testId ? `${testId}-close` : undefined}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.s4,
  },
  dialog: {
    width: '100%',
    maxWidth: 480,
    padding: spacing.s5,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.s4,
  },
  title: {
    fontSize: fontSize.h3, // 26
    fontWeight: fontWeight.bold as '700',
  },
  optionList: {
    gap: spacing.s2,
  },
  option: {
    minHeight: tapTarget.listItem, // 72
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
  },
  optionIcon: {
    fontSize: fontSize.h3,
    width: 32,
    textAlign: 'center',
  },
  optionTextBlock: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    fontSize: fontSize.body, // 24
  },
  optionDesc: {
    fontSize: fontSize.caption, // 20
  },
  checkmark: {
    fontSize: 28,
    fontWeight: '700',
  },
});
