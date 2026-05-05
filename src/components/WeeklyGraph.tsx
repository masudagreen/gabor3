/**
 * WeeklyGraph — V1ScoreChart のタブ付きラッパー（components.md §23、screens.md S5-04 / S5-05）。
 *
 * タブ：
 *   - "score" V1 スコア折れ線（28 日）
 *   - "best"  日次ベスト閾値（ゲーム別、過去 7 日）
 *
 * components.md §23：
 *   - タブは 2 つ（56px 高、font.body.lg=26px）
 *   - アクティブタブは下線 4px brand.primary
 *
 * spec.md §9.2：
 *   - 7 日未満：「もう少しデータが集まると傾向が見えます」（V1ScoreChart 側で描画）
 *   - 0 日：CTA「3 分コースを始める」
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
  radius,
  spacing,
} from '../theme/tokens';
import { ChartDataPoint } from '../lib/weeklyStats';
import { V1ScoreChart } from './V1ScoreChart';

export type DailyBest = {
  /** YYYY-MM-DD */
  date: string;
  game1: number | null;
  game2: number | null;
  game3: number | null;
};

export type WeeklyGraphProps = {
  scoreData: ChartDataPoint[];
  /** 過去 7 日のベスト（古→新） */
  dailyBests: DailyBest[];
  initialTab?: 'score' | 'best';
  /** 当日 YYYY-MM-DD */
  todayDate: string;
  /** empty state（0 日）時の CTA */
  onStartCourse?: (() => void) | null;
};

export const WeeklyGraph: React.FC<WeeklyGraphProps> = ({
  scoreData,
  dailyBests,
  initialTab = 'score',
  todayDate,
  onStartCourse = null,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const [tab, setTab] = React.useState<'score' | 'best'>(initialTab);

  const validDays = scoreData.filter((d) => d.score != null).length;
  const showLowOverlay = validDays > 0 && validDays < 7;

  return (
    <View style={styles.container}>
      <View
        accessibilityRole="tablist"
        style={[
          styles.tabRow,
          { borderBottomColor: colors.borderDefault },
        ]}
      >
        <TabButton
          label="V1 スコア"
          active={tab === 'score'}
          onPress={() => setTab('score')}
          colors={colors}
          testId="weekly-tab-score"
        />
        <TabButton
          label="日次ベスト"
          active={tab === 'best'}
          onPress={() => setTab('best')}
          colors={colors}
          testId="weekly-tab-best"
        />
      </View>

      {tab === 'score' ? (
        <View style={styles.tabPanel} accessibilityRole="none">
          <Text style={[styles.sectionTitle, { color: colors.fgPrimary }]}>
            過去 28 日の V1 スコア
          </Text>
          <V1ScoreChart
            data={scoreData}
            todayDate={todayDate}
            showLowDataOverlay={showLowOverlay}
            onStartCourse={onStartCourse}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.tabPanel}>
          <Text style={[styles.sectionTitle, { color: colors.fgPrimary }]}>
            過去 7 日のベスト
          </Text>
          <BestTable bests={dailyBests} colors={colors} />
        </ScrollView>
      )}
    </View>
  );
};

const TabButton: React.FC<{
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof getColors>;
  testId?: string;
}> = ({ label, active, onPress, colors, testId }) => (
  <Pressable
    accessibilityRole="tab"
    accessibilityState={{ selected: active }}
    // Sprint 6：Web での aria-selected 直接付与（Sprint 5 minor 修正）
    aria-selected={active}
    accessibilityLabel={`${label}タブ`}
    onPress={onPress}
    testID={testId}
    style={[
      styles.tabButton,
      active
        ? { borderBottomWidth: 4, borderBottomColor: colors.actionPrimary }
        : { borderBottomWidth: 4, borderBottomColor: 'transparent' },
    ]}
  >
    <Text
      style={[
        styles.tabLabel,
        {
          color: active ? colors.actionPrimary : colors.fgPrimary,
          fontWeight: active
            ? (fontWeight.bold as '700')
            : (fontWeight.medium as '600'),
        },
      ]}
    >
      {label}
    </Text>
  </Pressable>
);

const BestTable: React.FC<{
  bests: DailyBest[];
  colors: ReturnType<typeof getColors>;
}> = ({ bests, colors }) => {
  if (bests.length === 0) {
    return (
      <Text
        style={[styles.emptyText, { color: colors.fgMuted }]}
        testID="best-table-empty"
      >
        まだ記録がありません
      </Text>
    );
  }
  return (
    <View
      testID="best-table"
      style={[
        styles.tableContainer,
        {
          backgroundColor: colors.bgSurface,
          borderColor: colors.borderDefault,
        },
      ]}
    >
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, { color: colors.fgPrimary }]}>
          日付
        </Text>
        <Text style={[styles.tableHeaderCell, { color: colors.fgPrimary }]}>
          G1
        </Text>
        <Text style={[styles.tableHeaderCell, { color: colors.fgPrimary }]}>
          G2
        </Text>
        <Text style={[styles.tableHeaderCell, { color: colors.fgPrimary }]}>
          G3
        </Text>
      </View>
      {bests.map((b) => (
        <View
          key={b.date}
          style={[
            styles.tableRow,
            { borderTopColor: colors.borderDefault },
          ]}
        >
          <Text style={[styles.tableCell, { color: colors.fgPrimary }]}>
            {formatMd(b.date)}
          </Text>
          <Text style={[styles.tableCell, { color: colors.fgPrimary }]}>
            {fmt(b.game1)}
          </Text>
          <Text style={[styles.tableCell, { color: colors.fgPrimary }]}>
            {fmt(b.game2)}
          </Text>
          <Text style={[styles.tableCell, { color: colors.fgPrimary }]}>
            {fmt(b.game3)}
          </Text>
        </View>
      ))}
    </View>
  );
};

function formatMd(yyyymmdd: string): string {
  const [, m, d] = yyyymmdd.split('-');
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
}
function fmt(v: number | null): string {
  if (v == null) return '—';
  return `${v.toFixed(1)}°`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: fontSize.bodyLg, // 26px
  },
  tabPanel: {
    padding: spacing.s4,
    gap: spacing.s4,
  },
  sectionTitle: {
    fontSize: fontSize.bodyLg, // 26px
    fontWeight: fontWeight.bold as '700',
  },
  emptyText: {
    fontSize: fontSize.body,
    textAlign: 'center',
    paddingTop: spacing.s5,
  },
  tableContainer: {
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    padding: spacing.s3,
    gap: spacing.s2,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold as '700',
  },
  tableRow: {
    flexDirection: 'row',
    padding: spacing.s3,
    gap: spacing.s2,
    borderTopWidth: 1,
  },
  tableCell: {
    flex: 1,
    fontSize: fontSize.body,
    fontVariant: ['tabular-nums'],
  },
});
