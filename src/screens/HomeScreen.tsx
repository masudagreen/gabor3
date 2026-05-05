/**
 * HomeScreen — Sprint 2 のメインホーム画面（screens.md S2-01）。
 *
 * F-04 ホーム：
 *   - タイトル + 設定（Sprint 7 まで Stub）
 *   - StreakBadge（Sprint 6 で本実装、ここではプレースホルダ）
 *   - 「3 分コースを始める」プライマリ CTA（中央 56pt 以上）
 *   - 単体ゲーム選択：Sprint 3 改訂後、スマホでは 1 列縦積み、PC で 3 列横並び（screens.md S3-04）
 *   - 進捗グラフ・バッジ tertiary（Sprint 5/6 で実装）
 *
 * Sprint 3：Game 3 を有効化、「準備中」チップを撤去（screens.md S3-04）。
 */

import React from 'react';
import {
  Dimensions,
  Pressable,
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
import { IconButton } from '../components/IconButton';
import { StreakBadge } from '../components/StreakBadge';
import { t } from '../i18n';

export type HomeGameId = 'game1' | 'game2' | 'game3';

export type HomeScreenProps = {
  onStartCourse: () => void;
  onStartGame: (gameId: HomeGameId) => void;
  onOpenSettings: () => void;
  onOpenDebug?: () => void;
  /** Sprint 5：進捗グラフ画面に遷移 */
  onOpenProgress?: () => void;
  /** Sprint 6：バッジ一覧画面に遷移 */
  onOpenBadges?: () => void;
  /** Sprint 6：日次ベスト画面に遷移 */
  onOpenDailyBest?: () => void;
  /** 本日コース完了済みフラグ（Sprint 6 で本実装、Sprint 2 では false 固定） */
  todayCompleted?: boolean;
  /** 連続日数（Sprint 6 で永続化、Sprint 2 ではプレースホルダ表示） */
  currentStreak?: number;
  /** 過去最長ストリーク（Sprint 6） */
  longestStreak?: number;
  /** 22 時以降未完了で警告フラグ（Sprint 6） */
  streakResetWarning?: boolean;
  /** 今日の V1 スコア（Sprint 5、未算出は null） */
  todayV1Score?: number | null;
};

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onStartCourse,
  onStartGame,
  onOpenSettings,
  onOpenDebug,
  onOpenProgress,
  onOpenBadges,
  onOpenDailyBest,
  todayCompleted = false,
  currentStreak,
  longestStreak,
  streakResetWarning = false,
  todayV1Score = null,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const isWide = useIsWide();

  return (
    <View style={[styles.container, { backgroundColor: colors.bgCanvas }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.fgPrimary }]}
        >
          {t('home.title')}
        </Text>
        <IconButton
          icon="settings"
          ariaLabel={t('home.open_settings')}
          size="md"
          onPress={onOpenSettings}
          testId="home-open-settings"
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* 完了済みマーク（todayCompleted 時のみ） */}
        {todayCompleted ? (
          <View
            style={[
              styles.completedCard,
              { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
            ]}
          >
            <Text style={[styles.completedTitle, { color: colors.fgPrimary }]}>
              {t('home.today_completed_title')}
            </Text>
            <Text style={[styles.completedBody, { color: colors.fgPrimary }]}>
              {t('home.today_completed_body')}
            </Text>
          </View>
        ) : null}

        {/* StreakBadge（Sprint 6 で本実装、components.md §24 / screens.md S6-04） */}
        <StreakBadge
          currentStreak={currentStreak ?? 0}
          longestStreak={longestStreak}
          resetWarning={streakResetWarning}
          testId="home-streak-badge"
        />

        {/* 主要 CTA：3 分コース */}
        <View style={styles.cta}>
          <Button
            variant="primary"
            size="lg"
            label={
              todayCompleted
                ? t('home.start_course_again')
                : t('home.start_course')
            }
            ariaLabel={t('home.start_course_aria')}
            onPress={onStartCourse}
            fullWidth
            testId="home-start-course"
          />
        </View>

        {/* 単体ゲーム選択 */}
        <Text style={[styles.sectionLabel, { color: colors.fgPrimary }]}>
          {todayCompleted
            ? t('home.section_single_play')
            : t('home.section_pick_single')}
        </Text>

        {/* Sprint 3：3 ゲームすべて有効化。スマホは 1 列縦積み、PC は 3 列横並び */}
        <View style={[styles.gameList, isWide ? styles.gameListWide : null]}>
          <GameCard
            num="1"
            name="Game 1"
            description="変化察知"
            colors={colors}
            onPress={() => onStartGame('game1')}
            testId="home-game1-card"
            isWide={isWide}
          />
          <GameCard
            num="2"
            name="Game 2"
            description="二重表裏判別"
            colors={colors}
            onPress={() => onStartGame('game2')}
            testId="home-game2-card"
            isWide={isWide}
          />
          <GameCard
            num="3"
            name="Game 3"
            description="周辺視野ハント"
            colors={colors}
            onPress={() => onStartGame('game3')}
            testId="home-game3-card"
            isWide={isWide}
          />
        </View>

        {/* Sprint 5：今日の V1 スコア（既に記録あり時のみ） */}
        {todayV1Score != null ? (
          <View
            testID="home-today-v1-score"
            style={[
              styles.scoreCard,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderDefault,
              },
            ]}
            accessibilityLabel={t('home.today_v1_score_aria', {
              score: todayV1Score,
            })}
          >
            <Text style={[styles.scoreCardLabel, { color: colors.fgPrimary }]}>
              {t('home.today_v1_score')}
            </Text>
            <Text style={[styles.scoreCardValue, { color: colors.fgPrimary }]}>
              {todayV1Score}
              <Text style={styles.scoreCardUnit}> 点</Text>
            </Text>
          </View>
        ) : null}

        {/* tertiary：進捗・バッジ・日次ベスト（Sprint 6 で全て有効化） */}
        <View style={styles.tertiaryRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('home.progress_button_aria')}
            onPress={onOpenProgress ?? (() => {})}
            disabled={!onOpenProgress}
            testID="home-open-progress"
            style={({ pressed }) => [
              styles.tertiaryItem,
              { opacity: pressed ? 0.6 : onOpenProgress ? 1 : 0.5 },
            ]}
          >
            <Text style={[styles.tertiaryText, { color: colors.fgPrimary }]}>
              {t('home.progress_button')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('home.badges_button_aria')}
            onPress={onOpenBadges ?? (() => {})}
            disabled={!onOpenBadges}
            testID="home-open-badges"
            style={({ pressed }) => [
              styles.tertiaryItem,
              { opacity: pressed ? 0.6 : onOpenBadges ? 1 : 0.5 },
            ]}
          >
            <Text style={[styles.tertiaryText, { color: colors.fgPrimary }]}>
              {t('home.badges_button')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('home.daily_best_button_aria')}
            onPress={onOpenDailyBest ?? (() => {})}
            disabled={!onOpenDailyBest}
            testID="home-open-daily-best"
            style={({ pressed }) => [
              styles.tertiaryItem,
              { opacity: pressed ? 0.6 : onOpenDailyBest ? 1 : 0.5 },
            ]}
          >
            <Text style={[styles.tertiaryText, { color: colors.fgPrimary }]}>
              {t('home.daily_best_button')}
            </Text>
          </Pressable>
        </View>

        {onOpenDebug ? (
          <View style={styles.debugRow}>
            <Button
              variant="tertiary"
              size="md"
              label="デバッグ表示"
              onPress={onOpenDebug}
              fullWidth
              testId="home-open-debug"
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const GameCard: React.FC<{
  num: string;
  name: string;
  description: string;
  colors: ReturnType<typeof getColors>;
  onPress: () => void;
  testId?: string;
  isWide?: boolean;
}> = ({ num, name, description, colors, onPress, testId, isWide }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={`${name}（${description}）を始める`}
    onPress={onPress}
    style={({ pressed }) => [
      styles.gameCard,
      isWide ? styles.gameCardWide : styles.gameCardTall,
      {
        backgroundColor: colors.bgSurface,
        borderColor: colors.borderDefault,
        opacity: pressed ? 0.85 : 1,
      },
    ]}
    testID={testId}
  >
    <Text style={[styles.gameNum, { color: colors.fgPrimary }]}>{num}</Text>
    <Text style={[styles.gameName, { color: colors.fgPrimary }]}>{name}</Text>
    <Text style={[styles.gameDesc, { color: colors.fgPrimary }]}>{description}</Text>
  </Pressable>
);

function useIsWide(): boolean {
  const [wide, setWide] = React.useState<boolean>(() => {
    const { width } = Dimensions.get('window');
    return width >= 600;
  });
  React.useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setWide(window.width >= 600);
    });
    return () => sub.remove();
  }, []);
  return wide;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s4,
    paddingBottom: spacing.s2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: fontSize.h2, // 30px
    fontWeight: fontWeight.bold as '700',
  },
  content: {
    padding: spacing.s4,
    gap: spacing.s5,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  completedCard: {
    padding: spacing.s5,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.s2,
  },
  completedTitle: {
    fontSize: fontSize.h3,
    fontWeight: fontWeight.bold as '700',
  },
  completedBody: {
    fontSize: fontSize.body,
  },
  streakCard: {
    padding: spacing.s5,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s4,
  },
  streakIcon: {
    fontSize: 36,
  },
  streakNumber: {
    fontSize: fontSize.numericL, // 48px
    fontWeight: fontWeight.bold as '700',
    fontVariant: ['tabular-nums'],
  },
  streakLabel: {
    fontSize: fontSize.body,
  },
  streakEmpty: {
    fontSize: fontSize.body,
    flex: 1,
  },
  cta: {
    width: '100%',
  },
  sectionLabel: {
    fontSize: fontSize.body,
  },
  gameList: {
    flexDirection: 'column',
    gap: spacing.s4,
    width: '100%',
  },
  gameListWide: {
    flexDirection: 'row',
    gap: spacing.s4,
  },
  gameCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.s5,
    gap: spacing.s3,
  },
  gameCardTall: {
    width: '100%',
    minHeight: 140,
  },
  gameCardWide: {
    flex: 1,
    minHeight: 200,
  },
  gameNum: {
    fontSize: fontSize.h1, // 36px
    fontWeight: fontWeight.bold as '700',
    fontVariant: ['tabular-nums'],
  },
  gameName: {
    fontSize: fontSize.h3, // 26px
    fontWeight: fontWeight.bold as '700',
  },
  gameDesc: {
    fontSize: fontSize.body, // 24px
  },
  tertiaryRow: {
    flexDirection: 'row',
    gap: spacing.s4,
    justifyContent: 'space-around',
    paddingVertical: spacing.s4,
  },
  tertiaryItem: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.s3,
  },
  tertiaryText: {
    fontSize: fontSize.body, // 24px（tertiary でも 24px 維持）
    fontWeight: fontWeight.medium as '600',
  },
  debugRow: {
    marginTop: spacing.s5,
    paddingTop: spacing.s4,
    borderTopWidth: 1,
    borderTopColor: '#E3E5EA',
  },
  scoreCard: {
    padding: spacing.s4,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreCardLabel: {
    fontSize: fontSize.body, // 24px
    fontWeight: fontWeight.medium as '600',
  },
  scoreCardValue: {
    fontSize: fontSize.h1, // 36px
    fontWeight: fontWeight.bold as '700',
    fontVariant: ['tabular-nums'],
  },
  scoreCardUnit: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold as '700',
  },
});
