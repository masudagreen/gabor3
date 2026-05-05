/**
 * SideBySideStimulus — GE-02 受け入れテスト（components.md §16、screens.md S10-02）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SideBySideStimulus } from '../../../../src/components/v11/games/SideBySideStimulus';
import { G02GaborSpec } from '../../../../src/lib/v11/g02Trial';

const LEFT: G02GaborSpec = {
  cpd: 3,
  contrast: 0.3,
  sigmaDeg: 0.6,
  orientationDeg: 60,
  phaseRad: 0,
};
const RIGHT: G02GaborSpec = {
  cpd: 3,
  contrast: 0.3,
  sigmaDeg: 0.6,
  orientationDeg: 54,
  phaseRad: 0,
};

describe('SideBySideStimulus: GE-02', () => {
  it('左右 2 つのパッチを描画する', () => {
    const { getByTestId } = render(
      <SideBySideStimulus
        left={LEFT}
        right={RIGHT}
        patchSizePx={120}
        gapPx={32}
        viewingDistanceCm={40}
        selectedSide={null}
        onSelectSide={jest.fn()}
      />,
    );
    expect(getByTestId('g02-stimulus-left')).toBeTruthy();
    expect(getByTestId('g02-stimulus-right')).toBeTruthy();
  });

  it('左パッチタップで onSelectSide("left") が呼ばれる', () => {
    const onSelectSide = jest.fn();
    const { getByTestId } = render(
      <SideBySideStimulus
        left={LEFT}
        right={RIGHT}
        patchSizePx={120}
        gapPx={32}
        viewingDistanceCm={40}
        selectedSide={null}
        onSelectSide={onSelectSide}
      />,
    );
    fireEvent.press(getByTestId('g02-stimulus-left'));
    expect(onSelectSide).toHaveBeenCalledWith('left');
  });

  it('左パッチを再タップ（selectedSide=left）で null（解除）が渡る', () => {
    const onSelectSide = jest.fn();
    const { getByTestId } = render(
      <SideBySideStimulus
        left={LEFT}
        right={RIGHT}
        patchSizePx={120}
        gapPx={32}
        viewingDistanceCm={40}
        selectedSide="left"
        onSelectSide={onSelectSide}
      />,
    );
    fireEvent.press(getByTestId('g02-stimulus-left'));
    expect(onSelectSide).toHaveBeenCalledWith(null);
  });

  it('左選択中に右パッチをタップで「right」が渡る（切替）', () => {
    const onSelectSide = jest.fn();
    const { getByTestId } = render(
      <SideBySideStimulus
        left={LEFT}
        right={RIGHT}
        patchSizePx={120}
        gapPx={32}
        viewingDistanceCm={40}
        selectedSide="left"
        onSelectSide={onSelectSide}
      />,
    );
    fireEvent.press(getByTestId('g02-stimulus-right'));
    expect(onSelectSide).toHaveBeenCalledWith('right');
  });

  it('selectedSide="left" のとき左セルの accessibilityState.checked=true', () => {
    const { getByTestId } = render(
      <SideBySideStimulus
        left={LEFT}
        right={RIGHT}
        patchSizePx={120}
        gapPx={32}
        viewingDistanceCm={40}
        selectedSide="left"
        onSelectSide={jest.fn()}
      />,
    );
    expect(
      getByTestId('g02-stimulus-left').props.accessibilityState.checked,
    ).toBe(true);
    expect(
      getByTestId('g02-stimulus-right').props.accessibilityState.checked,
    ).toBe(false);
  });

  it('selectedSide を left → right と更新すると aria-checked が動的に追従（M-1）', () => {
    const { getByTestId, rerender } = render(
      <SideBySideStimulus
        left={LEFT}
        right={RIGHT}
        patchSizePx={120}
        gapPx={32}
        viewingDistanceCm={40}
        selectedSide="left"
        onSelectSide={jest.fn()}
      />,
    );
    expect(
      getByTestId('g02-stimulus-left').props.accessibilityState.checked,
    ).toBe(true);
    rerender(
      <SideBySideStimulus
        left={LEFT}
        right={RIGHT}
        patchSizePx={120}
        gapPx={32}
        viewingDistanceCm={40}
        selectedSide="right"
        onSelectSide={jest.fn()}
      />,
    );
    expect(
      getByTestId('g02-stimulus-left').props.accessibilityState.checked,
    ).toBe(false);
    expect(
      getByTestId('g02-stimulus-right').props.accessibilityState.checked,
    ).toBe(true);
  });

  it('disabled=true で onSelectSide が呼ばれない', () => {
    const onSelectSide = jest.fn();
    const { getByTestId } = render(
      <SideBySideStimulus
        left={LEFT}
        right={RIGHT}
        patchSizePx={120}
        gapPx={32}
        viewingDistanceCm={40}
        selectedSide={null}
        onSelectSide={onSelectSide}
        disabled
      />,
    );
    fireEvent.press(getByTestId('g02-stimulus-left'));
    expect(onSelectSide).not.toHaveBeenCalled();
  });

  it('accessibilityRole は radio（2 択）', () => {
    const { getByTestId } = render(
      <SideBySideStimulus
        left={LEFT}
        right={RIGHT}
        patchSizePx={120}
        gapPx={32}
        viewingDistanceCm={40}
        selectedSide={null}
        onSelectSide={jest.fn()}
      />,
    );
    expect(
      getByTestId('g02-stimulus-left').props.accessibilityRole,
    ).toBe('radio');
    expect(
      getByTestId('g02-stimulus-right').props.accessibilityRole,
    ).toBe('radio');
  });

  // Sprint 10 修正ラウンド 2 / G-3 修正：1.5 秒拡大ハイライト演出
  it('highlightSide="left" を渡すと左パッチに Animated.View ラッパー（g02-stimulus-left-anim）が付与される', () => {
    const { getByTestId } = render(
      <SideBySideStimulus
        left={LEFT}
        right={RIGHT}
        patchSizePx={120}
        gapPx={32}
        viewingDistanceCm={40}
        selectedSide={null}
        onSelectSide={jest.fn()}
        highlightSide="left"
      />,
    );
    expect(getByTestId('g02-stimulus-left-anim')).toBeTruthy();
    expect(getByTestId('g02-stimulus-right-anim')).toBeTruthy();
  });

  it('highlightSide が指定されると正解側セルが選択中扱いになる（黄 4px 枠）', () => {
    const { getByTestId } = render(
      <SideBySideStimulus
        left={LEFT}
        right={RIGHT}
        patchSizePx={120}
        gapPx={32}
        viewingDistanceCm={40}
        selectedSide={null}
        onSelectSide={jest.fn()}
        highlightSide="right"
      />,
    );
    expect(
      getByTestId('g02-stimulus-right').props.accessibilityState.checked,
    ).toBe(true);
    expect(
      getByTestId('g02-stimulus-left').props.accessibilityState.checked,
    ).toBe(false);
  });

  it('highlightSide=null（プレイ中）ではどちらのセルも選択中扱いにならない', () => {
    const { getByTestId } = render(
      <SideBySideStimulus
        left={LEFT}
        right={RIGHT}
        patchSizePx={120}
        gapPx={32}
        viewingDistanceCm={40}
        selectedSide={null}
        onSelectSide={jest.fn()}
        highlightSide={null}
      />,
    );
    expect(
      getByTestId('g02-stimulus-left').props.accessibilityState.checked,
    ).toBe(false);
    expect(
      getByTestId('g02-stimulus-right').props.accessibilityState.checked,
    ).toBe(false);
  });

  it('highlightDurationMs / highlightPeakScale が prop として受理される（テスト容易化）', () => {
    const { getByTestId } = render(
      <SideBySideStimulus
        left={LEFT}
        right={RIGHT}
        patchSizePx={120}
        gapPx={32}
        viewingDistanceCm={40}
        selectedSide={null}
        onSelectSide={jest.fn()}
        highlightSide="left"
        highlightDurationMs={100}
        highlightPeakScale={1.2}
      />,
    );
    // 描画クラッシュなし
    expect(getByTestId('g02-stimulus-left-anim')).toBeTruthy();
  });

  // Sprint 13 改修：aria-label の context-aware 化
  describe('Sprint 13 改修：aria-label optional 上書き', () => {
    it('leftAriaLabel / rightAriaLabel 未指定時は GE-02 既定文面（時計回り）が使われる（後方互換）', () => {
      const { getByTestId } = render(
        <SideBySideStimulus
          left={LEFT}
          right={RIGHT}
          patchSizePx={120}
          gapPx={32}
          viewingDistanceCm={40}
          selectedSide={null}
          onSelectSide={jest.fn()}
        />,
      );
      expect(
        getByTestId('g02-stimulus-left').props.accessibilityLabel,
      ).toBe('左の縞模様（タップで「左が時計回り」と回答）');
      expect(
        getByTestId('g02-stimulus-right').props.accessibilityLabel,
      ).toBe('右の縞模様（タップで「右が時計回り」と回答）');
    });

    it('leftAriaLabel / rightAriaLabel を指定すると上書きされる（G-04 文脈：濃い）', () => {
      const { getByTestId } = render(
        <SideBySideStimulus
          left={LEFT}
          right={RIGHT}
          patchSizePx={120}
          gapPx={32}
          viewingDistanceCm={40}
          selectedSide={null}
          onSelectSide={jest.fn()}
          leftAriaLabel="左の縞模様（タップで「左が濃い」と回答）"
          rightAriaLabel="右の縞模様（タップで「右が濃い」と回答）"
        />,
      );
      expect(
        getByTestId('g02-stimulus-left').props.accessibilityLabel,
      ).toBe('左の縞模様（タップで「左が濃い」と回答）');
      expect(
        getByTestId('g02-stimulus-right').props.accessibilityLabel,
      ).toBe('右の縞模様（タップで「右が濃い」と回答）');
    });

    it('leftAriaLabel / rightAriaLabel を指定すると上書きされる（G-05 文脈：細かい）', () => {
      const { getByTestId } = render(
        <SideBySideStimulus
          left={LEFT}
          right={RIGHT}
          patchSizePx={120}
          gapPx={32}
          viewingDistanceCm={40}
          selectedSide={null}
          onSelectSide={jest.fn()}
          leftAriaLabel="左の縞模様（タップで「左が細かい」と回答）"
          rightAriaLabel="右の縞模様（タップで「右が細かい」と回答）"
        />,
      );
      expect(
        getByTestId('g02-stimulus-left').props.accessibilityLabel,
      ).toBe('左の縞模様（タップで「左が細かい」と回答）');
      expect(
        getByTestId('g02-stimulus-right').props.accessibilityLabel,
      ).toBe('右の縞模様（タップで「右が細かい」と回答）');
    });

    it('groupAriaLabel 未指定時は GE-02 既定文面（時計回り）が使われる', () => {
      const { getByTestId } = render(
        <SideBySideStimulus
          left={LEFT}
          right={RIGHT}
          patchSizePx={120}
          gapPx={32}
          viewingDistanceCm={40}
          selectedSide={null}
          onSelectSide={jest.fn()}
          testId="custom-stimulus"
        />,
      );
      expect(
        getByTestId('custom-stimulus').props.accessibilityLabel,
      ).toBe('左右の縞模様（時計回りに傾いている方を選んでください）');
    });

    it('groupAriaLabel を指定すると上書きされる', () => {
      const { getByTestId } = render(
        <SideBySideStimulus
          left={LEFT}
          right={RIGHT}
          patchSizePx={120}
          gapPx={32}
          viewingDistanceCm={40}
          selectedSide={null}
          onSelectSide={jest.fn()}
          groupAriaLabel="左右の縞模様（細かい方を選んでください）"
          testId="custom-stimulus"
        />,
      );
      expect(
        getByTestId('custom-stimulus').props.accessibilityLabel,
      ).toBe('左右の縞模様（細かい方を選んでください）');
    });

    it('左パッチだけ aria-label を上書き、右はデフォルトのまま（部分指定）', () => {
      const { getByTestId } = render(
        <SideBySideStimulus
          left={LEFT}
          right={RIGHT}
          patchSizePx={120}
          gapPx={32}
          viewingDistanceCm={40}
          selectedSide={null}
          onSelectSide={jest.fn()}
          leftAriaLabel="左パッチ・カスタム文面"
        />,
      );
      expect(
        getByTestId('g02-stimulus-left').props.accessibilityLabel,
      ).toBe('左パッチ・カスタム文面');
      // 右はデフォルトのまま
      expect(
        getByTestId('g02-stimulus-right').props.accessibilityLabel,
      ).toBe('右の縞模様（タップで「右が時計回り」と回答）');
    });
  });
});
