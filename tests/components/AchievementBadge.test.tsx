/**
 * AchievementBadge の表示テスト（components.md §25 / screens.md S6-01）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { AchievementBadge } from '../../src/components/AchievementBadge';

describe('AchievementBadge', () => {
  it('earned=true：「獲得済」 + 獲得日付を表示し、a11y ラベルに「獲得済」', () => {
    const { getByTestId, getByText } = render(
      <AchievementBadge
        badgeId="B-01"
        earned
        earnedAt="2026-04-29T12:00:00.000Z"
        onPress={jest.fn()}
        testId="badge-B-01"
      />,
    );
    const card = getByTestId('badge-B-01');
    expect(card.props.accessibilityLabel).toContain('獲得済');
    expect(card.props.accessibilityLabel).toContain('はじめの一歩');
    // 「獲得済 4/29」のような表記
    expect(getByText(/獲得済/)).toBeTruthy();
  });

  it('earned=false：ヒント文言を表示し、a11y ラベルに「未獲得」', () => {
    const { getByTestId, getByText } = render(
      <AchievementBadge
        badgeId="B-03"
        earned={false}
        hint="あと 4 日"
        onPress={jest.fn()}
        testId="badge-B-03"
      />,
    );
    const card = getByTestId('badge-B-03');
    expect(card.props.accessibilityLabel).toContain('未獲得');
    expect(getByText('あと 4 日')).toBeTruthy();
  });

  it('タップで onPress が呼ばれる', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <AchievementBadge
        badgeId="B-05"
        earned={false}
        hint="累計 50 試行 / 100 試行"
        onPress={onPress}
        testId="badge-B-05"
      />,
    );
    fireEvent.press(getByTestId('badge-B-05'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
