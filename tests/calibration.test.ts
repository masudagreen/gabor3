/**
 * 視聴距離 → ピクセル換算ユニットテスト（spec.md §6.2）。
 */

import {
  DEFAULT_DPI,
  DEFAULT_VIEWING_DISTANCE_CM,
  degToCm,
  degToPixels,
  estimateDeviceType,
  pixelSizeCm,
  pixelsPerCycle,
  pixelsPerDegree,
  recommendedPatchSizePx,
} from '../src/lib/calibration';

describe('calibration: cpd → px 変換', () => {
  it('40cm 距離・1° は約 0.698cm', () => {
    const cm = degToCm(DEFAULT_VIEWING_DISTANCE_CM, 1);
    expect(cm).toBeGreaterThan(0.69);
    expect(cm).toBeLessThan(0.71);
  });

  it('1px の物理サイズ：dpi=110 PC で約 0.0231cm', () => {
    const cm = pixelSizeCm(DEFAULT_DPI.pc);
    expect(cm).toBeGreaterThan(0.022);
    expect(cm).toBeLessThan(0.024);
  });

  it('PC（dpi=110）で 40cm、1° 視野角は約 30.24px', () => {
    const ppd = pixelsPerDegree(40, DEFAULT_DPI.pc);
    expect(ppd).toBeGreaterThan(28);
    expect(ppd).toBeLessThan(32);
  });

  it('iPhone（dpi=460）で 40cm、1° 視野角は約 126.5px', () => {
    const ppd = pixelsPerDegree(40, DEFAULT_DPI.iphone);
    expect(ppd).toBeGreaterThan(120);
    expect(ppd).toBeLessThan(135);
  });

  it('cpd=3, dpi=110, 40cm → 1 サイクル ≈ 10.08px', () => {
    const pxc = pixelsPerCycle(40, DEFAULT_DPI.pc, 3);
    expect(pxc).toBeGreaterThan(9);
    expect(pxc).toBeLessThan(11);
  });

  it('sigma=0.6° → 推奨パッチサイズが 64 〜 480 の範囲に収まる', () => {
    const sizePc = recommendedPatchSizePx(40, DEFAULT_DPI.pc, 0.6);
    expect(sizePc).toBeGreaterThanOrEqual(64);
    expect(sizePc).toBeLessThanOrEqual(480);

    const sizePhone = recommendedPatchSizePx(40, DEFAULT_DPI.iphone, 0.6);
    expect(sizePhone).toBeGreaterThanOrEqual(64);
    expect(sizePhone).toBeLessThanOrEqual(480);
  });

  it('degToPixels 6° は 1° の 6 倍', () => {
    const one = degToPixels(40, DEFAULT_DPI.pc, 1);
    const six = degToPixels(40, DEFAULT_DPI.pc, 6);
    expect(six).toBeCloseTo(one * 6, 5);
  });

  it('estimateDeviceType: ios → iphone、android → android、その他 → pc', () => {
    expect(estimateDeviceType('ios')).toBe('iphone');
    expect(estimateDeviceType('android')).toBe('android');
    expect(estimateDeviceType('web')).toBe('pc');
    expect(estimateDeviceType('windows')).toBe('pc');
  });
});

describe('calibration: 視聴距離 30/40/50cm でガボールサイズが変わる（F-03）', () => {
  it('1° の視野角は距離が遠いほど大きい（cm）', () => {
    const cm30 = degToCm(30, 1);
    const cm40 = degToCm(40, 1);
    const cm50 = degToCm(50, 1);
    expect(cm30).toBeLessThan(cm40);
    expect(cm40).toBeLessThan(cm50);
    // 比率が距離比に一致
    expect(cm50 / cm30).toBeCloseTo(50 / 30, 5);
  });

  it('PC（dpi=110）で cpd=3 のとき、1 サイクル px 数は距離 30/40/50cm で異なる', () => {
    const px30 = pixelsPerCycle(30, DEFAULT_DPI.pc, 3);
    const px40 = pixelsPerCycle(40, DEFAULT_DPI.pc, 3);
    const px50 = pixelsPerCycle(50, DEFAULT_DPI.pc, 3);
    // 距離が遠いほど 1 サイクル あたりピクセル数は増える（同じ cpd でもパッチが拡大）
    expect(px30).toBeLessThan(px40);
    expect(px40).toBeLessThan(px50);
    // 数値比は距離比に一致（線形）
    expect(px50 / px30).toBeCloseTo(50 / 30, 3);
  });

  it('iPhone（dpi=460）で sigmaDeg=0.6 の推奨パッチサイズが 30/40/50cm で異なる', () => {
    const s30 = recommendedPatchSizePx(30, DEFAULT_DPI.iphone, 0.6);
    const s40 = recommendedPatchSizePx(40, DEFAULT_DPI.iphone, 0.6);
    const s50 = recommendedPatchSizePx(50, DEFAULT_DPI.iphone, 0.6);
    // 上限 480 でクランプされる場合があるため、>= の関係のみ確認
    expect(s30).toBeLessThanOrEqual(s40);
    expect(s40).toBeLessThanOrEqual(s50);
  });
});

describe('calibration: 端末タイプ自動推定（spec.md §6.2）', () => {
  // estimateDeviceTypeAdvanced を ESM で取り込み
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { estimateDeviceTypeAdvanced, dpiForDevice } = require('../src/lib/calibration');

  it('iOS で shortSide < 768 → iphone', () => {
    expect(estimateDeviceTypeAdvanced('ios', 390, '')).toBe('iphone');
    expect(estimateDeviceTypeAdvanced('ios', 375, '')).toBe('iphone');
  });

  it('iOS で shortSide >= 768 → tablet（iPad）', () => {
    expect(estimateDeviceTypeAdvanced('ios', 768, '')).toBe('tablet');
    expect(estimateDeviceTypeAdvanced('ios', 1024, '')).toBe('tablet');
  });

  it('android で shortSide < 720 → android スマホ', () => {
    expect(estimateDeviceTypeAdvanced('android', 412, '')).toBe('android');
    expect(estimateDeviceTypeAdvanced('android', 360, '')).toBe('android');
  });

  it('android で shortSide >= 720 → tablet', () => {
    expect(estimateDeviceTypeAdvanced('android', 800, '')).toBe('tablet');
  });

  it('web の UA で iPad / iPhone / Android tablet を判別', () => {
    expect(
      estimateDeviceTypeAdvanced(
        'web',
        1024,
        'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      ),
    ).toBe('tablet');
    expect(
      estimateDeviceTypeAdvanced(
        'web',
        390,
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      ),
    ).toBe('iphone');
    // Android タブレット（mobile が無い）
    expect(
      estimateDeviceTypeAdvanced(
        'web',
        800,
        'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36',
      ),
    ).toBe('tablet');
    // Android スマホ（mobile 有り）
    expect(
      estimateDeviceTypeAdvanced(
        'web',
        412,
        'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36',
      ),
    ).toBe('android');
  });

  it('web の汎用デスクトップ UA → pc', () => {
    expect(
      estimateDeviceTypeAdvanced(
        'web',
        1280,
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ),
    ).toBe('pc');
  });

  it('dpiForDevice: 4 区分の既定値（spec.md §6.2）', () => {
    expect(dpiForDevice('iphone')).toBe(460);
    expect(dpiForDevice('android')).toBe(400);
    expect(dpiForDevice('tablet')).toBe(264);
    expect(dpiForDevice('pc')).toBe(110);
  });
});
