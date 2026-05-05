/**
 * MarkBadge — MK-1（components.md §24、v1.1.1 新規）。
 *
 * `ResultOverlay` の子。◯ / ✕ / 薄 ◯ アイコンを単体で描画する。
 *
 *   - kind="correct"：緑の ◯（成功色 successFg）
 *   - kind="wrong"  ：赤の ✕（危険色 dangerFg）
 *   - kind="missed" ：薄い緑の ◯（不透明度 50%、複数選択ゲーム用）
 *
 * 円形背景（82% 不透明）+ 中央のアイコンの 2 層構造。アイコンは円直径 × 0.6、
 * 線幅は円直径 × 0.10（最小 2px、最大 6px）。
 *
 * v1.1.1 spec 再確定：
 *   - 点滅・アニメーションは付けない（OPT-9 / a11y）
 *   - SVG ではなく React Native の View / Border ベースで描画する（jest-expo / RN Web 互換）
 *   - 親 ResultOverlay 全体のフェードイン 200ms に乗る形で出現すれば十分
 */

import React from 'react';
import { StyleSheet, useColorScheme, View, ViewStyle } from 'react-native';
import { getColors } from '../../theme/tokens';

export type MarkBadgeKind = 'correct' | 'wrong' | 'missed';

export type MarkBadgeProps = {
  kind: MarkBadgeKind;
  /** 円形バッジ全体の直径（px、24〜80 の範囲を期待） */
  sizePx: number;
  /** SR 読み上げ用ラベル */
  ariaLabel: string;
  testId?: string;
};

const MIN_SIZE_PX = 24;
const MAX_SIZE_PX = 80;

/** 線幅 = sizePx × 0.10（最小 2px、最大 6px） */
function strokeWidthFor(sizePx: number): number {
  const w = Math.round(sizePx * 0.1);
  if (w < 2) return 2;
  if (w > 6) return 6;
  return w;
}

export const MarkBadge: React.FC<MarkBadgeProps> = ({
  kind,
  sizePx,
  ariaLabel,
  testId,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  // sizePx は呼び出し側でクランプ済み想定だが、安全側で再クランプ
  const size = clampSize(sizePx);
  const strokeWidth = strokeWidthFor(size);
  const iconSize = Math.round(size * 0.6);
  const opacity = kind === 'missed' ? 0.5 : 1;

  const iconColor =
    kind === 'wrong' ? colors.dangerFg : colors.successFg;

  // 円形背景（82% 不透明 + 1px 縁取り）
  const bgStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: colors.overlayResultBg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
    opacity,
  };

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={ariaLabel}
      style={bgStyle}
      testID={testId ?? `mark-badge-${kind}`}
      // dataset での検索を可能にする（テストフィルタ用、screens.md §15.1）
      // @ts-expect-error react-native-web 拡張
      dataSet={{ markKind: kind }}
    >
      {kind === 'wrong' ? (
        <CrossIcon sizePx={iconSize} strokeWidth={strokeWidth} color={iconColor} />
      ) : (
        <RingIcon sizePx={iconSize} strokeWidth={strokeWidth} color={iconColor} />
      )}
    </View>
  );
};

/** 円形 ◯（border で実現） */
const RingIcon: React.FC<{
  sizePx: number;
  strokeWidth: number;
  color: string;
}> = ({ sizePx, strokeWidth, color }) => {
  return (
    <View
      style={{
        width: sizePx,
        height: sizePx,
        borderRadius: sizePx / 2,
        borderWidth: strokeWidth,
        borderColor: color,
      }}
      testID="mark-badge-icon-ring"
    />
  );
};

/** ✕ クロス（2 本の細長い View を 45° 回転で重畳） */
const CrossIcon: React.FC<{
  sizePx: number;
  strokeWidth: number;
  color: string;
}> = ({ sizePx, strokeWidth, color }) => {
  // 線分の長さは対角線 × 0.95（少し内側に収める）
  const lineLength = Math.round(sizePx * 0.95);
  const lineStyle: ViewStyle = {
    position: 'absolute',
    width: lineLength,
    height: strokeWidth,
    backgroundColor: color,
    borderRadius: strokeWidth / 2,
    top: (sizePx - strokeWidth) / 2,
    left: (sizePx - lineLength) / 2,
  };
  return (
    <View
      style={{
        width: sizePx,
        height: sizePx,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      testID="mark-badge-icon-cross"
    >
      <View
        style={[lineStyle, { transform: [{ rotate: '45deg' }] }]}
      />
      <View
        style={[lineStyle, { transform: [{ rotate: '-45deg' }] }]}
      />
    </View>
  );
};

function clampSize(sizePx: number): number {
  if (!Number.isFinite(sizePx) || sizePx < MIN_SIZE_PX) return MIN_SIZE_PX;
  if (sizePx > MAX_SIZE_PX) return MAX_SIZE_PX;
  return Math.round(sizePx);
}

// styles unused export prevention
const _unused = StyleSheet.create({});
void _unused;

/** 規範的サイズ計算ヘルパ（components.md §24 / screens.md §13.2）。
 *  cellSizePx = 56〜80 → 24px、80〜200 → cellSizePx × 0.35、200〜480 → 80px
 *  Generator 実装ガイド：呼び出し側で MarkBadge sizePx を決めるときに使う。 */
export function markBadgeSizeForCell(cellSizePx: number): number {
  if (!Number.isFinite(cellSizePx) || cellSizePx <= 0) return MIN_SIZE_PX;
  if (cellSizePx <= 80) return MIN_SIZE_PX;
  if (cellSizePx >= 200) return MAX_SIZE_PX;
  const v = Math.round(cellSizePx * 0.35);
  return Math.max(MIN_SIZE_PX, Math.min(MAX_SIZE_PX, v));
}
