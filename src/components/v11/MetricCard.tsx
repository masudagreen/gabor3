/**
 * MetricCard — MC-1（components.md §7）。
 *
 * F-10 結果サマリの数値カード（「今回の閾値」「前回比」など）。
 *
 * - Card variant=outlined、padding 24px、minHeight 140px
 * - 値は font.h2 30px Bold tabular-nums
 * - ラベル font.body 24px、color.fg.secondary
 * - diff の direction による装飾色（テキスト本体は color.fg.primary のまま、§1.4 制約遵守）：
 *   - improved: 矢印 success、「改善」テキスト
 *   - flat: 矢印水平 muted、「同等」
 *   - worsened: 矢印 warning、「やや低下」
 * - diff が undefined のとき：
 *     - showInitialMeasurementHint=true（前回比カードの既定）：「初回測定」を fgMuted で表示
 *     - showInitialMeasurementHint=false（今回の閾値カードなど）：何も表示しない
 *
 * Sprint 10 の m-3 修正：「今回の閾値」では「初回測定」を出さないようにする
 * （冗長表示の解消、screens.md §4 より「前回比」カードでのみ表示）。
 */

import React from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import {
  fontSize,
  fontWeight,
  getColors,
  radius,
  spacing,
} from '../../theme/tokens';

export type MetricDiff = {
  /** 表示する符号（"+"/"-"/"0"）。direction とは独立に保持 */
  sign: '+' | '-' | '0';
  magnitude: string;
  direction: 'improved' | 'flat' | 'worsened';
};

export type MetricCardProps = {
  label: string;
  value: string;
  unit?: string;
  diff?: MetricDiff;
  /**
   * diff が undefined のとき「初回測定」テキストを描画するか。
   * - 「前回比」カード（既定 true）：初回測定を表示
   * - 「今回の閾値」カード（false 指定）：何も表示しない（Sprint 10 m-3）
   */
  showInitialMeasurementHint?: boolean;
  testId?: string;
};

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  diff,
  showInitialMeasurementHint = true,
  testId,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  const diffNode = renderDiff(diff, colors, showInitialMeasurementHint);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.bgSurface,
          borderColor: colors.borderDefault,
        },
      ]}
      testID={testId ?? 'metric-card'}
      accessibilityRole="text"
      accessibilityLabel={composeAriaLabel(
        label,
        value,
        unit,
        diff,
        showInitialMeasurementHint,
      )}
    >
      <Text style={[styles.label, { color: colors.fgSecondary }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.fgPrimary }]}>
        {value}
      </Text>
      {unit ? (
        <Text style={[styles.unit, { color: colors.fgMuted }]}>{unit}</Text>
      ) : null}
      {diffNode !== null ? <View style={styles.diff}>{diffNode}</View> : null}
    </View>
  );
};

function renderDiff(
  diff: MetricDiff | undefined,
  colors: ReturnType<typeof getColors>,
  showInitialMeasurementHint: boolean,
): React.ReactNode {
  if (!diff) {
    if (!showInitialMeasurementHint) return null;
    return (
      <Text
        style={{
          fontSize: fontSize.body,
          color: colors.fgMuted,
        }}
      >
        初回測定
      </Text>
    );
  }
  const { sign, magnitude, direction } = diff;
  let arrow = '→';
  let arrowColor = colors.fgMuted;
  let directionText = '同等';
  if (direction === 'improved') {
    arrow = sign === '-' ? '↓' : '↑';
    arrowColor = colors.semanticSuccess;
    directionText = '改善';
  } else if (direction === 'worsened') {
    arrow = sign === '-' ? '↓' : '↑';
    arrowColor = colors.semanticWarning;
    directionText = 'やや低下';
  } else {
    arrow = '→';
    arrowColor = colors.fgMuted;
    directionText = '同等';
  }
  return (
    <Text
      style={{
        fontSize: fontSize.body,
        fontWeight: fontWeight.bold as '700',
        color: colors.fgPrimary,
      }}
    >
      {`${sign === '0' ? '' : sign}${magnitude} `}
      <Text style={{ color: arrowColor }}>{arrow}</Text>
      {` ${directionText}`}
    </Text>
  );
}

function composeAriaLabel(
  label: string,
  value: string,
  unit: string | undefined,
  diff: MetricDiff | undefined,
  showInitialMeasurementHint: boolean,
): string {
  const parts: string[] = [label, value];
  if (unit) parts.push(unit);
  if (diff) {
    const dir =
      diff.direction === 'improved'
        ? '改善'
        : diff.direction === 'worsened'
          ? 'やや低下'
          : '同等';
    parts.push(`前回比 ${diff.sign === '0' ? '' : diff.sign}${diff.magnitude} ${dir}`);
  } else if (showInitialMeasurementHint) {
    parts.push('初回測定');
  }
  return parts.join('、');
}

const styles = StyleSheet.create({
  card: {
    flexBasis: '45%',
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 140,
    padding: spacing.s5,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s2,
  },
  label: {
    fontSize: fontSize.body, // 24
    textAlign: 'center',
  },
  value: {
    fontSize: fontSize.h2, // 30
    fontWeight: fontWeight.bold as '700',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  unit: {
    fontSize: fontSize.body, // 24
    textAlign: 'center',
  },
  diff: {
    marginTop: spacing.s2,
  },
});
