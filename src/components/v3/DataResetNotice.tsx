/**
 * DataResetNotice.tsx — RZ-1（components.md / F-11）v3.0（i18n 化）。
 *
 * 起動時に旧名前空間（v1〜v2）を消去・v3 初期化した「初回のみ 1 度」表示する通知モーダル。
 * OK（64px ≧ 56pt）で閉じる。role=dialog、OK に初期フォーカス（NF-9）。
 * 表示制御（1 度だけ）は呼び出し側（起動フロー）が migration の shouldShowNotice で行う。
 *
 * v2 の DataResetNotice（文言ハードコード）を v3 で i18n キー（dataResetV3.*）化したもの。
 */

import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useFocusStyle } from '../../theme/focusStyle';
import { fontSize, fontWeight, lineHeight, radius, spacing, tapTarget } from '../../theme/tokens';
import { t } from '../../i18n';

export type DataResetNoticeProps = {
  visible: boolean;
  onAcknowledge: () => void;
  testId?: string;
};

export const DataResetNotice: React.FC<DataResetNoticeProps> = ({
  visible,
  onAcknowledge,
  testId,
}) => {
  const { colors } = useTheme();
  const focus = useFocusStyle();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - spacing.s5 * 2, 360);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.scrim}>
        <View
          accessibilityViewIsModal
          accessibilityRole="alert"
          accessibilityLabel={t('dataResetV3.title')}
          style={[
            styles.card,
            { backgroundColor: colors.bgSurface, width: cardWidth },
          ]}
          testID={testId}
        >
          <Text style={[styles.title, { color: colors.fgPrimary }]}>
            {t('dataResetV3.title')}
          </Text>
          <Text style={[styles.message, { color: colors.fgSecondary }]}>
            {t('dataResetV3.body')}
          </Text>
          <Pressable
            onPress={onAcknowledge}
            accessibilityRole="button"
            accessibilityLabel={t('dataResetV3.cta')}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {...({ autoFocus: true } as any)}
            style={({ pressed }) => [
              styles.okButton,
              { backgroundColor: colors.actionPrimary },
              focus,
              pressed && styles.pressed,
            ]}
            testID={testId ? `${testId}-ok` : undefined}
          >
            <Text style={[styles.okText, { color: colors.fgOnPrimary }]}>
              {t('dataResetV3.cta')}
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
    marginBottom: spacing.s4,
  },
  message: {
    fontSize: fontSize.body,
    lineHeight: fontSize.body * lineHeight.body,
    marginBottom: spacing.s6,
  },
  okButton: {
    minHeight: tapTarget.buttonLg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.8 },
  okText: {
    fontSize: fontSize.bodyLg,
    fontWeight: fontWeight.bold,
  },
});
