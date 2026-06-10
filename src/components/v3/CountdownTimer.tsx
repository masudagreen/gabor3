/**
 * CountdownTimer.tsx — CD-1（components.md / F-12、v3.0）。
 *
 * 数字のみ・3 段階色・太字補強・点滅なし（F-12）。
 * - 通常（残り 6 秒+）：normal 色 + Bold(700)
 * - ≤5 秒：warn（黄/暗赤）+ Bold(700)
 * - ≤3 秒：danger（赤/暗赤）+ Black(900)
 * サイズは段階で変えない（位置ジャンプ回避）。tabular-nums で桁ぶれ防止。
 *
 * 不透明背景の担保（system §1.4 / GB-1）：数字直下に countdownV2.bg の不透明ピルを
 * 敷く（A+B 併用でガボール縞が実効背景に混入しない）。inline はゲーム上部バーが
 * 常に暗い不透明バーのため、アプリのライト/ダークに関わらず暗トークンを使う
 *（白→黄→赤の 3 段階が両テーマで AAA、F-12）。
 *
 * バリアント：inline（font.h2 30px）/ large（距離リマインド、72px、S7）/
 * stage（v3.1：プレイ中の制限時間。格子の上＝メイン画面上部に大きめ、numeric.l 48px・太字・不透明プレート。
 *   段階色は danger（≤3 秒、赤）のみ。warn（5・4 秒）は黄にせず白のまま＝ユーザー要望）/
 * disclosure（v3.1：ラウンド締切後の 3 秒開示。メイン画面上部、font.h1 36px（stage より一回り小さい）、
 *   文字色は白（ユーザー要望）+ Bold、不透明プレート。3 秒は確定値。components.md CD-1 / system §16.1）。
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { countdownV2, fontSize, fontWeight, radius, spacing } from '../../theme/tokens';
import { countdownAriaLive, countdownTier } from '../../lib/v3/gameView';
import { t } from '../../i18n';

export type CountdownTimerProps = {
  /** 残り秒数（整数）。0 で停止扱い。 */
  remainingSec: number;
  variant?: 'inline' | 'large' | 'stage' | 'disclosure';
  testId?: string;
};

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  remainingSec,
  variant = 'inline',
  testId,
}) => {
  const { mode } = useTheme();
  // inline / stage / disclosure はガボール背景上のため常に暗トークン（不透明プレート）。large はテーマ追従。
  const tokens = variant === 'large' ? countdownV2[mode] : countdownV2.dark;
  // disclosure は白固定（ユーザー要望）。stage は warn（5・4 秒）を黄にせず白のまま、danger（≤3 秒）のみ赤。
  let tier = variant === 'disclosure' ? 'normal' : countdownTier(remainingSec);
  if (variant === 'stage' && tier === 'warn') tier = 'normal';

  const color =
    tier === 'danger' ? tokens.danger : tier === 'warn' ? tokens.warn : tokens.normal;
  // 太字補強（NF-12）：danger は Black(900)、それ以外は Bold(700)。
  const weight = tier === 'danger' ? '900' : fontWeight.bold;
  const numberSize =
    variant === 'large'
      ? fontSize.numericXl
      : variant === 'stage'
        ? fontSize.numericL
        : variant === 'disclosure'
          ? fontSize.h1
          : fontSize.h2;
  // disclosure は全区間 assertive（3/2/1 を毎秒読み上げ、components.md CD-1）。
  const liveRegion =
    variant === 'disclosure' ? 'assertive' : countdownAriaLive(remainingSec);
  const a11yLabel =
    variant === 'disclosure'
      ? t('gameV3.disclosure_countdown', { n: remainingSec })
      : t('gameV3.countdown_remaining', { n: remainingSec });

  return (
    <View
      style={[
        styles.pill,
        variant === 'large' && styles.pillLarge,
        (variant === 'stage' || variant === 'disclosure') && styles.pillStage,
        { backgroundColor: tokens.bg },
      ]}
      accessibilityRole="text"
      accessibilityLabel={a11yLabel}
      accessibilityLiveRegion={liveRegion}
      // Web の aria-live を react-native-web に透過
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...({ 'aria-live': liveRegion } as any)}
      testID={testId}
    >
      <Text
        style={[styles.number, { color, fontSize: numberSize, fontWeight: weight }]}
        testID={testId ? `${testId}-number` : 'countdown-number-v3'}
      >
        {String(remainingSec)}
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
    minWidth: 56,
  },
  pillLarge: {
    paddingHorizontal: spacing.s5,
    paddingVertical: spacing.s2,
  },
  pillStage: {
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s1,
    minWidth: 72,
  },
  number: {
    // react-native-web で tabular-nums を効かせる（桁ぶれ防止）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...({ fontVariant: ['tabular-nums'] } as any),
    textAlign: 'center',
    includeFontPadding: false,
  },
});
