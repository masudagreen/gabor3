/**
 * GaborGridStimulus — GE-07（components.md §15、screens.md S14-05）の単体テスト。
 *
 * 重点：
 *   - 16 セル全部を描画
 *   - role="checkbox"（複数選択可）/ aria-checked 動的更新
 *   - 複数セル選択 → onToggleCell が個別に呼ばれる
 *   - 再タップで解除（onToggleCell が同じ id で再度呼ばれる、解除は親側で集合管理）
 *   - selectedIds 外のセルは aria-checked=false
 *   - highlightIds で該当セルが「選択中」表示になる
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { GaborGridStimulus } from '../../../../src/components/v11/games/GaborGridStimulus';
import {
  G07PatchSpec,
  buildG07Trial,
} from '../../../../src/lib/v11/g07Trial';

function makeSeedPatches(): ReadonlyArray<G07PatchSpec> {
  // テスト容易性のため固定 rng で生成
  return buildG07Trial(5, () => 0.3).patches;
}

describe('GaborGridStimulus: 描画と選択', () => {
  it('16 セル全部を描画する', () => {
    const patches = makeSeedPatches();
    const { queryByTestId } = render(
      <GaborGridStimulus
        patches={patches}
        cellSizePx={64}
        gapPx={12}
        viewingDistanceCm={40}
        selectedIds={[]}
        onToggleCell={jest.fn()}
      />,
    );
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 4; c += 1) {
        expect(queryByTestId(`g07-cell-r${r}c${c}`)).toBeTruthy();
      }
    }
  });

  it('全セルが role="checkbox" を持つ（accessibilityState.checked=false 初期）', () => {
    const patches = makeSeedPatches();
    const { getByTestId } = render(
      <GaborGridStimulus
        patches={patches}
        cellSizePx={64}
        gapPx={12}
        viewingDistanceCm={40}
        selectedIds={[]}
        onToggleCell={jest.fn()}
      />,
    );
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 4; c += 1) {
        const cell = getByTestId(`g07-cell-r${r}c${c}`);
        // accessibilityState.checked が false（未選択）
        expect(cell.props.accessibilityState?.checked).toBe(false);
      }
    }
  });

  it('selectedIds に含まれるセルは aria-checked=true', () => {
    const patches = makeSeedPatches();
    const { getByTestId } = render(
      <GaborGridStimulus
        patches={patches}
        cellSizePx={64}
        gapPx={12}
        viewingDistanceCm={40}
        selectedIds={['r0c0', 'r2c3']}
        onToggleCell={jest.fn()}
      />,
    );
    expect(getByTestId('g07-cell-r0c0').props.accessibilityState.checked).toBe(true);
    expect(getByTestId('g07-cell-r2c3').props.accessibilityState.checked).toBe(true);
    expect(getByTestId('g07-cell-r0c1').props.accessibilityState.checked).toBe(false);
  });

  it('セルタップ → onToggleCell が当該 id で呼ばれる', () => {
    const patches = makeSeedPatches();
    const onToggle = jest.fn();
    const { getByTestId } = render(
      <GaborGridStimulus
        patches={patches}
        cellSizePx={64}
        gapPx={12}
        viewingDistanceCm={40}
        selectedIds={[]}
        onToggleCell={onToggle}
      />,
    );
    fireEvent.press(getByTestId('g07-cell-r1c2'));
    expect(onToggle).toHaveBeenCalledWith('r1c2');
  });

  it('複数セル選択：3 個タップで onToggleCell が 3 回呼ばれる（複数選択可）', () => {
    const patches = makeSeedPatches();
    const onToggle = jest.fn();
    const { getByTestId } = render(
      <GaborGridStimulus
        patches={patches}
        cellSizePx={64}
        gapPx={12}
        viewingDistanceCm={40}
        selectedIds={[]}
        onToggleCell={onToggle}
      />,
    );
    fireEvent.press(getByTestId('g07-cell-r0c0'));
    fireEvent.press(getByTestId('g07-cell-r0c1'));
    fireEvent.press(getByTestId('g07-cell-r0c2'));
    expect(onToggle).toHaveBeenCalledTimes(3);
    expect(onToggle).toHaveBeenNthCalledWith(1, 'r0c0');
    expect(onToggle).toHaveBeenNthCalledWith(2, 'r0c1');
    expect(onToggle).toHaveBeenNthCalledWith(3, 'r0c2');
  });

  it('既選択セルを再タップ → onToggleCell が呼ばれる（解除は親側で集合管理）', () => {
    const patches = makeSeedPatches();
    const onToggle = jest.fn();
    const { getByTestId } = render(
      <GaborGridStimulus
        patches={patches}
        cellSizePx={64}
        gapPx={12}
        viewingDistanceCm={40}
        selectedIds={['r0c0']}
        onToggleCell={onToggle}
      />,
    );
    fireEvent.press(getByTestId('g07-cell-r0c0'));
    expect(onToggle).toHaveBeenCalledWith('r0c0');
  });

  it('disabled=true なら全セルが disabled', () => {
    const patches = makeSeedPatches();
    const { getByTestId } = render(
      <GaborGridStimulus
        patches={patches}
        cellSizePx={64}
        gapPx={12}
        viewingDistanceCm={40}
        selectedIds={[]}
        onToggleCell={jest.fn()}
        disabled
      />,
    );
    expect(
      getByTestId('g07-cell-r0c0').props.accessibilityState.disabled,
    ).toBe(true);
    expect(
      getByTestId('g07-cell-r3c3').props.accessibilityState.disabled,
    ).toBe(true);
  });

  it('highlightIds で該当セルが「選択中」表示になる（黄 4px 枠）', () => {
    const patches = makeSeedPatches();
    const { getByTestId } = render(
      <GaborGridStimulus
        patches={patches}
        cellSizePx={64}
        gapPx={12}
        viewingDistanceCm={40}
        selectedIds={[]}
        onToggleCell={jest.fn()}
        highlightIds={['r0c0', 'r1c1', 'r2c2']}
      />,
    );
    // ImageChoiceCell の isSelected が true になり accessibilityState.checked=true
    expect(getByTestId('g07-cell-r0c0').props.accessibilityState.checked).toBe(true);
    expect(getByTestId('g07-cell-r1c1').props.accessibilityState.checked).toBe(true);
    expect(getByTestId('g07-cell-r2c2').props.accessibilityState.checked).toBe(true);
    expect(getByTestId('g07-cell-r0c1').props.accessibilityState.checked).toBe(false);
  });

  it('selectedIds と highlightIds が同時に渡されたら両方とも「選択中」', () => {
    const patches = makeSeedPatches();
    const { getByTestId } = render(
      <GaborGridStimulus
        patches={patches}
        cellSizePx={64}
        gapPx={12}
        viewingDistanceCm={40}
        selectedIds={['r0c0']}
        onToggleCell={jest.fn()}
        highlightIds={['r2c2']}
      />,
    );
    expect(getByTestId('g07-cell-r0c0').props.accessibilityState.checked).toBe(true);
    expect(getByTestId('g07-cell-r2c2').props.accessibilityState.checked).toBe(true);
  });

  it('groupAriaLabel が指定されていれば反映される', () => {
    const patches = makeSeedPatches();
    const { getByTestId } = render(
      <GaborGridStimulus
        patches={patches}
        cellSizePx={64}
        gapPx={12}
        viewingDistanceCm={40}
        selectedIds={[]}
        onToggleCell={jest.fn()}
        groupAriaLabel="カスタムラベル"
        testId="custom-grid"
      />,
    );
    expect(getByTestId('custom-grid').props.accessibilityLabel).toBe(
      'カスタムラベル',
    );
  });

  it('groupAriaLabel 未指定なら既定文面が入る', () => {
    const patches = makeSeedPatches();
    const { getByTestId } = render(
      <GaborGridStimulus
        patches={patches}
        cellSizePx={64}
        gapPx={12}
        viewingDistanceCm={40}
        selectedIds={[]}
        onToggleCell={jest.fn()}
      />,
    );
    expect(getByTestId('gabor-grid-stimulus').props.accessibilityLabel).toMatch(
      /4×4|3 個|線|盤面/,
    );
  });

  it('各セルの aria-label が「縞模様 N 行 M 列」形式', () => {
    const patches = makeSeedPatches();
    const { getByTestId } = render(
      <GaborGridStimulus
        patches={patches}
        cellSizePx={64}
        gapPx={12}
        viewingDistanceCm={40}
        selectedIds={[]}
        onToggleCell={jest.fn()}
      />,
    );
    expect(
      getByTestId('g07-cell-r0c0').props.accessibilityLabel,
    ).toBe('縞模様 1 行 1 列');
    expect(
      getByTestId('g07-cell-r2c3').props.accessibilityLabel,
    ).toBe('縞模様 3 行 4 列');
  });

  it('disabled=true でもタップを onToggleCell に通さない（ImageChoiceCell の disabled 動作）', () => {
    const patches = makeSeedPatches();
    const onToggle = jest.fn();
    const { getByTestId } = render(
      <GaborGridStimulus
        patches={patches}
        cellSizePx={64}
        gapPx={12}
        viewingDistanceCm={40}
        selectedIds={[]}
        onToggleCell={onToggle}
        disabled
      />,
    );
    fireEvent.press(getByTestId('g07-cell-r0c0'));
    expect(onToggle).not.toHaveBeenCalled();
  });
});
