/**
 * SessionResultCard.tsx — RC-1（S6-3、F-08/F-04）。
 *
 * r ラウンド完了後、ホームタブに表示するセッション結果。
 * - 0〜100 スコアを 72px tabular-nums で最大強調（SessionRecord.sessionScore）。
 * - 今日のストリーク（Streak.currentStreak）を炎アイコン + テキストで表示（色非依存）。
 * - 「もう一度」56pt 以上（実際 buttonLg 64px）。回数制限なし（F-08）。
 *
 * セーフエリア準拠（NF-30）。結果表示中はゲーム非進行 → タブ移動自由（呼び出し側で担保）。
 * バッジ獲得演出（点滅なし）は S8 で本コンポーネント上に重畳する。
 */

import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { useFocusStyle } from '../../theme/focusStyle';
import {
  fontSize,
  fontWeight,
  lineHeight,
  radius,
  spacing,
  tapTarget,
} from '../../theme/tokens';
import { t } from '../../i18n';
import { BadgeAwardToast } from './BadgeAwardToast';
import type { BadgeId } from '../../state/schema';

export type SessionResultCardProps = {
  /** 0〜100 セッションスコア（F-04）。 */
  score: number;
  /** 今日の連続日数（Streak.currentStreak）。 */
  streak: number;
  /** 「もう一度」押下 → 距離リマインド経由で新セッション（F-08）。 */
  onReplay: () => void;
  /**
   * 今回新規獲得したバッジ ID（§5.4）。空でなければ獲得演出（BadgeAwardToast）を
   * 結果カード上層で 1 度だけ表示する。点滅なし・短時間（screens.md S8-2）。
   */
  newlyEarnedBadges?: readonly BadgeId[];
  /** 獲得演出の表示開始時に 1 度だけ（S9：音/ハプティクス発火点）。 */
  onBadgeShown?: (badgeIds: readonly BadgeId[]) => void;
  testId?: string;
};

export const SessionResultCard: React.FC<SessionResultCardProps> = ({
  score,
  streak,
  onReplay,
  newlyEarnedBadges = [],
  onBadgeShown,
  testId,
}) => {
  const { mode, colors } = useTheme();
  const focus = useFocusStyle();

  // Animated score and entrance
  const progress = useSharedValue(0);
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 1200 });
  }, []);

  useEffect(() => {
    // Simple JS interval for number counting to keep it robust
    let startTimestamp: number | null = null;
    const duration = 1200;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutQuart
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      setDisplayScore(Math.floor(easeProgress * score));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, [score]);

  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
      transform: [
        { translateY: interpolate(progress.value, [0, 1], [30, 0]) },
      ],
    };
  });

  const streakText =
    streak > 0 ? t('home.streak_label', { n: streak }) : t('home.streak_zero');

  const gradientBg = mode === 'dark' 
    ? ['rgba(30, 34, 46, 0.7)', 'rgba(20, 23, 33, 0.9)'] 
    : ['rgba(255, 255, 255, 0.8)', 'rgba(240, 242, 245, 0.9)'];

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.root, { backgroundColor: colors.bgCanvas }]}
      testID={testId}
    >
      <LinearGradient
        colors={(mode === 'dark' ? [colors.bgCanvas, '#110622'] : [colors.bgCanvas, '#E8EAF6']) as [string, string]}
        style={StyleSheet.absoluteFill}
      />
      
      <Animated.View style={[styles.content, animatedCardStyle]}>
        <View
          style={[styles.glassCard, { borderColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
          accessibilityRole="summary"
          accessibilityLabel={t('home.result_region_label', { score, streak })}
        >
          <LinearGradient
            colors={gradientBg as [string, string]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />

          <Text style={[styles.label, { color: colors.actionPrimary }]}>
            {t('home.result_label')}
          </Text>

          <View style={styles.scoreWrap}>
            <Text
              style={[styles.score, { color: colors.fgPrimary }]}
              testID={testId ? `${testId}-score` : undefined}
            >
              {displayScore}
            </Text>
            <Text style={[styles.scoreUnit, { color: colors.fgSecondary }]}>
              {t('home.score_unit')}
            </Text>
          </View>

          <View style={styles.streakRow}>
            <Text style={styles.streakIcon} accessibilityElementsHidden>
              🔥
            </Text>
            <Text
              style={[styles.streak, { color: colors.fgPrimary }]}
              testID={testId ? `${testId}-streak` : undefined}
            >
              {streakText}
            </Text>
          </View>

          <Pressable
            onPress={onReplay}
            accessibilityRole="button"
            accessibilityLabel={t('home.replay')}
            style={({ pressed }) => [
              styles.cta,
              focus,
              pressed && styles.pressed,
            ]}
            testID={testId ? `${testId}-replay` : undefined}
          >
            <LinearGradient
              colors={[colors.actionPrimary, colors.actionPrimaryHover]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              <Text style={[styles.ctaText, { color: colors.fgOnPrimary }]}>
                {t('home.replay')}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </Animated.View>

      {/* バッジ獲得演出 */}
      <BadgeAwardToast
        badgeIds={newlyEarnedBadges}
        onShown={onBadgeShown}
        testId={testId ? `${testId}-badge-toast` : undefined}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.s5,
  },
  glassCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: radius.xl,
    padding: spacing.s7,
    alignItems: 'center',
    gap: spacing.s5,
    overflow: 'hidden',
    borderWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  label: {
    fontSize: fontSize.h3,
    fontWeight: fontWeight.bold,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  scoreWrap: {
    alignItems: 'center',
    marginVertical: spacing.s2,
  },
  score: {
    fontSize: fontSize.numericXl,
    fontWeight: '900',
    lineHeight: fontSize.numericXl * lineHeight.numeric,
    // tabular-nums
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...({ fontVariant: ['tabular-nums'] } as any),
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  scoreUnit: {
    fontSize: fontSize.h3,
    fontWeight: fontWeight.medium,
    marginTop: spacing.s1,
    opacity: 0.8,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s2,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s2,
    borderRadius: radius.pill,
  },
  streakIcon: { fontSize: fontSize.h3 },
  streak: {
    fontSize: fontSize.bodyLg,
    fontWeight: fontWeight.bold,
  },
  cta: {
    minHeight: tapTarget.buttonLg,
    minWidth: 240,
    borderRadius: radius.pill,
    marginTop: spacing.s4,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  ctaGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.s6,
  },
  ctaText: {
    fontSize: fontSize.bodyLg,
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
});
