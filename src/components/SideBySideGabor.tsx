/**
 * SideBySideGabor — Game 2（amendment）の左右並びガボール表示。
 *
 * 仕様：spec.md §7.2 / screens.md S1-03。
 *
 * - 左右に 2 つの GaborPatch を並べる（横並び固定、点滅なし、5 秒同時静止表示）
 * - サイズは親が `sizePx` で渡す（左右合わせて画面に収まるよう親が計算）
 * - SR 用に各ガボールに「左の縞模様」「右の縞模様」aria-label を付ける
 * - 中央に固視点用のスペースを 24px 程度開ける
 * - `onSelectSide` + `enabled=true` のとき各パッチをタップして直接回答できる
 *   （視線をガボール画像から離さずに済むため）
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GaborPatch } from './GaborPatch';
import { palette, spacing } from '../theme/tokens';

export type SideBySideGaborSpec = {
  cpd: 1.5 | 3 | 6 | 9;
  contrast: number;
  sigmaDeg: number;
  orientationDeg: number;
  phaseRad: number;
};

export type SideBySideGaborSide = 'left' | 'right';

export type SideBySideGaborProps = {
  left: SideBySideGaborSpec;
  right: SideBySideGaborSpec;
  /** 各パッチの辺長（CSS px / dp）。左右で同一 */
  sizePx: number;
  pixelDensity?: number;
  viewingDistanceCm: 30 | 40 | 50;
  dpi?: number;
  /** 左右の中央に開ける間隔（既定 24px） */
  gapPx?: number;
  /** パッチ自体のタップで回答する場合のハンドラ */
  onSelectSide?: (side: SideBySideGaborSide) => void;
  /** タップ受付有効フラグ（answer フェーズのみ true） */
  enabled?: boolean;
  testId?: string;
};

export const SideBySideGabor: React.FC<SideBySideGaborProps> = ({
  left,
  right,
  sizePx,
  pixelDensity = 1,
  viewingDistanceCm,
  dpi,
  gapPx = spacing.s5,
  onSelectSide,
  enabled = false,
  testId,
}) => {
  const tappable = !!onSelectSide && enabled;

  const renderPatch = (side: SideBySideGaborSide, spec: SideBySideGaborSpec) => {
    const isLeft = side === 'left';
    const ariaLabel = isLeft
      ? '左の縞模様（タップで回答）'
      : '右の縞模様（タップで回答）';
    const patch = (
      <GaborPatch
        {...spec}
        sizePx={sizePx}
        pixelDensity={pixelDensity}
        viewingDistanceCm={viewingDistanceCm}
        dpi={dpi}
        ariaLabel={tappable ? ariaLabel : isLeft ? '左の縞模様' : '右の縞模様'}
        testId={testId ? `${testId}-${side}-patch` : undefined}
      />
    );

    const frameStyle = [styles.patchFrame, { width: sizePx, height: sizePx }];
    const wrapTestId = testId ? `${testId}-${side}` : undefined;

    if (tappable) {
      return (
        <Pressable
          style={frameStyle}
          onPress={() => onSelectSide?.(side)}
          accessibilityRole="button"
          accessibilityLabel={
            isLeft
              ? '左の縞模様が時計回りに傾いている'
              : '右の縞模様が時計回りに傾いている'
          }
          testID={wrapTestId}
        >
          {patch}
        </Pressable>
      );
    }

    return (
      <View style={frameStyle} testID={wrapTestId}>
        {patch}
      </View>
    );
  };

  return (
    <View
      style={[styles.row, { gap: gapPx }]}
      testID={testId}
      accessibilityLabel="左右に並んだ縞模様 2 つ"
    >
      {renderPatch('left', left)}
      {renderPatch('right', right)}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  patchFrame: {
    backgroundColor: palette.gabor.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
