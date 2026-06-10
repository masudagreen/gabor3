/**
 * LevelDeltaIndicator.tsx — LD-1（components.md / F-04、v3.0 新規）。
 *
 * ゲーム結果によるレベル変化（+1 / ±0 / −1）を観察可能に提示する（F-04 受け入れ基準）。
 * 色 + 矢印形 + テキストの 3 重で区別（NF-12）。−1 は「責めない」暗橙（エラー赤を使わない）。
 *
 * 3 状態（levelDelta と from/to から導出）：
 *   - up   （+1）：▲ +「レベル {from} → {to}」+「レベルが上がりました（+1）」緑。
 *   - same （ 0）：― +「レベル {n}」+「レベルはそのままです」中性灰。
 *                  クリアでクランプ（上限）した場合は「最高レベルです」。
 *   - down （−1）：▼ +「レベル {from} → {to}」+「無理なく続けられるよう、レベルを 1 つ下げました」暗橙。
 *
 * a11y：aria-live=polite、aria-label に状態文（「レベルが上がりました。レベル {from} から {to}」等）。
 */

import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { fontSize, fontWeight, levelDeltaV3, lineHeight, spacing } from '../../theme/tokens';
import type { LevelDelta, GameResult } from '../../lib/v3/level';
import { t } from '../../i18n';

export type LevelDeltaIndicatorProps = {
  /** このゲームによるレベル変化（applyResult の levelDelta）。 */
  delta: LevelDelta;
  /** 挑戦したレベル（変化前）。 */
  fromLevel: number;
  /** 増減反映後の現在レベル（次に挑戦するレベル）。 */
  toLevel: number;
  /** クリア/失敗（delta=0 のとき「最高レベル」案内の出し分けに使う）。 */
  result: GameResult;
  testId?: string;
};

export const LevelDeltaIndicator: React.FC<LevelDeltaIndicatorProps> = ({
  delta,
  fromLevel,
  toLevel,
  result,
  testId,
}) => {
  const { mode } = useTheme();
  const tokens = levelDeltaV3[mode];

  let arrow: string;
  let fg: string;
  let changeText: string;
  let message: string;
  let announce: string;

  if (delta === 1) {
    arrow = '▲';
    fg = tokens.upFg;
    changeText = t('levelDeltaV3.up_change', { from: fromLevel, to: toLevel });
    message = t('levelDeltaV3.up_message');
    announce = t('levelDeltaV3.up_announce', { from: fromLevel, to: toLevel });
  } else if (delta === -1) {
    arrow = '▼';
    fg = tokens.downFg;
    changeText = t('levelDeltaV3.down_change', { from: fromLevel, to: toLevel });
    message = t('levelDeltaV3.down_message');
    announce = t('levelDeltaV3.down_announce', { from: fromLevel, to: toLevel });
  } else {
    arrow = '―';
    fg = tokens.sameFg;
    changeText = t('levelDeltaV3.same_level', { n: toLevel });
    // クリアで上がらなかった = 上限クランプ → 「最高レベルです」。失敗 1 回目は「そのまま」。
    message =
      result === 'clear'
        ? t('levelDeltaV3.same_message_max')
        : t('levelDeltaV3.same_message');
    announce = t('levelDeltaV3.same_announce', { n: toLevel });
  }

  return (
    <View
      style={styles.wrap}
      accessibilityRole="text"
      accessibilityLabel={announce}
      // react-native-web: aria-live=polite を DOM に透過（NF-10）
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...(Platform.OS === 'web' ? ({ 'aria-live': 'polite' } as any) : {})}
      testID={testId}
    >
      <Text
        style={[styles.change, { color: fg }]}
        testID={testId ? `${testId}-change` : undefined}
      >
        {arrow} {changeText}
      </Text>
      <Text
        style={[styles.message, { color: fg }]}
        testID={testId ? `${testId}-message` : undefined}
      >
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.s1,
  },
  change: {
    fontSize: fontSize.h3,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    includeFontPadding: false,
  },
  message: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    lineHeight: fontSize.body * lineHeight.body,
    textAlign: 'center',
  },
});
