/**
 * AggregateResultBadge.tsx — OV-3（components.md / F-03）。
 *
 * 刺激領域の直下に 1 個だけ表示する総合マーク。
 * - success：緑背景 + 白/黒チェック（aggregate.success）
 * - danger：赤背景 + ❌（aggregate.danger）
 * 直径 56px 相当のピル、アイコンのみ（テキスト・数値なし、F-03）。
 *
 * a11y：aria-label「正解」/「不正解」。
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { resultV2, spacing } from '../../theme/tokens';
import { AggregateKind } from '../../lib/v2/gameView';
import { t } from '../../i18n';

export type AggregateResultBadgeProps = {
  kind: AggregateKind;
  testId?: string;
};

export const AggregateResultBadge: React.FC<AggregateResultBadgeProps> = ({
  kind,
  testId,
}) => {
  const { mode } = useTheme();
  const tokens = resultV2[mode];
  const bg = kind === 'success' ? tokens.aggregateSuccessBg : tokens.aggregateDangerBg;
  const label = kind === 'success' ? t('result.correct') : t('result.wrong');

  return (
    <View
      style={[styles.badge, { backgroundColor: bg }]}
      accessibilityRole="image"
      accessibilityLabel={label}
      testID={testId}
    >
      <Text style={[styles.icon, { color: tokens.aggregateFg }]}>
        {kind === 'success' ? '✓' : '✕'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    minWidth: 56,
    height: 56,
    borderRadius: 9999,
    paddingHorizontal: spacing.s4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
