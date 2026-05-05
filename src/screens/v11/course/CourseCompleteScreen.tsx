/**
 * CourseCompleteScreen — S18-04（design-v11/sprints/sprint-18/screens.md §5）。
 *
 * 全ゲーム連続コース完了画面。
 * - 本日のワイドスコア（Card outlined）+ 前回比 diff
 * - ストリーク（StreakBadge 流用）
 * - 「進捗グラフを見る」Primary lg
 * - 「ホームへ」Secondary lg
 *
 * バッジ獲得演出は Sprint 19 で別途。本スプリントでは表示なし。
 */

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import {
  fontSize,
  fontWeight,
  getColors,
  radius,
  spacing,
} from '../../../theme/tokens';
import { Button } from '../../../components/Button';
import { StreakBadge } from '../../../components/StreakBadge';
import { BadgeUnlockToast } from '../../../components/v11/badges/BadgeUnlockToast';
import { BadgeIdV11 } from '../../../lib/v11/badgeDefinitions';

export type CourseCompleteScreenProps = {
  /** 本日のワイドスコア（0〜100、null は集計不可） */
  todayWideScore: number | null;
  /** 前回比（前回 wideScore との diff、null は初回） */
  diffFromPrevious: number | null;
  /** 含まれたゲーム数（"N ゲーム平均" 表示用） */
  gameCount: number;
  /** 現在のストリーク日数 */
  currentStreak: number;
  /** 過去最長 */
  longestStreak: number;
  /** Sprint 19 / F-13：今回新たに獲得したバッジ ID 配列。S19-07 演出 */
  newlyAwardedBadges?: ReadonlyArray<BadgeIdV11>;
  onPressProgress: () => void;
  onPressHome: () => void;
};

export const CourseCompleteScreen: React.FC<CourseCompleteScreenProps> = ({
  todayWideScore,
  diffFromPrevious,
  gameCount,
  currentStreak,
  longestStreak,
  newlyAwardedBadges,
  onPressProgress,
  onPressHome,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  // 複数獲得時、1.5 秒ずつ順次切替（screens.md S19 §8.4）
  const [badgeIndex, setBadgeIndex] = React.useState(0);
  React.useEffect(() => {
    if (!newlyAwardedBadges || newlyAwardedBadges.length <= 1) return;
    if (badgeIndex >= newlyAwardedBadges.length - 1) return;
    const t = setTimeout(() => setBadgeIndex((i) => i + 1), 1500);
    return () => clearTimeout(t);
  }, [newlyAwardedBadges, badgeIndex]);
  const currentBadge =
    newlyAwardedBadges && newlyAwardedBadges.length > 0
      ? newlyAwardedBadges[Math.min(badgeIndex, newlyAwardedBadges.length - 1)]
      : null;

  const scoreText = todayWideScore !== null ? `${todayWideScore}` : '—';
  const diffText =
    diffFromPrevious === null
      ? '初回'
      : diffFromPrevious > 0
        ? `↑ 前回より +${diffFromPrevious} 点改善`
        : diffFromPrevious < 0
          ? `↓ 前回より ${diffFromPrevious} 点`
          : '前回と同等';

  const ariaScore =
    todayWideScore !== null
      ? `本日のワイドスコアは ${todayWideScore} 点。${diffText}`
      : '本日のワイドスコアは未集計です';

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgCanvas }]}
      testID="course-complete-screen"
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text
          accessibilityElementsHidden
          style={styles.celebration}
        >
          🎉
        </Text>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.fgPrimary }]}
        >
          お疲れさまでした
        </Text>

        <View
          accessibilityLabel={ariaScore}
          style={[
            styles.card,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderDefault,
            },
          ]}
          testID="course-complete-wide-score"
        >
          <Text style={[styles.cardLabel, { color: colors.fgPrimary }]}>
            本日のワイドスコア
          </Text>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreValue, { color: colors.fgPrimary }]}>
              {scoreText}
            </Text>
            <Text style={[styles.scoreUnit, { color: colors.fgPrimary }]}>
              {todayWideScore !== null ? '点' : ''}
            </Text>
          </View>
          <Text
            style={[styles.cardSubtle, { color: colors.fgSecondary }]}
          >
            （{gameCount} ゲーム平均）
          </Text>
          <Text
            style={[styles.cardDiff, { color: colors.fgPrimary }]}
            testID="course-complete-diff"
          >
            {diffText}
          </Text>
        </View>

        <View testID="course-complete-streak-wrap">
          <StreakBadge
            currentStreak={currentStreak}
            longestStreak={longestStreak}
            testId="course-complete-streak"
          />
        </View>

        {currentBadge ? (
          <View
            style={[
              styles.badgeSlot,
              { borderTopColor: colors.borderDefault },
            ]}
            testID="course-complete-badge-slot"
          >
            <BadgeUnlockToast
              key={currentBadge}
              badgeId={currentBadge}
              testId={`course-complete-badge-${currentBadge}`}
            />
          </View>
        ) : null}

        <Button
          variant="primary"
          size="lg"
          label="進捗グラフを見る"
          onPress={onPressProgress}
          fullWidth
          testId="course-complete-progress"
        />
        <Button
          variant="secondary"
          size="lg"
          label="ホームへ"
          onPress={onPressHome}
          fullWidth
          testId="course-complete-home"
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: spacing.s5,
    gap: spacing.s4,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
    paddingTop: spacing.s7,
    paddingBottom: spacing.s8,
  },
  celebration: {
    fontSize: 56,
    textAlign: 'center',
  },
  title: {
    fontSize: fontSize.h1,
    fontWeight: fontWeight.bold as '700',
    textAlign: 'center',
  },
  card: {
    padding: spacing.s5,
    borderWidth: 1,
    borderRadius: radius.md,
    gap: spacing.s2,
  },
  cardLabel: {
    fontSize: fontSize.bodyLg,
    fontWeight: fontWeight.bold as '700',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing.s2,
  },
  scoreValue: {
    fontSize: fontSize.numericL, // 48
    fontWeight: fontWeight.bold as '700',
    fontVariant: ['tabular-nums'],
  },
  scoreUnit: {
    fontSize: fontSize.bodyLg,
  },
  cardSubtle: {
    fontSize: fontSize.body,
    textAlign: 'center',
  },
  cardDiff: {
    fontSize: fontSize.body,
    textAlign: 'center',
    marginTop: spacing.s2,
  },
  badgeSlot: {
    width: '100%',
    paddingTop: spacing.s4,
    borderTopWidth: 1,
    alignItems: 'center',
  },
});
