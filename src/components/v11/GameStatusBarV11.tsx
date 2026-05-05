/**
 * GameStatusBarV11 — GD-1（components.md §2、system.md §1.1）。
 *
 * v1 `GameStatusBar` から「N / M 試行」表記を削除した版（OPT-12：1 セッション 1
 * 試行に統一されたため）。
 *
 * - 高 64px
 * - 左：✕ IconButton lg、aria-label="ゲームを中断"
 * - 中央：「残り N 秒」font.h2 30px Bold tabular-nums、aria-live="polite"
 * - 右：何も置かない
 * - 5 秒以下になったら数値の左に時計絵文字 🕐 を装飾追加（テキスト色は変えない、NF-12）
 */

import React from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import {
  fontSize,
  fontWeight,
  getColors,
  spacing,
} from '../../theme/tokens';
import { IconButton } from '../IconButton';

export type GameStatusBarV11Props = {
  remainingSeconds: number;
  onAbort: () => void;
  testId?: string;
};

export const GameStatusBarV11: React.FC<GameStatusBarV11Props> = ({
  remainingSeconds,
  onAbort,
  testId,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const seconds = Math.max(0, Math.ceil(remainingSeconds));
  // 5 秒以下のときのみ aria-live で読み上げ（v1 の挙動を継承、system.md §1.1）
  const liveMode = seconds <= 5 ? 'polite' : 'none';
  const showWarn = seconds <= 5 && seconds > 0;

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.bgSurface,
          borderBottomColor: colors.borderDefault,
        },
      ]}
      testID={testId ?? 'game-status-bar-v11'}
    >
      <IconButton
        icon="close"
        ariaLabel="ゲームを中断"
        size="lg"
        onPress={onAbort}
        testId="game-status-bar-v11-abort"
      />
      <Text
        accessibilityLiveRegion={liveMode}
        accessibilityLabel={`残り ${seconds} 秒`}
        style={[styles.countdown, { color: colors.fgPrimary }]}
        testID="game-status-bar-v11-countdown"
      >
        {showWarn ? '🕐 ' : ''}残り {seconds} 秒
      </Text>
      {/* 右側は配置しない（components.md §2：試行数表記は廃止）。
          IconButton 左の幅と同等の spacer を置いてカウントダウンを真ん中に保つ */}
      <View style={styles.spacer} accessibilityElementsHidden />
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
    fontSize: fontSize.h2, // 30px
    fontWeight: fontWeight.bold as '700',
    fontVariant: ['tabular-nums'],
  },
  spacer: {
    width: 56, // IconButton size lg と同幅
    height: 56,
  },
});
