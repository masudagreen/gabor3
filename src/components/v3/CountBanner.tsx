/**
 * CountBanner.tsx — CB-1（components.md / F-02、v3.0 新規）。
 *
 * 探すべき回転パッチの個数を明示する案内（「◯個探せ！」）。
 * - 位置：v3.1 改訂で**格子の下**に表示（格子に被らない、ユーザー要望）。
 * - テキスト：game.count.findN「{n} 個探せ！」を font.body.lg 26px Bold（18pt 以上）。
 *   ガボール背景 #808080 に縞が被らないよう不透明ピル（bg.surface）を敷く。色 fg.primary。
 * - ゲーム開始時点で確定、ゲーム中に変動しない（F-02 受け入れ基準）。
 *
 * a11y：aria-label「{n} 個の回転を探してください」。
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { fontSize, fontWeight, radius, spacing } from '../../theme/tokens';
import { t } from '../../i18n';

export type CountBannerProps = {
  count: number;
  testId?: string;
};

export const CountBanner: React.FC<CountBannerProps> = ({ count, testId }) => {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.pill, { backgroundColor: colors.bgSurface }]}
      accessibilityRole="text"
      accessibilityLabel={t('gameV3.count_label', { n: count })}
      testID={testId}
    >
      <Text
        style={[styles.text, { color: colors.fgPrimary }]}
        testID={testId ? `${testId}-text` : undefined}
      >
        {t('gameV3.count_find_n', { n: count })}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.s5,
    paddingVertical: spacing.s2,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: fontSize.bodyLg,
    fontWeight: fontWeight.bold,
    includeFontPadding: false,
  },
});
