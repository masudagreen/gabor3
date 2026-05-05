/**
 * SessionCompleteScreen — おまかせコース完了画面（screens.md S5-03 / S6-05）。
 *
 * Sprint 5：V1 スコア表示・前回比・グラフ導線
 * Sprint 6：StreakBadge を実値、バッジ獲得演出（1.5 秒、点滅なし）を表示
 *
 * 演出仕様（screens.md S6-05）：
 *   0〜100ms     : バッジカード出現（scale 0.6）
 *   100〜600ms   : scale 0.6 → 1.05（decelerate）
 *   600〜800ms   : scale 1.05 → 1.0（弾性下げ）
 *   800〜1500ms  : 静止表示「獲得！」
 *   1500ms 以降  : 通常状態
 *
 * 複数バッジ同時獲得時は順次表示（1.5 秒ずつ）。
 * Reduced motion 環境では scale を省略し、フェードイン的に出すだけ。
 */

import React from 'react';
import {
  Animated,
  Easing,
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
} from '../theme/tokens';
import { Button } from '../components/Button';
import { BadgeId } from '../state/storage';
import { BADGE_META } from '../lib/badges';

export type SessionCompleteScreenProps = {
  onHome: () => void;
  /** Sprint 6 で本実装：現在のストリーク（コース完了反映後の値） */
  streakAfter?: number;
  /** 当日の V1 スコア（0-100、null=計算不可） */
  v1Score: number | null;
  /** 前回（直近過去日）の V1 スコア。null=初回／前回なし */
  previousScore: number | null;
  /** 進捗グラフ画面に遷移 */
  onOpenProgress: () => void;
  /** 今回新たに獲得したバッジ ID 配列（Sprint 6） */
  newlyEarnedBadges?: BadgeId[];
};

export const SessionCompleteScreen: React.FC<SessionCompleteScreenProps> = ({
  onHome,
  streakAfter,
  v1Score,
  previousScore,
  onOpenProgress,
  newlyEarnedBadges = [],
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  const diff =
    v1Score != null && previousScore != null ? v1Score - previousScore : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgCanvas }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.celebrate}>🎉</Text>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.fgPrimary }]}
        >
          今日のトレーニング、{'\n'}おつかれさまでした
        </Text>

        {/* V1 スコアカード（Sprint 5 新規） */}
        <View
          testID="session-v1score-card"
          style={[
            styles.scoreCard,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderDefault,
            },
          ]}
        >
          <Text style={[styles.scoreCardTitle, { color: colors.fgPrimary }]}>
            今日の V1 スコア
          </Text>
          <Text
            testID="session-v1score-value"
            style={[styles.scoreCardValue, { color: colors.fgPrimary }]}
            accessibilityLabel={
              v1Score != null
                ? `今日の V1 スコア ${v1Score} 点`
                : '今日の V1 スコアは未算出'
            }
          >
            {v1Score != null ? `${v1Score}` : '—'}
            <Text style={styles.scoreCardUnit}> 点</Text>
          </Text>
          {diff != null ? (
            <Text
              testID="session-v1score-diff"
              style={[
                styles.scoreCardDiff,
                {
                  color:
                    diff > 0
                      ? colors.semanticSuccess
                      : colors.fgSecondary,
                },
              ]}
            >
              {diff > 0
                ? `前回より +${diff} 点 ✨`
                : diff < 0
                  ? `前回より ${diff} 点`
                  : '前回と同じ'}
            </Text>
          ) : (
            <Text
              testID="session-v1score-first"
              style={[styles.scoreCardDiff, { color: colors.fgSecondary }]}
            >
              はじめての記録です
            </Text>
          )}
        </View>

        <View
          style={[
            styles.streakCard,
            { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
          ]}
        >
          <Text style={styles.streakIcon}>🔥</Text>
          <View>
            <Text style={[styles.streakNumber, { color: colors.fgPrimary }]}>
              {typeof streakAfter === 'number' ? streakAfter : 1}
            </Text>
            <Text style={[styles.streakLabel, { color: colors.fgPrimary }]}>
              日連続（+1）
            </Text>
          </View>
        </View>

        {/* バッジ獲得演出（Sprint 6 / screens.md S6-05、1.5 秒、点滅なし） */}
        {newlyEarnedBadges.length > 0 ? (
          <BadgeCelebrations badgeIds={newlyEarnedBadges} colors={colors} />
        ) : null}

        <Text style={[styles.note, { color: colors.fgMuted }]}>
          ※ V1 スコアはこのアプリ独自の点数で、{'\n'}医療数値ではありません
        </Text>

        <View style={styles.btnRow}>
          <View style={styles.btnSecondary}>
            <Button
              variant="secondary"
              size="lg"
              label="グラフを見る"
              onPress={onOpenProgress}
              fullWidth
              testId="session-complete-progress"
            />
          </View>
          <View style={styles.btnPrimary}>
            <Button
              variant="primary"
              size="lg"
              label="ホームへ"
              onPress={onHome}
              fullWidth
              testId="session-complete-home"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

/**
 * 複数バッジを 1.5 秒ずつ順次表示する演出コンテナ。
 *
 * 1 つのバッジは BadgeCelebrationCard が scale 0.6 → 1.05 → 1.0 のスプリング演出をし、
 * 800〜1500ms に「獲得！」テキストを出す。1500ms 経過したら次のバッジへ。
 */
const BadgeCelebrations: React.FC<{
  badgeIds: BadgeId[];
  colors: ReturnType<typeof getColors>;
}> = ({ badgeIds, colors }) => {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    if (index >= badgeIds.length) return;
    const timer = setTimeout(() => setIndex((i) => i + 1), 1500);
    return () => clearTimeout(timer);
  }, [index, badgeIds.length]);

  // 全バッジ演出後も最後の 1 つを残して表示する（OPT-7「次へ」を急かさない）
  const displayIdx = Math.min(index, badgeIds.length - 1);
  const id = badgeIds[displayIdx];
  return (
    <BadgeCelebrationCard
      key={`${id}-${displayIdx}`}
      badgeId={id}
      colors={colors}
      total={badgeIds.length}
      currentIndex={displayIdx}
    />
  );
};

const BadgeCelebrationCard: React.FC<{
  badgeId: BadgeId;
  colors: ReturnType<typeof getColors>;
  total: number;
  currentIndex: number;
}> = ({ badgeId, colors, total, currentIndex }) => {
  const meta = BADGE_META[badgeId];
  const scale = React.useRef(new Animated.Value(0.6)).current;
  const [showLabel, setShowLabel] = React.useState(false);

  React.useEffect(() => {
    scale.setValue(0.6);
    setShowLabel(false);
    // 100〜600ms：scale 0.6 → 1.05（decelerate）
    // 600〜800ms：scale 1.05 → 1.0（弾性下げ）
    Animated.sequence([
      Animated.delay(100),
      Animated.timing(scale, {
        toValue: 1.05,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1.0,
        duration: 200,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowLabel(true);
    });
  }, [badgeId, scale]);

  const counterText =
    total > 1 ? `（${currentIndex + 1} / ${total}）` : '';

  return (
    <View
      testID={`badge-celebration-${badgeId}`}
      accessibilityLiveRegion="assertive"
      accessibilityLabel={`${meta.name}バッジを獲得しました${counterText}`}
      style={[
        styles.celebrationCard,
        {
          backgroundColor: colors.bgSurface,
          borderColor: colors.borderDefault,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.celebrationIconWrap,
          {
            backgroundColor: colors.bgSurfaceRaised,
            borderColor: colors.borderDefault,
            transform: [{ scale }],
          },
        ]}
      >
        <Text style={styles.celebrationIcon}>{meta.emoji}</Text>
      </Animated.View>
      <Text
        style={[styles.celebrationName, { color: colors.fgPrimary }]}
      >
        {meta.name}
      </Text>
      {showLabel ? (
        <Text
          testID={`badge-celebration-label-${badgeId}`}
          style={[styles.celebrationLabel, { color: colors.actionPrimary }]}
        >
          獲得！ {counterText}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: spacing.s4,
    gap: spacing.s5,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    paddingTop: spacing.s7,
    alignItems: 'center',
  },
  celebrate: {
    fontSize: 64,
    textAlign: 'center',
  },
  title: {
    fontSize: fontSize.h1,
    fontWeight: fontWeight.bold as '700',
    textAlign: 'center',
    lineHeight: fontSize.h1 * 1.3,
  },
  scoreCard: {
    padding: spacing.s5,
    borderRadius: radius.md,
    borderWidth: 1,
    width: '100%',
    alignItems: 'center',
    gap: spacing.s2,
  },
  scoreCardTitle: {
    fontSize: fontSize.bodyLg, // 26px
    fontWeight: fontWeight.bold as '700',
  },
  scoreCardValue: {
    fontSize: fontSize.numericXl, // 72px
    fontWeight: fontWeight.bold as '700',
    fontVariant: ['tabular-nums'],
    lineHeight: fontSize.numericXl,
  },
  scoreCardUnit: {
    fontSize: fontSize.h2,
    fontWeight: fontWeight.bold as '700',
  },
  scoreCardDiff: {
    fontSize: fontSize.bodyLg, // 26px
    fontWeight: fontWeight.bold as '700',
    textAlign: 'center',
  },
  streakCard: {
    padding: spacing.s5,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s4,
    width: '100%',
  },
  streakIcon: {
    fontSize: 36,
  },
  streakNumber: {
    fontSize: fontSize.numericL,
    fontWeight: fontWeight.bold as '700',
    fontVariant: ['tabular-nums'],
  },
  streakLabel: {
    fontSize: fontSize.body,
  },
  note: {
    fontSize: fontSize.caption,
    textAlign: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.s3,
    width: '100%',
  },
  btnSecondary: { flex: 1 },
  btnPrimary: { flex: 1 },
  celebrationCard: {
    width: '100%',
    padding: spacing.s5,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: spacing.s3,
  },
  celebrationIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationIcon: {
    fontSize: 56,
  },
  celebrationName: {
    fontSize: fontSize.h3, // 26px
    fontWeight: fontWeight.bold as '700',
    textAlign: 'center',
  },
  celebrationLabel: {
    fontSize: fontSize.bodyLg, // 26px
    fontWeight: fontWeight.bold as '700',
    textAlign: 'center',
  },
});
