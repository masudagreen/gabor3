/**
 * StatTile.tsx — ST-1（components.md / F-09、v3.0）。
 *
 * 履歴タブの数値タイル。最高到達レベル / 連続日数 / 累計プレイ回数を表示する。
 * - 数値 font.numeric.l 48px Bold tabular-nums + ラベル font.label 24px（components ST-1）。
 * - 連続日数は炎アイコン 🔥 を併記（色 + 形で非依存、NF-12）。0 日でも実値を表示。
 * - 最高到達レベルは color.level.fg で強調（screens.md S8-1）。
 * - カード bg.surface / radius.md。aria-label に「{ラベル} {値}{単位}」を与える。
 *
 * v2.0 の components/v2/StatTile.tsx（スコア管理由来）を v3 トークンに合わせて再実装した版。
 * `highlight` プロップで最高到達レベルの数値色を level.fg に切り替える。
 * 点滅なし（NF-11）。セーフエリアは親（HistoryScreen）が担保（NF-30）。
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import {
  fontSize,
  fontWeight,
  levelV3,
  lineHeight,
  radius,
  spacing,
  tapTarget,
} from '../../theme/tokens';

export type StatTileProps = {
  /** 大きく表示する値（最高到達レベル / 連続日数 / 累計回数 / 累計ゲーム時間など）。 */
  value: number | string;
  /** タイル下のラベル（「最高到達レベル」「連続日数」「累計プレイ回数」）。 */
  label: string;
  /** スクリーンリーダー用の要約（「最高到達レベル 25」等）。 */
  accessibilityLabel: string;
  /** 炎アイコンを数値の前に出すか（連続日数用、NF-12）。 */
  flame?: boolean;
  /** 数値を color.level.fg で強調するか（最高到達レベル用）。 */
  highlight?: boolean;
  /** 長い文字列値（例：累計ゲーム時間「12時間34分」）を一回り小さい字で表示する。 */
  smallValue?: boolean;
  testId?: string;
};

export const StatTile: React.FC<StatTileProps> = ({
  value,
  label,
  accessibilityLabel,
  flame = false,
  highlight = false,
  smallValue = false,
  testId,
}) => {
  const { colors, mode } = useTheme();

  const numColor = flame
    ? colors.streakFlameFg
    : highlight
      ? levelV3[mode].fg
      : colors.fgPrimary;

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
          <Text
            style={styles.flame}
            accessibilityElementsHidden
            importantForAccessibility="no"
            testID={testId ? `${testId}-flame` : undefined}
          >
            🔥
          </Text>
        ) : null}
        <Text
          style={[styles.num, smallValue && styles.numSmall, { color: numColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit
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
    includeFontPadding: false,
    // tabular-nums（桁ぶれ防止、components ST-1）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...({ fontVariant: ['tabular-nums'] } as any),
  },
  numSmall: {
    fontSize: fontSize.h2,
    lineHeight: fontSize.h2 * lineHeight.numeric,
  },
  label: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
});
