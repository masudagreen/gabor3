/**
 * RadialEightStimulus — GE-03 受け入れテスト（components.md §15.GE-03、screens.md S11-02）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { RadialEightStimulus } from '../../../../src/components/v11/games/RadialEightStimulus';
import { G03GaborSpec } from '../../../../src/lib/v11/g03Trial';

const PATCH = (orientationDeg: number): G03GaborSpec => ({
  cpd: 3,
  contrast: 0.5,
  sigmaDeg: 0.6,
  orientationDeg,
  phaseRad: 0,
});

const PATCHES_8: G03GaborSpec[] = [
  PATCH(45),
  PATCH(45),
  PATCH(45), // odd one at idx=2 in some tests
  PATCH(45),
  PATCH(45),
  PATCH(45),
  PATCH(45),
  PATCH(45),
];

describe('RadialEightStimulus: GE-03', () => {
  it('8 個のスロットを描画する', () => {
    const { getByTestId } = render(
      <RadialEightStimulus
        patches={PATCHES_8}
        framePx={320}
        patchSizePx={56}
        eccentricityDeg={8}
        viewingDistanceCm={40}
        selectedClockPosition={null}
        onSelectClockPosition={jest.fn()}
      />,
    );
    for (let i = 0; i < 8; i += 1) {
      expect(getByTestId(`g03-stimulus-slot-${i}`)).toBeTruthy();
    }
  });

  it('中央の固視点を描画する', () => {
    const { getByTestId } = render(
      <RadialEightStimulus
        patches={PATCHES_8}
        framePx={320}
        patchSizePx={56}
        eccentricityDeg={8}
        viewingDistanceCm={40}
        selectedClockPosition={null}
        onSelectClockPosition={jest.fn()}
        testId="g03-stim"
      />,
    );
    const fix = getByTestId('g03-stim-fixation');
    expect(fix).toBeTruthy();
    // RN Web 0.19+ では pointerEvents は style 経由が推奨（旧 prop は deprecated）
    // タップを通さないことを style.pointerEvents='none' で確認
    const flat = Array.isArray(fix.props.style)
      ? Object.assign({}, ...fix.props.style.filter(Boolean))
      : (fix.props.style ?? {});
    expect(flat.pointerEvents).toBe('none');
  });

  it('スロット idx=0（12 時）タップで onSelectClockPosition("12") が呼ばれる', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <RadialEightStimulus
        patches={PATCHES_8}
        framePx={320}
        patchSizePx={56}
        eccentricityDeg={8}
        viewingDistanceCm={40}
        selectedClockPosition={null}
        onSelectClockPosition={onSelect}
      />,
    );
    fireEvent.press(getByTestId('g03-stimulus-slot-0'));
    expect(onSelect).toHaveBeenCalledWith('12');
  });

  it('スロット idx=2（3 時）タップで "3" が渡る', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <RadialEightStimulus
        patches={PATCHES_8}
        framePx={320}
        patchSizePx={56}
        eccentricityDeg={8}
        viewingDistanceCm={40}
        selectedClockPosition={null}
        onSelectClockPosition={onSelect}
      />,
    );
    fireEvent.press(getByTestId('g03-stimulus-slot-2'));
    expect(onSelect).toHaveBeenCalledWith('3');
  });

  it('既に選択中のスロットを再タップで null（解除）が渡る', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <RadialEightStimulus
        patches={PATCHES_8}
        framePx={320}
        patchSizePx={56}
        eccentricityDeg={8}
        viewingDistanceCm={40}
        selectedClockPosition="3"
        onSelectClockPosition={onSelect}
      />,
    );
    fireEvent.press(getByTestId('g03-stimulus-slot-2'));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('selectedClockPosition="3" のとき idx=2 が選択中扱い（aria-checked）', () => {
    const { getByTestId } = render(
      <RadialEightStimulus
        patches={PATCHES_8}
        framePx={320}
        patchSizePx={56}
        eccentricityDeg={8}
        viewingDistanceCm={40}
        selectedClockPosition="3"
        onSelectClockPosition={jest.fn()}
      />,
    );
    const slot2 = getByTestId('g03-stimulus-slot-2');
    expect(slot2.props.accessibilityState).toMatchObject({ checked: true });
    const slot0 = getByTestId('g03-stimulus-slot-0');
    expect(slot0.props.accessibilityState).toMatchObject({ checked: false });
  });

  it('disabled=true ですべてのスロットがタップ不可（onSelect 呼ばれない）', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <RadialEightStimulus
        patches={PATCHES_8}
        framePx={320}
        patchSizePx={56}
        eccentricityDeg={8}
        viewingDistanceCm={40}
        selectedClockPosition={null}
        onSelectClockPosition={onSelect}
        disabled
      />,
    );
    fireEvent.press(getByTestId('g03-stimulus-slot-0'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('correctIndexHighlight=2 を渡すと矢印（g03-correct-arrow）が描画される', () => {
    const { getByTestId } = render(
      <RadialEightStimulus
        patches={PATCHES_8}
        framePx={320}
        patchSizePx={56}
        eccentricityDeg={8}
        viewingDistanceCm={40}
        selectedClockPosition={null}
        onSelectClockPosition={jest.fn()}
        correctIndexHighlight={2}
      />,
    );
    expect(getByTestId('g03-correct-arrow')).toBeTruthy();
  });

  it('correctIndexHighlight 未指定時は矢印が描画されない', () => {
    const { queryByTestId } = render(
      <RadialEightStimulus
        patches={PATCHES_8}
        framePx={320}
        patchSizePx={56}
        eccentricityDeg={8}
        viewingDistanceCm={40}
        selectedClockPosition={null}
        onSelectClockPosition={jest.fn()}
      />,
    );
    expect(queryByTestId('g03-correct-arrow')).toBeNull();
  });

  it('frame の width/height は framePx に等しい', () => {
    const { getByTestId } = render(
      <RadialEightStimulus
        patches={PATCHES_8}
        framePx={400}
        patchSizePx={64}
        eccentricityDeg={8}
        viewingDistanceCm={40}
        selectedClockPosition={null}
        onSelectClockPosition={jest.fn()}
        testId="g03-stim"
      />,
    );
    const frame = getByTestId('g03-stim');
    const flat = Array.isArray(frame.props.style)
      ? Object.assign({}, ...frame.props.style.flat(Infinity))
      : frame.props.style;
    expect(flat.width).toBe(400);
    expect(flat.height).toBe(400);
  });

  it('正解開示時は対象スロットも選択中扱い（黄 4px 枠の表示用 isSelected=true）', () => {
    const { getByTestId } = render(
      <RadialEightStimulus
        patches={PATCHES_8}
        framePx={320}
        patchSizePx={56}
        eccentricityDeg={8}
        viewingDistanceCm={40}
        selectedClockPosition={null}
        onSelectClockPosition={jest.fn()}
        correctIndexHighlight={4}
      />,
    );
    const slot4 = getByTestId('g03-stimulus-slot-4');
    expect(slot4.props.accessibilityState).toMatchObject({ checked: true });
  });
});
