/**
 * MetricCard — MC-1 受け入れテスト（components.md §7）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { render } from '@testing-library/react-native';
import { MetricCard } from '../../../src/components/v11/MetricCard';

describe('MetricCard: MC-1', () => {
  it('label / value / unit を表示', () => {
    const { getByText } = render(
      <MetricCard label="今回の閾値" value="5.0" unit="角度差" />,
    );
    expect(getByText('今回の閾値')).toBeTruthy();
    expect(getByText('5.0')).toBeTruthy();
    expect(getByText('角度差')).toBeTruthy();
  });

  it('diff が undefined のとき「初回測定」を表示', () => {
    const { getByText } = render(
      <MetricCard label="前回比" value="—" />,
    );
    expect(getByText('初回測定')).toBeTruthy();
  });

  it('diff.direction=improved で「改善」を含む', () => {
    const { getByText } = render(
      <MetricCard
        label="前回比"
        value="-0.3"
        diff={{ sign: '-', magnitude: '0.3', direction: 'improved' }}
      />,
    );
    expect(getByText(/改善/)).toBeTruthy();
  });

  it('diff.direction=worsened で「やや低下」を含む', () => {
    const { getByText } = render(
      <MetricCard
        label="前回比"
        value="+0.5"
        diff={{ sign: '+', magnitude: '0.5', direction: 'worsened' }}
      />,
    );
    expect(getByText(/やや低下/)).toBeTruthy();
  });

  it('diff.direction=flat で「同等」を含む', () => {
    const { getByText } = render(
      <MetricCard
        label="前回比"
        value="0"
        diff={{ sign: '0', magnitude: '0.0', direction: 'flat' }}
      />,
    );
    expect(getByText(/同等/)).toBeTruthy();
  });

  it('aria-label に label / value が含まれる', () => {
    const { getByTestId } = render(
      <MetricCard
        label="今回の閾値"
        value="5.0"
        unit="角度差"
        diff={{ sign: '-', magnitude: '0.3', direction: 'improved' }}
      />,
    );
    const card = getByTestId('metric-card');
    expect(card.props.accessibilityLabel).toMatch(/今回の閾値/);
    expect(card.props.accessibilityLabel).toMatch(/5\.0/);
    expect(card.props.accessibilityLabel).toMatch(/改善/);
  });

  // ---- Sprint 10 / m-3：showInitialMeasurementHint=false で「初回測定」を出さない ----
  it('showInitialMeasurementHint=false かつ diff=undefined では「初回測定」を表示しない', () => {
    const { queryByText } = render(
      <MetricCard
        label="今回の閾値"
        value="5.0"
        unit="角度差"
        showInitialMeasurementHint={false}
      />,
    );
    expect(queryByText('初回測定')).toBeNull();
  });

  it('showInitialMeasurementHint=false の aria-label にも「初回測定」を含めない', () => {
    const { getByTestId } = render(
      <MetricCard
        label="今回の閾値"
        value="5.0"
        unit="角度差"
        showInitialMeasurementHint={false}
      />,
    );
    expect(getByTestId('metric-card').props.accessibilityLabel).not.toMatch(/初回測定/);
  });
});
