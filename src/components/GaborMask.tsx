/**
 * GaborMask — Game 2 のマスク（spec.md §7.2）。
 *
 * 高コントラスト 0.8 のランダム向きガボールスーパーポジションを描画。
 * 点滅なし（OPT-9）。Sprint 1 では静止画 1 枚として提示する。
 *
 * Sprint 1 では決定論的な seed を持たせて再現性を確保（テスト容易性）。
 */

import React from 'react';
import { Image, View, ViewStyle } from 'react-native';
import {
  computeMaskPixels,
  pixelsToBmpDataUrl,
} from '../lib/gaborPixels';
import { DEFAULT_DPI } from '../lib/calibration';
import { palette } from '../theme/tokens';

export type GaborMaskProps = {
  sizePx: number;
  pixelDensity?: number;
  viewingDistanceCm: 30 | 40 | 50;
  dpi?: number;
  cpd?: number; // 既定 3（spec.md §6.1 中央値）
  sigmaDeg?: number; // 既定 0.6
  seed?: number;
  testId?: string;
};

const GaborMaskInner: React.FC<GaborMaskProps> = ({
  sizePx,
  pixelDensity = 1,
  viewingDistanceCm,
  dpi = DEFAULT_DPI.pc,
  cpd = 3,
  sigmaDeg = 0.6,
  seed,
  testId,
}) => {
  const dataUrl = React.useMemo(() => {
    const buf = computeMaskPixels({
      sizePx,
      pixelDensity,
      viewingDistanceCm,
      dpi,
      cpd,
      sigmaDeg,
      seed: seed ?? Math.floor(Math.random() * 1_000_000),
    });
    return pixelsToBmpDataUrl(buf);
  }, [sizePx, pixelDensity, viewingDistanceCm, dpi, cpd, sigmaDeg, seed]);

  const containerStyle: ViewStyle = {
    width: sizePx,
    height: sizePx,
    backgroundColor: palette.gabor.bg,
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <View
      style={containerStyle}
      accessibilityLabel="マスク"
      accessible
      testID={testId}
    >
      <Image
        source={{ uri: dataUrl }}
        style={{ width: sizePx, height: sizePx }}
        accessibilityIgnoresInvertColors
        accessible={false}
      />
    </View>
  );
};

export const GaborMask = React.memo(GaborMaskInner);
