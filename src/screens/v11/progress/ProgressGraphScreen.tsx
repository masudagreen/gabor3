/**
 * ProgressGraphScreen — S18-07 / S18-08（design-v11/sprints/sprint-18/screens.md §8-§9）。
 * F-11 ワイドスコアと進捗グラフ。
 *
 * 構造：
 *   - Header: ← 戻る / 「進捗グラフ」
 *   - 親タブ：「ワイドスコア」「ゲーム別」（role=tablist）
 *   - ワイドスコアタブ：本日のワイドスコア + 28 日折れ線グラフ + 統計
 *   - ゲーム別タブ：enabled ゲームの子タブ + 各ゲームの閾値折れ線グラフ（F-18 で disabled は除外）
 *   - データ < 7 日：「もう少しデータが集まると傾向が見えます」
 *   - F-18：releaseEnabled=false のゲームは子タブから除外
 */

import React from 'react';
import {
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
} from '../../../theme/tokens';
import { IconButton } from '../../../components/IconButton';
import { LineChart, LineChartPoint } from '../../../components/v11/charts/LineChart';
import {
  GameDefinition,
  GAME_REGISTRY,
  getEnabledGames,
  getGameDefinition,
} from '../../../state/gameRegistry';
import { GameIdV11 } from '../../../state/gameIds-v11';
import {
  DailyStatsV11,
  loadRecentDailyStatsV11,
} from '../../../state/storage-v11';

export type ProgressGraphScreenProps = {
  /** 端末ローカルの今日（YYYY-MM-DD） */
  todayDate: string;
  onBack: () => void;
  /** テスト用：DailyStats を直接注入する（AsyncStorage を使わない） */
  preloadedStatsForTest?: ReadonlyArray<DailyStatsV11>;
};

export const ProgressGraphScreen: React.FC<ProgressGraphScreenProps> = ({
  todayDate,
  onBack,
  preloadedStatsForTest,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  const [tab, setTab] = React.useState<'wide' | 'game'>('wide');
  const [selectedGameId, setSelectedGameId] = React.useState<GameIdV11>(
    () => getEnabledGames()[0]?.gameId ?? 'G-01',
  );
  const [stats, setStats] = React.useState<ReadonlyArray<DailyStatsV11>>(
    preloadedStatsForTest ?? [],
  );
  const [loaded, setLoaded] = React.useState<boolean>(
    preloadedStatsForTest != null,
  );

  React.useEffect(() => {
    if (preloadedStatsForTest != null) return;
    let cancelled = false;
    void loadRecentDailyStatsV11(todayDate, 28).then((rec) => {
      if (cancelled) return;
      setStats(rec);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [todayDate, preloadedStatsForTest]);

  const enabledGames = React.useMemo(() => getEnabledGames(), []);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgCanvas }]}
      testID="progress-graph-screen"
    >
      <View style={styles.header}>
        <IconButton
          icon="back"
          ariaLabel="戻る"
          onPress={onBack}
          testId="progress-graph-back"
        />
        <Text
          accessibilityRole="header"
          style={[styles.headerTitle, { color: colors.fgPrimary }]}
        >
          進捗グラフ
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View
        accessibilityRole="tablist"
        style={styles.tabsRow}
        testID="progress-graph-tabs"
      >
        <TabButton
          label="ワイドスコア"
          selected={tab === 'wide'}
          onPress={() => setTab('wide')}
          testId="progress-tab-wide"
        />
        <TabButton
          label="ゲーム別"
          selected={tab === 'game'}
          onPress={() => setTab('game')}
          testId="progress-tab-game"
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {tab === 'wide' ? (
          <WideScoreTab
            stats={stats}
            todayDate={todayDate}
            loaded={loaded}
          />
        ) : (
          <GameTab
            stats={stats}
            todayDate={todayDate}
            loaded={loaded}
            enabledGames={enabledGames}
            selectedGameId={selectedGameId}
            onSelectGameId={setSelectedGameId}
          />
        )}
      </ScrollView>
    </View>
  );
};

// ---- ワイドスコアタブ（S18-07） ----
const WideScoreTab: React.FC<{
  stats: ReadonlyArray<DailyStatsV11>;
  todayDate: string;
  loaded: boolean;
}> = ({ stats, todayDate, loaded }) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const series = buildWideScoreSeries(stats, todayDate);
  const todayValue = series.find((p) => p.date === todayDate)?.value ?? null;
  const validCount = series.filter((p) => p.value != null).length;
  const showLowDataOverlay = validCount < 7;
  const validValues = series
    .map((p) => p.value)
    .filter((v): v is number => v !== null);
  const max = validValues.length > 0 ? Math.max(...validValues) : null;
  const avg =
    validValues.length > 0
      ? Math.round(validValues.reduce((a, b) => a + b, 0) / validValues.length)
      : null;
  const maxEntry = max !== null ? series.find((p) => p.value === max) : null;

  if (!loaded) {
    return (
      <Text style={{ color: colors.fgSecondary, fontSize: fontSize.body }}>
        読み込み中…
      </Text>
    );
  }

  return (
    <>
      <Text style={[styles.todayHeading, { color: colors.fgPrimary }]}>
        本日のスコア：
        {todayValue !== null ? `${todayValue} 点` : '未測定'}
      </Text>
      <Text style={[styles.subHeading, { color: colors.fgSecondary }]}>
        過去 28 日推移
      </Text>
      <LineChart
        data={series}
        todayDate={todayDate}
        showLowDataOverlay={showLowDataOverlay}
        yMin={0}
        yMax={100}
        yGridCount={4}
        height={240}
        ariaLabel={`ワイドスコア過去 28 日推移、本日 ${
          todayValue !== null ? `${todayValue} 点` : '未測定'
        }`}
        testId="progress-wide-chart"
      />
      <View style={styles.statsRow} testID="progress-wide-stats">
        <Text style={[styles.statText, { color: colors.fgPrimary }]}>
          データ件数：28 日中 {validCount} 日
        </Text>
        {max !== null && maxEntry ? (
          <Text style={[styles.statText, { color: colors.fgPrimary }]}>
            最高：{max} 点（{formatMdShort(maxEntry.date)}）
          </Text>
        ) : null}
        {avg !== null ? (
          <Text style={[styles.statText, { color: colors.fgPrimary }]}>
            平均：{avg} 点
          </Text>
        ) : null}
      </View>
    </>
  );
};

// ---- ゲーム別タブ（S18-08） ----
const GameTab: React.FC<{
  stats: ReadonlyArray<DailyStatsV11>;
  todayDate: string;
  loaded: boolean;
  enabledGames: ReadonlyArray<GameDefinition>;
  selectedGameId: GameIdV11;
  onSelectGameId: (id: GameIdV11) => void;
}> = ({ stats, todayDate, loaded, enabledGames, selectedGameId, onSelectGameId }) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const def = getGameDefinition(selectedGameId);

  if (!loaded || !def) {
    return (
      <Text style={{ color: colors.fgSecondary, fontSize: fontSize.body }}>
        読み込み中…
      </Text>
    );
  }

  const series = buildGameThresholdSeries(stats, todayDate, selectedGameId);
  const todayValue = series.find((p) => p.date === todayDate)?.value ?? null;
  const validCount = series.filter((p) => p.value != null).length;
  const showLowDataOverlay = validCount < 7;
  const yUnit = unitForGame(def.gameId);

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
        contentContainerStyle={styles.subTabsRow}
        testID="progress-game-subtabs"
      >
        {enabledGames.map((g) => (
          <SubTabButton
            key={g.gameId}
            gameId={g.gameId}
            selected={g.gameId === selectedGameId}
            onPress={() => onSelectGameId(g.gameId)}
          />
        ))}
      </ScrollView>

      <Text style={[styles.todayHeading, { color: colors.fgPrimary }]}>
        {def.gameId} {def.nameJa}
      </Text>
      <Text style={[styles.subHeading, { color: colors.fgPrimary }]}>
        本日の閾値：
        {todayValue !== null ? `${formatThresholdValue(todayValue, def.gameId)}${yUnit}` : '未測定'}
      </Text>
      <Text style={[styles.subHeading, { color: colors.fgSecondary }]}>
        過去 28 日推移
      </Text>
      <LineChart
        data={series}
        todayDate={todayDate}
        showLowDataOverlay={showLowDataOverlay}
        yMin={Math.min(def.paramRange.min, def.paramRange.max)}
        yMax={Math.max(def.paramRange.min, def.paramRange.max)}
        yGridCount={4}
        yUnit={yUnit}
        lowerIsBetter
        height={240}
        ariaLabel={`${def.gameId} ${def.nameJa} の閾値、過去 28 日推移、本日 ${
          todayValue !== null
            ? `${formatThresholdValue(todayValue, def.gameId)}${yUnit}`
            : '未測定'
        }`}
        testId="progress-game-chart"
      />
      <Text
        style={[styles.caption, { color: colors.fgSecondary }]}
        testID="progress-game-caption"
      >
        ※ 値が小さいほど良い
      </Text>
    </>
  );
};

// ---- 内部 helper ----

const TabButton: React.FC<{
  label: string;
  selected: boolean;
  onPress: () => void;
  testId?: string;
}> = ({ label, selected, onPress, testId }) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const [focused, setFocused] = React.useState(false);
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      testID={testId}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => {
        const s: ViewStyle = {
          flex: 1,
          minHeight: 56,
          alignItems: 'center',
          justifyContent: 'center',
          borderBottomWidth: selected ? 4 : 1,
          borderBottomColor: selected
            ? colors.actionPrimary
            : colors.borderDefault,
          opacity: pressed ? 0.85 : 1,
        };
        if (focused) {
          (s as ViewStyle & { outlineColor?: string; outlineWidth?: number; outlineStyle?: string }).outlineColor = colors.focusRing;
          (s as ViewStyle & { outlineColor?: string; outlineWidth?: number; outlineStyle?: string }).outlineWidth = 3;
          (s as ViewStyle & { outlineColor?: string; outlineWidth?: number; outlineStyle?: string }).outlineStyle = 'solid';
        }
        return s;
      }}
    >
      <Text
        style={{
          fontSize: fontSize.bodyLg,
          fontWeight: selected
            ? (fontWeight.bold as '700')
            : (fontWeight.medium as '600'),
          color: selected ? colors.actionPrimary : colors.fgPrimary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const SubTabButton: React.FC<{
  gameId: GameIdV11;
  selected: boolean;
  onPress: () => void;
}> = ({ gameId, selected, onPress }) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const [focused, setFocused] = React.useState(false);
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={gameId}
      testID={`progress-subtab-${gameId}`}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => {
        const s: ViewStyle = {
          minHeight: 48,
          paddingHorizontal: spacing.s4,
          alignItems: 'center',
          justifyContent: 'center',
          borderBottomWidth: selected ? 4 : 1,
          borderBottomColor: selected
            ? colors.actionPrimary
            : colors.borderDefault,
          opacity: pressed ? 0.85 : 1,
        };
        if (focused) {
          (s as ViewStyle & { outlineColor?: string; outlineWidth?: number; outlineStyle?: string }).outlineColor = colors.focusRing;
          (s as ViewStyle & { outlineColor?: string; outlineWidth?: number; outlineStyle?: string }).outlineWidth = 3;
          (s as ViewStyle & { outlineColor?: string; outlineWidth?: number; outlineStyle?: string }).outlineStyle = 'solid';
        }
        return s;
      }}
    >
      <Text
        style={{
          fontSize: fontSize.body,
          fontWeight: selected
            ? (fontWeight.bold as '700')
            : (fontWeight.medium as '600'),
          color: selected ? colors.actionPrimary : colors.fgPrimary,
        }}
      >
        {gameId}
      </Text>
    </Pressable>
  );
};

// ---- データ整形 ----

/**
 * 28 日分の日付配列に DailyStats の wideScore を埋め込む。
 * 欠損日は `value: null`。
 */
export function buildWideScoreSeries(
  stats: ReadonlyArray<DailyStatsV11>,
  todayDate: string,
): LineChartPoint[] {
  const map = new Map<string, DailyStatsV11>();
  for (const s of stats) map.set(s.date, s);
  const dates = buildDateRange(todayDate, 28);
  return dates.map((d) => ({
    date: d,
    value: map.get(d)?.wideScore ?? null,
  }));
}

/**
 * 28 日分の日付配列に各ゲームのベスト閾値を埋め込む。
 */
export function buildGameThresholdSeries(
  stats: ReadonlyArray<DailyStatsV11>,
  todayDate: string,
  gameId: GameIdV11,
): LineChartPoint[] {
  const map = new Map<string, DailyStatsV11>();
  for (const s of stats) map.set(s.date, s);
  const dates = buildDateRange(todayDate, 28);
  return dates.map((d) => ({
    date: d,
    value: map.get(d)?.gameBestThresholds?.[gameId] ?? null,
  }));
}

/** today を末尾とする 28 日分の YYYY-MM-DD 配列（古い → 新しい）。 */
export function buildDateRange(today: string, days: number): string[] {
  const [y, m, d] = today.split('-').map((s) => parseInt(s, 10));
  const out: string[] = [];
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    out.push(`${yy}-${mm}-${dd}`);
    dt.setDate(dt.getDate() + 1);
  }
  return out;
}

function unitForGame(gameId: GameIdV11): string {
  switch (gameId) {
    case 'G-01':
    case 'G-02':
    case 'G-03':
    case 'G-07':
    case 'G-08':
    case 'G-10':
      return '°';
    case 'G-11':
      return "'";
    case 'G-05':
    case 'G-06':
    case 'G-12':
      return '×';
    case 'G-04':
    case 'G-09':
    case 'G-13':
      return '';
    default:
      return '';
  }
}

function formatThresholdValue(value: number, gameId: GameIdV11): string {
  switch (gameId) {
    case 'G-04':
    case 'G-09':
    case 'G-13':
      return value.toFixed(2);
    case 'G-05':
    case 'G-06':
    case 'G-12':
      return value.toFixed(1);
    case 'G-11':
      return value.toFixed(1);
    default:
      return value.toFixed(1);
  }
}

function formatMdShort(yyyymmdd: string): string {
  const [, m, d] = yyyymmdd.split('-');
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
}

// 未使用ガード
void GAME_REGISTRY;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 64,
    paddingHorizontal: spacing.s4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
  },
  headerTitle: {
    fontSize: fontSize.h3,
    fontWeight: fontWeight.bold as '700',
  },
  headerSpacer: { flex: 1 },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.s4,
  },
  subTabsRow: {
    paddingHorizontal: spacing.s4,
    gap: spacing.s2,
    paddingVertical: spacing.s2,
  },
  content: {
    padding: spacing.s5,
    gap: spacing.s3,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: spacing.s8,
  },
  todayHeading: {
    fontSize: fontSize.h2,
    fontWeight: fontWeight.bold as '700',
  },
  subHeading: {
    fontSize: fontSize.body,
  },
  statsRow: {
    gap: spacing.s2,
    paddingTop: spacing.s2,
  },
  statText: {
    fontSize: fontSize.body,
  },
  caption: {
    fontSize: fontSize.body,
    paddingTop: spacing.s2,
  },
});
