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
 *
 * v1.1.5 Android ネイティブ対応：
 *   transform を <Image> 自身に当てると、source が memo 化されて変化しない場合に
 *   Android (RN 0.81 / Fabric) で動的な transform 更新がビュー側に反映されず、
 *   60 秒のモーフィングが「動かない」ように見える。Image を回転用ラッパー <View>
 *   で包み、transform は View 側に当てる方式に変更（View の transform 更新は
 *   Android でも確実に再レンダーされる）。
 *
 * v1.2 クリッピング品質基準（NF-27 / NF-28、system.md §1.12）：
 *   旧実装は内部 BMP を **sizePx × sizePx** で生成し、回転時に四隅で背景色
 *   （グレー #808080）が露出していた（特に最小単位の角度刻みでわずかな隙間が出る）。
 *   v1.2 では「実サイズ N=1.5 倍で生成 → 矩形クリッピング」方式を採用：
 *   - 内部 BMP（sizePx × N）を `View transform: rotate` で角度回転
 *   - 外側 View を `width=sizePx, height=sizePx, overflow:hidden` でクリップ
 *   - ガウス窓の裾野が矩形端まで連続するため、回転しても四隅で背景が見えない
 *   N=1.5 は √2≈1.414 を上回る安全マージン（system.md §1.12.2）。
 */

import React from 'react';
import { Image, View, ViewStyle } from 'react-native';
import {
  computeGaborPixels,
  pixelsToBmpDataUrl,
} from '../lib/gaborPixels';
import { DEFAULT_DPI } from '../lib/calibration';
import { palette } from '../theme/tokens';

/**
 * クリッピングマージン倍率（NF-27 / NF-28、system.md §1.12.2）。
 *
 * 表示サイズ × CLIP_RATIO の BMP を生成し、表示サイズで矩形クリップする。
 *   - 1.0：枠ぴったり、四隅で背景色露出
 *   - 1.414（√2）：90° 回転までは保証
 *   - 1.5（採用）：完全な保証 + マージン
 */
export const GABOR_CLIP_RATIO = 1.5;

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
  /**
   * 向き（°）。v1.1 までは 0〜180 の限定範囲だったが、v1.2 で角度自由化（NF-26）
   * のため 0〜360 のいずれの値でも受け取り可能（内部で transform に渡す）。
   */
  orientationDeg: number;
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
  // v1.2 NF-27 / NF-28：表示サイズの 1.5 倍で BMP を生成し、外側で矩形クリップ。
  // ガウス窓の裾野が矩形端まで連続するため、角度を最小単位ずつ変えても四隅で
  // 背景色が露出しない。
  const innerSizePx = Math.round(sizePx * GABOR_CLIP_RATIO);

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
      sizePx: innerSizePx,
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
    innerSizePx,
    pixelDensity,
    viewingDistanceCm,
    dpi,
  ]);

  // v2.0 仕様変更（周波数変化アニメ廃止・回転のみ）により cpd は時間変化しないため、
  //   BMP（dataUrl）はラウンド中 1 度だけ生成され（上の useMemo）差し替わらない。
  //   よって「source 差し替え時のデコード空白＝点滅」が原理的に起きない。
  //   回転（orientationDeg）は transform で連続更新するが BMP は不変。
  //   → 単純な 1 枚の <Image> + transform 回転で十分（ダブルバッファ等は不要）。

  // 外側コンテナ：表示サイズちょうど、overflow:hidden で内部 BMP をクリップ。
  // 背景色 (#808080) はガボール背景と一致するため、万一クリップが甘くても
  // ガボール領域と区別がつかず違和感が出ない（保険）。
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

  // 内側 wrapper：BMP（innerSizePx × innerSizePx）を transform で回転。
  // alignItems/justifyContent center により、内側 wrapper は外側 sizePx の
  // 中心に配置され、超過分は overflow:hidden で切り捨てられる。
  return (
    <View
      style={containerStyle}
      accessibilityLabel={ariaLabel}
      accessible
      testID={testId}
    >
      <View
        style={{
          width: innerSizePx,
          height: innerSizePx,
          transform: [{ rotate: `${orientationDeg}deg` }],
        }}
      >
        <Image
          source={{ uri: dataUrl }}
          style={{ width: innerSizePx, height: innerSizePx }}
          fadeDuration={0}
          accessibilityIgnoresInvertColors
          accessible={false}
        />
      </View>
    </View>
  );
};

export const GaborPatch = React.memo(GaborPatchInner);
