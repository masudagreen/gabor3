/**
 * CountdownTimer.tsx — CD-1（components.md / F-12）。
 *
 * 数字のみ・3 段階色・太字補強・点滅なし。
 * - 通常（残り 6 秒+）：normal 色 + Bold(700)
 * - ≤5 秒：warn（黄/暗赤）+ Bold(700)
 * - ≤3 秒：danger（赤/暗赤）+ Black(900)
 * サイズは段階で変えない（位置ジャンプ回避）。tabular-nums で桁ぶれ防止。
 *
 * 不透明背景の担保（system §1.4 / GB-1）：本コンポーネントは数字直下に
 * `countdownV2.bg` の不透明ピルを敷く（defense in depth）。GameTopBar 側でも
 * バー全体を不透明にしており、A+B 併用でガボール縞が実効背景に混入しない。
 *
 * バリアント：
 * - inline：ゲーム上部バー（font.h2 30px）
 * - large：距離リマインド中央（font.numeric.xl 72px）。S6 で使用。
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { countdownV2, fontSize, fontWeight, radius, spacing } from '../../theme/tokens';
import { countdownAriaLive, countdownTier } from '../../lib/v2/gameView';
import { t } from '../../i18n';

export type CountdownTimerProps = {
  /** 残り秒数（整数）。0 で停止扱い。 */
  remainingSec: number;
  variant?: 'inline' | 'large';
  testId?: string;
};

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  remainingSec,
  variant = 'inline',
  testId,
}) => {
  const { mode } = useTheme();
  // inline（ゲーム上部バー）は常に暗いガボール上に重なる固定の暗バーのため、
  // アプリのライト/ダークに関わらず暗トークンを使う（白→黄→赤の 3 段階が全て AAA、F-12）。
  // light の暗バー化で warn/danger が同色（暗赤）に潰れる S5 評価 Minor を解消。
  // large（距離リマインド、通常テーマ画面）はテーマ追従のまま。
  const tokens = variant === 'inline' ? countdownV2.dark : countdownV2[mode];
  const tier = countdownTier(remainingSec);

  const color =
    tier === 'danger' ? tokens.danger : tier === 'warn' ? tokens.warn : tokens.normal;
  // 太字補強（NF-12）：danger は Black(900)、それ以外は Bold(700)
  const weight = tier === 'danger' ? '900' : fontWeight.bold;
  const numberSize = variant === 'large' ? fontSize.numericXl : fontSize.h2;

  return (
    <View
      style={[
        styles.pill,
        variant === 'large' && styles.pillLarge,
        { backgroundColor: tokens.bg },
      ]}
      // 数値のみだと SR が単位を読まないため remaining 文言を label に持たせる
      accessibilityRole="text"
      accessibilityLabel={t('game.countdown_remaining', { n: remainingSec })}
      accessibilityLiveRegion={countdownAriaLive(remainingSec)}
      // Web の aria-live を react-native-web に透過
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...({ 'aria-live': countdownAriaLive(remainingSec) } as any)}
      testID={testId}
    >
      <Text
        style={[styles.number, { color, fontSize: numberSize, fontWeight: weight }]}
        testID={testId ? `${testId}-number` : 'countdown-number'}
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
  number: {
    // react-native-web で tabular-nums を効かせる（桁ぶれ防止）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...({ fontVariant: ['tabular-nums'] } as any),
    textAlign: 'center',
    includeFontPadding: false,
  },
});
