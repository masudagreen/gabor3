/**
 * DataResetNotice.tsx — RZ-1（components.md）/ F-11。
 *
 * 起動時に旧名前空間を消去・v2 初期化した「初回のみ 1 度」表示する通知モーダル。
 * OK（64px ≧ 56pt）で閉じる。role=dialog、OK に初期フォーカス。
 * 表示制御（1 度だけ）は呼び出し側（起動フロー S6）が migration の shouldShowNotice で行う。
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
import { fontSize, fontWeight, radius, spacing, tapTarget } from '../../theme/tokens';

export type DataResetNoticeProps = {
  visible: boolean;
  onAcknowledge: () => void;
};

export const RESET_NOTICE_TITLE = '最新版へのアップデート';
export const RESET_NOTICE_MESSAGE =
  '最新版へのアップデートのため、過去データをリセットしました';

export const DataResetNotice: React.FC<DataResetNoticeProps> = ({
  visible,
  onAcknowledge,
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
          accessibilityLabel={RESET_NOTICE_TITLE}
          style={[
            styles.card,
            { backgroundColor: colors.bgSurface, width: cardWidth },
          ]}
        >
          <Text style={[styles.title, { color: colors.fgPrimary }]}>
            {RESET_NOTICE_TITLE}
          </Text>
          <Text style={[styles.message, { color: colors.fgSecondary }]}>
            {RESET_NOTICE_MESSAGE}
          </Text>
          <Pressable
            onPress={onAcknowledge}
            accessibilityRole="button"
            accessibilityLabel="OK"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {...({ autoFocus: true } as any)}
            style={({ pressed }) => [
              styles.okButton,
              { backgroundColor: colors.actionPrimary },
              focus,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.okText, { color: colors.fgOnPrimary }]}>OK</Text>
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
    lineHeight: fontSize.body * 1.5,
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
