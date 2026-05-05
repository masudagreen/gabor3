/**
 * V1ScoreChart — 過去 28 日の V1 スコア折れ線グラフ（components.md §22 / spec.md §9.2）。
 *
 * 軽量実装方針（依存追加なし）：
 *   - 線そのものは描かず、各データ点を「縦バーまたは丸」で表現
 *   - X 軸：日付（M/D）、4 日おきにラベル
 *   - Y 軸：0/25/50/75/100 グリッドライン
 *   - 当日の点は強調（半径 10px、色 actionPrimary）
 *   - 通常点：半径 6px
 *   - データ欠損日は描画しない（線も切る）
 *   - 7 日未満：opacity 0.4 でデータ＋オーバーレイメッセージ
 *   - 0 日：empty state（メッセージ + CTA）
 *
 * Skia 等の高機能描画は使わず、絶対配置 View で実装する（テスト容易、Web/iOS/Android で動く）。
 *
 * a11y：role=img + aria-label（28 日推移＋当日値）。
 */

import React from 'react';
import {
  Pressable,
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
import { Button } from './Button';
import { ChartDataPoint } from '../lib/weeklyStats';

export type V1ScoreChartProps = {
  /** 28 件、buildLast28DaysChart の出力 */
  data: ChartDataPoint[];
  /** YYYY-MM-DD。data 末尾と同じ想定 */
  todayDate: string;
  /** 7 日未満のラッピング演出を表示するか（呼び出し側で判定） */
  showLowDataOverlay?: boolean;
  /** 0 日（データ無し）時に CTA を出す。null の場合は overlay のみ */
  onStartCourse?: (() => void) | null;
  /** チャート高さ。スマホ 280、PC 360 */
  height?: number;
};

// Sprint 6 Major-1：Y 軸ラベル「100」が 3 桁 + 24px font で 48px だと
// 端末によっては「1」が切れる/「00」と分離して表示される事象あり。
// Sprint 7 で 56px に拡張（残幅は X 軸キャンバスから差し引かれる）。
const Y_LABEL_WIDTH = 48;
const CHART_PADDING_LEFT = Y_LABEL_WIDTH + 8; // ラベル幅 + ラベル右側の余白
const CHART_PADDING_RIGHT = 16;
const CHART_PADDING_TOP = 16;
const CHART_PADDING_BOTTOM = 36; // X 軸ラベル分
const POINT_RADIUS_NORMAL = 6;
const POINT_RADIUS_TODAY = 10;
const Y_GRID_VALUES = [0, 25, 50, 75, 100];
// Sprint 6 Major-2：スマホ幅では 7 日刻み、PC 横では従来通り 4 日刻みに切替。
// 28 日のデータで 7 日刻みなら 5 ラベル / 4 日刻みなら 8 ラベル。
const X_LABEL_INTERVAL_NARROW = 7;
const X_LABEL_INTERVAL_WIDE = 4;
const NARROW_BREAKPOINT = 480; // 360 / 375 のスマホ幅をカバー

export const V1ScoreChart: React.FC<V1ScoreChartProps> = ({
  data,
  todayDate,
  showLowDataOverlay = false,
  onStartCourse = null,
  height = 280,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  const validCount = data.filter((d) => d.score != null).length;
  const isEmpty = validCount === 0;

  const todaySummary =
    data.find((d) => d.date === todayDate)?.score ?? null;
  const ariaLabel = `V1 スコアの過去 28 日推移、現在 ${todaySummary ?? '未記録'} 点`;

  // 0 日：empty state
  if (isEmpty && onStartCourse) {
    return (
      <View
        style={[
          styles.emptyContainer,
          {
            backgroundColor: colors.bgSurface,
            borderColor: colors.borderDefault,
            minHeight: height,
          },
        ]}
        accessibilityRole="image"
        accessibilityLabel="まだデータがありません"
      >
        <Text
          accessibilityRole="header"
          style={[styles.emptyTitle, { color: colors.fgPrimary }]}
        >
          まずは 1 セッション{'\n'}完了させましょう
        </Text>
        <Text style={[styles.emptyBody, { color: colors.fgPrimary }]}>
          トレーニング記録は{'\n'}ここに表示されます
        </Text>
        <View style={styles.emptyCta}>
          <Button
            variant="primary"
            size="lg"
            label="3 分コースを始める"
            onPress={onStartCourse}
            fullWidth
            testId="empty-start-course"
          />
        </View>
      </View>
    );
  }

  // 通常 / 低データレンダリング
  const overlayActive = showLowDataOverlay;

  return (
    <View
      testID="v1-chart"
      accessibilityRole="image"
      accessibilityLabel={ariaLabel}
      style={[
        styles.chartContainer,
        {
          backgroundColor: colors.bgSurface,
          borderColor: colors.borderDefault,
          height,
          opacity: overlayActive ? 0.55 : 1,
        },
      ]}
    >
      <ChartCanvas
        data={data}
        todayDate={todayDate}
        colors={colors}
        height={height}
      />
      {overlayActive ? (
        <View
          testID="v1-chart-low-data-overlay"
          style={[
            styles.overlay,
            // RN Web 0.19+ では pointerEvents は style 経由が推奨
            { pointerEvents: 'none' },
          ]}
        >
          <View
            style={[
              styles.overlayBox,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderDefault,
              },
            ]}
          >
            <Text
              style={[styles.overlayTitle, { color: colors.fgPrimary }]}
            >
              もう少しデータが集まると{'\n'}傾向が見えます
            </Text>
            <Text
              style={[styles.overlayBody, { color: colors.fgPrimary }]}
            >
              現在 {validCount} 日のデータ
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const ChartCanvas: React.FC<{
  data: ChartDataPoint[];
  todayDate: string;
  colors: ReturnType<typeof getColors>;
  height: number;
}> = ({ data, todayDate, colors, height }) => {
  const [width, setWidth] = React.useState<number>(0);
  const innerWidth = Math.max(0, width - CHART_PADDING_LEFT - CHART_PADDING_RIGHT);
  const innerHeight = height - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;
  const stepX = data.length > 1 ? innerWidth / (data.length - 1) : 0;
  // スマホ幅（chart 自体が狭い）か PC 横かでラベル間隔を切替（Sprint 6 Major-2）
  const xLabelInterval =
    width > 0 && width < NARROW_BREAKPOINT
      ? X_LABEL_INTERVAL_NARROW
      : X_LABEL_INTERVAL_WIDE;

  const yToPx = (score: number): number => {
    const clamped = Math.max(0, Math.min(100, score));
    return CHART_PADDING_TOP + (1 - clamped / 100) * innerHeight;
  };
  const xToPx = (i: number): number => CHART_PADDING_LEFT + stepX * i;

  return (
    <View
      style={styles.canvas}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      testID="v1-chart-canvas"
    >
      {/* Y 軸グリッド + ラベル */}
      {Y_GRID_VALUES.map((v) => {
        const top = yToPx(v);
        return (
          <React.Fragment key={`y-${v}`}>
            <View
              style={[
                styles.gridLine,
                {
                  top,
                  left: CHART_PADDING_LEFT,
                  width: innerWidth,
                  backgroundColor: colors.borderDefault,
                },
              ]}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.yLabel,
                {
                  top: top - 12,
                  color: colors.fgPrimary,
                },
              ]}
            >
              {v}
            </Text>
          </React.Fragment>
        );
      })}

      {/* データ点 */}
      {data.map((p, i) => {
        if (p.score == null) return null;
        const isToday = p.date === todayDate;
        const r = isToday ? POINT_RADIUS_TODAY : POINT_RADIUS_NORMAL;
        const cx = xToPx(i);
        const cy = yToPx(p.score);
        return (
          <View
            key={`pt-${p.date}`}
            testID={isToday ? 'v1-chart-today-point' : `v1-chart-point-${i}`}
            style={{
              position: 'absolute',
              left: cx - r,
              top: cy - r,
              width: r * 2,
              height: r * 2,
              borderRadius: r,
              backgroundColor: isToday
                ? colors.actionPrimary
                : colors.actionPrimaryHover,
              borderWidth: isToday ? 2 : 0,
              borderColor: colors.bgSurface,
            }}
          />
        );
      })}

      {/* 線分（連続したデータ点を結ぶ） */}
      {data.map((p, i) => {
        if (i === 0) return null;
        const prev = data[i - 1];
        if (prev.score == null || p.score == null) return null;
        const x1 = xToPx(i - 1);
        const y1 = yToPx(prev.score);
        const x2 = xToPx(i);
        const y2 = yToPx(p.score);
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return null;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <View
            key={`seg-${i}`}
            testID={`v1-chart-segment-${i}`}
            style={{
              position: 'absolute',
              left: x1,
              top: y1 - 1.5,
              width: len,
              height: 3,
              backgroundColor: colors.actionPrimary,
              transformOrigin: '0% 50%',
              transform: [{ rotate: `${angle}deg` }],
            }}
          />
        );
      })}

      {/* X 軸ラベル（スマホ幅は 7 日刻み、PC は 4 日刻み、必ず末尾を含む） */}
      {data.map((p, i) => {
        if (i % xLabelInterval !== 0 && i !== data.length - 1) return null;
        const cx = xToPx(i);
        const md = formatMd(p.date);
        return (
          <Text
            key={`xl-${i}`}
            numberOfLines={1}
            testID={`v1-chart-xlabel-${i}`}
            style={[
              styles.xLabel,
              {
                left: cx - 24,
                color: colors.fgPrimary,
                bottom: 4,
              },
            ]}
          >
            {md}
          </Text>
        );
      })}
    </View>
  );
};

function formatMd(yyyymmdd: string): string {
  const [, m, d] = yyyymmdd.split('-');
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
}

// SR 用：データテーブル形式の代替表示（components.md §22「表で見る」）
export const V1ScoreTable: React.FC<{ data: ChartDataPoint[] }> = ({
  data,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  return (
    <View
      testID="v1-chart-table"
      accessibilityRole="text"
      style={[
        styles.tableContainer,
        {
          backgroundColor: colors.bgSurface,
          borderColor: colors.borderDefault,
        },
      ]}
    >
      {data.map((p) => (
        <View key={`row-${p.date}`} style={styles.tableRow}>
          <Text style={[styles.tableCell, { color: colors.fgPrimary }]}>
            {formatMd(p.date)}
          </Text>
          <Text style={[styles.tableCell, { color: colors.fgPrimary }]}>
            {p.score == null ? '—' : `${p.score} 点`}
          </Text>
        </View>
      ))}
    </View>
  );
};

// 未使用ガード
void Pressable;

const styles = StyleSheet.create({
  chartContainer: {
    width: '100%',
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  canvas: {
    flex: 1,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    height: 1,
    opacity: 0.6,
  },
  yLabel: {
    position: 'absolute',
    left: 4,
    fontSize: fontSize.body, // 24px（OPT-1 床、軸ラベルは主要情報）
    fontWeight: fontWeight.medium as '600',
    width: Y_LABEL_WIDTH,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  xLabel: {
    position: 'absolute',
    fontSize: fontSize.body, // 24px
    // Sprint 7 Major：「4/10」等 4 文字日付が完全に収まるよう 56px に拡張
    width: 56,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.s4,
  },
  overlayBox: {
    padding: spacing.s5,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: spacing.s2,
    maxWidth: 360,
  },
  overlayTitle: {
    fontSize: fontSize.bodyLg, // 26px
    fontWeight: fontWeight.bold as '700',
    textAlign: 'center',
  },
  overlayBody: {
    fontSize: fontSize.body,
    textAlign: 'center',
  },
  emptyContainer: {
    width: '100%',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.s5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s4,
  },
  emptyTitle: {
    fontSize: fontSize.h2, // 30px
    fontWeight: fontWeight.bold as '700',
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: fontSize.body,
    textAlign: 'center',
  },
  emptyCta: {
    width: '100%',
    maxWidth: 360,
  },
  tableContainer: {
    padding: spacing.s4,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.s2,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tableCell: {
    fontSize: fontSize.body,
    fontVariant: ['tabular-nums'],
  },
});
