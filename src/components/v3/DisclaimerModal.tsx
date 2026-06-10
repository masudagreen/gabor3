/**
 * DisclaimerModal.tsx — 免責事項の再閲覧（F-10 / screens.md S3-1）v3.0。
 *
 * 設定の「免責事項を読む」から開く閲覧のみモーダル（同意ボタンなし、components.md DC-1）。
 * 中身は DisclaimerPanel（v2 から流用）。中央モーダル、scrim、role=dialog、閉じるボタン
 * 56pt 以上。Esc / onRequestClose で閉じる（Web）。
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
import { DisclaimerPanel } from '../v2/DisclaimerPanel';
import { fontSize, fontWeight, radius, spacing, tapTarget } from '../../theme/tokens';
import { t } from '../../i18n';

export type DisclaimerModalProps = {
  visible: boolean;
  onClose: () => void;
  testId?: string;
};

export const DisclaimerModal: React.FC<DisclaimerModalProps> = ({
  visible,
  onClose,
  testId,
}) => {
  const { colors } = useTheme();
  const focus = useFocusStyle();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - spacing.s5 * 2, width >= 600 ? 560 : 360);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const closeRef = React.useRef<any>(null);
  React.useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;
    const id = setTimeout(() => {
      const node = closeRef.current;
      if (node && typeof node.focus === 'function') node.focus();
    }, 0);
    return () => clearTimeout(id);
  }, [visible]);

  const titleId = testId ? `${testId}-title` : 'disclaimer-modal-title';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.scrim}>
        <View
          accessibilityViewIsModal
          accessibilityRole="alert"
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
            accessibilityRole="header"
            style={[styles.title, { color: colors.fgPrimary }]}
          >
            {t('settingsV3.disclaimer_modal_title')}
          </Text>
          <DisclaimerPanel testId={testId ? `${testId}-panel` : undefined} />
          <Pressable
            ref={closeRef}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            style={({ pressed }) => [
              styles.button,
              {
                borderColor: colors.borderDefault,
                backgroundColor: colors.actionSecondary,
              },
              focus,
              pressed && styles.pressed,
            ]}
            testID={testId ? `${testId}-close` : undefined}
          >
            <Text style={[styles.buttonText, { color: colors.fgPrimary }]}>
              {t('common.close')}
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
    gap: spacing.s4,
  },
  title: {
    fontSize: fontSize.h2,
    fontWeight: fontWeight.bold,
  },
  button: {
    minHeight: tapTarget.recommended,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.s4,
  },
  pressed: { opacity: 0.8 },
  buttonText: {
    fontSize: fontSize.bodyLg,
    fontWeight: fontWeight.bold,
  },
});
