/**
 * contrastNF8.test.ts — NF-8（UI テキスト/ボタン背景のコントラスト比 7:1 以上）。
 *
 * S11 の NF-8 amendment 確定値（src/theme/tokens.ts）を WCAG 2.1 相対輝度比で実測検証する。
 *   - light brandPrimary #13449D + 白文字 = 8.97:1（プライマリボタン/アクティブタブラベル）
 *   - light streakFlameFg #7A3C00 + 白背景 = 8.49:1（ストリーク炎テキスト）
 *   - dark brandPrimary #7FB0FF + 黒文字 = 9.56:1
 *   - dark streakFlameFg #FFB266 + dark surface（#15171C 相当）
 * 主要セマンティックペア（fgOnPrimary on actionPrimary 等）も合わせて 7:1 を担保する。
 */

import { getColors, levelDeltaV3, palette } from '../../src/theme/tokens';

/** #RRGGBB → [0..1, 0..1, 0..1] sRGB。 */
function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  return [r, g, b];
}

/** WCAG 2.1 相対輝度（sRGB → 線形 → 輝度）。 */
function relativeLuminance(hex: string): number {
  const lin = hexToRgb(hex).map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** コントラスト比（WCAG）。fg/bg は #RRGGBB。 */
function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const MIN = 7.0;

describe('NF-8 amendment 確定値（tokens.ts）', () => {
  it('light brandPrimary は本書確定値 #13449D（白文字 8.97:1 以上）', () => {
    expect(palette.light.brandPrimary).toBe('#13449D');
    const ratio = contrastRatio('#FFFFFF', palette.light.brandPrimary);
    expect(ratio).toBeGreaterThanOrEqual(MIN);
    expect(ratio).toBeGreaterThan(8.5); // 実測 ≒ 8.97
  });

  it('light brandPrimaryHover は #0F3580（白文字 7:1 以上）', () => {
    expect(palette.light.brandPrimaryHover).toBe('#0F3580');
    expect(contrastRatio('#FFFFFF', palette.light.brandPrimaryHover)).toBeGreaterThanOrEqual(MIN);
  });

  it('light streakFlameFg は #7A3C00（白背景 8.49:1 以上）', () => {
    expect(palette.light.streakFlameFg).toBe('#7A3C00');
    const ratio = contrastRatio(palette.light.streakFlameFg, '#FFFFFF');
    expect(ratio).toBeGreaterThanOrEqual(MIN);
    expect(ratio).toBeGreaterThan(8.0); // 実測 ≒ 8.49
  });

  it('dark brandPrimary は本書確定値 #7FB0FF（黒文字 7:1 以上）', () => {
    expect(palette.dark.brandPrimary).toBe('#7FB0FF');
    expect(contrastRatio('#000000', palette.dark.brandPrimary)).toBeGreaterThanOrEqual(MIN);
  });

  it('dark streakFlameFg は #FFB266（dark surface 上 7:1 以上）', () => {
    expect(palette.dark.streakFlameFg).toBe('#FFB266');
    // dark surface（bgSurface）= neutral100 = #12131A
    expect(contrastRatio(palette.dark.streakFlameFg, palette.dark.neutral100)).toBeGreaterThanOrEqual(MIN);
  });
});

describe('NF-8 主要セマンティックペア（getColors）', () => {
  it('light：白文字 on プライマリボタン背景が 7:1 以上', () => {
    const c = getColors('light');
    expect(contrastRatio(c.fgOnPrimary, c.actionPrimary)).toBeGreaterThanOrEqual(MIN);
  });

  it('dark：黒文字 on プライマリボタン背景が 7:1 以上', () => {
    const c = getColors('dark');
    expect(contrastRatio(c.fgOnPrimary, c.actionPrimary)).toBeGreaterThanOrEqual(MIN);
  });

  it('light：副テキスト fgSecondary on canvas が 7:1 以上（非アクティブタブ等）', () => {
    const c = getColors('light');
    expect(contrastRatio(c.fgSecondary, c.bgCanvas)).toBeGreaterThanOrEqual(MIN);
  });

  it('light：アクティブタブの藍文字 actionPrimary on surface が 7:1 以上', () => {
    const c = getColors('light');
    expect(contrastRatio(c.actionPrimary, c.bgSurface)).toBeGreaterThanOrEqual(MIN);
  });
});

describe('NF-8 levelDeltaV3（結果カードの実背景 = canvas #F8F9FB 上）', () => {
  // LevelDeltaIndicator は結果カード上に直接描画され、その地は bgCanvas（light=neutral50=#F8F9FB）。
  // 白 #FFFFFF 前提だと same(#4E5460) が 7:1 を超えてしまい再発を検知できないため、
  // 実レンダリングの canvas 地を前提に検証する（amendment: same #525866→#4E5460）。
  const CANVAS = getColors('light').bgCanvas;

  it('canvas 地は確定値 #F8F9FB', () => {
    expect(CANVAS).toBe('#F8F9FB');
  });

  it('same は確定値 #4E5460（canvas 上 7:1 以上、旧 #525866 は <7:1）', () => {
    expect(levelDeltaV3.light.sameFg).toBe('#4E5460');
    const ratio = contrastRatio(levelDeltaV3.light.sameFg, CANVAS);
    expect(ratio).toBeGreaterThanOrEqual(MIN);
    expect(ratio).toBeGreaterThan(7.2); // 実測 ≒ 7.22
    // 回帰防止：旧値 #525866 は canvas 上で 7:1 未満（再発を検知できる前提）。
    expect(contrastRatio('#525866', CANVAS)).toBeLessThan(MIN);
  });

  it('up（+1）#0A6238 は canvas 上 7:1 以上', () => {
    expect(contrastRatio(levelDeltaV3.light.upFg, CANVAS)).toBeGreaterThanOrEqual(MIN);
  });

  it('down（−1）#7A4300 は canvas 上 7:1 以上', () => {
    expect(contrastRatio(levelDeltaV3.light.downFg, CANVAS)).toBeGreaterThanOrEqual(MIN);
  });
});
