/**
 * BadgeListScreen — screens.md S6-01。
 *
 * - 8 種類のバッジを 2 列（スマホ）/ 4 列（PC ≥ 600px）グリッドで表示
 * - 各バッジは AchievementBadge（earned / 未獲得）
 * - タップで BadgeDetailModal
 * - 上部に獲得 N / 8 統計
 *
 * 起動時に loadBadgeStatuses + loadStreak + loadAllDailyStats + getTotalTrialCount を読む。
 */
import React from 'react';
import {
  Dimensions,
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
  spacing,
} from '../theme/tokens';
import { IconButton } from '../components/IconButton';
import { AchievementBadge } from '../components/AchievementBadge';
import { BadgeDetailModal } from '../components/BadgeDetailModal';
import {
  ALL_BADGE_IDS,
  BadgeStatus,
  DailyStats,
  Streak,
  createDefaultBadgeStatuses,
  createDefaultStreak,
  getTotalTrialCount,
  loadAllDailyStats,
  loadBadgeStatuses,
  loadStreak,
} from '../state/storage';
import { buildBadgeHint } from '../lib/badges';

export type BadgeListScreenProps = {
  onBack: () => void;
  /** B-06 / B-07 から「Game N をプレイ」する場合のハンドラ */
  onPlayGame?: (gameId: 'game2' | 'game3') => void;
};

export const BadgeListScreen: React.FC<BadgeListScreenProps> = ({
  onBack,
  onPlayGame,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const isWide = useIsWide();

  const [badges, setBadges] = React.useState<BadgeStatus[]>(
    createDefaultBadgeStatuses(),
  );
  const [streak, setStreak] = React.useState<Streak>(createDefaultStreak());
  const [totalTrials, setTotalTrials] = React.useState<number>(0);
  const [dailyStats, setDailyStats] = React.useState<DailyStats[]>([]);
  const [selectedIdx, setSelectedIdx] = React.useState<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const [b, s, t, ds] = await Promise.all([
        loadBadgeStatuses(),
        loadStreak(),
        getTotalTrialCount(),
        loadAllDailyStats(),
      ]);
      if (cancelled) return;
      setBadges(b);
      setStreak(s);
      setTotalTrials(t);
      setDailyStats(ds);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const earnedCount = badges.filter((b) => b.earned).length;
  const today = React.useMemo(() => new Date(), []);
  const ctx = React.useMemo(
    () => ({
      streak,
      totalTrialCount: totalTrials,
      allDailyStats: dailyStats,
      today,
    }),
    [streak, totalTrials, dailyStats, today],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bgCanvas }]}>
      <View style={styles.header}>
        <IconButton
          icon="back"
          ariaLabel="戻る"
          onPress={onBack}
          testId="badges-back"
        />
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.fgPrimary }]}
        >
          バッジ
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text
          testID="badges-summary"
          style={[styles.summary, { color: colors.fgPrimary }]}
        >
          獲得 {earnedCount} / {ALL_BADGE_IDS.length}
        </Text>

        <View
          style={[
            styles.grid,
            isWide ? styles.gridWide : null,
          ]}
        >
          {badges.map((b, idx) => (
            <View
              key={b.badgeId}
              style={isWide ? styles.cellWide : styles.cellTall}
            >
              <AchievementBadge
                badgeId={b.badgeId}
                earned={b.earned}
                earnedAt={b.earnedAt}
                hint={
                  b.earned ? undefined : buildBadgeHint(b.badgeId, ctx)
                }
                onPress={() => setSelectedIdx(idx)}
                testId={`badge-card-${b.badgeId}`}
              />
            </View>
          ))}
        </View>
      </ScrollView>

      <BadgeDetailModal
        visible={selectedIdx != null}
        status={selectedIdx != null ? badges[selectedIdx] : null}
        streak={streak}
        totalTrialCount={totalTrials}
        allDailyStats={dailyStats}
        today={today}
        onClose={() => setSelectedIdx(null)}
        onPlayGame={
          onPlayGame
            ? (gid) => {
                setSelectedIdx(null);
                onPlayGame(gid);
              }
            : undefined
        }
      />
    </View>
  );
};

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
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s4,
    gap: spacing.s3,
  },
  title: {
    fontSize: fontSize.h2,
    fontWeight: fontWeight.bold as '700',
  },
  scrollContent: {
    padding: spacing.s4,
    gap: spacing.s4,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  summary: {
    fontSize: fontSize.h3, // 26px
    fontWeight: fontWeight.bold as '700',
    paddingVertical: spacing.s2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s4,
    width: '100%',
  },
  gridWide: {
    // PC：4 列を確保するため、子のみ flexBasis を制御
  },
  cellTall: {
    width: '47%',
  },
  cellWide: {
    width: '23%',
  },
});
