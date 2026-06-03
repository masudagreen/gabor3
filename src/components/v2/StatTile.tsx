/**
 * StatTile.tsx — ST-1（S7、F-09）。
 *
 * 連続日数 / 累計プレイ回数を表示する数値タイル。
 * - 数値 48px Bold tabular-nums + ラベル 24px（components ST-1）。
 * - 連続日数は炎アイコン 🔥 を併記（色 + 形で非依存、NF-12）。0 日でも実値を表示。
 * - カード bg.surface / radius.md。aria-label に「{ラベル} {値}{単位}」を与える。
 *
 * 点滅なし（NF-11）。セーフエリアは親（HistoryScreen）が担保（NF-30）。
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import {
  fontSize,
  fontWeight,
  lineHeight,
  radius,
  spacing,
  tapTarget,
} from '../../theme/tokens';

export type StatTileProps = {
  /** 大きく表示する数値（連続日数 / 累計回数）。 */
  value: number;
  /** タイル下のラベル（「連続日数」「累計プレイ回数」）。 */
  label: string;
  /** スクリーンリーダー用の要約（「連続日数 5 日」等）。 */
  accessibilityLabel: string;
  /** 炎アイコンを数値の前に出すか（連続日数用）。 */
  flame?: boolean;
  testId?: string;
};

export const StatTile: React.FC<StatTileProps> = ({
  value,
  label,
  accessibilityLabel,
  flame = false,
  testId,
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
      ]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      testID={testId}
    >
      <View style={styles.numRow}>
        {flame ? (
          <Text style={styles.flame} accessibilityElementsHidden importantForAccessibility="no">
            🔥
          </Text>
        ) : null}
        <Text
          style={[styles.num, { color: flame ? colors.streakFlameFg : colors.fgPrimary }]}
          testID={testId ? `${testId}-value` : undefined}
        >
          {String(value)}
        </Text>
      </View>
      <Text style={[styles.label, { color: colors.fgSecondary }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.s4,
    alignItems: 'center',
    minHeight: tapTarget.listItem,
    justifyContent: 'center',
    gap: spacing.s1,
  },
  numRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s1,
  },
  flame: { fontSize: fontSize.h3 },
  num: {
    fontSize: fontSize.numericL,
    fontWeight: fontWeight.bold,
    lineHeight: fontSize.numericL * lineHeight.numeric,
    // tabular-nums（桁ぶれ防止、components ST-1）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...({ fontVariant: ['tabular-nums'] } as any),
  },
  label: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
});
