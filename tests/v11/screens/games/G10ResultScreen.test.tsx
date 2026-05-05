/**
 * G10ResultScreen — F-10 結果サマリ受け入れテスト（screens.md S16-03）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { G10ResultScreen } from '../../../../src/screens/v11/games/G10ResultScreen';
import { G10TrialResult } from '../../../../src/screens/v11/games/G10TextureSegmentationScreen';
import {
  buildG10Trial,
  G10GradingResult,
  G10Quadrant,
  G10TrialSpec,
} from '../../../../src/lib/v11/g10Trial';

function makeTrial(overrides: Partial<G10TrialSpec> = {}): G10TrialSpec {
  // 確定的な trial（rng=固定）
  const t = buildG10Trial(30, () => 0);
  return { ...t, ...overrides };
}

function makeGrading(args: {
  correctQuadrant: G10Quadrant;
  userAnswer: G10Quadrant | null;
}): G10GradingResult {
  const isCorrect =
    args.userAnswer !== null && args.userAnswer === args.correctQuadrant;
  return {
    correctQuadrant: args.correctQuadrant,
    userAnswer: args.userAnswer,
    isCorrect,
    unattempted: args.userAnswer === null,
  };
}

function makeResult(overrides: Partial<G10TrialResult> = {}): G10TrialResult {
  const grading =
    overrides.grading ??
    makeGrading({ correctQuadrant: 'top-left', userAnswer: 'top-left' });
  return {
    thresholdDeg: 30,
    grading,
    trial: overrides.trial ?? makeTrial(),
    playedParam: 30,
    isCorrectForStaircase: grading.isCorrect,
    ...overrides,
  };
}

const FIXED_LAYOUT = { cellSizePx: 32, gapPx: 0 };

describe('G10ResultScreen: F-10', () => {
  it('描画クラッシュなしでマウント', () => {
    const { getByTestId } = render(
      <G10ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(getByTestId('g10-result-screen')).toBeTruthy();
  });

  it('正解時：「正解は「左上」」「あなたの回答「左上」」を表示', () => {
    const { getByText } = render(
      <G10ResultScreen
        result={makeResult({
          grading: makeGrading({
            correctQuadrant: 'top-left',
            userAnswer: 'top-left',
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
    expect(getByText(/正解は「左上」/)).toBeTruthy();
    expect(getByText(/あなたの回答「左上」/)).toBeTruthy();
  });

  it('不正解時：正解と回答が異なる象限ラベルで併記される', () => {
    const { getByText } = render(
      <G10ResultScreen
        result={makeResult({
          grading: makeGrading({
            correctQuadrant: 'top-left',
            userAnswer: 'bottom-right',
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
    expect(getByText(/正解は「左上」/)).toBeTruthy();
    expect(getByText(/あなたの回答「右下」/)).toBeTruthy();
  });

  it('未回答時：「未回答」detail を表示', () => {
    const { getByTestId } = render(
      <G10ResultScreen
        result={makeResult({
          grading: makeGrading({
            correctQuadrant: 'top-left',
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
    expect(getByTestId('g10-result-detail')).toBeTruthy();
  });

  it('Sprint 20-B-2：閾値「30°」はオーバーレイに表示しない', () => {
    const { queryAllByText } = render(
      <G10ResultScreen
        result={makeResult({ thresholdDeg: 30 })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(queryAllByText(/30°/).length).toBe(0);
  });

  it('Sprint 20-B-2：閾値の単位「向き差°」もオーバーレイに表示しない', () => {
    const { queryAllByText } = render(
      <G10ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(queryAllByText(/向き差/).length).toBe(0);
  });

  it('Sprint 20-B-2：前回比（初回）バッジは引き続き表示されない', () => {
    const { queryByText } = render(
      <G10ResultScreen
        result={makeResult({ thresholdDeg: 30 })}
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

  it('Sprint 20-B-2：前回比（diff）バッジもオーバーレイに表示しない（previousBest あり）', () => {
    const { queryByText } = render(
      <G10ResultScreen
        result={makeResult({ thresholdDeg: 25 })}
        previousBestThreshold={30}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(queryByText(/改善/)).toBeNull();
    expect(queryByText(/-5|−5/)).toBeNull();
  });

  // Sprint 20-B-2：MarkBadge 重畳の確認
  it('Sprint 20-B-2：correctQuadrant に ◯ が重畳される（正解時 / 短縮形 g10-tl など）', () => {
    const { getByTestId } = render(
      <G10ResultScreen
        result={makeResult({
          grading: makeGrading({
            correctQuadrant: 'top-left',
            userAnswer: 'top-left',
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
    expect(getByTestId('result-overlay-mark-badge-g10-tl')).toBeTruthy();
  });

  it('TextureGridStimulus の result-stimulus が描画される', () => {
    const { getByTestId } = render(
      <G10ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(getByTestId('g10-result-stimulus')).toBeTruthy();
    expect(getByTestId('g10-result-stimulus-inner')).toBeTruthy();
  });

  it('単体プレイモード：3 ボタン Footer（「もう一度」「一覧」「ホーム」）', () => {
    const onPlayAgain = jest.fn();
    const { getByText } = render(
      <G10ResultScreen
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
      <G10ResultScreen
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
});
