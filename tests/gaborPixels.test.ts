/**
 * GaborPatch ピクセル計算ユニットテスト。
 *
 * Sprint 1 受け入れ要件 §9-1：「cpd / contrast / sigmaDeg を反映してオフスクリーン Canvas を生成する」。
 */

import {
  computeGaborPixels,
  computeMaskPixels,
  pixelsToBmpDataUrl,
} from '../src/lib/gaborPixels';

const baseParams = {
  cpd: 3,
  contrast: 0.3,
  orientationDeg: 90,
  phaseRad: 0,
  sigmaDeg: 0.6,
  sizePx: 64, // 小さめ（テスト高速化）
  pixelDensity: 1,
  viewingDistanceCm: 40,
  dpi: 110,
} as const;

describe('gaborPixels', () => {
  it('指定サイズの RGBA バッファを返す', () => {
    const buf = computeGaborPixels({ ...baseParams });
    expect(buf.width).toBe(64);
    expect(buf.height).toBe(64);
    expect(buf.data.length).toBe(64 * 64 * 4);
  });

  it('dpr=2 で物理ピクセル数が 2 倍になる', () => {
    const buf = computeGaborPixels({ ...baseParams, pixelDensity: 2 });
    expect(buf.width).toBe(128);
    expect(buf.height).toBe(128);
  });

  it('contrast=0 ならパッチ全体が完全な中性グレー（128）', () => {
    const buf = computeGaborPixels({ ...baseParams, contrast: 0 });
    // 中央付近のピクセルをサンプル
    const cx = Math.floor(buf.width / 2);
    const idx = (cx * buf.width + cx) * 4;
    expect(buf.data[idx]).toBeGreaterThanOrEqual(127);
    expect(buf.data[idx]).toBeLessThanOrEqual(128);
  });

  it('contrast=0.6 でパッチ中央付近で 128 より大きく振れる', () => {
    const buf = computeGaborPixels({
      ...baseParams,
      contrast: 0.6,
      phaseRad: 0,
    });
    const cx = Math.floor(buf.width / 2);
    const cy = Math.floor(buf.height / 2);
    const idx = (cy * buf.width + cx) * 4;
    // phase=0 / cos(0)=1 / gauss=1 → lum ≈ 0.5 + 0.3 = 0.8 → 204
    expect(buf.data[idx]).toBeGreaterThan(180);
  });

  it('全ピクセルの A チャネルが 255', () => {
    const buf = computeGaborPixels({ ...baseParams });
    for (let i = 3; i < buf.data.length; i += 4) {
      if (buf.data[i] !== 255) {
        throw new Error(`alpha != 255 at ${i}`);
      }
    }
  });

  it('cpd を 2 倍にすると同じサイズ内の sine 周期が短くなる（中央列の min/max 切替頻度が上がる）', () => {
    const lo = computeGaborPixels({ ...baseParams, cpd: 1.5 });
    const hi = computeGaborPixels({ ...baseParams, cpd: 6 });
    const transitionsLo = countCenterRowTransitions(lo);
    const transitionsHi = countCenterRowTransitions(hi);
    expect(transitionsHi).toBeGreaterThan(transitionsLo);
  });

  it('マスクは指定サイズの RGBA バッファを返し、決定論的（同 seed で同結果）', () => {
    const a = computeMaskPixels({
      sizePx: 64,
      pixelDensity: 1,
      viewingDistanceCm: 40,
      dpi: 110,
      sigmaDeg: 0.6,
      cpd: 3,
      seed: 42,
    });
    const b = computeMaskPixels({
      sizePx: 64,
      pixelDensity: 1,
      viewingDistanceCm: 40,
      dpi: 110,
      sigmaDeg: 0.6,
      cpd: 3,
      seed: 42,
    });
    expect(a.data.length).toBe(b.data.length);
    expect(a.data[0]).toBe(b.data[0]);
    expect(a.data[100]).toBe(b.data[100]);
  });

  it('pixelsToBmpDataUrl は data:image/bmp;base64 を返す', () => {
    const buf = computeGaborPixels({ ...baseParams });
    const url = pixelsToBmpDataUrl(buf);
    expect(url.startsWith('data:image/bmp;base64,')).toBe(true);
    expect(url.length).toBeGreaterThan(100);
  });
});

function countCenterRowTransitions(buf: { width: number; height: number; data: Uint8Array }): number {
  const y = Math.floor(buf.height / 2);
  let prev = -1;
  let count = 0;
  for (let x = 0; x < buf.width; x += 1) {
    const idx = (y * buf.width + x) * 4;
    const v = buf.data[idx] > 128 ? 1 : 0;
    if (prev !== -1 && v !== prev) count += 1;
    prev = v;
  }
  return count;
}
