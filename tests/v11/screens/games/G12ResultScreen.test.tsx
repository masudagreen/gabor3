/**
 * G12ResultScreen — F-10 結果サマリ受け入れテスト（screens.md S17-03）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { G12ResultScreen } from '../../../../src/screens/v11/games/G12ResultScreen';
import { G12TrialResult } from '../../../../src/screens/v11/games/G12CrowdingScreen';
import {
  buildG12Trial,
  G12GradingResult,
  G12Orientation,
  G12TrialSpec,
} from '../../../../src/lib/v11/g12Trial';

function makeTrial(
  orientation: G12Orientation = 'vertical',
  overrides: Partial<G12TrialSpec> = {},
): G12TrialSpec {
  // pickRandomOrientation: rng=0.05 → vertical, rng=0.3 → horizontal,
  // rng=0.6 → diagonalRight, rng=0.9 → diagonalLeft
  let rngVal: number;
  switch (orientation) {
    case 'vertical':
      rngVal = 0.05;
      break;
    case 'horizontal':
      rngVal = 0.3;
      break;
    case 'diagonalRight':
      rngVal = 0.6;
      break;
    case 'diagonalLeft':
      rngVal = 0.9;
      break;
  }
  const t = buildG12Trial(2.0, () => rngVal);
  return { ...t, ...overrides };
}

function makeGrading(args: {
  correctOrientation: G12Orientation;
  userAnswer: G12Orientation | null;
}): G12GradingResult {
  const isCorrect =
    args.userAnswer !== null && args.userAnswer === args.correctOrientation;
  return {
    correctOrientation: args.correctOrientation,
    userAnswer: args.userAnswer,
    isCorrect,
    unattempted: args.userAnswer === null,
  };
}

function makeResult(overrides: Partial<G12TrialResult> = {}): G12TrialResult {
  const grading =
    overrides.grading ??
    makeGrading({
      correctOrientation: 'vertical',
      userAnswer: 'vertical',
    });
  return {
    thresholdSpacing: 2.0,
    grading,
    trial: overrides.trial ?? makeTrial(grading.correctOrientation),
    playedParam: 2.0,
    isCorrectForStaircase: grading.isCorrect,
    ...overrides,
  };
}

const FIXED_LAYOUT = { patchSizePx: 50, containerSizePx: 240 };

describe('G12ResultScreen: F-10', () => {
  it('描画クラッシュなしでマウント', () => {
    const { getByTestId } = render(
      <G12ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(getByTestId('g12-result-screen')).toBeTruthy();
  });

  it('正解時：「正解は「垂直」」「あなたの回答…」を表示', () => {
    const { getByText } = render(
      <G12ResultScreen
        result={makeResult({
          grading: makeGrading({
            correctOrientation: 'vertical',
            userAnswer: 'vertical',
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
    expect(getByText(/正解は「垂直」/)).toBeTruthy();
    expect(getByText(/あなたの回答「垂直」/)).toBeTruthy();
  });

  it('不正解時：正解と回答が異なる向きで併記される', () => {
    const { getByText } = render(
      <G12ResultScreen
        result={makeResult({
          grading: makeGrading({
            correctOrientation: 'diagonalRight',
            userAnswer: 'horizontal',
          }),
          trial: makeTrial('diagonalRight'),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(getByText(/正解は「斜め右」/)).toBeTruthy();
    expect(getByText(/あなたの回答「水平」/)).toBeTruthy();
  });

  it('未回答時：「未回答」detail を表示', () => {
    const { getByTestId } = render(
      <G12ResultScreen
        result={makeResult({
          grading: makeGrading({
            correctOrientation: 'vertical',
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
    expect(getByTestId('g12-result-detail')).toBeTruthy();
  });

  it('Sprint 20-B-2：閾値「2.0×」はオーバーレイに表示しない', () => {
    const { queryAllByText } = render(
      <G12ResultScreen
        result={makeResult({ thresholdSpacing: 2.0 })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(queryAllByText(/2\.0×/).length).toBe(0);
  });

  it('Sprint 20-B-2：閾値の単位「spacing(target直径倍)」もオーバーレイに表示しない', () => {
    const { queryAllByText } = render(
      <G12ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(queryAllByText(/spacing/).length).toBe(0);
  });

  it('Sprint 20-B-2：前回比（初回）バッジは引き続き表示されない', () => {
    const { queryByText } = render(
      <G12ResultScreen
        result={makeResult({ thresholdSpacing: 2.0 })}
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
      <G12ResultScreen
        result={makeResult({ thresholdSpacing: 1.8 })}
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

  it('CrowdingStimulus の result-stimulus が描画される', () => {
    const { getByTestId } = render(
      <G12ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(getByTestId('g12-result-stimulus')).toBeTruthy();
    expect(getByTestId('g12-result-stimulus-inner')).toBeTruthy();
  });

  it('単体プレイモード：3 ボタン Footer（「もう一度」「一覧」「ホーム」）', () => {
    const onPlayAgain = jest.fn();
    const { getByText } = render(
      <G12ResultScreen
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
      <G12ResultScreen
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

  // Sprint 20-B-2：MarkBadge 重畳の確認
  it('Sprint 20-B-2：correctOrientation に ◯ が重畳される（正解時）', () => {
    const correctOrientation = makeResult().grading.correctOrientation;
    const { getByTestId } = render(
      <G12ResultScreen
        result={makeResult({
          grading: makeGrading({
            correctOrientation,
            userAnswer: correctOrientation,
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
    expect(
      getByTestId(`result-overlay-mark-badge-g12-${correctOrientation}`),
    ).toBeTruthy();
  });
});
