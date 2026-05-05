/**
 * TextureGridStimulus — GE-10（components.md §15、screens.md S16-02）の単体テスト。
 *
 * 重点：
 *   - 8×8 = 64 セルを描画
 *   - target 領域 9 セルが正しく orientation を持つ（背景と異なる）
 *   - 全体は accessibilityElementsHidden（spec §7.10、SR 非到達）
 *   - highlightTargetRegion を渡したとき target-highlight 枠が描画される
 *   - プレイ中（highlight なし）はハイライト枠が出ない
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { render } from '@testing-library/react-native';
import { TextureGridStimulus } from '../../../../src/components/v11/games/TextureGridStimulus';
import { buildG10Trial } from '../../../../src/lib/v11/g10Trial';

describe('TextureGridStimulus: 描画', () => {
  it('8×8 = 64 セルを描画する', () => {
    const trial = buildG10Trial(30, () => 0.5);
    const { queryByTestId } = render(
      <TextureGridStimulus
        cells={trial.cells}
        cellSizePx={40}
        gapPx={0}
        viewingDistanceCm={40}
      />,
    );
    expect(queryByTestId('texture-grid-stimulus')).toBeTruthy();
    // 64 セル全て描画
    for (let r = 0; r < 8; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        expect(
          queryByTestId(`texture-grid-stimulus-cell-${r}-${c}`),
        ).toBeTruthy();
      }
    }
  });

  it('カスタム testId を付けるとセル ID も派生する', () => {
    const trial = buildG10Trial(30, () => 0.5);
    const { queryByTestId } = render(
      <TextureGridStimulus
        cells={trial.cells}
        cellSizePx={40}
        gapPx={0}
        viewingDistanceCm={40}
        testId="custom-grid"
      />,
    );
    expect(queryByTestId('custom-grid')).toBeTruthy();
    expect(queryByTestId('custom-grid-cell-0-0')).toBeTruthy();
    expect(queryByTestId('custom-grid-cell-7-7')).toBeTruthy();
  });

  it('各セルは accessibilityElementsHidden 内部ラッパで SR 非到達（spec §7.10、二重保険）', () => {
    const trial = buildG10Trial(30, () => 0.5);
    const { getByTestId } = render(
      <TextureGridStimulus
        cells={trial.cells}
        cellSizePx={40}
        gapPx={0}
        viewingDistanceCm={40}
      />,
    );
    // 外枠は SR 非隠蔽（GamePlaySurface 側で隠す）。各セル内部のラッパで SR 隠蔽
    const cell00 = getByTestId('texture-grid-stimulus-cell-0-0');
    const children = React.Children.toArray(
      cell00.props.children as React.ReactNode,
    );
    expect(children.length).toBeGreaterThanOrEqual(1);
    const innerEl = children[0] as React.ReactElement<{
      accessibilityElementsHidden?: boolean;
      importantForAccessibility?: string;
    }>;
    expect(innerEl.props.accessibilityElementsHidden).toBe(true);
    expect(innerEl.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('プレイ中（highlightTargetRegion なし）は target-highlight 枠が出ない', () => {
    const trial = buildG10Trial(30, () => 0.5);
    const { queryByTestId } = render(
      <TextureGridStimulus
        cells={trial.cells}
        cellSizePx={40}
        gapPx={0}
        viewingDistanceCm={40}
      />,
    );
    expect(queryByTestId('texture-grid-stimulus-target-highlight')).toBeNull();
  });

  it('採点後（highlightTargetRegion=true）は target-highlight 枠が出る', () => {
    const trial = buildG10Trial(30, () => 0.5);
    const { queryByTestId } = render(
      <TextureGridStimulus
        cells={trial.cells}
        cellSizePx={40}
        gapPx={0}
        viewingDistanceCm={40}
        highlightTargetRegion
      />,
    );
    expect(
      queryByTestId('texture-grid-stimulus-target-highlight'),
    ).toBeTruthy();
  });

  it('cellSizePx / gapPx の通りに各セル size が設定される', () => {
    const trial = buildG10Trial(30, () => 0.5);
    const { getByTestId } = render(
      <TextureGridStimulus
        cells={trial.cells}
        cellSizePx={36}
        gapPx={0}
        viewingDistanceCm={40}
      />,
    );
    const cell00 = getByTestId('texture-grid-stimulus-cell-0-0');
    const styleProp = cell00.props.style;
    const flat = Array.isArray(styleProp) ? styleProp : [styleProp];
    const merged = flat.reduce(
      (acc: Record<string, unknown>, s: Record<string, unknown> | undefined) =>
        s ? { ...acc, ...s } : acc,
      {},
    );
    expect(merged.width).toBe(36);
    expect(merged.height).toBe(36);
  });

  it('target 領域 9 セルは isTargetMember=true で背景と異なる向き', () => {
    const trial = buildG10Trial(30, () => 0.5);
    const targets = trial.cells.filter((c) => c.isTargetMember);
    const bg = trial.cells.filter((c) => !c.isTargetMember);
    // target は 9 セル
    expect(targets).toHaveLength(9);
    // target 全てが同じ向き（target 領域は単一向き）
    const targetDeg = targets[0].gabor.orientationDeg;
    for (const t of targets) {
      expect(t.gabor.orientationDeg).toBeCloseTo(targetDeg, 4);
    }
    // 背景全てが同じ向き
    const bgDeg = bg[0].gabor.orientationDeg;
    for (const b of bg) {
      expect(b.gabor.orientationDeg).toBeCloseTo(bgDeg, 4);
    }
    // target と背景は異なる
    expect(targetDeg).not.toBeCloseTo(bgDeg, 1);
  });

  it('cells 数が 64 未満でもクラッシュしない（空セル代替描画）', () => {
    const trial = buildG10Trial(30, () => 0.5);
    // 先頭 30 セルだけ渡す → 残りは空セル（margin 確保）
    const { queryByTestId } = render(
      <TextureGridStimulus
        cells={trial.cells.slice(0, 30)}
        cellSizePx={40}
        gapPx={0}
        viewingDistanceCm={40}
      />,
    );
    expect(queryByTestId('texture-grid-stimulus')).toBeTruthy();
  });

  it('highlightDurationMs / highlightPeakScale を渡してもクラッシュしない', () => {
    const trial = buildG10Trial(30, () => 0.5);
    const { queryByTestId } = render(
      <TextureGridStimulus
        cells={trial.cells}
        cellSizePx={40}
        gapPx={0}
        viewingDistanceCm={40}
        highlightTargetRegion
        highlightDurationMs={500}
        highlightPeakScale={1.5}
      />,
    );
    expect(queryByTestId('texture-grid-stimulus-target-highlight')).toBeTruthy();
  });

  it('cellSizePx 60 でレンダリング（PC 1280px サイズ想定）', () => {
    const trial = buildG10Trial(30, () => 0.5);
    const { getByTestId } = render(
      <TextureGridStimulus
        cells={trial.cells}
        cellSizePx={60}
        gapPx={0}
        viewingDistanceCm={40}
      />,
    );
    const cell00 = getByTestId('texture-grid-stimulus-cell-0-0');
    const styleProp = cell00.props.style;
    const flat = Array.isArray(styleProp) ? styleProp : [styleProp];
    const merged = flat.reduce(
      (acc: Record<string, unknown>, s: Record<string, unknown> | undefined) =>
        s ? { ...acc, ...s } : acc,
      {},
    );
    expect(merged.width).toBe(60);
    expect(merged.height).toBe(60);
  });
});
