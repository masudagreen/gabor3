/**
 * EmbeddedNumeralStimulus — GE-13（components.md §15、screens.md S17-05）の単体テスト。
 *
 * 重点：
 *   - ノイズ層 + 数字層を描画
 *   - 全体は accessibilityElementsHidden（spec §7.13、SR 非到達）
 *   - 8×8 = 64 個のノイズセル
 *   - highlightDigit を渡すと正解開示の数字オーバーレイが描画される
 *   - noiseSeed が同じなら同じパターン（決定論）
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { render } from '@testing-library/react-native';
import { EmbeddedNumeralStimulus } from '../../../../src/components/v11/games/EmbeddedNumeralStimulus';

/** ルート View の children から、testID を持つ ReactElement を探す */
function findChildByTestId(
  parent: { props: { children: React.ReactNode } },
  testId: string,
): React.ReactElement<{
  accessibilityElementsHidden?: boolean;
  children?: React.ReactNode;
}> | null {
  const children = React.Children.toArray(parent.props.children);
  for (const c of children) {
    if (!React.isValidElement(c)) continue;
    const props = (c as React.ReactElement<{ testID?: string }>).props;
    if (props.testID === testId) {
      return c as React.ReactElement<{
        accessibilityElementsHidden?: boolean;
        children?: React.ReactNode;
      }>;
    }
  }
  return null;
}

describe('EmbeddedNumeralStimulus: 描画', () => {
  it('描画クラッシュなしでマウントできる', () => {
    const { queryByTestId } = render(
      <EmbeddedNumeralStimulus
        digit={3}
        contrast={0.10}
        noiseSeed={42}
        stimulusSizePx={240}
      />,
    );
    expect(queryByTestId('embedded-numeral-stimulus')).toBeTruthy();
  });

  it('カスタム testId を付けると noise / digit-base が ReactElement として配置される', () => {
    const { getByTestId } = render(
      <EmbeddedNumeralStimulus
        digit={3}
        contrast={0.10}
        noiseSeed={42}
        stimulusSizePx={240}
        testId="custom-en"
      />,
    );
    const root = getByTestId('custom-en');
    // 子要素のうち、testID="custom-en-noise" / "custom-en-digit-base" が含まれること
    expect(findChildByTestId(root, 'custom-en-noise')).not.toBeNull();
    expect(findChildByTestId(root, 'custom-en-digit-base')).not.toBeNull();
  });

  it('ノイズ層は accessibilityElementsHidden（spec §7.13 SR 非到達。全体ルートは GamePlaySurface 側で包まれる）', () => {
    const { getByTestId } = render(
      <EmbeddedNumeralStimulus
        digit={3}
        contrast={0.10}
        noiseSeed={42}
        stimulusSizePx={240}
      />,
    );
    const root = getByTestId('embedded-numeral-stimulus');
    const noise = findChildByTestId(root, 'embedded-numeral-stimulus-noise');
    expect(noise).not.toBeNull();
    expect(noise?.props.accessibilityElementsHidden).toBe(true);
  });

  it('ノイズ層は 16×16 = 256 個のセルを持つ（v1.1.4：ノイズ細粒度化）', () => {
    const { getByTestId } = render(
      <EmbeddedNumeralStimulus
        digit={3}
        contrast={0.10}
        noiseSeed={42}
        stimulusSizePx={240}
      />,
    );
    const root = getByTestId('embedded-numeral-stimulus');
    const noise = findChildByTestId(root, 'embedded-numeral-stimulus-noise');
    expect(noise).not.toBeNull();
    const cells = React.Children.toArray(noise!.props.children);
    expect(cells).toHaveLength(256);
  });

  it('highlightDigit を渡すと正解開示用 digit-highlight が出る', () => {
    const { queryByTestId } = render(
      <EmbeddedNumeralStimulus
        digit={3}
        contrast={0.10}
        noiseSeed={42}
        stimulusSizePx={240}
        highlightDigit={3}
      />,
    );
    expect(queryByTestId('embedded-numeral-stimulus-digit-highlight')).toBeTruthy();
  });

  it('highlightDigit なしでは digit-highlight が描画されない', () => {
    const { queryByTestId } = render(
      <EmbeddedNumeralStimulus
        digit={3}
        contrast={0.10}
        noiseSeed={42}
        stimulusSizePx={240}
      />,
    );
    expect(queryByTestId('embedded-numeral-stimulus-digit-highlight')).toBeNull();
  });

  it('stimulus container は正方形（width=height）', () => {
    const { getByTestId } = render(
      <EmbeddedNumeralStimulus
        digit={3}
        contrast={0.10}
        noiseSeed={42}
        stimulusSizePx={280}
      />,
    );
    const root = getByTestId('embedded-numeral-stimulus');
    const styleFn = root.props.style;
    const style =
      typeof styleFn === 'function' ? styleFn({ pressed: false }) : styleFn;
    const flat = Array.isArray(style)
      ? Object.assign({}, ...style.flat(Infinity))
      : style;
    expect(flat.width).toBe(280);
    expect(flat.height).toBe(280);
  });

  it('同じ noiseSeed なら同じノイズパターンになる（決定論）', () => {
    const { getByTestId: getA } = render(
      <EmbeddedNumeralStimulus
        digit={3}
        contrast={0.10}
        noiseSeed={42}
        stimulusSizePx={240}
        testId="a"
      />,
    );
    const { getByTestId: getB } = render(
      <EmbeddedNumeralStimulus
        digit={3}
        contrast={0.10}
        noiseSeed={42}
        stimulusSizePx={240}
        testId="b"
      />,
    );
    // ノイズ親 View 配下の最初のセル（accessibilityElementsHidden 配下のため
    // children を直接辿る）の backgroundColor を比較
    const rootA = getA('a');
    const rootB = getB('b');
    const noiseA = findChildByTestId(rootA, 'a-noise');
    const noiseB = findChildByTestId(rootB, 'b-noise');
    expect(noiseA).not.toBeNull();
    expect(noiseB).not.toBeNull();
    const cellA = React.Children.toArray(
      noiseA!.props.children,
    )[0] as React.ReactElement<{ style?: { backgroundColor?: string } }>;
    const cellB = React.Children.toArray(
      noiseB!.props.children,
    )[0] as React.ReactElement<{ style?: { backgroundColor?: string } }>;
    expect(cellA.props.style?.backgroundColor).toBe(
      cellB.props.style?.backgroundColor,
    );
  });

  it('contrast の値で digit base の opacity が変化する', () => {
    const { getByTestId } = render(
      <EmbeddedNumeralStimulus
        digit={3}
        contrast={0.10}
        noiseSeed={42}
        stimulusSizePx={240}
      />,
    );
    const root = getByTestId('embedded-numeral-stimulus');
    const base = findChildByTestId(root, 'embedded-numeral-stimulus-digit-base');
    expect(base).not.toBeNull();
    // children を辿って Text の opacity を確認
    const children = React.Children.toArray(base!.props.children) as Array<
      React.ReactElement<{ style?: { opacity?: number } }>
    >;
    expect(children.length).toBeGreaterThanOrEqual(1);
    // Text 要素の opacity プロパティが contrast=0.10 と一致
    const text = children[0];
    expect(text.props.style?.opacity).toBeCloseTo(0.10, 5);
  });

  it('数字 digit が 0〜9 全てで描画クラッシュしない', () => {
    for (const d of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const) {
      const { queryByTestId, unmount } = render(
        <EmbeddedNumeralStimulus
          digit={d}
          contrast={0.10}
          noiseSeed={42}
          stimulusSizePx={240}
        />,
      );
      expect(queryByTestId('embedded-numeral-stimulus')).toBeTruthy();
      unmount();
    }
  });
});
