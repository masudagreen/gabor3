/**
 * CountBanner.tsx — CB-1（components.md / F-02、v3.2 改訂）。
 *
 * 課題の教示バナー。2 バリアント（components.md CB-1）：
 * - `all`（本番、既定）：「全て探せ」（個数は非表示・内部値、§4.9・AS-36）。
 * - `count`（チュートリアル Lv0）：「◯個探せ！」（個数を明示、§4.8）。
 * - 位置：**格子の下**（格子に被らない）。font.body.lg 26px Bold（18pt 以上）。
 *   ガボール背景 #808080 に縞が被らないよう不透明ピル（bg.surface）を敷く。色 fg.primary。
 * - ゲーム開始時点で確定、ゲーム中に変動しない（F-02 受け入れ基準）。
 *
 * a11y：count バリアント=「{n} 個の回転を探してください」／all バリアント=「回転しているパッチをすべて探してください」。
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { fontSize, fontWeight, radius, spacing } from '../../theme/tokens';
import { t } from '../../i18n';

export type CountBannerProps = {
  /** 回転パッチ個数（showCount=true のときのみ表示）。 */
  count: number;
  /** 個数を明示するか（true=「◯個探せ」チュートリアル / false=「全て探せ」本番）。既定 false。 */
  showCount?: boolean;
  testId?: string;
};

export const CountBanner: React.FC<CountBannerProps> = ({
  count,
  showCount = false,
  testId,
}) => {
  const { colors } = useTheme();

  const label = showCount
    ? t('gameV3.count_label', { n: count })
    : t('gameV3.find_all_label');
  const text = showCount
    ? t('gameV3.count_find_n', { n: count })
    : t('gameV3.find_all');

  return (
    <View
      style={[styles.pill, { backgroundColor: colors.bgSurface }]}
      accessibilityRole="text"
      accessibilityLabel={label}
      testID={testId}
    >
      <Text
        style={[styles.text, { color: colors.fgPrimary }]}
        // 教示は 1 行固定（折り返し禁止）。長い文言（「回転しているものを全て探せ」）は
        // 狭い画面で縮小して 1 行に収める（adjustsFontSizeToFit は native のみ有効）。
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        testID={testId ? `${testId}-text` : undefined}
      >
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.s5,
    paddingVertical: spacing.s2,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: fontSize.bodyLg,
    fontWeight: fontWeight.bold,
    includeFontPadding: false,
  },
});
