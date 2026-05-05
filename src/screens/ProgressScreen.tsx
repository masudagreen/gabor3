/**
 * ProgressScreen — 進捗グラフ画面（screens.md S5-04 / S5-05 / S5-06）。
 *
 * - V1ScoreChart を中心に、過去 28 日のスコア折れ線
 * - WeeklyGraph の 2 タブ：「V1 スコア」「日次ベスト」
 * - データ 0 日：CTA「3 分コースを始める」
 * - データ 1〜6 日：低データ overlay
 * - データ 7 日以上：通常表示
 *
 * データ取得：
 *   loadAllDailyStats() → buildLast28DaysChart / 直近 7 日のベストを抽出
 */

import React from 'react';
import {
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
  spacing,
} from '../theme/tokens';
import { IconButton } from '../components/IconButton';
import { WeeklyGraph, DailyBest } from '../components/WeeklyGraph';
import {
  buildLast28DaysChart,
  formatDateLocal,
  summarizeChart,
} from '../lib/weeklyStats';
import { DailyStats, loadAllDailyStats } from '../state/storage';

export type ProgressScreenProps = {
  onBack: () => void;
  onStartCourse: () => void;
};

export const ProgressScreen: React.FC<ProgressScreenProps> = ({
  onBack,
  onStartCourse,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const [stats, setStats] = React.useState<DailyStats[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await loadAllDailyStats();
      if (cancelled) return;
      setStats(all);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const today = new Date();
  const todayDate = formatDateLocal(today);
  const points = stats ? buildLast28DaysChart(stats, today) : [];
  const summary = stats ? summarizeChart(points) : null;

  // 直近 7 日のベスト（古→新）
  const dailyBests: DailyBest[] = React.useMemo(() => {
    if (!stats) return [];
    return points
      .slice(-7)
      .map((p) => {
        const stat = stats.find((s) => s.date === p.date);
        return {
          date: p.date,
          game1: stat?.game1BestThreshold ?? null,
          game2: stat?.game2BestThreshold ?? null,
          game3: stat?.game3BestThreshold ?? null,
        };
      })
      .filter((b) => b.game1 != null || b.game2 != null || b.game3 != null);
  }, [stats, points]);

  if (!stats) {
    return (
      <View
        style={[styles.container, { backgroundColor: colors.bgCanvas }]}
        testID="progress-loading"
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgCanvas }]}>
      <View style={styles.header}>
        <IconButton
          icon="back"
          ariaLabel="戻る"
          onPress={onBack}
          testId="progress-back"
        />
        <Text
          accessibilityRole="header"
          style={[styles.headerTitle, { color: colors.fgPrimary }]}
        >
          進捗グラフ
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <WeeklyGraph
          scoreData={points}
          dailyBests={dailyBests}
          todayDate={todayDate}
          onStartCourse={onStartCourse}
        />
      </View>

      {summary && summary.daysWithData > 0 ? (
        <Pressable
          accessibilityRole="none"
          onPress={() => {}}
          style={styles.summaryRow}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.summaryRowInner}
          >
            <SummaryItem
              label="今日"
              value={
                summary.todayScore != null
                  ? `${summary.todayScore} 点`
                  : '未記録'
              }
              colors={colors}
            />
            <SummaryItem
              label="28 日平均"
              value={
                summary.average != null ? `${summary.average} 点` : '—'
              }
              colors={colors}
            />
            <SummaryItem
              label="最高"
              value={summary.max != null ? `${summary.max} 点` : '—'}
              colors={colors}
            />
          </ScrollView>
        </Pressable>
      ) : null}

      <Text style={[styles.disclaimer, { color: colors.fgMuted }]}>
        ※ V1 スコアは医療数値ではありません
      </Text>
    </View>
  );
};

const SummaryItem: React.FC<{
  label: string;
  value: string;
  colors: ReturnType<typeof getColors>;
}> = ({ label, value, colors }) => (
  <View style={styles.summaryItem}>
    <Text style={[styles.summaryLabel, { color: colors.fgPrimary }]}>
      {label}
    </Text>
    <Text style={[styles.summaryValue, { color: colors.fgPrimary }]}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s4,
    gap: spacing.s3,
  },
  headerTitle: {
    fontSize: fontSize.h3, // 26px
    fontWeight: fontWeight.bold as '700',
  },
  summaryRow: {
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s3,
  },
  summaryRowInner: {
    gap: spacing.s5,
  },
  summaryItem: {
    gap: spacing.s1,
  },
  summaryLabel: {
    fontSize: fontSize.body, // 24px
  },
  summaryValue: {
    fontSize: fontSize.bodyLg, // 26px
    fontWeight: fontWeight.bold as '700',
    fontVariant: ['tabular-nums'],
  },
  disclaimer: {
    fontSize: fontSize.caption, // 20px
    textAlign: 'center',
    paddingHorizontal: spacing.s4,
    paddingBottom: spacing.s4,
  },
});
