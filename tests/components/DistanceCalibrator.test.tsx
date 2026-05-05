/**
 * DistanceCalibrator 単体テスト（components.md §11 / screens.md S4-04）。
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { DistanceCalibrator } from '../../src/components/DistanceCalibrator';

describe('DistanceCalibrator', () => {
  it('30 / 40 / 50cm の 3 ノッチがすべて描画される', () => {
    const { getByTestId } = render(
      <DistanceCalibrator value={40} onChange={() => {}} />,
    );
    expect(getByTestId('distance-notch-30')).toBeTruthy();
    expect(getByTestId('distance-notch-40')).toBeTruthy();
    expect(getByTestId('distance-notch-50')).toBeTruthy();
  });

  it('現在値（value）に対応するノッチが selected', () => {
    const { getByTestId } = render(
      <DistanceCalibrator value={50} onChange={() => {}} />,
    );
    const n50 = getByTestId('distance-notch-50');
    const n40 = getByTestId('distance-notch-40');
    expect(n50.props.accessibilityState?.selected).toBe(true);
    expect(n40.props.accessibilityState?.selected).toBe(false);
  });

  it('別ノッチをタップすると onChange が呼ばれる（30 / 50 切替）', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <DistanceCalibrator value={40} onChange={onChange} />,
    );
    fireEvent.press(getByTestId('distance-notch-30'));
    expect(onChange).toHaveBeenCalledWith(30);

    fireEvent.press(getByTestId('distance-notch-50'));
    expect(onChange).toHaveBeenCalledWith(50);
  });

  it('現在の距離が aria-live で読み上げられるラベルに反映', () => {
    const { getByTestId, rerender } = render(
      <DistanceCalibrator value={40} onChange={() => {}} />,
    );
    expect(getByTestId('distance-current').props.children).toEqual([
      '現在の距離：',
      40,
      ' cm',
    ]);

    rerender(<DistanceCalibrator value={30} onChange={() => {}} />);
    expect(getByTestId('distance-current').props.children).toEqual([
      '現在の距離：',
      30,
      ' cm',
    ]);
  });

  it('showPreview=true でサンプルガボールが描画される', () => {
    const { getByTestId, queryByTestId, rerender } = render(
      <DistanceCalibrator value={40} onChange={() => {}} />,
    );
    expect(queryByTestId('distance-preview')).toBeNull();

    rerender(
      <DistanceCalibrator value={40} onChange={() => {}} showPreview />,
    );
    expect(getByTestId('distance-preview')).toBeTruthy();
    expect(getByTestId('distance-preview-patch')).toBeTruthy();
  });
});
