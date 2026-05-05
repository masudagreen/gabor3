/**
 * FixationCross — 固視点（十字）コンポーネント。
 *
 * components.md §18 に従う。
 * sizeDeg=0.5 の視野角を距離 / dpi に応じて px 換算。
 * グレー背景上では常に黒固定（system.md §7 の規約）。
 */

import React from 'react';
import { View, ViewStyle } from 'react-native';
import { degToPixels, DEFAULT_DPI } from '../lib/calibration';
import { palette } from '../theme/tokens';

export type FixationCrossProps = {
  sizeDeg?: 0.5; // 仕様で固定
  viewingDistanceCm?: 30 | 40 | 50;
  dpi?: number;
  testId?: string;
};

export const FixationCross: React.FC<FixationCrossProps> = ({
  sizeDeg = 0.5,
  viewingDistanceCm = 40,
  dpi = DEFAULT_DPI.pc,
  testId,
}) => {
  const sizePx = Math.max(8, Math.round(degToPixels(viewingDistanceCm, dpi, sizeDeg)));
  const lineThickness = 2;

  const horizontalStyle: ViewStyle = {
    position: 'absolute',
    width: sizePx,
    height: lineThickness,
    backgroundColor: palette.gabor.fixation,
    top: (sizePx - lineThickness) / 2,
    left: 0,
  };
  const verticalStyle: ViewStyle = {
    position: 'absolute',
    width: lineThickness,
    height: sizePx,
    backgroundColor: palette.gabor.fixation,
    top: 0,
    left: (sizePx - lineThickness) / 2,
  };

  return (
    <View
      style={{ width: sizePx, height: sizePx }}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      testID={testId}
    >
      <View style={horizontalStyle} />
      <View style={verticalStyle} />
    </View>
  );
};
