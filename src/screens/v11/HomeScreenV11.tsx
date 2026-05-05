/**
 * HomeScreenV11 — F-04（spec-v11.md §F-04 / sprints/sprint-8/screens.md §3）。
 *
 * 構成（system.md §1.2 / components.md §9, §10）：
 *   - Header: GaborEye ロゴ + 設定 IconButton
 *   - 上段：本日完了マーク（完了時のみ）+ StreakBadge
 *   - HomeHeroCTA：「全ゲーム連続プレイ（約 N 分）」
 *   - セカンダリ：「単体プレイ（{n} ゲームから）」
 *   - HomeNavGrid：進捗グラフ / バッジ（Sprint 8 ではプレースホルダ表示）
 *
 * Sprint 8 時点では HeroCTA タップ時の動作は呼び出し元（AppRouterV11）の判断。
 * 本コンポーネントは onPressFullCourse / onPressSinglePlay などのコールバックを受ける。
 */

import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  ViewStyle,
} from 'react-native';
import {
  fontSize,
  fontWeight,
  getColors,
  radius,
  spacing,
  tapTarget,
} from '../../theme/tokens';
import { IconButton } from '../../components/IconButton';
import { StreakBadge } from '../../components/StreakBadge';
import { HomeHeroCTA } from '../../components/v11/HomeHeroCTA';

export type HomeScreenV11Props = {
  /** F-18：enabled なゲーム数。CTA ラベル「約 N 分」の N */
  enabledGameCount: number;
  /** 本日のフルコース完了済みか */
  todayCompleted: boolean;
  currentStreak: number;
  longestStreak: number;
  /** 22 時以降の警告（本日未完了時のみ true） */
  streakResetWarning?: boolean;
  /** バッジ獲得済み数（Sprint 8 では 0 / 13） */
  badgeEarnedCount?: number;
  badgeTotalCount?: number;
  onPressFullCourse: () => void;
  onPressSinglePlay: () => void;
  onPressProgress: () => void;
  onPressBadges: () => void;
  onOpenSettings: () => void;
};

export const HomeScreenV11: React.FC<HomeScreenV11Props> = ({
  enabledGameCount,
  todayCompleted,
  currentStreak,
  longestStreak,
  streakResetWarning,
  badgeEarnedCount = 0,
  badgeTotalCount = 13,
  onPressFullCourse,
  onPressSinglePlay,
  onPressProgress,
  onPressBadges,
  onOpenSettings,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgCanvas }]}
      testID="home-screen-v11"
    >
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={[styles.logo, { color: colors.fgPrimary }]}
        >
          GaborEye
        </Text>
        <IconButton
          icon="settings"
          ariaLabel="設定を開く"
          onPress={onOpenSettings}
          size="lg"
          testId="home-v11-settings"
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusRow}>
          {todayCompleted ? (
            <View
              style={[
                styles.completedTag,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.semanticSuccess,
                },
              ]}
              accessibilityLabel="今日のトレーニング完了"
            >
              <Text
                style={[styles.completedTagText, { color: colors.fgPrimary }]}
              >
                ✓ 本日完了
              </Text>
            </View>
          ) : null}
          <StreakBadge
            currentStreak={currentStreak}
            longestStreak={longestStreak}
            resetWarning={streakResetWarning}
            testId="home-v11-streak"
          />
        </View>

        <HomeHeroCTA
          enabledGameCount={enabledGameCount}
          todayCompleted={todayCompleted}
          onPress={onPressFullCourse}
        />

        <SinglePlayLink
          enabledGameCount={enabledGameCount}
          onPress={onPressSinglePlay}
          colors={colors}
        />

        <View style={styles.divider} />

        <View style={styles.navGrid}>
          <NavCard
            title="📊 進捗グラフ"
            subtitle="直近 28 日推移"
            ariaLabel="進捗グラフを開く"
            onPress={onPressProgress}
            colors={colors}
            testId="home-v11-progress"
          />
          <NavCard
            title="🏅 バッジ"
            subtitle={`${badgeEarnedCount} / ${badgeTotalCount} 達成`}
            ariaLabel={`バッジ一覧を開く。${badgeEarnedCount} 個獲得済み、全 ${badgeTotalCount} 種`}
            onPress={onPressBadges}
            colors={colors}
            testId="home-v11-badges"
          />
        </View>
      </ScrollView>
    </View>
  );
};

const SinglePlayLink: React.FC<{
  enabledGameCount: number;
  onPress: () => void;
  colors: ReturnType<typeof getColors>;
}> = ({ enabledGameCount, onPress, colors }) => {
  const [focused, setFocused] = React.useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`単体プレイを開く。${enabledGameCount} 個のゲームから選べます`}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      testID="home-v11-single-play"
      style={({ pressed }) => {
        const style: ViewStyle = {
          minHeight: tapTarget.recommended,
          paddingVertical: spacing.s3,
          paddingHorizontal: spacing.s4,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.85 : 1,
          ...(Platform.OS === 'web' && focused
            ? ({
                outlineColor: colors.focusRing,
                outlineWidth: 3,
                outlineStyle: 'solid',
                outlineOffset: 2,
              } as object)
            : {}),
        };
        return style;
      }}
    >
      <Text
        style={{
          fontSize: fontSize.body,
          fontWeight: fontWeight.medium as '600',
          color: colors.actionPrimary,
          textDecorationLine: 'underline',
        }}
      >
        単体プレイ（{enabledGameCount} ゲームから）›
      </Text>
    </Pressable>
  );
};

const NavCard: React.FC<{
  title: string;
  subtitle: string;
  ariaLabel: string;
  onPress: () => void;
  colors: ReturnType<typeof getColors>;
  testId?: string;
}> = ({ title, subtitle, ariaLabel, onPress, colors, testId }) => {
  const [focused, setFocused] = React.useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ariaLabel}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      testID={testId}
      style={({ pressed }) => {
        const style: ViewStyle = {
          flex: 1,
          minHeight: 80,
          padding: spacing.s4,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.borderDefault,
          backgroundColor: colors.bgSurface,
          opacity: pressed ? 0.85 : 1,
          gap: spacing.s2,
          ...(Platform.OS === 'web' && focused
            ? ({
                outlineColor: colors.focusRing,
                outlineWidth: 3,
                outlineStyle: 'solid',
                outlineOffset: 2,
              } as object)
            : {}),
        };
        return style;
      }}
    >
      <Text
        style={{
          fontSize: fontSize.h3,
          fontWeight: fontWeight.bold as '700',
          color: colors.fgPrimary,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontSize: fontSize.body,
          color: colors.fgSecondary,
        }}
      >
        {subtitle}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 64,
    paddingHorizontal: spacing.s4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    fontSize: fontSize.h3, // 26
    fontWeight: fontWeight.bold as '700',
  },
  content: {
    padding: spacing.s4,
    gap: spacing.s5,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: spacing.s7,
  },
  statusRow: {
    gap: spacing.s3,
  },
  completedTag: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.s2,
    paddingHorizontal: spacing.s4,
    borderRadius: radius.md,
    borderWidth: 2,
  },
  completedTagText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold as '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#0000001a',
    marginVertical: spacing.s2,
  },
  navGrid: {
    flexDirection: 'row',
    gap: spacing.s3,
  },
});
