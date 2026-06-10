/**
 * LevelLineChart.tsx — CH-1（components.md / F-09、v3.0 改訂）。
 *
 * **日次到達レベル**（その日の最高到達レベル＝ max）の折れ線。v2.0 の 0〜100 スコア折れ線
 * （components/v2/LineChart.tsx）から到達レベルへ全面差し替えた版。
 *
 * - SVG 非依存・View ベース（Expo Go / SDK 54 互換、native モジュール非追加）。座標は
 *   lib/v3/chartGeometry.ts の純関数に分離（動的 Y スケール）。
 * - Y 軸ラベル：上端 / 中間 / 0 の動的 3 段（chartGeometry.yTicks）。font.label 24px（18pt 以上）。
 * - X 軸ラベル：始点・中間・終点の日付。
 * - 折れ線：色 color.level.line（青）。点：● 他日（青）、◆ + 赤 当日（色 + 形で非依存、NF-12）。
 * - **最高到達レベル基準線**：橙の水平破線 + 「最高 {n}」ラベル（highestLevel>0 のとき）。
 * - 同日複数ゲームの max は historyView が DailyStats.highestLevelReached で確定済み。
 * - データ 7 日未満の案内（EmptyState）は呼び出し側（HistoryScreen）が制御。
 * - 点滅なし（NF-11）。描画アニメーションなし（reduced-motion でも同一の静的描画、NF-13）。
 * - aria-label にサマリ（「過去 N 日の到達レベル。最新 {date} は レベル {n}。最高到達レベル {m}」）。
 */

import React from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import {
  fontSize,
  fontWeight,
  levelChartV3,
  radius,
  spacing,
} from '../../theme/tokens';
import { computeChartGeometry } from '../../lib/v3/chartGeometry';
import {
  historyChartSummary,
  shortDateLabel,
  type HistoryView,
} from '../../lib/v3/historyView';
import { t } from '../../i18n';

export type LevelLineChartProps = {
  view: HistoryView;
  /** 最高到達レベル（LevelState.highestLevel）。基準線 + スケール + aria に使う。 */
  highestLevel: number;
  testId?: string;
};

const PLOT_HEIGHT = 180;
const Y_AXIS_WIDTH = 52;
const POINT_SIZE = 14;
const LINE_THICKNESS = 3;
const DASH_WIDTH = 8;
const DASH_GAP = 6;

export const LevelLineChart: React.FC<LevelLineChartProps> = ({
  view,
  highestLevel,
  testId,
}) => {
  const { colors, mode } = useTheme();
  const chart = levelChartV3[mode];
  const [plotWidth, setPlotWidth] = React.useState(0);

  const onPlotLayout = React.useCallback((e: LayoutChangeEvent) => {
    setPlotWidth(e.nativeEvent.layout.width);
  }, []);

  const summary = historyChartSummary(view);
  const ariaLabel = summary
    ? t('historyV3.chart_summary', {
        days: summary.dayCount,
        date: shortDateLabel(summary.latestDate),
        level: summary.latestLevel,
        highest: highestLevel,
      })
    : t('historyV3.chart_summary_empty', { highest: highestLevel });

  const geometry =
    plotWidth > 0
      ? computeChartGeometry(view.points, highestLevel, plotWidth, PLOT_HEIGHT)
      : null;

  const xLabels = pickXLabels(view);
  const dashCount =
    plotWidth > 0 ? Math.max(1, Math.floor(plotWidth / (DASH_WIDTH + DASH_GAP))) : 0;

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
        {/* Y 軸ラベル（動的：上端 / 中間 / 0） */}
        <View style={styles.yAxis}>
          {(geometry ? geometry.yTicks : [10, 5, 0]).map((tick, i) => (
            <Text
              key={`y-${i}`}
              style={[styles.axisLabel, { color: colors.fgSecondary }]}
              testID={testId ? `${testId}-y-${i}` : undefined}
            >
              {String(tick)}
            </Text>
          ))}
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

          {/* 最高到達レベル基準線（橙・破線、highestLevel>0 のとき） */}
          {geometry?.highestLineY != null ? (
            <View
              pointerEvents="none"
              style={[styles.dashRow, { top: geometry.highestLineY }]}
              testID={testId ? `${testId}-highest-line` : undefined}
            >
              {Array.from({ length: dashCount }).map((_, i) => (
                <View
                  key={`dash-${i}`}
                  style={[styles.dash, { backgroundColor: chart.lineHighest }]}
                />
              ))}
            </View>
          ) : null}

          {/* 折れ線セグメント */}
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
                  backgroundColor: chart.line,
                  transform: [{ rotateZ: `${seg.angleDeg}deg` }],
                },
              ]}
            />
          ))}

          {/* データ点（当日は ◆ 赤、他日は ● 青） */}
          {geometry?.points.map((p, i) => (
            <View
              key={`pt-${p.date}-${i}`}
              pointerEvents="none"
              testID={
                testId ? `${testId}-point-${p.isToday ? 'today' : i}` : undefined
              }
              style={[
                styles.point,
                {
                  left: p.x - POINT_SIZE / 2,
                  top: p.y - POINT_SIZE / 2,
                  backgroundColor: p.isToday ? chart.pointToday : chart.point,
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

      {/* 最高到達レベルの凡例ラベル（基準線の意味を補強、色のみ非依存） */}
      {highestLevel > 0 ? (
        <Text
          style={[styles.highestLabel, { color: chart.lineHighest }]}
          testID={testId ? `${testId}-highest-label` : undefined}
        >
          {t('historyV3.axis_highest_line', { n: highestLevel })}
        </Text>
      ) : null}
    </View>
  );
};

/** X 軸に出す日付ラベル（始点・中間・終点。点が 3 以下なら全点）。 */
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
  dashRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: DASH_GAP,
    height: 2,
  },
  dash: {
    width: DASH_WIDTH,
    height: 2,
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
  highestLabel: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
    marginTop: spacing.s2,
    marginLeft: Y_AXIS_WIDTH,
  },
});
