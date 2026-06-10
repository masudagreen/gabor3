/**
 * HomeResultCard.tsx — RC-1（components.md / screens.md S7-3、F-08/F-04、v3.0 改訂）。
 *
 * 1 ゲーム（1 レベル挑戦）完了後にホームタブへ表示する結果カード。
 * v2.0 のスコア中心構成から「クリア/失敗・レベル変化・現在レベル・ストリーク」中心へ全面改訂。
 *
 * 構成（縦）：
 *   1. 総合結果（クリア！/失敗、AggregateResultBadge 同系の色+アイコン+テキスト、NF-12）
 *   2. レベル変化告知（LD-1 LevelDeltaIndicator、+1/±0/−1、from→to）
 *   3. 現在のレベル（LB-1 LevelBadge large、「現在のレベル」+ 数値 64px ＝次に挑戦するレベル）
 *   4. 今日のストリーク（🔥 + 「連続 {n} 日」、形+テキストで色非依存）
 *   5. 「もう一度」（Button primary lg 64px ≧ 56pt、回数制限なし）
 *
 * スコア数値（0〜100）は表示しない（廃止）。結果表示中はゲーム非進行 → タブ移動自由（呼び出し側）。
 * セーフエリア準拠（NF-30）。
 *
 * a11y：role=region aria-label「ゲーム結果。{クリア/失敗}。レベル {from} から {to}。現在のレベル {to}。連続 {n} 日」。
 */

import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useFocusStyle } from '../../theme/focusStyle';
import {
  fontSize,
  fontWeight,
  levelV3,
  lineHeight,
  radius,
  resultV3,
  spacing,
  tapTarget,
} from '../../theme/tokens';
import type { GameResult, LevelDelta } from '../../lib/v3/level';
import type { BadgeId } from '../../state/v3/schema';
import { LevelDeltaIndicator } from './LevelDeltaIndicator';
import { BadgeAwardToast } from './BadgeAwardToast';
import { t } from '../../i18n';

export type HomeResultCardProps = {
  result: GameResult;
  /** 挑戦したレベル（変化前）。 */
  fromLevel: number;
  /** 増減反映後の現在レベル（次に挑戦するレベル）。 */
  toLevel: number;
  /** このゲームによるレベル変化（+1 / 0 / -1）。 */
  delta: LevelDelta;
  /** 今日のストリーク（連続日数）。 */
  streak: number;
  /** 今回新規獲得したバッジ ID（§6.4：獲得時に 1 度だけ演出）。空なら演出なし。 */
  newlyEarnedBadges?: readonly BadgeId[];
  /** バッジ獲得演出の表示開始時に 1 度（S10：音/ハプティクス発火点）。 */
  onBadgeShown?: (badgeIds: readonly BadgeId[]) => void;
  /** 「もう一度」押下（距離リマインド経由で次ゲーム）。 */
  onReplay: () => void;
  testId?: string;
};

export const HomeResultCard: React.FC<HomeResultCardProps> = ({
  result,
  fromLevel,
  toLevel,
  delta,
  streak,
  newlyEarnedBadges,
  onBadgeShown,
  onReplay,
  testId,
}) => {
  const { colors, mode } = useTheme();
  const focus = useFocusStyle();
  const rTokens = resultV3[mode];
  const lTokens = levelV3[mode];

  const isClear = result === 'clear';
  const aggBg = isClear ? rTokens.aggregateClearBg : rTokens.aggregateFailBg;
  const aggFg = isClear ? rTokens.aggregateClearFg : rTokens.aggregateFailFg;
  const aggLabel = isClear ? t('homeV3.result_clear') : t('homeV3.result_fail');

  const streakText =
    streak > 0 ? t('homeV3.streak', { n: streak }) : t('homeV3.streak_zero');

  const regionLabel = isClear
    ? t('homeV3.region_clear', { from: fromLevel, to: toLevel, streak })
    : t('homeV3.region_fail', { to: toLevel, streak });

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={[styles.root, { backgroundColor: colors.bgCanvas }]}
      testID={testId}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        // react-native-web: role=region + aria-label で結果全体を 1 まとめに読み上げ
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...(Platform.OS === 'web' ? ({ role: 'region', 'aria-label': regionLabel } as any) : {})}
        accessibilityLabel={Platform.OS === 'web' ? undefined : regionLabel}
      >
        {/* 1. 総合結果 */}
        <View
          style={[styles.aggregate, { backgroundColor: aggBg }]}
          accessibilityRole="text"
          accessibilityLabel={aggLabel}
          testID={testId ? `${testId}-aggregate` : undefined}
        >
          {isClear ? <Text style={[styles.aggIcon, { color: aggFg }]}>✓</Text> : null}
          <Text style={[styles.aggText, { color: aggFg }]}>{aggLabel}</Text>
        </View>

        {/* 2. レベル変化告知 */}
        <LevelDeltaIndicator
          delta={delta}
          fromLevel={fromLevel}
          toLevel={toLevel}
          result={result}
          testId={testId ? `${testId}-delta` : undefined}
        />

        {/* 3. 現在のレベル（LB-1 large 相当） */}
        <View
          style={styles.currentLevel}
          accessibilityRole="text"
          accessibilityLabel={`${t('homeV3.current_level_label')} ${toLevel}`}
          testID={testId ? `${testId}-current-level` : undefined}
        >
          <Text style={[styles.currentLabel, { color: colors.fgSecondary }]}>
            {t('homeV3.current_level_label')}
          </Text>
          <Text
            style={[styles.currentNumber, { color: lTokens.fg }]}
            testID={testId ? `${testId}-current-number` : undefined}
          >
            {String(toLevel)}
          </Text>
        </View>

        {/* 4. 今日のストリーク */}
        <Text
          style={[styles.streak, { color: colors.streakFlameFg }]}
          accessibilityRole="text"
          testID={testId ? `${testId}-streak` : undefined}
        >
          🔥 {streakText}
        </Text>

        {/* 5. もう一度（primary lg 64px） */}
        <Pressable
          onPress={onReplay}
          accessibilityRole="button"
          accessibilityLabel={t('homeV3.replay')}
          style={({ pressed }) => [
            styles.replay,
            { backgroundColor: colors.actionPrimary },
            focus,
            pressed && styles.pressed,
          ]}
          testID={testId ? `${testId}-replay` : undefined}
        >
          <Text style={[styles.replayText, { color: colors.fgOnPrimary }]}>
            {t('homeV3.replay')}
          </Text>
        </Pressable>
      </ScrollView>

      {/* バッジ獲得演出（BG-2、§6.4）：新規獲得時のみ 1 度。中央上、もう一度と非干渉。 */}
      <BadgeAwardToast
        badgeIds={newlyEarnedBadges ?? []}
        onShown={onBadgeShown}
        testId={testId ? `${testId}-badge-toast` : undefined}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s5,
    padding: spacing.s5,
  },
  aggregate: {
    flexDirection: 'row',
    minHeight: 56,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.s6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s2,
  },
  aggIcon: {
    fontSize: 32,
    fontWeight: '900',
    includeFontPadding: false,
  },
  aggText: {
    fontSize: fontSize.bodyLg,
    fontWeight: fontWeight.bold,
    includeFontPadding: false,
  },
  currentLevel: { alignItems: 'center', gap: spacing.s1 },
  currentLabel: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.medium,
  },
  currentNumber: {
    fontSize: fontSize.numericXl,
    fontWeight: fontWeight.bold,
    includeFontPadding: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...({ fontVariant: ['tabular-nums'] } as any),
  },
  streak: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    lineHeight: fontSize.body * lineHeight.body,
    textAlign: 'center',
  },
  replay: {
    minHeight: tapTarget.buttonLg,
    minWidth: 220,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.s6,
  },
  replayText: {
    fontSize: fontSize.bodyLg,
    fontWeight: fontWeight.bold,
  },
  pressed: { opacity: 0.8 },
});
