/**
 * TabPlaceholderScreen.tsx — 履歴 / 設定タブの暫定プレースホルダ（S6）。
 *
 * S6 はタブ切替の骨格を通すスプリント。履歴（F-09）は S8、設定（F-13）は S7 で
 * 本実装する。本画面は「準備中」を提示するだけのセーフエリア準拠（NF-30）画面。
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { fontSize, fontWeight, lineHeight, spacing } from '../../theme/tokens';

export type TabPlaceholderScreenProps = {
  title: string;
  body: string;
  testId?: string;
};

export const TabPlaceholderScreen: React.FC<TabPlaceholderScreenProps> = ({
  title,
  body,
  testId,
}) => {
  const { colors } = useTheme();
  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.root, { backgroundColor: colors.bgCanvas }]}
      testID={testId}
    >
      <View style={styles.content}>
        <Text
          style={[styles.title, { color: colors.fgPrimary }]}
          accessibilityRole="header"
        >
          {title}
        </Text>
        <Text style={[styles.body, { color: colors.fgSecondary }]}>{body}</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.s5,
    gap: spacing.s4,
  },
  title: {
    fontSize: fontSize.h1,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  body: {
    fontSize: fontSize.body,
    lineHeight: fontSize.body * lineHeight.body,
    textAlign: 'center',
  },
});
