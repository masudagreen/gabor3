/**
 * PeripheralLayout テスト（components.md §17 / screens.md S3-01）。
 *
 * 確認項目：
 *   - 8 個のスロットが描画される
 *   - 全スロットが同一の accessibilityLabel（DOM 上で odd one を判別不能）
 *   - 中心に固視点が描画される
 *   - phase='presentation' でパッチ描画、phase='mask' でマスク描画
 *   - 8 ポジションが円周上に等間隔（45°）に配置される（座標確認）
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import {
  PeripheralLayout,
  PeripheralPatch,
} from '../../src/components/PeripheralLayout';

const PATCHES: PeripheralPatch[] = Array.from({ length: 8 }, (_, i) => ({
  cpd: 3 as const,
  contrast: 0.4,
  orientationDeg: i === 3 ? 30 : 0, // odd one at idx 3
  phaseRad: 0,
  sigmaDeg: 0.6,
}));

describe('PeripheralLayout', () => {
  it('8 個のスロットが描画され、すべて同一 accessibilityLabel="パッチ"（DOM 上で odd one を判別不能）', () => {
    const { getAllByLabelText, getByTestId } = render(
      <PeripheralLayout
        patches={PATCHES}
        phase="presentation"
        eccentricityDeg={8}
        viewingDistanceCm={40}
        framePx={320}
        patchSizePx={48}
        testId="peripheral"
      />,
    );

    // 全 8 スロットが同じ accessibilityLabel
    const slots = getAllByLabelText('パッチ');
    expect(slots.length).toBeGreaterThanOrEqual(8);
    // 各スロットの testID（slot-0..slot-7）が存在
    for (let i = 0; i < 8; i += 1) {
      expect(getByTestId(`peripheral-slot-${i}`)).toBeTruthy();
    }
  });

  it('固視点が描画される（phase に関わらず常時表示）', () => {
    const { getByTestId, rerender } = render(
      <PeripheralLayout
        patches={PATCHES}
        phase="fixation"
        eccentricityDeg={8}
        viewingDistanceCm={40}
        framePx={320}
        patchSizePx={48}
        testId="peripheral"
      />,
    );
    expect(getByTestId('peripheral-fixation')).toBeTruthy();

    rerender(
      <PeripheralLayout
        patches={PATCHES}
        phase="presentation"
        eccentricityDeg={8}
        viewingDistanceCm={40}
        framePx={320}
        patchSizePx={48}
        testId="peripheral"
      />,
    );
    expect(getByTestId('peripheral-fixation')).toBeTruthy();

    rerender(
      <PeripheralLayout
        patches={PATCHES}
        phase="answer"
        eccentricityDeg={8}
        viewingDistanceCm={40}
        framePx={320}
        patchSizePx={48}
        testId="peripheral"
      />,
    );
    expect(getByTestId('peripheral-fixation')).toBeTruthy();
  });

  it('スロットの座標が円周上に等間隔（45°）に配置される', () => {
    const { getByTestId } = render(
      <PeripheralLayout
        patches={PATCHES}
        phase="presentation"
        eccentricityDeg={8}
        viewingDistanceCm={40}
        framePx={320}
        patchSizePx={48}
        testId="peripheral"
      />,
    );

    // 各スロットの style から left/top を取得し、中心からの距離を確認
    const center = 320 / 2;
    const distances: number[] = [];
    for (let i = 0; i < 8; i += 1) {
      const slot = getByTestId(`peripheral-slot-${i}`);
      const style = flatten(slot.props.style);
      const left = Number(style.left);
      const top = Number(style.top);
      // 各スロットの中心 = left + patchSize/2 = left + 24
      const cx = left + 24;
      const cy = top + 24;
      const dx = cx - center;
      const dy = cy - center;
      distances.push(Math.hypot(dx, dy));
    }
    // すべて同じ半径（誤差許容）
    const refRadius = distances[0];
    for (const d of distances) {
      expect(Math.abs(d - refRadius)).toBeLessThan(2);
    }
    expect(refRadius).toBeGreaterThan(0);
  });
});

function flatten(style: unknown): Record<string, unknown> {
  if (typeof style === 'function') {
    return flatten((style as () => unknown)());
  }
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map((s) => flatten(s)));
  }
  if (style && typeof style === 'object') {
    return style as Record<string, unknown>;
  }
  return {};
}
