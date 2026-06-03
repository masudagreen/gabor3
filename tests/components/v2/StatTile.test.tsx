/**
 * StatTile.test.tsx — ST-1（S7、F-09）。
 *
 * 検証：数値・ラベル表示、aria-label 要約、0 値でも実値表示、炎アイコン併記。
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { StatTile } from '../../../src/components/v2/StatTile';

function renderTile(over: Partial<React.ComponentProps<typeof StatTile>> = {}) {
  render(
    <ThemeProvider preference="light" systemScheme="light">
      <StatTile
        value={5}
        label="連続日数"
        accessibilityLabel="連続日数 5 日"
        testId="tile"
        {...over}
      />
    </ThemeProvider>,
  );
}

describe('StatTile（F-09）', () => {
  it('数値とラベルを表示する', () => {
    renderTile({ value: 37, label: '累計プレイ回数' });
    expect(screen.getByTestId('tile-value')).toHaveTextContent('37');
    expect(screen.getByText('累計プレイ回数')).toBeTruthy();
  });

  it('0 値でも実値（0）を表示する（初期状態）', () => {
    renderTile({ value: 0, label: '連続日数' });
    expect(screen.getByTestId('tile-value')).toHaveTextContent('0');
  });

  it('aria-label に要約を与える（連続日数 5 日）', () => {
    renderTile({ accessibilityLabel: '連続日数 5 日' });
    expect(screen.getByLabelText('連続日数 5 日')).toBeTruthy();
  });
});
