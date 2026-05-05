/**
 * CrowdingStimulus — GE-12（components.md §15、screens.md S17-02）の単体テスト。
 *
 * 重点：
 *   - 中央 target + 周囲 6 flanker を描画
 *   - flanker は accessibilityElementsHidden（spec §7.12、SR 非到達）
 *   - 中央 target は ImageChoiceCell（disabled、dimOnDisabled=false）でラップ
 *   - 中央 target は disabled でも opacity=1（Sprint 15 教訓）
 *   - プレイ中（selectedOrientation 指定 / highlight なし）はハイライト枠なし
 *   - 採点後（highlightOrientation 指定）のみ黄ハイライト枠
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { render } from '@testing-library/react-native';
import { CrowdingStimulus } from '../../../../src/components/v11/games/CrowdingStimulus';
import { buildG12Trial } from '../../../../src/lib/v11/g12Trial';

describe('CrowdingStimulus: 描画', () => {
  it('中央 target + 6 flanker を描画する（標準）', () => {
    const trial = buildG12Trial(2.0, () => 0.4);
    const { queryByTestId } = render(
      <CrowdingStimulus
        target={trial.target}
        flankers={trial.flankers}
        flankerPlacements={trial.flankerPlacements}
        patchSizePx={60}
        containerSizePx={300}
        viewingDistanceCm={40}
        selectedOrientation={null}
      />,
    );
    expect(queryByTestId('crowding-stimulus')).toBeTruthy();
    expect(queryByTestId('crowding-stimulus-target')).toBeTruthy();
    for (let i = 0; i < 6; i++) {
      expect(queryByTestId(`crowding-stimulus-flanker-${i}`)).toBeTruthy();
    }
  });

  it('カスタム testId を付けると派生 ID も従う', () => {
    const trial = buildG12Trial(2.0, () => 0.4);
    const { queryByTestId } = render(
      <CrowdingStimulus
        target={trial.target}
        flankers={trial.flankers}
        flankerPlacements={trial.flankerPlacements}
        patchSizePx={60}
        containerSizePx={300}
        viewingDistanceCm={40}
        selectedOrientation={null}
        testId="custom-cs"
      />,
    );
    expect(queryByTestId('custom-cs')).toBeTruthy();
    expect(queryByTestId('custom-cs-target')).toBeTruthy();
    expect(queryByTestId('custom-cs-flanker-0')).toBeTruthy();
    expect(queryByTestId('custom-cs-flanker-5')).toBeTruthy();
  });

  it('flanker の inner は accessibilityElementsHidden（spec §7.12 SR 非到達）', () => {
    const trial = buildG12Trial(2.0, () => 0.4);
    const { getByTestId } = render(
      <CrowdingStimulus
        target={trial.target}
        flankers={trial.flankers}
        flankerPlacements={trial.flankerPlacements}
        patchSizePx={60}
        containerSizePx={300}
        viewingDistanceCm={40}
        selectedOrientation={null}
      />,
    );
    // accessibilityElementsHidden 配下は @testing-library/react-native の getByTestId が
    // 辿らないため、外側の flanker-0 の子要素を React.Children で直接確認する。
    const f0 = getByTestId('crowding-stimulus-flanker-0');
    const children = React.Children.toArray(
      f0.props.children as React.ReactNode,
    );
    expect(children.length).toBeGreaterThanOrEqual(1);
    const innerEl = children[0] as React.ReactElement<{
      accessibilityElementsHidden?: boolean;
    }>;
    expect(innerEl.props.accessibilityElementsHidden).toBe(true);
  });

  it('プレイ中（highlight なし）は中央 target に黄ハイライト枠が出ない', () => {
    const trial = buildG12Trial(2.0, () => 0.4);
    const { getByTestId } = render(
      <CrowdingStimulus
        target={trial.target}
        flankers={trial.flankers}
        flankerPlacements={trial.flankerPlacements}
        patchSizePx={60}
        containerSizePx={300}
        viewingDistanceCm={40}
        selectedOrientation="vertical"
      />,
    );
    const target = getByTestId('crowding-stimulus-target');
    expect(target.props.accessibilityState?.selected).toBe(false);
  });

  it('採点後（highlightOrientation 指定）は中央 target が isSelected=true に', () => {
    const trial = buildG12Trial(2.0, () => 0.4);
    const { getByTestId } = render(
      <CrowdingStimulus
        target={trial.target}
        flankers={trial.flankers}
        flankerPlacements={trial.flankerPlacements}
        patchSizePx={60}
        containerSizePx={300}
        viewingDistanceCm={40}
        selectedOrientation={null}
        highlightOrientation="vertical"
      />,
    );
    const target = getByTestId('crowding-stimulus-target');
    expect(target.props.accessibilityState?.selected).toBe(true);
  });

  it('中央 target は disabled だが押せない（Pressable.disabled=true）', () => {
    const trial = buildG12Trial(2.0, () => 0.4);
    const { getByTestId } = render(
      <CrowdingStimulus
        target={trial.target}
        flankers={trial.flankers}
        flankerPlacements={trial.flankerPlacements}
        patchSizePx={60}
        containerSizePx={300}
        viewingDistanceCm={40}
        selectedOrientation={null}
      />,
    );
    const target = getByTestId('crowding-stimulus-target');
    expect(target.props.accessibilityState?.disabled).toBe(true);
  });

  it('中央 target は dimOnDisabled=false（disabled でも opacity=1、Sprint 15 教訓）', () => {
    const trial = buildG12Trial(2.0, () => 0.4);
    const { getByTestId } = render(
      <CrowdingStimulus
        target={trial.target}
        flankers={trial.flankers}
        flankerPlacements={trial.flankerPlacements}
        patchSizePx={60}
        containerSizePx={300}
        viewingDistanceCm={40}
        selectedOrientation={null}
      />,
    );
    const target = getByTestId('crowding-stimulus-target');
    const styleFn = target.props.style;
    const style =
      typeof styleFn === 'function' ? styleFn({ pressed: false }) : styleFn;
    const flat = Array.isArray(style)
      ? Object.assign({}, ...style.flat(Infinity))
      : style;
    // ImageChoiceCell の disabled=true 時の opacity は dimOnDisabled=true で 0.5、
    // false で 1。1 になっていることを確認
    expect(flat.opacity ?? 1).toBe(1);
  });

  it('カスタム highlight duration / scale を受け付ける', () => {
    const trial = buildG12Trial(2.0, () => 0.4);
    const { queryByTestId } = render(
      <CrowdingStimulus
        target={trial.target}
        flankers={trial.flankers}
        flankerPlacements={trial.flankerPlacements}
        patchSizePx={60}
        containerSizePx={300}
        viewingDistanceCm={40}
        selectedOrientation={null}
        highlightOrientation="vertical"
        highlightDurationMs={500}
        highlightPeakScale={1.3}
      />,
    );
    expect(queryByTestId('crowding-stimulus-target-anim')).toBeTruthy();
  });

  it('flanker placement が反映される（angleRad 30° と 90° では位置が異なる）', () => {
    // 標準ヘキサゴン配置で flanker[0] は 30°、flanker[1] は 90°
    const trial = buildG12Trial(2.0, () => 0.4);
    const { getByTestId } = render(
      <CrowdingStimulus
        target={trial.target}
        flankers={trial.flankers}
        flankerPlacements={trial.flankerPlacements}
        patchSizePx={60}
        containerSizePx={300}
        viewingDistanceCm={40}
        selectedOrientation={null}
      />,
    );
    const f0 = getByTestId('crowding-stimulus-flanker-0');
    const f1 = getByTestId('crowding-stimulus-flanker-1');
    // 位置が異なることを確認（同じだと配置ロジックが壊れている）
    const flat = (n: { props: { style: unknown } }) => {
      const s = n.props.style;
      const obj = Array.isArray(s)
        ? Object.assign({}, ...s.flat(Infinity))
        : (s as { left?: number; top?: number });
      return obj;
    };
    expect(flat(f0)).not.toEqual(flat(f1));
  });
});
