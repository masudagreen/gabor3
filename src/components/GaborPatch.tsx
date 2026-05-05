/**
 * GaborPatch — ガボール刺激の単一描画コンポーネント。
 *
 * components.md §14 / system.md §14 の API に従う。
 *
 * 描画戦略：
 *   ピクセルバッファを純 JS で計算（src/lib/gaborPixels.ts）し、
 *   BMP data URL に変換して RN <Image> に渡す。
 *   この方式は iOS / Android / Web 共通で動き、ネイティブ pod インストールも
 *   CanvasKit wasm のロードも不要。
 *
 * v1.1.3 ちらつき軽減（G-01 モーフィング対応）：
 *   ガウス窓は回転対称なので、orientationDeg を変えるたびに BMP を作り直すと
 *   Android Web で `<img>` の src 切替に伴うリロードが起きて、変化中のパッチが
 *   点滅して見える（=正解が露呈する）。そこで pixel 計算は orientation=0 で 1 回
 *   だけ行い、表示時に View / Image の transform で角度を回転させる方式にする。
 *   ガボールパッチは正弦波 × 回転対称なガウス窓で構成されており、画像全体の
 *   回転と orientation パラメータでの再生成は数学的に等価（モルフォロジー一致）。
 */

import React from 'react';
import { Image, View, ViewStyle } from 'react-native';
import {
  computeGaborPixels,
  pixelsToBmpDataUrl,
} from '../lib/gaborPixels';
import { DEFAULT_DPI } from '../lib/calibration';
import { palette } from '../theme/tokens';

export type GaborPatchProps = {
  /**
   * 空間周波数（cpd, cycles per degree）。
   *
   * v1 では 1.5 / 3 / 6 / 9 の 4 段階 literal union だったが、Sprint 13 で
   * G-05 SF 弁別が staircase 比で cpd を連続的に変える必要があるため、
   * `number` に緩めた（後方互換、内部 `computeGaborPixels` は元から number 受け）。
   */
  cpd: number;
  contrast: number; // 0.15〜0.6
  orientationDeg: number; // 0〜180
  phaseRad: number; // 0〜2π
  sigmaDeg: number; // 0.3〜1.0
  sizePx: number; // 描画キャンバス辺長（CSS px）
  pixelDensity?: number; // dpr 補正（既定 1）
  viewingDistanceCm: 30 | 40 | 50;
  /** 端末 dpi（既定は PC=110）。Sprint 4 で auto detect に置換 */
  dpi?: number;
  ariaLabel?: string;
  testId?: string;
  selected?: boolean;
  highlighted?: boolean;
  onPress?: () => void;
};

const GaborPatchInner: React.FC<GaborPatchProps> = ({
  cpd,
  contrast,
  orientationDeg,
  phaseRad,
  sigmaDeg,
  sizePx,
  pixelDensity = 1,
  viewingDistanceCm,
  dpi = DEFAULT_DPI.pc,
  ariaLabel = '縞模様の刺激',
  testId,
  selected,
  highlighted,
}) => {
  // v1.1.3：BMP は orientation=0 で 1 回だけ生成。orientationDeg は transform で
  // 表示時に回転させる（Android Web の <img> リロード起因のちらつきを回避）。
  // computeGaborPixels の orientation=0 は「水平縞」なので、CSS rotate(θ) で
  // orientationDeg=θ を再現できる（数学的等価）。
  const dataUrl = React.useMemo(() => {
    const buf = computeGaborPixels({
      cpd,
      contrast,
      orientationDeg: 0,
      phaseRad,
      sigmaDeg,
      sizePx,
      pixelDensity,
      viewingDistanceCm,
      dpi,
    });
    return pixelsToBmpDataUrl(buf);
  }, [
    cpd,
    contrast,
    phaseRad,
    sigmaDeg,
    sizePx,
    pixelDensity,
    viewingDistanceCm,
    dpi,
  ]);

  const containerStyle: ViewStyle = {
    width: sizePx,
    height: sizePx,
    backgroundColor: palette.gabor.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: selected || highlighted ? 4 : 0,
    borderColor: palette.light.highlightCorrect,
    overflow: 'hidden',
  };

  return (
    <View
      style={containerStyle}
      accessibilityLabel={ariaLabel}
      accessible
      testID={testId}
    >
      <Image
        source={{ uri: dataUrl }}
        style={{
          width: sizePx,
          height: sizePx,
          transform: [{ rotate: `${orientationDeg}deg` }],
        }}
        accessibilityIgnoresInvertColors
        accessible={false}
      />
    </View>
  );
};

export const GaborPatch = React.memo(GaborPatchInner);
