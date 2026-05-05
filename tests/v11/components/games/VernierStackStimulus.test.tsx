/**
 * VernierStackStimulus — GE-11（components.md §15、screens.md S16-05）の単体テスト。
 *
 * 重点：
 *   - 上下 2 パッチを描画
 *   - upper は accessibilityElementsHidden（spec §7.11、SR 非到達）
 *   - lower は ImageChoiceCell（disabled、dimOnDisabled=false）でラップ
 *   - lowerOffsetXPx を渡すと translateX で水平にズレる
 *   - 下パッチは disabled でも opacity=1（Sprint 15 教訓）
 *   - プレイ中（selectedDirection 指定 / highlight なし）はハイライト枠なし
 *   - 採点後（highlightDirection 指定）のみ黄ハイライト枠
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { render } from '@testing-library/react-native';
import { VernierStackStimulus } from '../../../../src/components/v11/games/VernierStackStimulus';
import { buildG11Trial } from '../../../../src/lib/v11/g11Trial';

describe('VernierStackStimulus: 描画', () => {
  it('upper / lower の両パッチを描画する', () => {
    const trial = buildG11Trial(2, () => 0.4);
    const { queryByTestId } = render(
      <VernierStackStimulus
        upper={trial.upper}
        lower={trial.lower}
        patchSizePx={100}
        gapPx={16}
        lowerOffsetXPx={4}
        viewingDistanceCm={40}
        selectedDirection={null}
      />,
    );
    expect(queryByTestId('vernier-stack-stimulus')).toBeTruthy();
    expect(queryByTestId('vernier-stack-stimulus-upper')).toBeTruthy();
    expect(queryByTestId('vernier-stack-stimulus-lower')).toBeTruthy();
  });

  it('カスタム testId を付けると upper / lower も派生する', () => {
    const trial = buildG11Trial(2, () => 0.4);
    const { queryByTestId } = render(
      <VernierStackStimulus
        upper={trial.upper}
        lower={trial.lower}
        patchSizePx={100}
        gapPx={16}
        lowerOffsetXPx={4}
        viewingDistanceCm={40}
        selectedDirection={null}
        testId="custom-vernier"
      />,
    );
    expect(queryByTestId('custom-vernier')).toBeTruthy();
    expect(queryByTestId('custom-vernier-upper')).toBeTruthy();
    expect(queryByTestId('custom-vernier-lower')).toBeTruthy();
  });

  it('upper の inner は accessibilityElementsHidden（spec §7.11 SR 非到達）', () => {
    const trial = buildG11Trial(2, () => 0.4);
    const { getByTestId } = render(
      <VernierStackStimulus
        upper={trial.upper}
        lower={trial.lower}
        patchSizePx={100}
        gapPx={16}
        lowerOffsetXPx={4}
        viewingDistanceCm={40}
        selectedDirection={null}
      />,
    );
    const upper = getByTestId('vernier-stack-stimulus-upper');
    const children = React.Children.toArray(
      upper.props.children as React.ReactNode,
    );
    expect(children.length).toBeGreaterThanOrEqual(1);
    const innerEl = children[0] as React.ReactElement<{
      accessibilityElementsHidden?: boolean;
      importantForAccessibility?: string;
    }>;
    expect(innerEl.props.accessibilityElementsHidden).toBe(true);
    expect(innerEl.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('lower パッチの ImageChoiceCell は disabled（タップ不可）', () => {
    const trial = buildG11Trial(2, () => 0.4);
    const { getByTestId } = render(
      <VernierStackStimulus
        upper={trial.upper}
        lower={trial.lower}
        patchSizePx={100}
        gapPx={16}
        lowerOffsetXPx={4}
        viewingDistanceCm={40}
        selectedDirection={null}
      />,
    );
    const lower = getByTestId('vernier-stack-stimulus-lower');
    const ariaDisabled =
      lower.props.accessibilityState?.disabled === true ||
      lower.props['aria-disabled'] === true ||
      lower.props.disabled === true;
    expect(ariaDisabled).toBe(true);
  });

  // ---- Sprint 15 教訓 / Critical：刺激の opacity 忠実性 ----
  const resolveStyle = (cell: { props: { style: unknown } }): Record<string, unknown> => {
    const styleProp = cell.props.style;
    if (typeof styleProp === 'function') {
      return (styleProp as (state: { pressed: boolean }) => Record<string, unknown>)({
        pressed: false,
      });
    }
    return (styleProp ?? {}) as Record<string, unknown>;
  };

  it('下パッチは disabled でも opacity=1（spec §7.11 ハイパーアキュイティ忠実性）', () => {
    const trial = buildG11Trial(2, () => 0.4);
    const { getByTestId } = render(
      <VernierStackStimulus
        upper={trial.upper}
        lower={trial.lower}
        patchSizePx={100}
        gapPx={16}
        lowerOffsetXPx={4}
        viewingDistanceCm={40}
        selectedDirection={null}
      />,
    );
    const lower = getByTestId('vernier-stack-stimulus-lower');
    const style = resolveStyle(lower);
    expect(style.opacity).toBe(1);
  });

  // ---- Sprint 15 教訓 / Minor：プレイ中ハイライト枠抑止 ----
  it('プレイ中（selectedDirection 指定 / highlight なし）は lower に黄ハイライト枠が出ない', () => {
    const trial = buildG11Trial(2, () => 0.4);
    const { getByTestId } = render(
      <VernierStackStimulus
        upper={trial.upper}
        lower={trial.lower}
        patchSizePx={100}
        gapPx={16}
        lowerOffsetXPx={4}
        viewingDistanceCm={40}
        selectedDirection="left"
      />,
    );
    const lower = getByTestId('vernier-stack-stimulus-lower');
    const style = resolveStyle(lower);
    expect(style.borderWidth).toBe(0);
    expect(lower.props.accessibilityState?.checked).toBe(false);
  });

  it('Sprint 20 / v1.1.1：disabled な lower は枠なし（黄 4px は撤去、結果開示は ResultOverlay へ）', () => {
    const trial = buildG11Trial(2, () => 0.4);
    const { getByTestId } = render(
      <VernierStackStimulus
        upper={trial.upper}
        lower={trial.lower}
        patchSizePx={100}
        gapPx={16}
        lowerOffsetXPx={4}
        viewingDistanceCm={40}
        selectedDirection={null}
        highlightDirection="left"
      />,
    );
    const lower = getByTestId('vernier-stack-stimulus-lower');
    const style = resolveStyle(lower);
    expect(style.borderWidth).toBe(0);
  });

  it('プレイ中も採点後も lower の opacity は 1（disabled でも刺激減衰なし）', () => {
    const trial = buildG11Trial(2, () => 0.4);
    const { getByTestId, rerender } = render(
      <VernierStackStimulus
        upper={trial.upper}
        lower={trial.lower}
        patchSizePx={100}
        gapPx={16}
        lowerOffsetXPx={4}
        viewingDistanceCm={40}
        selectedDirection="left"
      />,
    );
    expect(resolveStyle(getByTestId('vernier-stack-stimulus-lower')).opacity).toBe(1);
    rerender(
      <VernierStackStimulus
        upper={trial.upper}
        lower={trial.lower}
        patchSizePx={100}
        gapPx={16}
        lowerOffsetXPx={4}
        viewingDistanceCm={40}
        selectedDirection={null}
        highlightDirection="right"
      />,
    );
    expect(resolveStyle(getByTestId('vernier-stack-stimulus-lower')).opacity).toBe(1);
  });

  // ---- 水平オフセット（lowerOffsetXPx）の適用 ----
  it('lowerOffsetXPx は lower-anim ラッパの transform に translateX として適用される', () => {
    const trial = buildG11Trial(2, () => 0.4);
    const { getByTestId } = render(
      <VernierStackStimulus
        upper={trial.upper}
        lower={trial.lower}
        patchSizePx={100}
        gapPx={16}
        lowerOffsetXPx={5}
        viewingDistanceCm={40}
        selectedDirection={null}
      />,
    );
    const anim = getByTestId('vernier-stack-stimulus-lower-anim');
    const styleProp = anim.props.style;
    const flat = Array.isArray(styleProp) ? styleProp : [styleProp];
    const merged = flat.reduce(
      (acc: Record<string, unknown>, s: Record<string, unknown> | undefined) =>
        s ? { ...acc, ...s } : acc,
      {},
    );
    const transform = merged.transform as Array<Record<string, unknown>>;
    expect(Array.isArray(transform)).toBe(true);
    const translateX = transform.find((t) => 'translateX' in t);
    expect(translateX).toBeDefined();
    expect(translateX!.translateX).toBe(5);
  });

  it('lowerOffsetXPx=-5（左ズレ）も transform に適用される', () => {
    const trial = buildG11Trial(2, () => 0.4);
    const { getByTestId } = render(
      <VernierStackStimulus
        upper={trial.upper}
        lower={trial.lower}
        patchSizePx={100}
        gapPx={16}
        lowerOffsetXPx={-5}
        viewingDistanceCm={40}
        selectedDirection={null}
      />,
    );
    const anim = getByTestId('vernier-stack-stimulus-lower-anim');
    const styleProp = anim.props.style;
    const flat = Array.isArray(styleProp) ? styleProp : [styleProp];
    const merged = flat.reduce(
      (acc: Record<string, unknown>, s: Record<string, unknown> | undefined) =>
        s ? { ...acc, ...s } : acc,
      {},
    );
    const transform = merged.transform as Array<Record<string, unknown>>;
    const translateX = transform.find((t) => 'translateX' in t);
    expect(translateX!.translateX).toBe(-5);
  });

  it('lowerOffsetXPx=0（ズレなし）も適用可', () => {
    const trial = buildG11Trial(0, () => 0.4);
    const { getByTestId } = render(
      <VernierStackStimulus
        upper={trial.upper}
        lower={trial.lower}
        patchSizePx={100}
        gapPx={16}
        lowerOffsetXPx={0}
        viewingDistanceCm={40}
        selectedDirection={null}
      />,
    );
    const anim = getByTestId('vernier-stack-stimulus-lower-anim');
    const styleProp = anim.props.style;
    const flat = Array.isArray(styleProp) ? styleProp : [styleProp];
    const merged = flat.reduce(
      (acc: Record<string, unknown>, s: Record<string, unknown> | undefined) =>
        s ? { ...acc, ...s } : acc,
      {},
    );
    const transform = merged.transform as Array<Record<string, unknown>>;
    const translateX = transform.find((t) => 'translateX' in t);
    expect(translateX!.translateX).toBe(0);
  });

  it('selectedDirection が left でも right でも描画クラッシュしない', () => {
    const trial = buildG11Trial(2, () => 0.4);
    const { rerender, queryByTestId } = render(
      <VernierStackStimulus
        upper={trial.upper}
        lower={trial.lower}
        patchSizePx={100}
        gapPx={16}
        lowerOffsetXPx={4}
        viewingDistanceCm={40}
        selectedDirection="left"
      />,
    );
    expect(queryByTestId('vernier-stack-stimulus')).toBeTruthy();
    rerender(
      <VernierStackStimulus
        upper={trial.upper}
        lower={trial.lower}
        patchSizePx={100}
        gapPx={16}
        lowerOffsetXPx={-4}
        viewingDistanceCm={40}
        selectedDirection="right"
      />,
    );
    expect(queryByTestId('vernier-stack-stimulus')).toBeTruthy();
  });

  it('highlightDirection を渡してもクラッシュなく描画する（lower-anim ラッパが存在）', () => {
    const trial = buildG11Trial(2, () => 0.4);
    const { queryByTestId } = render(
      <VernierStackStimulus
        upper={trial.upper}
        lower={trial.lower}
        patchSizePx={100}
        gapPx={16}
        lowerOffsetXPx={4}
        viewingDistanceCm={40}
        selectedDirection={null}
        highlightDirection="right"
      />,
    );
    expect(queryByTestId('vernier-stack-stimulus-lower-anim')).toBeTruthy();
  });
});
