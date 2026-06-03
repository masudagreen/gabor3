/**
 * ConfirmDialog.tsx — DG-1（components.md）。汎用 2 択確認ダイアログ。
 *
 * S2 では F-13「全データ削除」の 2 段階目に使う（中断用途は S5）。
 * 中央モーダル、scrim、role=dialog/aria-modal、初期フォーカスは安全側（キャンセル）。
 * ボタンは縦積み各 56pt 以上。
 */

import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useFocusStyle } from '../../theme/focusStyle';
import { fontSize, fontWeight, radius, spacing, tapTarget } from '../../theme/tokens';

export type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  /** 確認ボタンを danger スタイルに（全データ削除等） */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger,
  onConfirm,
  onCancel,
}) => {
  const { colors } = useTheme();
  const focus = useFocusStyle();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - spacing.s5 * 2, 360);

  const confirmBg = danger ? colors.semanticError : colors.actionPrimary;

  // 安全側「キャンセル」ボタンへ初期フォーカス（S5 評価 Major 修正）。
  // RN-web では autoFocus が効かないため、表示時に DOM ノードへ明示的に focus する。
  // Modal マウント直後はノード未確定のことがあるため次マクロタスクで実行。Native は no-op。
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cancelRef = React.useRef<any>(null);
  React.useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;
    const id = setTimeout(() => {
      const node = cancelRef.current;
      if (node && typeof node.focus === 'function') node.focus();
    }, 0);
    return () => clearTimeout(id);
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.scrim}>
        <View
          accessibilityViewIsModal
          accessibilityRole="alert"
          style={[
            styles.card,
            { backgroundColor: colors.bgSurface, width: cardWidth },
          ]}
        >
          <Text style={[styles.title, { color: colors.fgPrimary }]}>
            {title}
          </Text>
          <Text style={[styles.message, { color: colors.fgSecondary }]}>
            {message}
          </Text>
          <Pressable
            onPress={onConfirm}
            accessibilityRole="button"
            accessibilityLabel={confirmLabel}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: confirmBg },
              focus,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.buttonText, { color: colors.fgOnPrimary }]}>
              {confirmLabel}
            </Text>
          </Pressable>
          <Pressable
            ref={cancelRef}
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
            style={({ pressed }) => [
              styles.button,
              styles.secondary,
              { borderColor: colors.borderDefault, backgroundColor: colors.actionSecondary },
              focus,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.buttonText, { color: colors.fgPrimary }]}>
              {cancelLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.s5,
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing.s5,
  },
  title: {
    fontSize: fontSize.h2,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.s3,
  },
  message: {
    fontSize: fontSize.body,
    lineHeight: fontSize.body * 1.5,
    marginBottom: spacing.s5,
  },
  button: {
    minHeight: tapTarget.recommended,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.s3,
    paddingHorizontal: spacing.s4,
  },
  secondary: {
    borderWidth: 1,
  },
  pressed: { opacity: 0.8 },
  buttonText: {
    fontSize: fontSize.bodyLg,
    fontWeight: fontWeight.bold,
  },
});
