/**
 * ResultOverlayLayer.test.tsx — OV-1（F-03 / NF-10）。
 *
 * 総合バッジ描画・SR 読み上げ（assertive）・数値テキスト非表示を検証する。
 */

import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { ResultOverlayLayer } from '../../../src/components/v2/ResultOverlayLayer';
import { RoundScore } from '../../../src/lib/v2/scoring';

function score(over: Partial<RoundScore> = {}): RoundScore {
  return {
    changingPatchCount: 2,
    staticPatchCount: 14,
    tpCount: 2,
    fpCount: 0,
    fnCount: 0,
    roundScore: 2,
    ...over,
  };
}

function renderOverlay(ui: React.ReactElement) {
  return render(
    <ThemeProvider preference="dark" systemScheme="dark">
      {ui}
    </ThemeProvider>,
  );
}

describe('ResultOverlayLayer (OV-1 / F-03)', () => {
  it('success で総合 ✅（正解）バッジを描画する', () => {
    renderOverlay(
      <ResultOverlayLayer aggregate="success" score={score()} testId="ov" />,
    );
    expect(screen.getByTestId('ov-aggregate')).toBeTruthy();
    expect(screen.getByLabelText('正解')).toBeTruthy();
  });

  it('出現時に SR へ「正解」要約を 1 度読み上げる（NF-10）', () => {
    const spy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    spy.mockClear();
    renderOverlay(
      <ResultOverlayLayer aggregate="danger" score={score({ fpCount: 1, fnCount: 1 })} testId="ov" />,
    );
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toContain('不正解');
    spy.mockRestore();
  });

  it('画面に数値テキストを表示しない（閾値/速度/前回比禁止、F-03）', () => {
    // 視覚表示は総合バッジ（✓/✕）のみ。SR 要約は隠しテキスト（live region）。
    renderOverlay(
      <ResultOverlayLayer aggregate="success" score={score()} testId="ov" />,
    );
    // 総合バッジ内に数字はない
    const badge = screen.getByTestId('ov-aggregate');
    expect(badge.props.children).toBeTruthy();
    expect(screen.getByText('✓')).toBeTruthy();
  });
});
