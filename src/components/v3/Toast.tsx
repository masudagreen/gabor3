/**
 * Toast.tsx — 軽量インライン通知（screens.md S3-1）v3.0。
 *
 * 設定画面でのクランプ通知（§4.5「現在レベルは {N} に調整されました」）や
 * 最低 1 値違反案内に使う。点滅なし（NF-11）。aria-live="polite" で読み上げ（Web）。
 * 自動消滅はせず、呼び出し側が message を null にして閉じる（テスト容易性）。
 */

import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { fontSize, fontWeight, radius, spacing } from '../../theme/tokens';

export type ToastProps = {
  /** 表示メッセージ。null/空なら何も描画しない。 */
  message: string | null;
  /** エラー調（最低 1 値違反等）。既定は通知調。 */
  tone?: 'info' | 'error';
  testId?: string;
};

export const Toast: React.FC<ToastProps> = ({ message, tone = 'info', testId }) => {
  const { colors } = useTheme();
  if (!message) return null;
  const fg = tone === 'error' ? colors.semanticError : colors.fgPrimary;
  return (
    <View
      // 読み上げ（screens.md S3-1：aria-live で順序変更/クランプを案内）
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...(Platform.OS === 'web'
        ? ({ role: 'status', 'aria-live': 'polite' } as any)
        : {})}
      accessibilityLiveRegion="polite"
      style={[
        styles.toast,
        {
          backgroundColor: colors.bgSurfaceRaised,
          borderColor: tone === 'error' ? colors.semanticError : colors.borderDefault,
        },
      ]}
      testID={testId}
    >
      <Text style={[styles.text, { color: fg }]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  toast: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s3,
    marginVertical: spacing.s2,
  },
  text: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    lineHeight: fontSize.caption * 1.5,
  },
});
