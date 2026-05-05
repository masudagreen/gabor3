/**
 * DailyBestScreen — screens.md S6-05 / S6-06 / S5-05。
 *
 * - 今日のベスト（ゲーム別 3 列カード、components.md §26）
 * - 過去 7 日のベスト履歴（古→新）
 *
 * 進捗グラフ画面の「日次ベスト」タブとは別に、ホームから直接アクセスできる
 * 専用画面として配置する。データソースは loadAllDailyStats。
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
} from '../theme/tokens';
import { IconButton } from '../components/IconButton';
import {
  DailyStats,
  loadAllDailyStats,
} from '../state/storage';
import {
  getRecent7DaysBest,
  getTodayBest,
} from '../lib/dailyBest';

export type DailyBestScreenProps = {
  onBack: () => void;
};

export const DailyBestScreen: React.FC<DailyBestScreenProps> = ({ onBack }) => {
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

  if (!stats) {
    return (
      <View
        style={[styles.container, { backgroundColor: colors.bgCanvas }]}
        testID="daily-best-loading"
      />
    );
  }

  const today = new Date();
  const todayBest = getTodayBest(stats, today);
  const recent7 = getRecent7DaysBest(stats, today);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgCanvas }]}>
      <View style={styles.header}>
        <IconButton
          icon="back"
          ariaLabel="戻る"
          onPress={onBack}
          testId="daily-best-back"
        />
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.fgPrimary }]}
        >
          日次ベスト
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text
          accessibilityRole="header"
          style={[styles.section, { color: colors.fgPrimary }]}
        >
          今日のベスト
        </Text>
        <View style={styles.todayRow}>
          <BestCard
            label="Game 1"
            value={todayBest.game1Best}
            colors={colors}
            testId="daily-best-game1"
          />
          <BestCard
            label="Game 2"
            value={todayBest.game2Best}
            colors={colors}
            testId="daily-best-game2"
          />
          <BestCard
            label="Game 3"
            value={todayBest.game3Best}
            colors={colors}
            testId="daily-best-game3"
          />
        </View>

        <Text
          accessibilityRole="header"
          style={[styles.section, { color: colors.fgPrimary }]}
        >
          過去 7 日
        </Text>
        <View
          testID="recent7-table"
          style={[
            styles.table,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderDefault,
            },
          ]}
        >
          <View style={styles.tableHeader}>
            <Text style={[styles.cellHeader, { color: colors.fgPrimary }]}>
              日付
            </Text>
            <Text style={[styles.cellHeader, { color: colors.fgPrimary }]}>
              G1
            </Text>
            <Text style={[styles.cellHeader, { color: colors.fgPrimary }]}>
              G2
            </Text>
            <Text style={[styles.cellHeader, { color: colors.fgPrimary }]}>
              G3
            </Text>
          </View>
          {recent7.map((b) => (
            <View
              key={b.date}
              style={[
                styles.tableRow,
                { borderTopColor: colors.borderDefault },
              ]}
            >
              <Text style={[styles.cell, { color: colors.fgPrimary }]}>
                {formatMd(b.date)}
              </Text>
              <Text style={[styles.cell, { color: colors.fgPrimary }]}>
                {fmt(b.game1Best)}
              </Text>
              <Text style={[styles.cell, { color: colors.fgPrimary }]}>
                {fmt(b.game2Best)}
              </Text>
              <Text style={[styles.cell, { color: colors.fgPrimary }]}>
                {fmt(b.game3Best)}
              </Text>
            </View>
          ))}
        </View>

        <Text style={[styles.note, { color: colors.fgMuted }]}>
          ※ 値が小さいほど精度が高い（角度差が小さい）
        </Text>
      </ScrollView>
    </View>
  );
};

const BestCard: React.FC<{
  label: string;
  value: number | null;
  colors: ReturnType<typeof getColors>;
  testId?: string;
}> = ({ label, value, colors, testId }) => (
  <View
    testID={testId}
    style={[
      styles.bestCard,
      {
        backgroundColor: colors.bgSurface,
        borderColor: colors.borderDefault,
      },
    ]}
    accessibilityLabel={
      value == null
        ? `${label} の今日のベストはまだありません`
        : `${label} の今日のベスト ${value.toFixed(1)} 度`
    }
  >
    <Text style={[styles.bestLabel, { color: colors.fgPrimary }]}>{label}</Text>
    <Text style={[styles.bestValue, { color: colors.fgPrimary }]}>
      {value == null ? '—' : `${value.toFixed(1)}°`}
    </Text>
  </View>
);

function formatMd(yyyymmdd: string): string {
  const [, m, d] = yyyymmdd.split('-');
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
}
function fmt(v: number | null): string {
  if (v == null) return '—';
  return `${v.toFixed(1)}°`;
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
  scroll: {
    padding: spacing.s4,
    gap: spacing.s4,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  section: {
    fontSize: fontSize.h3, // 26px
    fontWeight: fontWeight.bold as '700',
  },
  todayRow: {
    flexDirection: 'row',
    gap: spacing.s3,
  },
  bestCard: {
    flex: 1,
    padding: spacing.s4,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: spacing.s2,
  },
  bestLabel: {
    fontSize: fontSize.body,
  },
  bestValue: {
    fontSize: fontSize.h2, // 30px
    fontWeight: fontWeight.bold as '700',
    fontVariant: ['tabular-nums'],
  },
  table: {
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    padding: spacing.s3,
    gap: spacing.s2,
  },
  cellHeader: {
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
  cell: {
    flex: 1,
    fontSize: fontSize.body,
    fontVariant: ['tabular-nums'],
  },
  note: {
    fontSize: fontSize.caption,
    textAlign: 'center',
    paddingTop: spacing.s2,
  },
});
