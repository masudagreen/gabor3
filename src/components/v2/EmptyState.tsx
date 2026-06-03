/**
 * EmptyState.tsx — EM-1（S7、F-09）。
 *
 * データ少時・空時の案内。アイコン + 文言 24px（components EM-1）。
 * 履歴 7 日未満「もう少しデータが集まると傾向が見えます」等に使う。
 * 点滅なし（NF-11）。色のみに依存しない（テキストで案内）。
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { fontSize, fontWeight, lineHeight, spacing } from '../../theme/tokens';

export type EmptyStateProps = {
  /** 案内文言（24px 以上）。 */
  message: string;
  /** 任意の先頭アイコン（絵文字）。装飾のため a11y からは隠す。 */
  icon?: string;
  testId?: string;
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  message,
  icon = '📈',
  testId,
}) => {
  const { colors } = useTheme();
  return (
    <View style={styles.root} accessible accessibilityRole="text" testID={testId}>
      <Text style={styles.icon} accessibilityElementsHidden importantForAccessibility="no">
        {icon}
      </Text>
      <Text style={[styles.message, { color: colors.fgSecondary }]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.s6,
    paddingHorizontal: spacing.s4,
    gap: spacing.s3,
  },
  icon: { fontSize: fontSize.h1 },
  message: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    lineHeight: fontSize.body * lineHeight.body,
    textAlign: 'center',
  },
});
