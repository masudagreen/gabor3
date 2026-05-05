/**
 * G13ResultScreen — F-10 結果サマリ受け入れテスト（screens.md S17-06）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { G13ResultScreen } from '../../../../src/screens/v11/games/G13ResultScreen';
import { G13TrialResult } from '../../../../src/screens/v11/games/G13EmbeddedNumeralScreen';
import {
  G13Digit,
  G13GradingResult,
  G13TrialSpec,
} from '../../../../src/lib/v11/g13Trial';

function makeTrial(
  digit: G13Digit = 3,
  contrast = 0.10,
  noiseSeed = 12345,
): G13TrialSpec {
  return {
    embeddedDigit: digit,
    paramContrast: contrast,
    noiseSeed,
  };
}

function makeGrading(args: {
  embeddedDigit: G13Digit;
  userAnswer: G13Digit | null;
}): G13GradingResult {
  const isCorrect =
    args.userAnswer !== null && args.userAnswer === args.embeddedDigit;
  return {
    embeddedDigit: args.embeddedDigit,
    userAnswer: args.userAnswer,
    isCorrect,
    unattempted: args.userAnswer === null,
  };
}

function makeResult(overrides: Partial<G13TrialResult> = {}): G13TrialResult {
  const grading =
    overrides.grading ??
    makeGrading({ embeddedDigit: 3, userAnswer: 3 });
  return {
    thresholdContrast: 0.10,
    grading,
    trial: overrides.trial ?? makeTrial(grading.embeddedDigit),
    playedParam: 0.10,
    isCorrectForStaircase: grading.isCorrect,
    ...overrides,
  };
}

const FIXED_LAYOUT = { stimulusSizePx: 200 };

describe('G13ResultScreen: F-10', () => {
  it('描画クラッシュなしでマウント', () => {
    const { getByTestId } = render(
      <G13ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(getByTestId('g13-result-screen')).toBeTruthy();
  });

  it('正解時：「正解は「3」」「あなたの回答「3」」を表示', () => {
    const { getByText } = render(
      <G13ResultScreen
        result={makeResult({
          grading: makeGrading({ embeddedDigit: 3, userAnswer: 3 }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(getByText(/正解は「3」/)).toBeTruthy();
    expect(getByText(/あなたの回答「3」/)).toBeTruthy();
  });

  it('不正解時：正解と回答が異なる数字で併記される', () => {
    const { getByText } = render(
      <G13ResultScreen
        result={makeResult({
          grading: makeGrading({ embeddedDigit: 3, userAnswer: 9 }),
          trial: makeTrial(3),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(getByText(/正解は「3」/)).toBeTruthy();
    expect(getByText(/あなたの回答「9」/)).toBeTruthy();
  });

  it('未回答時：「未回答」detail を表示', () => {
    const { getByTestId } = render(
      <G13ResultScreen
        result={makeResult({
          grading: makeGrading({ embeddedDigit: 3, userAnswer: null }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(getByTestId('g13-result-detail')).toBeTruthy();
  });

  it('Sprint 20-B-2：閾値「0.10」はオーバーレイに表示しない', () => {
    const { queryAllByText } = render(
      <G13ResultScreen
        result={makeResult({ thresholdContrast: 0.10 })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(queryAllByText(/0\.10/).length).toBe(0);
  });

  it('Sprint 20-B-2：閾値の単位「コントラスト」もオーバーレイに表示しない', () => {
    const { queryAllByText } = render(
      <G13ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(queryAllByText(/コントラスト/).length).toBe(0);
  });

  it('Sprint 20-B-2：前回比（初回）バッジは引き続き表示されない', () => {
    const { queryByText } = render(
      <G13ResultScreen
        result={makeResult({ thresholdContrast: 0.10 })}
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
      <G13ResultScreen
        result={makeResult({ thresholdContrast: 0.08 })}
        previousBestThreshold={0.10}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(queryByText(/改善/)).toBeNull();
  });

  it('EmbeddedNumeralStimulus の result-stimulus が描画される', () => {
    const { getByTestId } = render(
      <G13ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(getByTestId('g13-result-stimulus')).toBeTruthy();
    expect(getByTestId('g13-result-stimulus-inner')).toBeTruthy();
  });

  it('単体プレイモード：3 ボタン Footer（「もう一度」「一覧」「ホーム」）', () => {
    const onPlayAgain = jest.fn();
    const { getByText } = render(
      <G13ResultScreen
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
      <G13ResultScreen
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
  it('Sprint 20-B-2：embeddedDigit に対応する数字キーに ◯ が重畳される', () => {
    const result = makeResult();
    const embeddedDigit = result.grading.embeddedDigit;
    const { getByTestId } = render(
      <G13ResultScreen
        result={result}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(
      getByTestId(`result-overlay-mark-badge-g13-key-${embeddedDigit}`),
    ).toBeTruthy();
  });
});
