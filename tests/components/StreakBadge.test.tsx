/**
 * StreakBadge の表示テスト（components.md §24 / screens.md S6-04）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { render } from '@testing-library/react-native';
import { StreakBadge } from '../../src/components/StreakBadge';

describe('StreakBadge', () => {
  it('0 日：「コースを始めて、連続記録をスタート」を表示', () => {
    const { queryByText, queryByTestId } = render(
      <StreakBadge currentStreak={0} testId="streak-badge" />,
    );
    expect(queryByText(/連続記録をスタート/)).toBeTruthy();
    // 警告は表示されない
    expect(queryByTestId('streak-reset-warning')).toBeNull();
  });

  it('N 日連続：数値と「日連続」を表示し、a11y ラベルに値が含まれる', () => {
    const { getByText, getByTestId } = render(
      <StreakBadge currentStreak={23} longestStreak={30} testId="streak-badge" />,
    );
    expect(getByText('23')).toBeTruthy();
    expect(getByText('日連続')).toBeTruthy();
    const root = getByTestId('streak-badge');
    expect(root.props.accessibilityLabel).toContain('23');
    expect(root.props.accessibilityLabel).toContain('30');
  });

  it('resetWarning=true で警告メッセージと aria-live="polite" を表示', () => {
    const { getByTestId, getByText } = render(
      <StreakBadge
        currentStreak={7}
        resetWarning
        testId="streak-badge"
      />,
    );
    const warn = getByTestId('streak-reset-warning');
    expect(warn).toBeTruthy();
    expect(warn.props.accessibilityLiveRegion).toBe('polite');
    expect(getByText(/今日終わるとリセット/)).toBeTruthy();
  });

  it('resetWarning=false で警告メッセージは描画されない', () => {
    const { queryByTestId } = render(
      <StreakBadge currentStreak={7} resetWarning={false} testId="streak-badge" />,
    );
    expect(queryByTestId('streak-reset-warning')).toBeNull();
  });
});
