import { fontSize, getColors, tapTarget } from '../src/theme';

describe('theme tokens', () => {
  it('本文フォントサイズが 18pt 以上である (OPT-1)', () => {
    expect(fontSize.body).toBeGreaterThanOrEqual(18);
    expect(fontSize.heading).toBeGreaterThanOrEqual(22);
  });

  it('タップ領域が 48dp 以上である (OPT-2)', () => {
    expect(tapTarget.min).toBeGreaterThanOrEqual(48);
    expect(tapTarget.recommended).toBeGreaterThanOrEqual(56);
  });

  it('ライト/ダーク両モードの色が取れる (OPT-8)', () => {
    const light = getColors('light');
    const dark = getColors('dark');
    expect(light.background).toBeDefined();
    expect(dark.background).toBeDefined();
    expect(light.background).not.toBe(dark.background);
  });
});
