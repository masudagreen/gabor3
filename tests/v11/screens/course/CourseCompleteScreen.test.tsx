/**
 * CourseCompleteScreen — S18-04 受け入れテスト。
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CourseCompleteScreen } from '../../../../src/screens/v11/course/CourseCompleteScreen';

const baseProps = {
  todayWideScore: 72,
  diffFromPrevious: 3,
  gameCount: 13,
  currentStreak: 24,
  longestStreak: 30,
  onPressProgress: () => {},
  onPressHome: () => {},
};

describe('CourseCompleteScreen', () => {
  it('お疲れさまでした 見出し', () => {
    const { getByText } = render(<CourseCompleteScreen {...baseProps} />);
    expect(getByText('お疲れさまでした')).toBeTruthy();
  });

  it('ワイドスコア表示（72）', () => {
    const { getByTestId } = render(<CourseCompleteScreen {...baseProps} />);
    const card = getByTestId('course-complete-wide-score');
    expect(card.props.accessibilityLabel).toContain('72 点');
  });

  it('前回比 +3 改善表示', () => {
    const { getByTestId } = render(<CourseCompleteScreen {...baseProps} />);
    const diff = getByTestId('course-complete-diff');
    expect(diff.props.children).toContain('改善');
  });

  it('前回比 0 → 「同等」', () => {
    const { getByTestId } = render(
      <CourseCompleteScreen {...baseProps} diffFromPrevious={0} />,
    );
    const diff = getByTestId('course-complete-diff');
    expect(diff.props.children).toContain('同等');
  });

  it('前回比 -2 → 「↓」表示', () => {
    const { getByTestId } = render(
      <CourseCompleteScreen {...baseProps} diffFromPrevious={-2} />,
    );
    const diff = getByTestId('course-complete-diff');
    expect(diff.props.children).toContain('-2');
  });

  it('前回比 null → 「初回」', () => {
    const { getByTestId } = render(
      <CourseCompleteScreen {...baseProps} diffFromPrevious={null} />,
    );
    const diff = getByTestId('course-complete-diff');
    expect(diff.props.children).toContain('初回');
  });

  it('todayWideScore=null：— 表示、ワイドスコア未集計を示す', () => {
    const { getByTestId } = render(
      <CourseCompleteScreen {...baseProps} todayWideScore={null} />,
    );
    const card = getByTestId('course-complete-wide-score');
    expect(card.props.accessibilityLabel).toContain('未集計');
  });

  it('ストリークバッジが表示される', () => {
    const { getByTestId } = render(<CourseCompleteScreen {...baseProps} />);
    expect(getByTestId('course-complete-streak')).toBeTruthy();
  });

  it('「進捗グラフを見る」タップで onPressProgress', () => {
    const onPressProgress = jest.fn();
    const { getByTestId } = render(
      <CourseCompleteScreen {...baseProps} onPressProgress={onPressProgress} />,
    );
    fireEvent.press(getByTestId('course-complete-progress'));
    expect(onPressProgress).toHaveBeenCalledTimes(1);
  });

  it('「ホームへ」タップで onPressHome', () => {
    const onPressHome = jest.fn();
    const { getByTestId } = render(
      <CourseCompleteScreen {...baseProps} onPressHome={onPressHome} />,
    );
    fireEvent.press(getByTestId('course-complete-home'));
    expect(onPressHome).toHaveBeenCalledTimes(1);
  });
});
