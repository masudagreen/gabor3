/**
 * StaircaseResetConfirmDialog — S19-05（design-v11/sprints/sprint-19/screens.md §6）。
 *
 * F-14 受け入れ基準：
 *   - staircase をリセットは確認ダイアログ後に実行
 *   - 文言：「全 13 ゲームの難易度を初期値に戻します。これまでの進捗記録は残りますが、難易度のみリセットされます。」
 *   - キャンセル / リセット（destructive）の 2 ボタン
 *
 * a11y：role="dialog", aria-modal="true"
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
} from '../../../theme/tokens';
import { Button } from '../../../components/Button';

export type StaircaseResetConfirmDialogProps = {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export const StaircaseResetConfirmDialog: React.FC<
  StaircaseResetConfirmDialogProps
> = ({ visible, onConfirm, onCancel }) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onCancel}
      accessibilityViewIsModal
    >
      <Pressable
        style={styles.backdrop}
        onPress={onCancel}
        accessibilityRole="none"
      >
        <Pressable
          style={[
            styles.dialog,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderDefault,
            },
          ]}
          onPress={() => {}}
          accessibilityRole="none"
          aria-modal
          role="dialog"
          aria-labelledby="staircase-reset-title"
          testID="staircase-reset-confirm-dialog"
        >
          <Text
            accessibilityRole="header"
            nativeID="staircase-reset-title"
            style={[styles.title, { color: colors.fgPrimary }]}
          >
            staircase をリセット
          </Text>
          <Text style={[styles.message, { color: colors.fgPrimary }]}>
            全 13 ゲームの難易度を初期値に戻します。これまでの進捗記録は残りますが、難易度のみリセットされます。
          </Text>
          <View style={styles.actions}>
            <Button
              variant="secondary"
              size="lg"
              label="キャンセル"
              onPress={onCancel}
              fullWidth
              testId="staircase-reset-cancel"
            />
            <View style={styles.spacer} />
            <Button
              variant="destructive"
              size="lg"
              label="リセット"
              onPress={onConfirm}
              fullWidth
              testId="staircase-reset-confirm"
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
    fontSize: fontSize.h3, // 26
    fontWeight: fontWeight.bold as '700',
    marginBottom: spacing.s3,
  },
  message: {
    fontSize: fontSize.body, // 24
    lineHeight: fontSize.body * 1.6,
    marginBottom: spacing.s5,
  },
  actions: {
    flexDirection: 'column',
  },
  spacer: {
    height: spacing.s3,
  },
});
