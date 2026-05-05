/**
 * HomeScreen の主要動作テスト（screens.md S2-01）。
 *
 * - Game 1 / 2 のカードタップで onStartGame が呼ばれる
 * - 「3 分コースを始める」プライマリ CTA タップで onStartCourse が呼ばれる
 * - Game 3 カードは aria-disabled、tabindex=-1 相当（focusable=false）、
 *   accessibilityState.disabled=true で disabled として描画される
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { HomeScreen } from '../../src/screens/HomeScreen';

describe('HomeScreen', () => {
  it('「3 分コースを始める」プライマリ CTA で onStartCourse が呼ばれる', () => {
    const onStartCourse = jest.fn();
    const onStartGame = jest.fn();
    const onOpenSettings = jest.fn();

    const { getByTestId } = render(
      <HomeScreen
        onStartCourse={onStartCourse}
        onStartGame={onStartGame}
        onOpenSettings={onOpenSettings}
      />,
    );

    fireEvent.press(getByTestId('home-start-course'));
    expect(onStartCourse).toHaveBeenCalledTimes(1);
    expect(onStartGame).not.toHaveBeenCalled();
  });

  it('Game 1 / Game 2 / Game 3 カードタップで onStartGame が呼ばれる', () => {
    const onStartCourse = jest.fn();
    const onStartGame = jest.fn();
    const onOpenSettings = jest.fn();

    const { getByTestId } = render(
      <HomeScreen
        onStartCourse={onStartCourse}
        onStartGame={onStartGame}
        onOpenSettings={onOpenSettings}
      />,
    );

    fireEvent.press(getByTestId('home-game1-card'));
    expect(onStartGame).toHaveBeenCalledWith('game1');

    fireEvent.press(getByTestId('home-game2-card'));
    expect(onStartGame).toHaveBeenCalledWith('game2');

    fireEvent.press(getByTestId('home-game3-card'));
    expect(onStartGame).toHaveBeenCalledWith('game3');
  });

  it('Sprint 3：Game 3 カードは enabled で描画され、「準備中」チップを含まない', () => {
    const { getByTestId, queryByText } = render(
      <HomeScreen
        onStartCourse={jest.fn()}
        onStartGame={jest.fn()}
        onOpenSettings={jest.fn()}
      />,
    );

    const game3Card = getByTestId('home-game3-card');
    // accessibilityLabel に「準備中」を含まない
    expect(game3Card.props.accessibilityLabel ?? '').not.toContain('準備中');
    // disabled 状態でない（aria-disabled が無いか false）
    const a11yState = game3Card.props.accessibilityState;
    if (a11yState) {
      expect(a11yState.disabled).not.toBe(true);
    }
    // 「準備中」テキストが画面のどこにも無い
    expect(queryByText('準備中')).toBeNull();
  });

  it('todayCompleted=true で「今日のトレーニング完了」セクションが表示される', () => {
    const { queryByText } = render(
      <HomeScreen
        onStartCourse={jest.fn()}
        onStartGame={jest.fn()}
        onOpenSettings={jest.fn()}
        todayCompleted
      />,
    );
    expect(queryByText(/今日のトレーニング完了/)).toBeTruthy();
    expect(queryByText(/もう一度 3 分コース/)).toBeTruthy();
  });

  it('設定アイコンタップで onOpenSettings が呼ばれる', () => {
    const onOpenSettings = jest.fn();
    const { getByTestId } = render(
      <HomeScreen
        onStartCourse={jest.fn()}
        onStartGame={jest.fn()}
        onOpenSettings={onOpenSettings}
      />,
    );
    fireEvent.press(getByTestId('home-open-settings'));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('Sprint 6：バッジ一覧／日次ベストボタンが onOpenBadges / onOpenDailyBest を呼ぶ', () => {
    const onOpenBadges = jest.fn();
    const onOpenDailyBest = jest.fn();
    const { getByTestId } = render(
      <HomeScreen
        onStartCourse={jest.fn()}
        onStartGame={jest.fn()}
        onOpenSettings={jest.fn()}
        onOpenBadges={onOpenBadges}
        onOpenDailyBest={onOpenDailyBest}
      />,
    );
    fireEvent.press(getByTestId('home-open-badges'));
    expect(onOpenBadges).toHaveBeenCalledTimes(1);
    fireEvent.press(getByTestId('home-open-daily-best'));
    expect(onOpenDailyBest).toHaveBeenCalledTimes(1);
  });

  it('Sprint 6：currentStreak / longestStreak / streakResetWarning が StreakBadge に渡る', () => {
    const { getByTestId, queryByTestId } = render(
      <HomeScreen
        onStartCourse={jest.fn()}
        onStartGame={jest.fn()}
        onOpenSettings={jest.fn()}
        currentStreak={7}
        longestStreak={12}
        streakResetWarning
      />,
    );
    const streakBadge = getByTestId('home-streak-badge');
    expect(streakBadge.props.accessibilityLabel).toContain('7');
    expect(streakBadge.props.accessibilityLabel).toContain('12');
    // 警告メッセージが表示されている
    expect(queryByTestId('streak-reset-warning')).toBeTruthy();
  });
});
