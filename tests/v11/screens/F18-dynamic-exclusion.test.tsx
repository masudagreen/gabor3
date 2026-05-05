/**
 * F-18 動的除外 画面横断テスト — Sprint 19 / spec-v11.md §F-18。
 *
 * 「`gameRegistry` の 1 ゲームを `releaseEnabled=false` にしたとき、ホーム /
 * コース / グラフ / バッジから動的除外されるロジック」を確認する。
 *
 * 各画面に対して `getEnabledGames` を mock して、disabled ゲームが UI から
 * 消えることを検証する。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { render } from '@testing-library/react-native';
import * as registry from '../../../src/state/gameRegistry';
import { AllGamesListScreen } from '../../../src/screens/v11/AllGamesListScreen';
import { CourseStartScreen } from '../../../src/screens/v11/course/CourseStartScreen';

describe('F-18 動的除外：単体プレイ AllGamesListScreen', () => {
  let spy: jest.SpyInstance;

  beforeEach(() => {
    // G-13 disabled
    spy = jest
      .spyOn(registry, 'getEnabledGames')
      .mockReturnValue(
        registry.GAME_REGISTRY.filter((g) => g.gameId !== 'G-13').sort(
          (a, b) => a.order - b.order,
        ),
      );
  });

  afterEach(() => {
    spy.mockRestore();
  });

  it('disabled ゲーム G-13 のカードが表示されない', () => {
    const { queryByTestId, getByTestId } = render(
      <AllGamesListScreen
        onBack={jest.fn()}
        onSelectGame={jest.fn()}
        onSelectUnimplemented={jest.fn()}
        implementedGameIds={[
          'G-01',
          'G-02',
          'G-03',
          'G-04',
          'G-05',
          'G-06',
          'G-07',
          'G-08',
          'G-09',
          'G-10',
          'G-11',
          'G-12',
          'G-13',
        ]}
      />,
    );
    expect(getByTestId('game-card-G-12')).toBeTruthy();
    expect(queryByTestId('game-card-G-13')).toBeNull();
  });
});

describe('F-18 動的除外：CourseStartScreen', () => {
  it('disabled ゲーム 3 件が含まれるゲームリストから消える', () => {
    const enabledGames = registry.GAME_REGISTRY.filter(
      (g) => !['G-11', 'G-12', 'G-13'].includes(g.gameId),
    ).sort((a, b) => a.order - b.order);
    const { queryByTestId, getByTestId } = render(
      <CourseStartScreen
        onStart={jest.fn()}
        onCancel={jest.fn()}
        enabledGamesForTest={enabledGames}
      />,
    );
    expect(getByTestId('course-start-row-G-10')).toBeTruthy();
    expect(queryByTestId('course-start-row-G-11')).toBeNull();
    expect(queryByTestId('course-start-row-G-12')).toBeNull();
    expect(queryByTestId('course-start-row-G-13')).toBeNull();
  });
});

describe('F-18 動的除外：CourseStartScreen のゲーム数表示', () => {
  it('enabled 10 件で「含まれるゲーム（10 個）」相当の文言・件数が反映', () => {
    const enabledGames = registry.GAME_REGISTRY.filter(
      (g) => !['G-11', 'G-12', 'G-13'].includes(g.gameId),
    ).sort((a, b) => a.order - b.order);
    const { getAllByTestId } = render(
      <CourseStartScreen
        onStart={jest.fn()}
        onCancel={jest.fn()}
        enabledGamesForTest={enabledGames}
      />,
    );
    // 行が 10 個
    const rows = getAllByTestId(/^course-start-row-G-/);
    expect(rows).toHaveLength(10);
  });
});
