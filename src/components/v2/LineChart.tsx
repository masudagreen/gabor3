/**
 * LineChart.tsx — CH-1（S7、F-09）。
 *
 * 日次スコア（0〜100）の折れ線。SVG 非依存・View ベースで描画する（Expo Go / SDK 54
 * 互換を優先し、native モジュール react-native-svg を追加しないため。座標計算は
 * lib/v2/chartGeometry.ts の純関数に分離してテスト済み）。
 *
 * - Y 軸ラベル 100 / 50 / 0、X 軸ラベルは始点・中間・終点の日付（18pt 以上＝font.label 24px）。
 * - 折れ線：色 color.score.line（actionPrimary）。点：● 他日、◆ + 赤 当日（色 + 形で非依存、NF-12）。
 * - 同日 max は historyView が DailyStats.bestSessionScore で確定済み。
 * - データ 7 日未満は EmptyState 案内をグラフ下に表示（呼び出し側 = HistoryScreen が制御）。
 * - 点滅なし（NF-11）。描画アニメーションなし（reduced-motion 時も同一の静的描画、NF-13）。
 * - aria-label にサマリ（「過去 N 日の日次スコア。最新 {date} は {n} 点」）。
 */

import React from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { fontSize, fontWeight, radius, spacing } from '../../theme/tokens';
import { computeChartGeometry } from '../../lib/v2/chartGeometry';
import {
  historyChartSummary,
  shortDateLabel,
  type HistoryView,
} from '../../lib/v2/historyView';
import { t } from '../../i18n';

export type LineChartProps = {
  view: HistoryView;
  testId?: string;
};

const PLOT_HEIGHT = 180;
const Y_AXIS_WIDTH = 44;
const POINT_SIZE = 14;
const LINE_THICKNESS = 3;

export const LineChart: React.FC<LineChartProps> = ({ view, testId }) => {
  const { colors } = useTheme();
  const [plotWidth, setPlotWidth] = React.useState(0);

  const onPlotLayout = React.useCallback((e: LayoutChangeEvent) => {
    setPlotWidth(e.nativeEvent.layout.width);
  }, []);

  const summary = historyChartSummary(view);
  const ariaLabel = summary
    ? t('history.chart_summary', {
        days: summary.dayCount,
        date: shortDateLabel(summary.latestDate),
        score: summary.latestScore,
      })
    : t('history.chart_summary_empty');

  const geometry =
    plotWidth > 0
      ? computeChartGeometry(view.points, plotWidth, PLOT_HEIGHT)
      : null;

  // X 軸ラベル：始点・中間・終点の日付（点が少なければ詰めて表示）。
  const xLabels = pickXLabels(view);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
      ]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={ariaLabel}
      testID={testId}
    >
      <View style={styles.plotRow}>
        {/* Y 軸ラベル */}
        <View style={styles.yAxis}>
          <Text style={[styles.axisLabel, { color: colors.fgSecondary }]}>
            {t('history.axis_y_max')}
          </Text>
          <Text style={[styles.axisLabel, { color: colors.fgSecondary }]}>
            {t('history.axis_y_mid')}
          </Text>
          <Text style={[styles.axisLabel, { color: colors.fgSecondary }]}>
            {t('history.axis_y_min')}
          </Text>
        </View>

        {/* プロット領域 */}
        <View
          style={styles.plotArea}
          onLayout={onPlotLayout}
          testID={testId ? `${testId}-plot-area` : undefined}
        >
          {/* ベースライン（X 軸） */}
          <View
            style={[styles.baseline, { backgroundColor: colors.borderDefault }]}
            pointerEvents="none"
          />
          {geometry?.segments.map((seg, i) => (
            <View
              key={`seg-${i}`}
              pointerEvents="none"
              style={[
                styles.segment,
                {
                  left: seg.x,
                  top: seg.y - LINE_THICKNESS / 2,
                  width: seg.length,
                  backgroundColor: colors.actionPrimary,
                  transform: [
                    { translateX: 0 },
                    { rotateZ: `${seg.angleDeg}deg` },
                  ],
                },
              ]}
            />
          ))}
          {geometry?.points.map((p, i) => (
            <View
              key={`pt-${p.date}-${i}`}
              pointerEvents="none"
              testID={
                testId
                  ? `${testId}-point-${p.isToday ? 'today' : i}`
                  : undefined
              }
              style={[
                styles.point,
                {
                  left: p.x - POINT_SIZE / 2,
                  top: p.y - POINT_SIZE / 2,
                  backgroundColor: p.isToday
                    ? colors.semanticError
                    : colors.actionPrimary,
                  // 当日は ◆（45 度回転の四角）、他日は ●（円）で形でも区別（NF-12）。
                  borderRadius: p.isToday ? 0 : POINT_SIZE / 2,
                  transform: p.isToday ? [{ rotateZ: '45deg' }] : [],
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* X 軸ラベル */}
      <View style={styles.xAxis}>
        {xLabels.map((label, i) => (
          <Text
            key={`x-${i}`}
            style={[styles.axisLabel, { color: colors.fgSecondary }]}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
};

/** X 軸に出す日付ラベル（始点・中間・終点。点が 2 以下なら全点）。 */
function pickXLabels(view: HistoryView): string[] {
  const dates = view.points.map((p) => shortDateLabel(p.date));
  if (dates.length <= 3) return dates;
  const mid = Math.floor((dates.length - 1) / 2);
  return [dates[0], dates[mid], dates[dates.length - 1]];
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.s4,
  },
  plotRow: {
    flexDirection: 'row',
  },
  yAxis: {
    width: Y_AXIS_WIDTH,
    height: PLOT_HEIGHT,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: spacing.s2,
  },
  plotArea: {
    flex: 1,
    height: PLOT_HEIGHT,
    position: 'relative',
  },
  baseline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
  },
  segment: {
    position: 'absolute',
    height: LINE_THICKNESS,
    borderRadius: LINE_THICKNESS / 2,
    transformOrigin: 'left center',
  },
  point: {
    position: 'absolute',
    width: POINT_SIZE,
    height: POINT_SIZE,
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: Y_AXIS_WIDTH,
    marginTop: spacing.s2,
  },
  axisLabel: {
    // 18pt 以上要件。font.label 24px を使用（NF-16 / F-09）。
    fontSize: fontSize.label,
    fontWeight: fontWeight.medium,
  },
});
