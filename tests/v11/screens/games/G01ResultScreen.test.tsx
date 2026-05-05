/**
 * G01ResultScreen — F-10 結果サマリ受け入れテスト（screens.md S9-03）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { G01ResultScreen } from '../../../../src/screens/v11/games/G01ResultScreen';
import {
  Game1GradingResult,
  Game1TrialSpec,
} from '../../../../src/lib/game1';

function makeTrial(): Game1TrialSpec {
  return {
    config: { difficulty: 'hard', rows: 3, cols: 3, changingCount: 1 },
    patches: [
      {
        id: 'r0c0',
        row: 0,
        col: 0,
        cpd: 3,
        contrast: 0.4,
        sigmaDeg: 0.6,
        startOrientationDeg: 0,
        endOrientationDeg: 5,
        isChanging: true,
      },
      {
        id: 'r1c1',
        row: 1,
        col: 1,
        cpd: 3,
        contrast: 0.4,
        sigmaDeg: 0.6,
        startOrientationDeg: 0,
        endOrientationDeg: 0,
        isChanging: false,
      },
    ],
    maxAngleDeltaDeg: 5,
  };
}

function makeGrading(correct: boolean): Game1GradingResult {
  return correct
    ? {
        changingIds: ['r0c0'],
        correctIds: ['r0c0'],
        incorrectIds: [],
        missedIds: [],
        score: 1,
        isCorrectForStaircase: true,
      }
    : {
        changingIds: ['r0c0'],
        correctIds: [],
        incorrectIds: ['r1c1'],
        missedIds: ['r0c0'],
        score: 0,
        isCorrectForStaircase: false,
      };
}

describe('G01ResultScreen: F-10', () => {
  it('正解時：「正解は『1 列 1 行目』」「あなたの回答『1 列 1 行目』」を表示', () => {
    const { getByText } = render(
      <G01ResultScreen
        result={{
          thresholdDeg: 5.0,
          grading: makeGrading(true),
          unattempted: false,
          trial: makeTrial(),
          playedParam: 5,
          isCorrectForStaircase: true,
        }}
        selectedIds={['r0c0']}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
      />,
    );
    expect(getByText(/正解は「1 列 1 行目」/)).toBeTruthy();
    expect(getByText(/あなたの回答「1 列 1 行目」/)).toBeTruthy();
  });

  it('未挑戦時：あなたの回答「未回答」を表示', () => {
    const { queryAllByText } = render(
      <G01ResultScreen
        result={{
          thresholdDeg: 5.0,
          grading: null,
          unattempted: true,
          trial: makeTrial(),
          playedParam: 5,
          isCorrectForStaircase: false,
        }}
        selectedIds={[]}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    // 「あなたの回答『未回答』」テキストと採点詳細「未回答」の両方が出る
    expect(queryAllByText(/未回答/).length).toBeGreaterThanOrEqual(2);
  });

  // Sprint 20-B-2：メトリクスバー（閾値 / 前回比 / 初回測定）は撤去（spec 再確定、F-10 v1.1.1）
  it('Sprint 20-B-2：閾値（角度差・°）はオーバーレイに表示しない', () => {
    const { queryByText } = render(
      <G01ResultScreen
        result={{
          thresholdDeg: 5.0,
          grading: makeGrading(true),
          unattempted: false,
          trial: makeTrial(),
          playedParam: 5,
          isCorrectForStaircase: true,
        }}
        selectedIds={['r0c0']}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    expect(queryByText('5.0°')).toBeNull();
    expect(queryByText('角度差')).toBeNull();
  });

  it('Sprint 20-B-2：前回比（初回測定）もオーバーレイに表示しない', () => {
    const { queryAllByText } = render(
      <G01ResultScreen
        result={{
          thresholdDeg: 5.0,
          grading: makeGrading(true),
          unattempted: false,
          trial: makeTrial(),
          playedParam: 5,
          isCorrectForStaircase: true,
        }}
        selectedIds={['r0c0']}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    expect(queryAllByText('初回測定').length).toBe(0);
  });

  it('単体時：SinglePlayPostFooter（3 ボタン）を表示', () => {
    const { getByTestId } = render(
      <G01ResultScreen
        result={{
          thresholdDeg: 5.0,
          grading: makeGrading(true),
          unattempted: false,
          trial: makeTrial(),
          playedParam: 5,
          isCorrectForStaircase: true,
        }}
        selectedIds={['r0c0']}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
      />,
    );
    expect(getByTestId('single-play-post-play-again')).toBeTruthy();
    expect(getByTestId('single-play-post-back-to-list')).toBeTruthy();
    expect(getByTestId('single-play-post-go-home')).toBeTruthy();
  });

  it('「同じゲームをもう一度」押下で onPlayAgain が呼ばれる', () => {
    const onPlayAgain = jest.fn();
    const { getByTestId } = render(
      <G01ResultScreen
        result={{
          thresholdDeg: 5.0,
          grading: makeGrading(true),
          unattempted: false,
          trial: makeTrial(),
          playedParam: 5,
          isCorrectForStaircase: true,
        }}
        selectedIds={['r0c0']}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={onPlayAgain}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
      />,
    );
    fireEvent.press(getByTestId('single-play-post-play-again'));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });

  it('Sprint 20-B-2：前回比（改善 / 悪化）バッジもオーバーレイに表示しない', () => {
    const { queryAllByText } = render(
      <G01ResultScreen
        result={{
          thresholdDeg: 4.5,
          grading: makeGrading(true),
          unattempted: false,
          trial: makeTrial(),
          playedParam: 4,
          isCorrectForStaircase: true,
        }}
        selectedIds={['r0c0']}
        previousBestThreshold={5.5}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    expect(queryAllByText(/改善/).length).toBe(0);
  });

  // Sprint 20-B-2：MarkBadge 重畳の確認（複数選択ゲーム G-01 は ◯ + ✕ 同時にあり得る）
  it('Sprint 20-B-2：正解選択 ID には ◯（correctChosen）が重畳される', () => {
    const { getByTestId } = render(
      <G01ResultScreen
        result={{
          thresholdDeg: 5.0,
          grading: makeGrading(true),
          unattempted: false,
          trial: makeTrial(),
          playedParam: 5,
          isCorrectForStaircase: true,
        }}
        selectedIds={['r0c0']}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    expect(getByTestId('result-overlay-mark-badge-g01-r0c0')).toBeTruthy();
  });

  it('Sprint 20-B-2：誤選択 ID には ✕（wrongChosen）、正解未選択 ID には 薄 ◯ が重畳', () => {
    const { getByTestId } = render(
      <G01ResultScreen
        result={{
          thresholdDeg: 5.0,
          grading: makeGrading(false),
          unattempted: false,
          trial: makeTrial(),
          playedParam: 5,
          isCorrectForStaircase: false,
        }}
        selectedIds={['r1c1']}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    // r0c0 は changing だが選ばれていないので 薄 ◯（missed）
    expect(getByTestId('result-overlay-mark-badge-g01-r0c0')).toBeTruthy();
    // r1c1 はユーザーが選んだが changing でないので ✕
    expect(getByTestId('result-overlay-mark-badge-g01-r1c1')).toBeTruthy();
  });

  it('採点詳細「（正解 1, 誤答 0）」を表示', () => {
    const { getByText } = render(
      <G01ResultScreen
        result={{
          thresholdDeg: 5.0,
          grading: makeGrading(true),
          unattempted: false,
          trial: makeTrial(),
          playedParam: 5,
          isCorrectForStaircase: true,
        }}
        selectedIds={['r0c0']}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    expect(getByText('（正解 1, 誤答 0）')).toBeTruthy();
  });
});
