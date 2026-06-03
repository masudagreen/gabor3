/**
 * GameTopBar.tsx — GB-1（components.md / F-01・F-05・F-07）。
 *
 * ゲームプレイ画面の上部固定バー。高さ 64px + top セーフエリア分オフセット
 * （フルスクリーン時 NF-29）。内容（X・残り秒）はセーフエリア内に収める。
 *
 * カウントダウン領域の不透明保証（system §1.4 / GB-1 改訂）：バー全体を不透明
 * `countdownV2.bg` にする（A）+ CountdownTimer 側も不透明ピル（B）。これにより
 * ガボール縞が実効背景に混入せず 7:1 を構造的に担保する。
 *
 * 左：X（中断、aria-label「ゲームを中断」、48pt+）。右：何も置かない（試行数なし）。
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusStyle } from '../../theme/focusStyle';
import { countdownV2, fontSize, radius, spacing, tapTarget } from '../../theme/tokens';
import { t } from '../../i18n';
import { CountdownTimer } from './CountdownTimer';

const BAR_HEIGHT = 64;

export type GameTopBarProps = {
  remainingSec: number;
  onAbort: () => void;
  testId?: string;
};

export const GameTopBar: React.FC<GameTopBarProps> = ({
  remainingSec,
  onAbort,
  testId,
}) => {
  const focus = useFocusStyle();
  const insets = useSafeAreaInsets();
  // ゲーム上部バーはアプリのテーマに関わらず常に暗い不透明バー（モックアップ準拠）。
  // これにより warn 黄 / danger 赤の 3 段階色が両テーマで AAA を保つ（F-12、S5 評価 Minor 解消）。
  const tokens = countdownV2.dark;

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: tokens.bg,
          paddingTop: insets.top,
          height: BAR_HEIGHT + insets.top,
        },
      ]}
      testID={testId}
    >
      <Pressable
        onPress={onAbort}
        accessibilityRole="button"
        accessibilityLabel={t('game.abort_label')}
        hitSlop={8}
        style={({ pressed }) => [styles.xButton, focus, pressed && styles.pressed]}
        testID={testId ? `${testId}-abort` : undefined}
      >
        <Text style={[styles.xIcon, { color: tokens.normal }]}>✕</Text>
      </Pressable>
      <CountdownTimer remainingSec={remainingSec} variant="inline" />
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  xButton: {
    position: 'absolute',
    left: spacing.s2,
    bottom: (BAR_HEIGHT - tapTarget.iconButton) / 2,
    width: tapTarget.iconButton,
    height: tapTarget.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  xIcon: {
    fontSize: fontSize.h2,
  },
  pressed: { opacity: 0.7 },
});
