/**
 * Snackbar — 軽い完了通知（screens.md S7-06 / 設定保存後の通知用）。
 *
 * - 4 秒後に自動で消える（OPT-7 例外：本人確認不要の通知のみ）
 * - dismissible：タップで即時閉じ
 * - 背景は actionPrimary（dark で見やすく）、文字は fgOnPrimary
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fontSize, fontWeight, radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';

export type SnackbarProps = {
  visible: boolean;
  message: string;
  onDismiss: () => void;
  /** 自動 dismiss 秒数。0 なら自動 dismiss しない */
  durationMs?: number;
  testId?: string;
};

export const Snackbar: React.FC<SnackbarProps> = ({
  visible,
  message,
  onDismiss,
  durationMs = 4000,
  testId,
}) => {
  const { colors } = useTheme();

  React.useEffect(() => {
    if (!visible || durationMs <= 0) return;
    const t = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(t);
  }, [visible, durationMs, onDismiss]);

  if (!visible) return null;

  return (
    <View
      style={[
        styles.wrap,
        // RN Web 0.19+ では pointerEvents は style 経由が推奨
        { pointerEvents: 'box-none' },
      ]}
      accessibilityLiveRegion="polite"
      testID={testId ?? 'snackbar'}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${message}（タップで閉じる）`}
        onPress={onDismiss}
        style={[
          styles.bar,
          { backgroundColor: colors.actionPrimary },
        ]}
      >
        <Text style={[styles.text, { color: colors.fgOnPrimary }]}>{message}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.s5,
    alignItems: 'center',
    paddingHorizontal: spacing.s4,
  },
  bar: {
    minHeight: 56,
    paddingHorizontal: spacing.s5,
    paddingVertical: spacing.s3,
    borderRadius: radius.md,
    maxWidth: 480,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: fontSize.body, // 24
    fontWeight: fontWeight.medium as '600',
    textAlign: 'center',
  },
});
