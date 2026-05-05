/**
 * ConfirmDialog — components.md §5.3 / §28 に従う中断確認ダイアログ。
 *
 * Modal は RN の Modal を使用。背景オーバーレイは半透明黒。
 */

import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import {
  fontSize,
  fontWeight,
  getColors,
  radius,
  spacing,
} from '../theme/tokens';
import { Button } from './Button';

export type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  message: string;
  primaryLabel: string;
  secondaryLabel: string;
  onPrimaryPress: () => void;
  onSecondaryPress: () => void;
  destructive?: boolean;
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  primaryLabel,
  secondaryLabel,
  onPrimaryPress,
  onSecondaryPress,
  destructive,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  return (
    <Modal
      visible={isOpen}
      animationType="fade"
      transparent
      onRequestClose={onSecondaryPress}
      accessibilityViewIsModal
    >
      <Pressable style={styles.backdrop} onPress={onSecondaryPress} accessibilityRole="none">
        <Pressable
          style={[
            styles.dialog,
            { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
          ]}
          onPress={() => {}}
          accessibilityRole="none"
        >
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: colors.fgPrimary }]}
          >
            {title}
          </Text>
          <Text style={[styles.message, { color: colors.fgPrimary }]}>{message}</Text>
          <View style={styles.actions}>
            <Button
              variant={destructive ? 'destructive' : 'primary'}
              size="md"
              label={primaryLabel}
              onPress={onPrimaryPress}
              fullWidth
            />
            <View style={styles.spacer} />
            <Button
              variant="secondary"
              size="md"
              label={secondaryLabel}
              onPress={onSecondaryPress}
              fullWidth
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

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
  },
  title: {
    fontSize: fontSize.h3, // 26px
    fontWeight: fontWeight.bold as '700',
    marginBottom: spacing.s3,
  },
  message: {
    fontSize: fontSize.body, // 24px
    marginBottom: spacing.s5,
    lineHeight: fontSize.body * 1.6,
  },
  actions: {
    flexDirection: 'column',
  },
  spacer: {
    height: spacing.s3,
  },
});
