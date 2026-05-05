/**
 * StreakBadge — components.md §24 / screens.md S6-04。
 *
 * - 炎アイコン + 数値 (font.numeric.l = 48px) +「日連続」(font.body 24px)
 * - 炎アイコン色：light `#7A3C00`（8.49:1） / dark `#FFB266`（10.09:1）
 * - 0 日時：「コースを始めて、連続記録をスタート」
 * - resetWarning=true：警告色背景 + 「今日終わるとリセットされます」
 *   （22 時以降未完了の判定は呼び出し側で行う、screens.md S6-04 / spec.md §9.3）
 *
 * a11y：
 *   - 「現在 23 日連続。最長 30 日」
 *   - 警告メッセージは role="status" + aria-live="polite"
 */
import React from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import {
  fontSize,
  fontWeight,
  getColors,
  palette,
  radius,
  spacing,
} from '../theme/tokens';

export type StreakBadgeProps = {
  currentStreak: number;
  longestStreak?: number;
  /** 22 時以降で「今日終わるとリセット」警告を出すか */
  resetWarning?: boolean;
  testId?: string;
};

export const StreakBadge: React.FC<StreakBadgeProps> = ({
  currentStreak,
  longestStreak,
  resetWarning = false,
  testId,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const flameColor = palette[scheme].streakFlameFg;
  const flameBg = palette[scheme].streakFlameBg;
  const warningBg =
    scheme === 'light' ? '#FFF3E0' : '#3E2D0A';

  const hasStreak = currentStreak > 0;

  let ariaLabel: string;
  if (!hasStreak) {
    ariaLabel = '連続記録なし。コースを始めて、連続記録をスタート';
  } else {
    ariaLabel = `現在 ${currentStreak} 日連続`;
    if (typeof longestStreak === 'number' && longestStreak > 0) {
      ariaLabel += `。最長 ${longestStreak} 日`;
    }
  }

  return (
    <View
      testID={testId}
      accessibilityLabel={ariaLabel}
      style={[
        styles.card,
        {
          backgroundColor: resetWarning
            ? warningBg
            : hasStreak
              ? flameBg
              : colors.bgSurface,
          borderColor: colors.borderDefault,
        },
      ]}
    >
      <View style={styles.row}>
        <Text
          style={[styles.flame, { color: flameColor }]}
          accessibilityElementsHidden
        >
          🔥
        </Text>
        {hasStreak ? (
          <View style={styles.numCol}>
            <Text style={[styles.number, { color: colors.fgPrimary }]}>
              {currentStreak}
            </Text>
            <Text style={[styles.unit, { color: colors.fgPrimary }]}>
              日連続
            </Text>
          </View>
        ) : (
          <Text style={[styles.empty, { color: colors.fgPrimary }]}>
            コースを始めて、{'\n'}連続記録をスタート
          </Text>
        )}
      </View>
      {resetWarning ? (
        <Text
          testID="streak-reset-warning"
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
          style={[
            styles.warning,
            { color: colors.fgPrimary, borderTopColor: colors.borderDefault },
          ]}
        >
          ⚠ 今日終わるとリセットされます
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.s5,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.s3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s4,
  },
  flame: {
    fontSize: 36,
  },
  numCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.s3,
  },
  number: {
    fontSize: fontSize.numericL, // 48px
    fontWeight: fontWeight.bold as '700',
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontSize: fontSize.body, // 24px
  },
  empty: {
    fontSize: fontSize.body, // 24px
    flex: 1,
  },
  warning: {
    fontSize: fontSize.body, // 24px
    fontWeight: fontWeight.bold as '700',
    paddingTop: spacing.s3,
    borderTopWidth: 1,
  },
});
