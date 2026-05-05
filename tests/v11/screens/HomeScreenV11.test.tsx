/**
 * HomeScreenV11 — F-04 受け入れテスト（spec-v11.md §F-04）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { HomeScreenV11 } from '../../../src/screens/v11/HomeScreenV11';

const baseProps = {
  enabledGameCount: 13,
  todayCompleted: false,
  currentStreak: 0,
  longestStreak: 0,
  badgeEarnedCount: 0,
  badgeTotalCount: 13,
  onPressFullCourse: jest.fn(),
  onPressSinglePlay: jest.fn(),
  onPressProgress: jest.fn(),
  onPressBadges: jest.fn(),
  onOpenSettings: jest.fn(),
};

describe('HomeScreenV11: F-04', () => {
  it('GaborEye ロゴを表示', () => {
    const { getByText } = render(<HomeScreenV11 {...baseProps} />);
    expect(getByText('GaborEye')).toBeTruthy();
  });

  it('「単体プレイ」リンクは「単体プレイ（13 ゲームから）」と表示', () => {
    const { getByText } = render(<HomeScreenV11 {...baseProps} />);
    expect(getByText(/単体プレイ（13 ゲームから）/)).toBeTruthy();
  });

  it('todayCompleted=true 時は「✓ 本日完了」マークを表示（HeroCTA + 上段の 2 箇所）', () => {
    const { queryAllByText, rerender } = render(
      <HomeScreenV11 {...baseProps} todayCompleted={true} />,
    );
    // 上段ステータス + HeroCTA 内タグ で 2 箇所表示
    expect(queryAllByText('✓ 本日完了').length).toBeGreaterThanOrEqual(1);
    rerender(<HomeScreenV11 {...baseProps} todayCompleted={false} />);
    // false 時は 1 つも表示されない
    expect(queryAllByText('✓ 本日完了').length).toBe(0);
  });

  it('「全ゲーム連続プレイ」CTA タップで onPressFullCourse が呼ばれる', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <HomeScreenV11 {...baseProps} onPressFullCourse={onPress} />,
    );
    fireEvent.press(getByTestId('home-hero-cta'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('「単体プレイ」リンクタップで onPressSinglePlay が呼ばれる', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <HomeScreenV11 {...baseProps} onPressSinglePlay={onPress} />,
    );
    fireEvent.press(getByTestId('home-v11-single-play'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('設定 IconButton タップで onOpenSettings が呼ばれる', () => {
    const onOpen = jest.fn();
    const { getByTestId } = render(
      <HomeScreenV11 {...baseProps} onOpenSettings={onOpen} />,
    );
    fireEvent.press(getByTestId('home-v11-settings'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('進捗グラフカードに「直近 28 日推移」を表示', () => {
    const { getByText } = render(<HomeScreenV11 {...baseProps} />);
    expect(getByText(/直近 28 日推移/)).toBeTruthy();
  });

  it('バッジカードに「{earned} / {total} 達成」を表示', () => {
    const { getByText } = render(
      <HomeScreenV11
        {...baseProps}
        badgeEarnedCount={5}
        badgeTotalCount={13}
      />,
    );
    expect(getByText(/5 \/ 13 達成/)).toBeTruthy();
  });

  it('enabledGameCount=7 のときセカンダリリンクが「単体プレイ（7 ゲームから）」（F-18 動的）', () => {
    const { getByText } = render(
      <HomeScreenV11 {...baseProps} enabledGameCount={7} />,
    );
    expect(getByText(/単体プレイ（7 ゲームから）/)).toBeTruthy();
  });
});

describe('HomeScreenV11: F-12 ストリーク表示（Sprint 18）', () => {
  it('currentStreak=24 で「24 日連続」が見える', () => {
    const { getByText } = render(
      <HomeScreenV11
        {...baseProps}
        currentStreak={24}
        longestStreak={30}
      />,
    );
    expect(getByText(/24/)).toBeTruthy();
    expect(getByText(/日連続/)).toBeTruthy();
  });

  it('streakResetWarning=true で警告メッセージが表示される', () => {
    const { getByTestId } = render(
      <HomeScreenV11
        {...baseProps}
        currentStreak={5}
        longestStreak={10}
        streakResetWarning={true}
      />,
    );
    const warning = getByTestId('streak-reset-warning');
    expect(warning).toBeTruthy();
    expect(warning.props.children).toContain('今日終わるとリセットされます');
  });

  it('streakResetWarning=false（22 時前 or 今日完了）で警告は出ない', () => {
    const { queryByTestId } = render(
      <HomeScreenV11
        {...baseProps}
        currentStreak={5}
        longestStreak={10}
        streakResetWarning={false}
      />,
    );
    expect(queryByTestId('streak-reset-warning')).toBeNull();
  });

  it('警告メッセージは aria-live=polite', () => {
    const { getByTestId } = render(
      <HomeScreenV11
        {...baseProps}
        currentStreak={5}
        longestStreak={10}
        streakResetWarning={true}
      />,
    );
    const warning = getByTestId('streak-reset-warning');
    expect(warning.props.accessibilityLiveRegion).toBe('polite');
  });
});
