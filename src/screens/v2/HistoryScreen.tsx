/**
 * HistoryScreen.tsx — 履歴タブ本実装（S7、F-09 グラフ部 / screens.md S7-1）。
 *
 * HistoryPlaceholderScreen（S5）を置換する。表示要素：
 *  - 日次スコア折れ線（CH-1 LineChart、DailyStats.bestSessionScore を日付順・直近 30 日窓）
 *  - 連続日数（Streak.currentStreak）/ 累計プレイ回数（PlayStats.totalSessions）の StatTile
 *  - データ 7 日未満は EmptyState 案内（F-09）
 *  - バッジ領域はプレースホルダ（本実装は S8。レイアウト上の場所だけ確保）
 *
 * 永続化からの読み込み（loadAllDailyStats / loadStreak / loadPlayStats）→ historyView で整形。
 * 日付依存（「当日」「直近 N 日」）はテスト可能にするため now を注入可（既定 new Date()）。
 * セーフエリア準拠・縦スクロール・PC 最大幅 720px 中央寄せ（NF-30 / レスポンシブ）。
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { fontSize, fontWeight, radius, spacing } from '../../theme/tokens';
import { LineChart } from '../../components/v2/LineChart';
import { StatTile } from '../../components/v2/StatTile';
import { EmptyState } from '../../components/v2/EmptyState';
import { BadgeGrid } from '../../components/v2/BadgeGrid';
import {
  loadAllDailyStats,
  loadStreak,
  loadPlayStats,
  loadAllBadgeStatuses,
  loadAllSessions,
} from '../../state/repository';
import { buildHistoryViewAt, type HistoryView } from '../../lib/v2/historyView';
import { buildBadgeRows, type BadgeViewRow } from '../../lib/v2/badgeView';
import { countHighScoreSessions } from '../../state/badgeRecorder';
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
      currentStreak: number;
      totalSessions: number;
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
        const [daily, streak, playStats, badges, sessions] = await Promise.all([
          loadAllDailyStats(),
          loadStreak(),
          loadPlayStats(),
          loadAllBadgeStatuses(),
          loadAllSessions(),
        ]);
        if (!mounted) return;
        setState({
          status: 'ready',
          view: buildHistoryViewAt(daily, now()),
          currentStreak: streak.currentStreak,
          totalSessions: playStats.totalSessions,
          badgeRows: buildBadgeRows(badges, countHighScoreSessions(sessions)),
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
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator
      >
        <View style={styles.container}>
          <Text
            style={[styles.h1, { color: colors.fgPrimary }]}
            accessibilityRole="header"
            testID={testId ? `${testId}-title` : undefined}
          >
            {t('history.title')}
          </Text>

          {state.status === 'loading' ? (
            <View
              style={[
                styles.skeleton,
                { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
              ]}
              accessibilityLabel={t('common.loading')}
              testID={testId ? `${testId}-loading` : undefined}
            />
          ) : null}

          {state.status === 'error' ? (
            <EmptyState
              icon="⚠️"
              message={t('common.load_error')}
              testId={testId ? `${testId}-error` : undefined}
            />
          ) : null}

          {state.status === 'ready' ? (
            <>
              <Text style={[styles.h3, { color: colors.fgPrimary }]}>
                {t('history.chart_heading')}
              </Text>
              <LineChart
                view={state.view}
                testId={testId ? `${testId}-chart` : 'history-chart'}
              />

              {state.view.showTrendHint ? (
                <EmptyState
                  message={t('history.trend_hint')}
                  testId={testId ? `${testId}-trend-hint` : 'history-trend-hint'}
                />
              ) : null}

              <View style={styles.tiles}>
                <StatTile
                  flame
                  value={state.currentStreak}
                  label={t('history.streak_label')}
                  accessibilityLabel={t('history.streak_value_label', {
                    n: state.currentStreak,
                  })}
                  testId={testId ? `${testId}-streak` : 'history-streak'}
                />
                <StatTile
                  value={state.totalSessions}
                  label={t('history.total_label')}
                  accessibilityLabel={t('history.total_value_label', {
                    n: state.totalSessions,
                  })}
                  testId={testId ? `${testId}-total` : 'history-total'}
                />
              </View>

              {/* バッジ一覧（S8、F-09 バッジ部） */}
              <Text style={[styles.h3, { color: colors.fgPrimary }]}>
                {t('history.badges_heading')}
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
