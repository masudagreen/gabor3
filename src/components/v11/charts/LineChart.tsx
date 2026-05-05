/**
 * LineChart — F-11 進捗グラフ用折れ線グラフ（components.md / V1ScoreChart 流用）。
 *
 * v1 の V1ScoreChart を v1.1 用に汎用化：
 *   - Y 軸範囲が可変（0〜100 固定の「ワイドスコア」も、ゲームごと閾値範囲も）
 *   - 「下が良い」モード（角度差・コントラスト差等）にも対応
 *   - 当日強調点
 *   - 7 日未満時の overlay メッセージ
 *   - 軸ラベル 18pt 以上（既存トークン body=24px 適合）
 *
 * Skia 等の高機能描画は使わず、絶対配置 View で実装する（依存追加なし、
 * Web/iOS/Android で動く）。
 */

import React from 'react';
import {
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
} from '../../../theme/tokens';

export type LineChartPoint = {
  /** YYYY-MM-DD */
  date: string;
  /** 値（null は欠損 → 描画しない） */
  value: number | null;
};

export type LineChartProps = {
  /** 28 件想定。日付昇順 */
  data: LineChartPoint[];
  /** YYYY-MM-DD、当日強調用 */
  todayDate: string;
  /** 7 日未満時のオーバーレイメッセージを出すか */
  showLowDataOverlay?: boolean;
  /** Y 軸最小値（既定 0） */
  yMin?: number;
  /** Y 軸最大値（既定 100） */
  yMax?: number;
  /** Y 軸の中間ラベル数（既定 4 → 0/25/50/75/100 の 5 個） */
  yGridCount?: number;
  /** Y 軸単位（"" / "°" / "×" / "arcmin" など） */
  yUnit?: string;
  /** 「下が改善」（値が小さいほど良い）→ 強調色を逆転させない、表示は同じ */
  lowerIsBetter?: boolean;
  /** チャート高さ（既定 240、F-11 軸ラベル 18pt+） */
  height?: number;
  /** a11y label */
  ariaLabel?: string;
  /** テスト ID */
  testId?: string;
};

// Sprint 19 Minor 2 修正：Y 軸ラベル幅を 56 → 72 に拡張（ゲーム別タブの細かい数値を確保）
const Y_LABEL_WIDTH = 72;
const CHART_PADDING_LEFT = Y_LABEL_WIDTH + 8;
const CHART_PADDING_RIGHT = 16;
const CHART_PADDING_TOP = 16;
// Sprint 19 Minor 1 修正：Y 軸 0 ラベルと X 軸ラベル「4/3」の重なり解消（36 → 56）
const CHART_PADDING_BOTTOM = 56;
const POINT_RADIUS_NORMAL = 6;
const POINT_RADIUS_TODAY = 10;
const X_LABEL_INTERVAL_NARROW = 7;
const X_LABEL_INTERVAL_WIDE = 4;
const NARROW_BREAKPOINT = 480;

export const LineChart: React.FC<LineChartProps> = ({
  data,
  todayDate,
  showLowDataOverlay = false,
  yMin = 0,
  yMax = 100,
  yGridCount = 4,
  yUnit = '',
  lowerIsBetter = false,
  height = 240,
  ariaLabel,
  testId,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  const validCount = data.filter((d) => d.value != null).length;
  const todaySummary =
    data.find((d) => d.date === todayDate)?.value ?? null;
  const fallbackAria = `過去 ${data.length} 日推移、現在 ${
    todaySummary == null ? '未記録' : `${todaySummary}${yUnit}`
  }`;

  return (
    <View
      testID={testId ?? 'v11-line-chart'}
      accessibilityRole="image"
      accessibilityLabel={ariaLabel ?? fallbackAria}
      style={[
        styles.chartContainer,
        {
          backgroundColor: colors.bgSurface,
          borderColor: colors.borderDefault,
          height,
          opacity: showLowDataOverlay ? 0.55 : 1,
        },
      ]}
    >
      <ChartCanvas
        data={data}
        todayDate={todayDate}
        colors={colors}
        height={height}
        yMin={yMin}
        yMax={yMax}
        yGridCount={yGridCount}
        yUnit={yUnit}
      />
      {showLowDataOverlay ? (
        <View
          testID={`${testId ?? 'v11-line-chart'}-overlay`}
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
      {/* lowerIsBetter 注記は呼び出し元で表示 */}
      {lowerIsBetter ? null : null}
    </View>
  );
};

const ChartCanvas: React.FC<{
  data: LineChartPoint[];
  todayDate: string;
  colors: ReturnType<typeof getColors>;
  height: number;
  yMin: number;
  yMax: number;
  yGridCount: number;
  yUnit: string;
}> = ({ data, todayDate, colors, height, yMin, yMax, yGridCount, yUnit }) => {
  const [width, setWidth] = React.useState<number>(0);
  const innerWidth = Math.max(
    0,
    width - CHART_PADDING_LEFT - CHART_PADDING_RIGHT,
  );
  const innerHeight = height - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;
  const stepX = data.length > 1 ? innerWidth / (data.length - 1) : 0;
  const xLabelInterval =
    width > 0 && width < NARROW_BREAKPOINT
      ? X_LABEL_INTERVAL_NARROW
      : X_LABEL_INTERVAL_WIDE;

  const yRange = yMax - yMin;
  const yToPx = (value: number): number => {
    if (yRange === 0) return CHART_PADDING_TOP + innerHeight / 2;
    const clamped = Math.max(yMin, Math.min(yMax, value));
    const t = (clamped - yMin) / yRange;
    return CHART_PADDING_TOP + (1 - t) * innerHeight;
  };
  const xToPx = (i: number): number => CHART_PADDING_LEFT + stepX * i;

  // Y グリッド値（yMin〜yMax を yGridCount 等分）
  const yGridValues: number[] = [];
  for (let i = 0; i <= yGridCount; i++) {
    yGridValues.push(yMin + (yRange * i) / yGridCount);
  }

  return (
    <View
      style={styles.canvas}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      testID="v11-line-chart-canvas"
    >
      {yGridValues.map((v) => {
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
              {formatYLabel(v)}
              {yUnit}
            </Text>
          </React.Fragment>
        );
      })}

      {data.map((p, i) => {
        if (p.value == null) return null;
        const isToday = p.date === todayDate;
        const r = isToday ? POINT_RADIUS_TODAY : POINT_RADIUS_NORMAL;
        const cx = xToPx(i);
        const cy = yToPx(p.value);
        return (
          <View
            key={`pt-${p.date}`}
            testID={isToday ? 'v11-chart-today-point' : `v11-chart-point-${i}`}
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

      {data.map((p, i) => {
        if (i === 0) return null;
        const prev = data[i - 1];
        if (prev.value == null || p.value == null) return null;
        const x1 = xToPx(i - 1);
        const y1 = yToPx(prev.value);
        const x2 = xToPx(i);
        const y2 = yToPx(p.value);
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return null;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <View
            key={`seg-${i}`}
            testID={`v11-chart-segment-${i}`}
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

      {data.map((p, i) => {
        if (i % xLabelInterval !== 0 && i !== data.length - 1) return null;
        const cx = xToPx(i);
        const md = formatMd(p.date);
        return (
          <Text
            key={`xl-${i}`}
            numberOfLines={1}
            testID={`v11-chart-xlabel-${i}`}
            style={[
              styles.xLabel,
              {
                left: cx - 28,
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

function formatYLabel(v: number): string {
  // 整数なら整数、それ以外は小数 2 桁
  if (Number.isInteger(v)) return `${v}`;
  return v.toFixed(2);
}

function formatMd(yyyymmdd: string): string {
  const [, m, d] = yyyymmdd.split('-');
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
}

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
    fontSize: fontSize.body, // 24px（F-11 受け入れ基準：軸ラベル 18pt+ 適合）
    fontWeight: fontWeight.medium as '600',
    width: Y_LABEL_WIDTH,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  xLabel: {
    position: 'absolute',
    fontSize: fontSize.body, // 24px
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
    fontSize: fontSize.bodyLg,
    fontWeight: fontWeight.bold as '700',
    textAlign: 'center',
  },
  overlayBody: {
    fontSize: fontSize.body,
    textAlign: 'center',
  },
});
