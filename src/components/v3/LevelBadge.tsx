/**
 * LevelBadge.tsx — LB-1（components.md / F-02、v3.0 新規）。
 *
 * 現在のレベル番号を示すピル/タイル。ゲーム上部バー・ホーム結果・履歴で共用。
 * 本スプリント（S5）では `inline`（GB-1 内）と `large`（参考実装）を提供する。
 * - inline：font.label 24px Bold tabular-nums「レベル {n}」。color.level.bg ピル + color.level.fg。
 * - large ：font.display 64px Bold +「現在のレベル」ラベル（ホーム結果カード、S7 で本配置）。
 *
 * レベル番号は最大 3 桁（720）想定で桁ぶれしない（tabular-nums）。
 * a11y：aria-label「レベル {n}」（large は「現在のレベル {n}」）。ゲーム中は変動しない（F-02）。
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { fontSize, fontWeight, levelV3, radius, spacing } from '../../theme/tokens';
import { t } from '../../i18n';

export type LevelBadgeProps = {
  level: number;
  variant?: 'inline' | 'large';
  testId?: string;
};

export const LevelBadge: React.FC<LevelBadgeProps> = ({
  level,
  variant = 'inline',
  testId,
}) => {
  const { mode } = useTheme();
  const tokens = levelV3[mode];

  if (variant === 'large') {
    const label = `${t('home.result_label')} ${level}`;
    return (
      <View
        style={styles.largeWrap}
        accessibilityRole="text"
        accessibilityLabel={label}
        testID={testId}
      >
        <Text style={[styles.largeNumber, { color: tokens.fg }]} testID={testId ? `${testId}-number` : undefined}>
          {String(level)}
        </Text>
      </View>
    );
  }

  // inline（ゲーム上部バー）
  return (
    <View
      style={[styles.pill, { backgroundColor: tokens.bg }]}
      accessibilityRole="text"
      accessibilityLabel={t('gameV3.level_label', { n: level })}
      testID={testId}
    >
      <Text
        style={[styles.inlineText, { color: tokens.fg }]}
        testID={testId ? `${testId}-text` : undefined}
      >
        {t('gameV3.level', { n: level })}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.s3,
    paddingVertical: spacing.s1 / 2,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
    includeFontPadding: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...({ fontVariant: ['tabular-nums'] } as any),
  },
  largeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeNumber: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    includeFontPadding: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...({ fontVariant: ['tabular-nums'] } as any),
  },
});
