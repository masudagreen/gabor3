/**
 * G07ResultScreen — F-10 結果サマリ受け入れテスト（screens.md S14-06）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { G07ResultScreen } from '../../../../src/screens/v11/games/G07ResultScreen';
import { G07TrialResult } from '../../../../src/screens/v11/games/G07EdgeHuntScreen';
import {
  G07GradingResult,
  G07TrialSpec,
  buildG07Trial,
} from '../../../../src/lib/v11/g07Trial';

function makeTrial(): G07TrialSpec {
  return buildG07Trial(5, () => 0.3);
}

function makeGrading(args: {
  correctIds: ReadonlyArray<string>;
  userSelectedIds: ReadonlyArray<string>;
}): G07GradingResult {
  const correctSet = new Set(args.correctIds);
  const userSet = new Set(args.userSelectedIds);
  const tp: string[] = [];
  const fp: string[] = [];
  const fn: string[] = [];
  for (const id of userSet) {
    if (correctSet.has(id)) tp.push(id);
    else fp.push(id);
  }
  for (const id of correctSet) {
    if (!userSet.has(id)) fn.push(id);
  }
  return {
    correctIds: args.correctIds,
    userSelectedIds: Array.from(userSet),
    truePositiveIds: tp,
    falsePositiveIds: fp,
    falseNegativeIds: fn,
    isCorrect:
      !userSet.size === false &&
      tp.length === correctSet.size &&
      fp.length === 0 &&
      fn.length === 0,
    unattempted: userSet.size === 0,
  };
}

function makeResult(overrides: Partial<G07TrialResult> = {}): G07TrialResult {
  const trial = overrides.trial ?? makeTrial();
  const grading =
    overrides.grading ??
    makeGrading({
      correctIds: trial.correctIds,
      userSelectedIds: trial.correctIds, // 全正解
    });
  return {
    thresholdDeg: 5,
    grading,
    trial,
    userSelectedIds: grading.userSelectedIds,
    playedParam: 5,
    isCorrectForStaircase: grading.isCorrect,
    ...overrides,
  };
}

describe('G07ResultScreen: F-10', () => {
  it('正解時：「正解は『…』」「あなたの回答『3/3 個正解』」を表示', () => {
    const trial = makeTrial();
    const grading = makeGrading({
      correctIds: trial.correctIds,
      userSelectedIds: trial.correctIds,
    });
    const { queryAllByText } = render(
      <G07ResultScreen
        result={makeResult({ trial, grading })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={{ cellSizePx: 48, gapPx: 8, gridSizePx: 216 }}
      />,
    );
    // 「正解は『1 行 1 列・1 行 2 列・1 行 3 列』」のような文字列（aria-live + 可視
    // テキストで複数ノードに出ることがある）
    expect(queryAllByText(/正解は/).length).toBeGreaterThanOrEqual(1);
    // 行 / 列 が正解テキスト内に出る
    expect(queryAllByText(/行/).length).toBeGreaterThanOrEqual(1);
    expect(queryAllByText(/列/).length).toBeGreaterThanOrEqual(1);
    // ユーザー回答「3/3 個正解」
    expect(queryAllByText(/3\/3 個正解/).length).toBeGreaterThanOrEqual(1);
  });

  it('不正解時（2/3 + 1 過剰）：「あなたの回答『2/3 個正解（1 過剰）』」を表示', () => {
    const trial = makeTrial();
    const noiseId = trial.patches.find((p) => !p.isLineMember)?.id ?? 'r0c0';
    const userSelectedIds = [trial.correctIds[0], trial.correctIds[1], noiseId];
    const grading = makeGrading({
      correctIds: trial.correctIds,
      userSelectedIds,
    });
    const { queryAllByText } = render(
      <G07ResultScreen
        result={makeResult({
          trial,
          grading,
          userSelectedIds,
          isCorrectForStaircase: false,
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={{ cellSizePx: 48, gapPx: 8, gridSizePx: 216 }}
      />,
    );
    expect(queryAllByText(/2\/3 個正解/).length).toBeGreaterThanOrEqual(1);
    expect(queryAllByText(/1 過剰/).length).toBeGreaterThanOrEqual(1);
  });

  it('未回答時：あなたの回答「未回答」を表示', () => {
    const trial = makeTrial();
    const grading = makeGrading({
      correctIds: trial.correctIds,
      userSelectedIds: [],
    });
    const { queryAllByText } = render(
      <G07ResultScreen
        result={makeResult({
          trial,
          grading,
          userSelectedIds: [],
          isCorrectForStaircase: false,
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={{ cellSizePx: 48, gapPx: 8, gridSizePx: 216 }}
      />,
    );
    expect(queryAllByText(/未回答/).length).toBeGreaterThanOrEqual(1);
  });

  it('Sprint 20-B-2：閾値（向きズレ°）はオーバーレイに表示しない', () => {
    const { queryByText } = render(
      <G07ResultScreen
        result={makeResult({ thresholdDeg: 5 })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={{ cellSizePx: 48, gapPx: 8, gridSizePx: 216 }}
      />,
    );
    expect(queryByText('向きズレ°')).toBeNull();
  });

  it('Sprint 20-B-2：前回比（初回測定）もオーバーレイに表示しない', () => {
    const { queryAllByText } = render(
      <G07ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={{ cellSizePx: 48, gapPx: 8, gridSizePx: 216 }}
      />,
    );
    expect(queryAllByText('初回測定').length).toBe(0);
  });

  it('単体時：SinglePlayPostFooter（3 ボタン）を表示', () => {
    const { getByTestId } = render(
      <G07ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={{ cellSizePx: 48, gapPx: 8, gridSizePx: 216 }}
      />,
    );
    expect(getByTestId('single-play-post-play-again')).toBeTruthy();
    expect(getByTestId('single-play-post-back-to-list')).toBeTruthy();
    expect(getByTestId('single-play-post-go-home')).toBeTruthy();
  });

  it('「同じゲームをもう一度」押下で onPlayAgain が呼ばれる', () => {
    const onPlayAgain = jest.fn();
    const { getByTestId } = render(
      <G07ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={onPlayAgain}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={{ cellSizePx: 48, gapPx: 8, gridSizePx: 216 }}
      />,
    );
    fireEvent.press(getByTestId('single-play-post-play-again'));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });

  it('Sprint 20-B-2：前回比（改善 / 悪化）バッジもオーバーレイに表示しない', () => {
    const { queryAllByText } = render(
      <G07ResultScreen
        result={makeResult({ thresholdDeg: 5 })}
        previousBestThreshold={6}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={{ cellSizePx: 48, gapPx: 8, gridSizePx: 216 }}
      />,
    );
    expect(queryAllByText(/改善/).length).toBe(0);
  });

  it('結果画面に GaborGridStimulus（4×4）が埋め込まれている（g07-result-stimulus）', () => {
    const { getByTestId } = render(
      <G07ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={{ cellSizePx: 48, gapPx: 8, gridSizePx: 216 }}
      />,
    );
    expect(getByTestId('g07-result-stimulus')).toBeTruthy();
    expect(getByTestId('g07-result-stimulus-inner')).toBeTruthy();
  });

  it('正解 3 セルが highlightIds で「選択中」（黄 4px 枠）になる', () => {
    const trial = makeTrial();
    const grading = makeGrading({
      correctIds: trial.correctIds,
      userSelectedIds: trial.correctIds,
    });
    const { getByTestId } = render(
      <G07ResultScreen
        result={makeResult({ trial, grading })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={{ cellSizePx: 48, gapPx: 8, gridSizePx: 216 }}
      />,
    );
    for (const id of trial.correctIds) {
      const cell = getByTestId(`g07-cell-${id}`);
      expect(cell.props.accessibilityState?.checked).toBe(true);
    }
  });

  it('未回答時のみ補助テキスト「未回答」が g07-result-detail に出る', () => {
    const trial = makeTrial();
    const grading = makeGrading({
      correctIds: trial.correctIds,
      userSelectedIds: [],
    });
    const { getByTestId } = render(
      <G07ResultScreen
        result={makeResult({
          trial,
          grading,
          userSelectedIds: [],
          isCorrectForStaircase: false,
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={{ cellSizePx: 48, gapPx: 8, gridSizePx: 216 }}
      />,
    );
    expect(getByTestId('g07-result-detail')).toBeTruthy();
  });

  it('挑戦時には g07-result-detail の補助テキストは出ない（unattempted=false）', () => {
    const trial = makeTrial();
    const grading = makeGrading({
      correctIds: trial.correctIds,
      userSelectedIds: trial.correctIds,
    });
    const { queryByTestId } = render(
      <G07ResultScreen
        result={makeResult({ trial, grading })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={{ cellSizePx: 48, gapPx: 8, gridSizePx: 216 }}
      />,
    );
    expect(queryByTestId('g07-result-detail')).toBeNull();
  });

  it('Sprint 20-B-2：閾値カード（result-metric-threshold）はオーバーレイに存在しない', () => {
    const { queryByTestId } = render(
      <G07ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={{ cellSizePx: 48, gapPx: 8, gridSizePx: 216 }}
      />,
    );
    expect(queryByTestId('result-metric-threshold')).toBeNull();
  });

  // Sprint 20-B-2：複数選択ゲームで MarkBadge が個別パッチに ◯/✕ で出る
  it('Sprint 20-B-2：truePositiveIds に ◯（correctChosen）が重畳される', () => {
    const grading = {
      score: 1,
      isCorrect: true,
      isCorrectForStaircase: true,
      unattempted: false,
      correctIds: ['r0c0', 'r1c1', 'r2c2'],
      userSelectedIds: ['r0c0', 'r1c1', 'r2c2'],
      truePositiveIds: ['r0c0', 'r1c1', 'r2c2'],
      falsePositiveIds: [] as string[],
      falseNegativeIds: [] as string[],
    };
    const { getByTestId } = render(
      <G07ResultScreen
        result={makeResult({ grading })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={{ cellSizePx: 48, gapPx: 8, gridSizePx: 216 }}
      />,
    );
    expect(getByTestId('result-overlay-mark-badge-g07-r0c0')).toBeTruthy();
    expect(getByTestId('result-overlay-mark-badge-g07-r1c1')).toBeTruthy();
    expect(getByTestId('result-overlay-mark-badge-g07-r2c2')).toBeTruthy();
  });
});
