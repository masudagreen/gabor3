/**
 * GameStatusBar — components.md §27 に従う。
 *
 * 上部 64px、左に × アイコン、中央に残り秒（30px Bold tabular-nums）、
 * 右に「N / M 試行」（24px）。
 */

import React from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { fontSize, fontWeight, getColors, spacing } from '../theme/tokens';
import { IconButton } from './IconButton';

export type GameStatusBarProps = {
  remainingSeconds: number;
  trialIndex?: number;
  totalTrials?: number;
  onAbort: () => void;
};

export const GameStatusBar: React.FC<GameStatusBarProps> = ({
  remainingSeconds,
  trialIndex,
  totalTrials,
  onAbort,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const liveMode = remainingSeconds <= 5 ? 'polite' : 'none';

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.bgSurface,
          borderBottomColor: colors.borderDefault,
        },
      ]}
    >
      <IconButton
        icon="close"
        ariaLabel="ゲームを中断する"
        size="lg"
        onPress={onAbort}
        testId="status-abort"
      />
      <Text
        accessibilityLiveRegion={liveMode}
        style={[
          styles.countdown,
          { color: colors.fgPrimary },
        ]}
      >
        残り {Math.max(0, Math.ceil(remainingSeconds))} 秒
      </Text>
      {trialIndex !== undefined && totalTrials !== undefined ? (
        <Text style={[styles.trial, { color: colors.fgSecondary }]}>
          {trialIndex} / {totalTrials} 試行
        </Text>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    minHeight: 64,
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s3,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.s4,
  },
  countdown: {
    fontSize: fontSize.h2, // 30px、OPT-7 適合
    fontWeight: fontWeight.bold as '700',
    fontVariant: ['tabular-nums'],
  },
  trial: {
    fontSize: fontSize.body, // 24px
    fontWeight: fontWeight.regular as '400',
    minWidth: 100,
    textAlign: 'right',
  },
  spacer: {
    minWidth: 56,
  },
});
