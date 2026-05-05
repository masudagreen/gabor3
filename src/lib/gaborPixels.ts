/**
 * ガボールパッチのピクセル計算（純関数、プラットフォーム非依存）。
 *
 * 物理モデル（spec.md §6.1）：
 *   ガボールパッチ = 正弦波 × ガウス窓
 *   背景輝度 50%（中性グレー）を中心に、コントラスト振幅で輝度を変調
 *
 *   pixel(x,y) = 0.5 * (1 + contrast * cos(2π * f * (x' / pixelsPerCycle) + phase) * gauss(x,y))
 *   gauss(x,y) = exp(-((x-cx)^2 + (y-cy)^2) / (2 * sigmaPx^2))
 *
 * 出力は 0〜255 の輝度値（RGBA）。各プラットフォームでこれを <Image> として描画する。
 */

import { degToPixels, pixelsPerCycle } from './calibration';

export type GaborParams = {
  cpd: number; // 1.5 / 3 / 6 / 9
  contrast: number; // 0.15 〜 0.6
  orientationDeg: number; // 0〜180（0=水平縞 → 縞は横, 90=縦縞）
  phaseRad: number; // 0〜2π
  sigmaDeg: number; // 0.3〜1.0
  sizePx: number; // 描画キャンバス辺長（CSS px）
  pixelDensity: number; // dpr 倍率（1, 2, 3）
  viewingDistanceCm: number; // 30 / 40 / 50
  dpi: number; // 端末既定 dpi
};

/**
 * RGBA8 ピクセルバッファを生成する。
 * 戻り値の `width` / `height` は物理ピクセル数（CSS px * dpr）。
 */
export type GaborPixelBuffer = {
  width: number;
  height: number;
  data: Uint8Array; // RGBA、長さ width * height * 4
};

export function computeGaborPixels(params: GaborParams): GaborPixelBuffer {
  const dpr = Math.max(1, Math.floor(params.pixelDensity));
  const sizePxCss = Math.max(8, Math.floor(params.sizePx));
  const w = sizePxCss * dpr;
  const h = w;

  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;

  // sigma を物理 px に換算（dpr を掛ける）
  const sigmaPx =
    degToPixels(params.viewingDistanceCm, params.dpi, params.sigmaDeg) * dpr;
  const sigmaSq2 = 2 * sigmaPx * sigmaPx;

  // pixelsPerCycle も dpr 補正
  const pxPerCycle =
    pixelsPerCycle(params.viewingDistanceCm, params.dpi, params.cpd) * dpr;
  const angularFreq = (2 * Math.PI) / pxPerCycle;

  // 向きの定義（components.md §14 / system.md）：0°=水平縞、90°=垂直縞。
  // 縞の延長方向ベクトル：(cos θ, sin θ)。輝度はその直交方向に変調する。
  //   x' = dx * sin(θ) − dy * cos(θ)
  //   θ=0  → x' = -dy（y 方向で変調 → 横縞）
  //   θ=90 → x' = dx（x 方向で変調 → 縦縞）
  const theta = (params.orientationDeg * Math.PI) / 180;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);

  const c = clamp(params.contrast, 0, 1);

  const data = new Uint8Array(w * h * 4);
  let idx = 0;
  for (let y = 0; y < h; y += 1) {
    const dy = y - cy;
    for (let x = 0; x < w; x += 1) {
      const dx = x - cx;
      const xPrime = dx * sinT - dy * cosT;
      const gauss = Math.exp(-(dx * dx + dy * dy) / sigmaSq2);
      const sine = Math.cos(angularFreq * xPrime + params.phaseRad);
      // 0.5 を中心に [-0.5, +0.5] の振幅
      const lum = 0.5 + 0.5 * c * sine * gauss;
      const v = clamp(Math.round(lum * 255), 0, 255);
      data[idx] = v; // R
      data[idx + 1] = v; // G
      data[idx + 2] = v; // B
      data[idx + 3] = 255; // A
      idx += 4;
    }
  }

  return { width: w, height: h, data };
}

/**
 * マスク：複数のランダム向きガボールを重畳した高コントラスト刺激（spec.md §7.2）。
 * Sprint 1 では「8 個のガボールを重畳」して mask っぽい模様にする。
 */
export function computeMaskPixels(params: {
  sizePx: number;
  pixelDensity: number;
  viewingDistanceCm: number;
  dpi: number;
  sigmaDeg: number;
  cpd: number;
  seed?: number;
}): GaborPixelBuffer {
  const dpr = Math.max(1, Math.floor(params.pixelDensity));
  const w = Math.max(8, Math.floor(params.sizePx)) * dpr;
  const h = w;
  const data = new Uint8Array(w * h * 4);

  const rng = mulberry32(params.seed ?? 12345);
  const numLayers = 8;
  const layers: Array<{
    cosT: number;
    sinT: number;
    angularFreq: number;
    phase: number;
    sigmaSq2: number;
    cx: number;
    cy: number;
  }> = [];

  for (let i = 0; i < numLayers; i += 1) {
    const orientation = rng() * Math.PI;
    // 各レイヤーの cpd は ±50% 揺らぎ
    const cpd = params.cpd * (0.7 + rng() * 0.6);
    const pxPerCycle =
      pixelsPerCycle(params.viewingDistanceCm, params.dpi, cpd) * dpr;
    const sigmaPx =
      degToPixels(params.viewingDistanceCm, params.dpi, params.sigmaDeg) * dpr;
    layers.push({
      cosT: Math.cos(orientation),
      sinT: Math.sin(orientation),
      angularFreq: (2 * Math.PI) / pxPerCycle,
      phase: rng() * 2 * Math.PI,
      sigmaSq2: 2 * sigmaPx * sigmaPx,
      cx: (rng() - 0.5) * w * 0.4 + (w - 1) / 2,
      cy: (rng() - 0.5) * h * 0.4 + (h - 1) / 2,
    });
  }

  // 高コントラスト 0.8、加算後 [0,1] に正規化
  const layerContrast = 0.8 / Math.sqrt(numLayers);
  let idx = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let acc = 0;
      for (let i = 0; i < numLayers; i += 1) {
        const L = layers[i];
        const dx = x - L.cx;
        const dy = y - L.cy;
        const xPrime = dx * L.sinT - dy * L.cosT;
        const gauss = Math.exp(-(dx * dx + dy * dy) / L.sigmaSq2);
        acc += layerContrast * Math.cos(L.angularFreq * xPrime + L.phase) * gauss;
      }
      const lum = 0.5 + 0.5 * clamp(acc, -1, 1);
      const v = clamp(Math.round(lum * 255), 0, 255);
      data[idx] = v;
      data[idx + 1] = v;
      data[idx + 2] = v;
      data[idx + 3] = 255;
      idx += 4;
    }
  }

  return { width: w, height: h, data };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * 決定論的 RNG（テスト容易性のため）。
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * RGBA バッファを BMP の data URL に変換する（クロスプラットフォーム表示用）。
 *
 * BMP V3（24bit、無圧縮）。RGBA → BGR。
 * 全プラットフォームの <Image> が data:image/bmp,base64 を解釈する。
 */
export function pixelsToBmpDataUrl(buf: GaborPixelBuffer): string {
  const { width, height, data } = buf;
  // BMP は行を 4byte アラインで詰める
  const rowSize = ((24 * width + 31) >> 5) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;

  const out = new Uint8Array(fileSize);
  // BMP File Header (14 bytes)
  out[0] = 0x42; // 'B'
  out[1] = 0x4d; // 'M'
  writeUint32LE(out, 2, fileSize);
  writeUint32LE(out, 6, 0); // reserved
  writeUint32LE(out, 10, 54); // pixel data offset

  // DIB Header (BITMAPINFOHEADER, 40 bytes)
  writeUint32LE(out, 14, 40); // header size
  writeInt32LE(out, 18, width);
  // BMP は通常下→上で並ぶ。height を負にすると上→下になる
  writeInt32LE(out, 22, -height);
  out[26] = 1; // planes
  out[27] = 0;
  out[28] = 24; // bits per pixel
  out[29] = 0;
  writeUint32LE(out, 30, 0); // compression = BI_RGB
  writeUint32LE(out, 34, pixelArraySize);
  writeUint32LE(out, 38, 2835); // X pixels per meter (~72 dpi)
  writeUint32LE(out, 42, 2835); // Y
  writeUint32LE(out, 46, 0); // colors used
  writeUint32LE(out, 50, 0); // important colors

  // Pixel array, BGR
  let dst = 54;
  for (let y = 0; y < height; y += 1) {
    const rowStart = dst;
    for (let x = 0; x < width; x += 1) {
      const srcIdx = (y * width + x) * 4;
      out[dst] = data[srcIdx + 2]; // B
      out[dst + 1] = data[srcIdx + 1]; // G
      out[dst + 2] = data[srcIdx]; // R
      dst += 3;
    }
    // padding
    dst = rowStart + rowSize;
  }

  return `data:image/bmp;base64,${bytesToBase64(out)}`;
}

function writeUint32LE(out: Uint8Array, offset: number, v: number): void {
  out[offset] = v & 0xff;
  out[offset + 1] = (v >>> 8) & 0xff;
  out[offset + 2] = (v >>> 16) & 0xff;
  out[offset + 3] = (v >>> 24) & 0xff;
}

function writeInt32LE(out: Uint8Array, offset: number, v: number): void {
  writeUint32LE(out, offset, v < 0 ? v + 0x100000000 : v);
}

const BASE64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64(bytes: Uint8Array): string {
  // Web/Node 共通の純 JS 実装（btoa を避けて RN 対応）
  let result = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;
    const triplet = (b0 << 16) | (b1 << 8) | b2;
    result += BASE64_CHARS[(triplet >> 18) & 0x3f];
    result += BASE64_CHARS[(triplet >> 12) & 0x3f];
    if (i + 1 < len) {
      result += BASE64_CHARS[(triplet >> 6) & 0x3f];
    } else {
      result += '=';
    }
    if (i + 2 < len) {
      result += BASE64_CHARS[triplet & 0x3f];
    } else {
      result += '=';
    }
  }
  return result;
}
