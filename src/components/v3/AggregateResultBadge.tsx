/**
 * AggregateResultBadge.tsx — OV-3（components.md / F-03、v3.0 改訂）。
 *
 * 刺激領域の直下に 1 個だけ表示する総合マーク（クリア/失敗）。
 * - クリア：緑背景 + ✅ + 「クリア」テキスト（aggregate.clear）
 * - 失敗  ：赤背景 + 「失敗」テキスト（aggregate.fail、否定的 ❌ は控えめ）
 * 色のみに依存せず、背景色 + アイコン + テキストの 3 重で区別（NF-12）。
 * 内部数値（速度・角度・レベル変化数値）は一切出さない（F-03）。
 *
 * a11y：aria-label「クリア」/「失敗」。
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { fontSize, fontWeight, resultV3, spacing } from '../../theme/tokens';
import type { GameResult } from '../../lib/v3/level';
import { t } from '../../i18n';

export type AggregateResultBadgeProps = {
  result: GameResult;
  testId?: string;
};

export const AggregateResultBadge: React.FC<AggregateResultBadgeProps> = ({
  result,
  testId,
}) => {
  const { mode } = useTheme();
  const tokens = resultV3[mode];
  const isClear = result === 'clear';
  const bg = isClear ? tokens.aggregateClearBg : tokens.aggregateFailBg;
  const fg = isClear ? tokens.aggregateClearFg : tokens.aggregateFailFg;
  const label = isClear
    ? t('resultV3.aggregate_clear')
    : t('resultV3.aggregate_fail');

  return (
    <View
      style={[styles.badge, { backgroundColor: bg }]}
      accessibilityRole="text"
      accessibilityLabel={label}
      testID={testId}
    >
      {isClear ? (
        <Text style={[styles.icon, { color: fg }]}>✓</Text>
      ) : null}
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    minHeight: 56,
    borderRadius: 9999,
    paddingHorizontal: spacing.s5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s2,
  },
  icon: {
    fontSize: 30,
    fontWeight: '900',
    includeFontPadding: false,
  },
  text: {
    fontSize: fontSize.bodyLg,
    fontWeight: fontWeight.bold,
    includeFontPadding: false,
  },
});
