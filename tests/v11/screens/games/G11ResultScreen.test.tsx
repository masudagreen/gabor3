/**
 * G11ResultScreen — F-10 結果サマリ受け入れテスト（screens.md S16-06）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { G11ResultScreen } from '../../../../src/screens/v11/games/G11ResultScreen';
import { G11TrialResult } from '../../../../src/screens/v11/games/G11VernierAlignmentScreen';
import {
  buildG11Trial,
  G11GradingResult,
  G11OffsetDirection,
  G11SelectableSide,
  G11TrialSpec,
} from '../../../../src/lib/v11/g11Trial';

function makeTrial(
  direction: G11OffsetDirection = 'left',
  overrides: Partial<G11TrialSpec> = {},
): G11TrialSpec {
  // 確定的：rng で correctSide を制御（< 0.5 → left, >= 0.5 → right）。
  // direction は correctDirection（旧仕様の方向、後方互換）として使う。
  // makeTrial('left') → correctSide='left'、correctDirection='left'。
  const t = buildG11Trial(2.0, () => (direction === 'left' ? 0.3 : 0.7));
  return { ...t, ...overrides };
}

function makeGrading(args: {
  correctDirection: G11OffsetDirection;
  userAnswer: G11OffsetDirection | null;
  /** v1.1.2 Sprint 21：side ベース。省略時は correctDirection を side として流用 */
  correctSide?: G11SelectableSide;
  userAnswerSide?: G11SelectableSide | null;
}): G11GradingResult {
  const isCorrect =
    args.userAnswer !== null && args.userAnswer === args.correctDirection;
  return {
    correctDirection: args.correctDirection,
    userAnswer: args.userAnswer,
    isCorrect,
    unattempted: args.userAnswer === null,
    correctSide: args.correctSide ?? args.correctDirection,
    userAnswerSide:
      args.userAnswerSide !== undefined
        ? args.userAnswerSide
        : args.userAnswer,
  };
}

function makeResult(overrides: Partial<G11TrialResult> = {}): G11TrialResult {
  const grading =
    overrides.grading ??
    makeGrading({ correctDirection: 'left', userAnswer: 'left' });
  return {
    thresholdArcmin: 2.0,
    grading,
    trial: overrides.trial ?? makeTrial(grading.correctDirection),
    playedParam: 2.0,
    isCorrectForStaircase: grading.isCorrect,
    ...overrides,
  };
}

const FIXED_LAYOUT = { patchSizePx: 80, gapPx: 16 };

describe('G11ResultScreen: F-10', () => {
  it('描画クラッシュなしでマウント', () => {
    const { getByTestId } = render(
      <G11ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(getByTestId('g11-result-screen')).toBeTruthy();
  });

  it('正解時：「正解は「下のパッチは左にずれている」」「あなたの回答…」を表示', () => {
    const { getByText } = render(
      <G11ResultScreen
        result={makeResult({
          grading: makeGrading({
            correctDirection: 'left',
            userAnswer: 'left',
          }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(getByText(/正解は「下のパッチは左にずれている」/)).toBeTruthy();
    expect(getByText(/あなたの回答「下のパッチは左にずれている」/)).toBeTruthy();
  });

  it('不正解時：正解と回答が異なる方向で併記される', () => {
    const { getByText } = render(
      <G11ResultScreen
        result={makeResult({
          grading: makeGrading({
            correctDirection: 'left',
            userAnswer: 'right',
          }),
          trial: makeTrial('left'),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(getByText(/正解は「下のパッチは左にずれている」/)).toBeTruthy();
    expect(getByText(/あなたの回答「下のパッチは右にずれている」/)).toBeTruthy();
  });

  it('未回答時：「未回答」detail を表示', () => {
    const { getByTestId } = render(
      <G11ResultScreen
        result={makeResult({
          grading: makeGrading({
            correctDirection: 'left',
            userAnswer: null,
          }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(getByTestId('g11-result-detail')).toBeTruthy();
  });

  it('Sprint 20-B-2：閾値「2.0\'」はオーバーレイに表示しない', () => {
    const { queryAllByText } = render(
      <G11ResultScreen
        result={makeResult({ thresholdArcmin: 2.0 })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(queryAllByText(/2\.0'/).length).toBe(0);
  });

  it('Sprint 20-B-2：閾値の単位「ズレ量(arcmin)」もオーバーレイに表示しない', () => {
    const { queryAllByText } = render(
      <G11ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(queryAllByText(/arcmin/).length).toBe(0);
  });

  it('Sprint 20-B-2：前回比（初回）バッジは引き続き表示されない', () => {
    const { queryByText } = render(
      <G11ResultScreen
        result={makeResult({ thresholdArcmin: 2.0 })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(queryByText(/改善/)).toBeNull();
  });

  it('Sprint 20-B-2：前回比（diff 値）バッジもオーバーレイに表示しない', () => {
    const { queryByText } = render(
      <G11ResultScreen
        result={makeResult({ thresholdArcmin: 1.8 })}
        previousBestThreshold={2.0}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(queryByText(/改善/)).toBeNull();
  });

  it('Sprint 21：G11VernierStimulus の result-stimulus が描画される', () => {
    const { getByTestId } = render(
      <G11ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(getByTestId('g11-result-stimulus')).toBeTruthy();
    expect(getByTestId('g11-result-stimulus-inner')).toBeTruthy();
  });

  it('単体プレイモード：3 ボタン Footer（「もう一度」「一覧」「ホーム」）', () => {
    const onPlayAgain = jest.fn();
    const { getByText } = render(
      <G11ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={onPlayAgain}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    fireEvent.press(getByText(/同じゲームをもう一度/));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });

  it('コースモード：「次へ」ボタン', () => {
    const onNext = jest.fn();
    const { getByTestId } = render(
      <G11ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode
        onNext={onNext}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    fireEvent.press(getByTestId('result-overlay-next'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  // Sprint 21：MarkBadge 重畳の確認（v1.1.2 で side ベース g11-test-{left|right} に変更）
  it('Sprint 21：correctSide に ◯ が重畳される（正解時、`g11-test-left`）', () => {
    const { getByTestId } = render(
      <G11ResultScreen
        result={makeResult({
          grading: makeGrading({
            correctDirection: 'left',
            userAnswer: 'left',
            correctSide: 'left',
            userAnswerSide: 'left',
          }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(getByTestId('result-overlay-mark-badge-g11-test-left')).toBeTruthy();
  });
});
