/**
 * LateralMaskingStimulus — GE-09（components.md §15、screens.md S15-05）の単体テスト。
 *
 * 重点：
 *   - flanker × 2 + target を描画（横一列）
 *   - flanker は accessibilityElementsHidden（spec §7.9 SR 非到達）
 *   - target は ImageChoiceCell（disabled）でラップ、SR 非到達
 *   - highlightOrientation を渡したとき target-anim wrap が描画される
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { render } from '@testing-library/react-native';
import { LateralMaskingStimulus } from '../../../../src/components/v11/games/LateralMaskingStimulus';
import { buildG09Trial } from '../../../../src/lib/v11/g09Trial';

describe('LateralMaskingStimulus: 描画', () => {
  it('flanker × 2 + target の 3 パッチを描画する', () => {
    const trial = buildG09Trial(0.1, () => 0.4);
    const { queryByTestId } = render(
      <LateralMaskingStimulus
        flankerLeft={trial.flankerLeft}
        target={trial.target}
        flankerRight={trial.flankerRight}
        patchSizePx={80}
        gapPx={32}
        viewingDistanceCm={40}
        selectedOrientation={null}
      />,
    );
    expect(queryByTestId('lateral-masking-stimulus')).toBeTruthy();
    expect(queryByTestId('lateral-masking-stimulus-flanker-left')).toBeTruthy();
    expect(queryByTestId('lateral-masking-stimulus-flanker-right')).toBeTruthy();
    expect(queryByTestId('lateral-masking-stimulus-target')).toBeTruthy();
  });

  it('カスタム testId で派生 testID も切り替わる', () => {
    const trial = buildG09Trial(0.1, () => 0.4);
    const { queryByTestId } = render(
      <LateralMaskingStimulus
        flankerLeft={trial.flankerLeft}
        target={trial.target}
        flankerRight={trial.flankerRight}
        patchSizePx={80}
        gapPx={32}
        viewingDistanceCm={40}
        selectedOrientation={null}
        testId="custom-mask"
      />,
    );
    expect(queryByTestId('custom-mask')).toBeTruthy();
    expect(queryByTestId('custom-mask-flanker-left')).toBeTruthy();
    expect(queryByTestId('custom-mask-flanker-right')).toBeTruthy();
    expect(queryByTestId('custom-mask-target')).toBeTruthy();
  });

  it('flanker outer の中に accessibilityElementsHidden 内部ラッパが存在する', () => {
    const trial = buildG09Trial(0.1, () => 0.4);
    const { getByTestId } = render(
      <LateralMaskingStimulus
        flankerLeft={trial.flankerLeft}
        target={trial.target}
        flankerRight={trial.flankerRight}
        patchSizePx={80}
        gapPx={32}
        viewingDistanceCm={40}
        selectedOrientation={null}
      />,
    );
    for (const side of ['left', 'right'] as const) {
      const outer = getByTestId(`lateral-masking-stimulus-flanker-${side}`);
      const children = React.Children.toArray(
        outer.props.children as React.ReactNode,
      );
      expect(children.length).toBeGreaterThanOrEqual(1);
      const innerEl = children[0] as React.ReactElement<{
        accessibilityElementsHidden?: boolean;
        importantForAccessibility?: string;
      }>;
      expect(innerEl.props.accessibilityElementsHidden).toBe(true);
      expect(innerEl.props.importantForAccessibility).toBe(
        'no-hide-descendants',
      );
    }
  });

  it('target の ImageChoiceCell は disabled（タップ不可）', () => {
    const trial = buildG09Trial(0.1, () => 0.4);
    const { getByTestId } = render(
      <LateralMaskingStimulus
        flankerLeft={trial.flankerLeft}
        target={trial.target}
        flankerRight={trial.flankerRight}
        patchSizePx={80}
        gapPx={32}
        viewingDistanceCm={40}
        selectedOrientation={null}
      />,
    );
    const targetCell = getByTestId('lateral-masking-stimulus-target');
    const ariaDisabled =
      targetCell.props.accessibilityState?.disabled === true ||
      targetCell.props['aria-disabled'] === true ||
      targetCell.props.disabled === true;
    expect(ariaDisabled).toBe(true);
  });

  it('selectedOrientation が vertical でも horizontal でもクラッシュしない', () => {
    const trial = buildG09Trial(0.1, () => 0.4);
    const { rerender, queryByTestId } = render(
      <LateralMaskingStimulus
        flankerLeft={trial.flankerLeft}
        target={trial.target}
        flankerRight={trial.flankerRight}
        patchSizePx={80}
        gapPx={32}
        viewingDistanceCm={40}
        selectedOrientation="vertical"
      />,
    );
    expect(queryByTestId('lateral-masking-stimulus')).toBeTruthy();
    rerender(
      <LateralMaskingStimulus
        flankerLeft={trial.flankerLeft}
        target={trial.target}
        flankerRight={trial.flankerRight}
        patchSizePx={80}
        gapPx={32}
        viewingDistanceCm={40}
        selectedOrientation="horizontal"
      />,
    );
    expect(queryByTestId('lateral-masking-stimulus')).toBeTruthy();
  });

  it('highlightOrientation を渡してもクラッシュなく描画する（target-anim wrap が存在）', () => {
    const trial = buildG09Trial(0.1, () => 0.4);
    const { queryByTestId } = render(
      <LateralMaskingStimulus
        flankerLeft={trial.flankerLeft}
        target={trial.target}
        flankerRight={trial.flankerRight}
        patchSizePx={80}
        gapPx={32}
        viewingDistanceCm={40}
        selectedOrientation={null}
        highlightOrientation="vertical"
      />,
    );
    expect(queryByTestId('lateral-masking-stimulus-target-anim')).toBeTruthy();
  });

  // ---- Sprint 15 修正ラウンド 2 / Critical：刺激の opacity 忠実性 ----
  const resolveStyle = (cell: { props: { style: unknown } }): Record<string, unknown> => {
    const styleProp = cell.props.style;
    if (typeof styleProp === 'function') {
      return (styleProp as (state: { pressed: boolean }) => Record<string, unknown>)({
        pressed: false,
      });
    }
    return (styleProp ?? {}) as Record<string, unknown>;
  };

  it('中央 target は disabled でも opacity=1 で描画（spec §7.9 Polat target コントラスト忠実性）', () => {
    const trial = buildG09Trial(0.1, () => 0.4);
    const { getByTestId } = render(
      <LateralMaskingStimulus
        flankerLeft={trial.flankerLeft}
        target={trial.target}
        flankerRight={trial.flankerRight}
        patchSizePx={80}
        gapPx={32}
        viewingDistanceCm={40}
        selectedOrientation={null}
      />,
    );
    const targetCell = getByTestId('lateral-masking-stimulus-target');
    const style = resolveStyle(targetCell);
    // dimOnDisabled={false} が渡っており、staircase target コントラストは
    // 描画前に半減しない（opacity 0.5 適用なし）。
    expect(style.opacity).toBe(1);
  });

  // ---- Sprint 15 修正ラウンド 2 / Minor：プレイ中ハイライト枠抑止 ----
  it('プレイ中（selectedOrientation 指定 / highlightOrientation なし）は target に黄ハイライト枠が出ない', () => {
    const trial = buildG09Trial(0.1, () => 0.4);
    const { getByTestId } = render(
      <LateralMaskingStimulus
        flankerLeft={trial.flankerLeft}
        target={trial.target}
        flankerRight={trial.flankerRight}
        patchSizePx={80}
        gapPx={32}
        viewingDistanceCm={40}
        selectedOrientation="vertical"
      />,
    );
    const targetCell = getByTestId('lateral-masking-stimulus-target');
    const style = resolveStyle(targetCell);
    expect(style.borderWidth).toBe(0);
    expect(targetCell.props.accessibilityState?.checked).toBe(false);
  });

  it('Sprint 20 / v1.1.1：disabled な target は枠なし（黄 4px は撤去、結果開示は ResultOverlay へ）', () => {
    const trial = buildG09Trial(0.1, () => 0.4);
    const { getByTestId } = render(
      <LateralMaskingStimulus
        flankerLeft={trial.flankerLeft}
        target={trial.target}
        flankerRight={trial.flankerRight}
        patchSizePx={80}
        gapPx={32}
        viewingDistanceCm={40}
        selectedOrientation={null}
        highlightOrientation="vertical"
      />,
    );
    const targetCell = getByTestId('lateral-masking-stimulus-target');
    const style = resolveStyle(targetCell);
    // v1.1.1：disabled cell は borderWidth=0（旧 4px 黄色枠は撤去）。
    expect(style.borderWidth).toBe(0);
  });

  it('プレイ中も採点後も target の opacity は 1（disabled でも刺激減衰なし）', () => {
    const trial = buildG09Trial(0.1, () => 0.4);
    const { getByTestId, rerender } = render(
      <LateralMaskingStimulus
        flankerLeft={trial.flankerLeft}
        target={trial.target}
        flankerRight={trial.flankerRight}
        patchSizePx={80}
        gapPx={32}
        viewingDistanceCm={40}
        selectedOrientation="horizontal"
      />,
    );
    expect(resolveStyle(getByTestId('lateral-masking-stimulus-target')).opacity).toBe(1);
    rerender(
      <LateralMaskingStimulus
        flankerLeft={trial.flankerLeft}
        target={trial.target}
        flankerRight={trial.flankerRight}
        patchSizePx={80}
        gapPx={32}
        viewingDistanceCm={40}
        selectedOrientation={null}
        highlightOrientation="vertical"
      />,
    );
    expect(resolveStyle(getByTestId('lateral-masking-stimulus-target')).opacity).toBe(1);
  });

  it('flexDirection が row（横一列）', () => {
    const trial = buildG09Trial(0.1, () => 0.4);
    const { getByTestId } = render(
      <LateralMaskingStimulus
        flankerLeft={trial.flankerLeft}
        target={trial.target}
        flankerRight={trial.flankerRight}
        patchSizePx={80}
        gapPx={32}
        viewingDistanceCm={40}
        selectedOrientation={null}
      />,
    );
    const container = getByTestId('lateral-masking-stimulus');
    const styleVal = container.props.style;
    const flat = Array.isArray(styleVal) ? styleVal : [styleVal];
    const merged = flat.reduce(
      (acc: Record<string, unknown>, s: Record<string, unknown> | undefined) =>
        s ? { ...acc, ...s } : acc,
      {},
    );
    expect(merged.flexDirection).toBe('row');
  });
});
