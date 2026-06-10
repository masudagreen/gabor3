/**
 * HistoryScreen.tsx — v3.0 履歴タブ本実装（S8、F-09 グラフ部 / screens.md S8-1）。
 *
 * TabPlaceholderScreen（履歴）を置換する。表示要素（F-09 受け入れ基準）：
 *  - 日次到達レベル折れ線（CH-1 LevelLineChart、DailyStats.highestLevelReached を日付順・直近 30 日窓）。
 *    同日複数ゲームは max（その日の最高到達レベル）を代表値に（historyView が確定済み）。
 *  - 最高到達レベル（LevelState.highestLevel）：StatTile 強調 + グラフ基準線。
 *  - 連続日数（Streak.currentStreak）/ 累計プレイ回数（PlayStats.totalSessions、セッション単位）の StatTile。
 *  - 当日の到達レベルをグラフ上で強調（色 + ◆ 形、NF-12）。
 *  - データ 7 日未満は EmptyState 案内（F-09）。
 *  - バッジ領域はプレースホルダ（本実装は S9。レイアウト上の場所だけ確保）。
 *
 * 永続化からの読み込み（loadAllDailyStats / loadStreak / loadPlayStats / loadLevelState）
 * → historyView で整形。日付依存（「当日」「直近 N 日」）はテスト可能にするため now を注入可
 * （既定 new Date()）。マウント時に 1 度だけ読み込み（履歴は静的スナップショットでよい）。
 * セーフエリア準拠・縦スクロール・PC 最大幅 720px 中央寄せ（NF-30 / レスポンシブ）。
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { fontSize, fontWeight, radius, spacing } from '../../theme/tokens';
import { LevelLineChart } from '../../components/v3/LevelLineChart';
import { StatTile } from '../../components/v3/StatTile';
import { EmptyState } from '../../components/v3/EmptyState';
import { BadgeGrid } from '../../components/v3/BadgeGrid';
import {
  loadAllDailyStats,
  loadStreak,
  loadPlayStats,
  loadLevelState,
  loadAllBadgeStatuses,
} from '../../state/v3/repository';
import { buildHistoryViewAt, type HistoryView } from '../../lib/v3/historyView';
import { buildBadgeRows, type BadgeViewRow } from '../../lib/v3/badgeView';
import { formatCumulativeDuration } from '../../lib/v3/timeFormat';
import { t } from '../../i18n';

export type HistoryScreenProps = {
  /** 当日判定の時計注入（テスト決定論）。既定は new Date()。 */
  now?: () => Date;
  testId?: string;
};

type LoadState =
  | { status: 'loading' }
  | {
      status: 'ready';
      view: HistoryView;
      highestLevel: number;
      currentStreak: number;
      totalSessions: number;
      totalPlaySec: number;
      badgeRows: BadgeViewRow[];
    }
  | { status: 'error' };

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  now = () => new Date(),
  testId,
}) => {
  const { colors } = useTheme();
  const [state, setState] = React.useState<LoadState>({ status: 'loading' });

  React.useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const [daily, streak, playStats, levelState, badges] = await Promise.all([
          loadAllDailyStats(),
          loadStreak(),
          loadPlayStats(),
          loadLevelState(),
          loadAllBadgeStatuses(),
        ]);
        if (!mounted) return;
        setState({
          status: 'ready',
          view: buildHistoryViewAt(daily, now()),
          highestLevel: levelState.highestLevel,
          currentStreak: streak.currentStreak,
          totalSessions: playStats.totalSessions,
          totalPlaySec: playStats.totalPlaySec,
          badgeRows: buildBadgeRows(badges),
        });
      } catch {
        if (mounted) setState({ status: 'error' });
      }
    })();
    return () => {
      mounted = false;
    };
    // now はマウント時に 1 度だけ評価する（履歴は静的スナップショットでよい）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.root, { backgroundColor: colors.bgCanvas }]}
      testID={testId}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator>
        <View style={styles.container}>
          <Text
            style={[styles.h1, { color: colors.fgPrimary }]}
            accessibilityRole="header"
            testID={testId ? `${testId}-title` : undefined}
          >
            {t('historyV3.title')}
          </Text>

          {state.status === 'loading' ? (
            <View
              style={[
                styles.skeleton,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderDefault,
                },
              ]}
              accessibilityLabel={t('historyV3.loading')}
              testID={testId ? `${testId}-loading` : undefined}
            />
          ) : null}

          {state.status === 'error' ? (
            <EmptyState
              icon="⚠️"
              message={t('historyV3.load_error')}
              testId={testId ? `${testId}-error` : undefined}
            />
          ) : null}

          {state.status === 'ready' ? (
            <>
              <Text style={[styles.h3, { color: colors.fgPrimary }]}>
                {t('historyV3.chart_heading')}
              </Text>
              <LevelLineChart
                view={state.view}
                highestLevel={state.highestLevel}
                testId={testId ? `${testId}-chart` : 'history-chart'}
              />

              {state.view.showTrendHint ? (
                <EmptyState
                  message={t('historyV3.trend_hint')}
                  testId={testId ? `${testId}-trend-hint` : 'history-trend-hint'}
                />
              ) : null}

              {/* 最高到達レベル / 累計プレイ回数（2 列） */}
              <View style={styles.tiles}>
                <StatTile
                  highlight
                  value={state.highestLevel}
                  label={t('historyV3.highest_label')}
                  accessibilityLabel={t('historyV3.highest_value_label', {
                    n: state.highestLevel,
                  })}
                  testId={testId ? `${testId}-highest` : 'history-highest'}
                />
                <StatTile
                  value={state.totalSessions}
                  label={t('historyV3.total_label')}
                  accessibilityLabel={t('historyV3.total_value_label', {
                    n: state.totalSessions,
                  })}
                  testId={testId ? `${testId}-total` : 'history-total'}
                />
              </View>

              {/* 連続日数 / 累計ゲーム時間（2 列） */}
              <View style={styles.tiles}>
                <StatTile
                  flame
                  value={state.currentStreak}
                  label={t('historyV3.streak_label')}
                  accessibilityLabel={t('historyV3.streak_value_label', {
                    n: state.currentStreak,
                  })}
                  testId={testId ? `${testId}-streak` : 'history-streak'}
                />
                <StatTile
                  smallValue
                  value={formatCumulativeDuration(state.totalPlaySec)}
                  label={t('historyV3.total_play_time_label')}
                  accessibilityLabel={t('historyV3.total_play_time_value_label', {
                    text: formatCumulativeDuration(state.totalPlaySec),
                  })}
                  testId={testId ? `${testId}-playtime` : 'history-playtime'}
                />
              </View>

              {/* バッジ一覧（S9、F-09 バッジ部 / screens.md S9-1）。3 軸 11 種。 */}
              <Text
                style={[styles.h3, { color: colors.fgPrimary }]}
                accessibilityRole="header"
              >
                {t('historyV3.badges_heading')}
              </Text>
              <BadgeGrid
                rows={state.badgeRows}
                testId={testId ? `${testId}-badges` : 'history-badges'}
              />
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    flexGrow: 1,
    padding: spacing.s4,
  },
  container: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    gap: spacing.s3,
  },
  h1: {
    fontSize: fontSize.h1,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.s2,
  },
  h3: {
    fontSize: fontSize.h3,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.s3,
  },
  tiles: {
    flexDirection: 'row',
    gap: spacing.s3,
    marginTop: spacing.s2,
  },
  skeleton: {
    height: 220,
    borderWidth: 1,
    borderRadius: radius.md,
    opacity: 0.5,
  },
});
