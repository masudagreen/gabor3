/**
 * CourseStartScreen — S18-01 受け入れテスト。
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CourseStartScreen } from '../../../../src/screens/v11/course/CourseStartScreen';
import { GAME_REGISTRY } from '../../../../src/state/gameRegistry';

describe('CourseStartScreen', () => {
  it('enabled な全ゲームが含まれるリストが表示される（v1.1.4：9 ゲーム）', () => {
    const { getByTestId, queryByTestId } = render(
      <CourseStartScreen onStart={() => {}} onCancel={() => {}} />,
    );
    for (const g of GAME_REGISTRY) {
      if (g.releaseEnabled) {
        expect(getByTestId(`course-start-row-${g.gameId}`)).toBeTruthy();
      } else {
        expect(queryByTestId(`course-start-row-${g.gameId}`)).toBeNull();
      }
    }
  });

  it('「約 N 分」が動的計算（v1.1.4：9 ゲームで 11 分目安）', () => {
    const { getByText } = render(
      <CourseStartScreen onStart={() => {}} onCancel={() => {}} />,
    );
    // 9 ゲーム → 3 + 9*60 + 9*10 + 10 = 643 秒 ≒ 11 分
    expect(getByText(/約\s*11\s*分/)).toBeTruthy();
  });

  it('enabled が縮小（7 ゲーム）でもラベルが動的に変わる', () => {
    const trimmed = GAME_REGISTRY.slice(0, 7);
    const { getByText } = render(
      <CourseStartScreen
        onStart={() => {}}
        onCancel={() => {}}
        enabledGamesForTest={trimmed}
      />,
    );
    // 7 ゲーム → 3 + 7*60 + 7*10 + 10 = 503 秒 ≒ 8 分
    expect(getByText(/約\s*8\s*分/)).toBeTruthy();
  });

  it('「はじめる」タップで onStart 発火', () => {
    const onStart = jest.fn();
    const { getByTestId } = render(
      <CourseStartScreen onStart={onStart} onCancel={() => {}} />,
    );
    fireEvent.press(getByTestId('course-start-begin'));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('「キャンセル」タップで onCancel 発火', () => {
    const onCancel = jest.fn();
    const { getByTestId } = render(
      <CourseStartScreen onStart={() => {}} onCancel={onCancel} />,
    );
    fireEvent.press(getByTestId('course-start-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('× アイコンタップで onCancel 発火', () => {
    const onCancel = jest.fn();
    const { getByTestId } = render(
      <CourseStartScreen onStart={() => {}} onCancel={onCancel} />,
    );
    fireEvent.press(getByTestId('course-start-cancel-icon'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('ゲーム 0 件でも crash しない（防御）', () => {
    const { getByTestId } = render(
      <CourseStartScreen
        onStart={() => {}}
        onCancel={() => {}}
        enabledGamesForTest={[]}
      />,
    );
    // 「はじめる」ボタンは存在
    expect(getByTestId('course-start-begin')).toBeTruthy();
  });
});
