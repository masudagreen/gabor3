/**
 * ConfirmDialog.tsx — DG-1（components.md / screens.md S6-2）v3.0。
 *
 * 汎用 2 択確認ダイアログ。S6 では F-07「中断（プレイ中のみ）」に使う。
 * 中央モーダル、scrim（背後ゲームが透ける）、role=dialog / aria-modal。
 * 初期フォーカスは安全側（キャンセル＝「続ける」）。Esc = キャンセル。
 * ボタンは縦積み各 56pt 以上（spec F-07：48pt 以上）。
 *
 * a11y（screens.md S6-2）：role="dialog" aria-modal="true" aria-labelledby、
 * 初期フォーカスは安全側「続ける」、Esc = キャンセル、フォーカストラップ（Web）。
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
import {
  fontSize,
  fontWeight,
  radius,
  spacing,
  tapTarget,
} from '../../theme/tokens';

export type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  /** 確認ボタンを danger スタイルに（全データ削除等）。中断は false。 */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  testId?: string;
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
  testId,
}) => {
  const { colors } = useTheme();
  const focus = useFocusStyle();
  const { width } = useWindowDimensions();
  // スマホ 360px / PC 480px 最大幅（screens.md S6-2）。
  const cardWidth = Math.min(width - spacing.s5 * 2, width >= 600 ? 480 : 360);

  const confirmBg = danger ? colors.semanticError : colors.actionPrimary;

  // 安全側「続ける（キャンセル）」へ初期フォーカス（screens.md S6-2）。
  // RN-web では autoFocus が効かないため、表示時に DOM ノードへ明示 focus する。
  // Native は no-op。
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

  // Esc = キャンセル（続ける）。Web のみ（screens.md S6-2）。
  const onCancelRef = React.useRef(onCancel);
  onCancelRef.current = onCancel;
  React.useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancelRef.current();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [visible]);

  const titleId = testId ? `${testId}-title` : 'confirm-dialog-title';

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
          // react-native-web：role=dialog + aria-modal + aria-labelledby（screens.md S6-2）
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {...(Platform.OS === 'web'
            ? ({
                role: 'dialog',
                'aria-modal': true,
                'aria-labelledby': titleId,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as any)
            : {})}
          style={[
            styles.card,
            { backgroundColor: colors.bgSurface, width: cardWidth },
          ]}
          testID={testId}
        >
          <Text
            nativeID={titleId}
            style={[styles.title, { color: colors.fgPrimary }]}
            accessibilityRole="header"
          >
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
            testID={testId ? `${testId}-confirm` : undefined}
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
              {
                borderColor: colors.borderDefault,
                backgroundColor: colors.actionSecondary,
              },
              focus,
              pressed && styles.pressed,
            ]}
            testID={testId ? `${testId}-cancel` : undefined}
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
    // scrim（背後ゲームが透ける、system §1.3 color.bg.scrim）。
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
    minHeight: tapTarget.recommended, // 56pt（>= 48pt、F-07）
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
