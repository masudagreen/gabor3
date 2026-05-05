/**
 * G05ResultScreen — F-10 結果サマリ受け入れテスト（screens.md S13-03）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { G05ResultScreen } from '../../../../src/screens/v11/games/G05ResultScreen';
import { G05TrialResult } from '../../../../src/screens/v11/games/G05SfDiscrimScreen';
import {
  G05GradingResult,
  G05Side,
  G05TrialSpec,
} from '../../../../src/lib/v11/g05Trial';

function makeTrial(overrides: Partial<G05TrialSpec> = {}): G05TrialSpec {
  return {
    left: {
      cpd: 4 * Math.sqrt(1.5), // 高 cpd 側 ≈ 4.899
      contrast: 0.4,
      sigmaDeg: 0.6,
      orientationDeg: 60,
      phaseRad: 0,
    },
    right: {
      cpd: 4 / Math.sqrt(1.5), // 低 cpd 側 ≈ 3.266
      contrast: 0.4,
      sigmaDeg: 0.6,
      orientationDeg: 60,
      phaseRad: 0,
    },
    correctSide: 'left',
    paramValueRatio: 1.5,
    baseCpd: 4,
    ...overrides,
  };
}

function makeGrading(args: {
  correctSide: G05Side;
  userAnswer: G05Side | null;
}): G05GradingResult {
  const isCorrect =
    args.userAnswer !== null && args.userAnswer === args.correctSide;
  return {
    correctSide: args.correctSide,
    userAnswer: args.userAnswer,
    isCorrect,
    unattempted: args.userAnswer === null,
  };
}

function makeResult(overrides: Partial<G05TrialResult> = {}): G05TrialResult {
  const grading =
    overrides.grading ??
    makeGrading({ correctSide: 'left', userAnswer: 'left' });
  return {
    thresholdRatio: 1.5,
    grading,
    trial: overrides.trial ?? makeTrial(),
    playedParam: 1.5,
    isCorrectForStaircase: grading.isCorrect,
    ...overrides,
  };
}

describe('G05ResultScreen: F-10', () => {
  it('正解時：「正解は『左が細かい』」「あなたの回答『左が細かい』」を表示', () => {
    const { getByText } = render(
      <G05ResultScreen
        result={makeResult({
          grading: makeGrading({ correctSide: 'left', userAnswer: 'left' }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
      />,
    );
    expect(getByText(/正解は「左が細かい」/)).toBeTruthy();
    expect(getByText(/あなたの回答「左が細かい」/)).toBeTruthy();
  });

  it('不正解時：「正解は『左が細かい』」「あなたの回答『右が細かい』」を表示', () => {
    const { getByText } = render(
      <G05ResultScreen
        result={makeResult({
          grading: makeGrading({ correctSide: 'left', userAnswer: 'right' }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    expect(getByText(/正解は「左が細かい」/)).toBeTruthy();
    expect(getByText(/あなたの回答「右が細かい」/)).toBeTruthy();
  });

  it('未回答時：あなたの回答「未回答」を表示', () => {
    const { queryAllByText } = render(
      <G05ResultScreen
        result={makeResult({
          grading: makeGrading({ correctSide: 'left', userAnswer: null }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    expect(queryAllByText(/未回答/).length).toBeGreaterThanOrEqual(1);
  });

  it('Sprint 20-B-2：閾値（cpd 比）はオーバーレイに表示しない', () => {
    const { queryByText } = render(
      <G05ResultScreen
        result={makeResult({ thresholdRatio: 1.5 })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    expect(queryByText('1.5')).toBeNull();
    expect(queryByText('cpd 比')).toBeNull();
  });

  it('Sprint 20-B-2：前回比（初回測定）もオーバーレイに表示しない', () => {
    const { queryAllByText } = render(
      <G05ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    expect(queryAllByText('初回測定').length).toBe(0);
  });

  it('単体時：SinglePlayPostFooter（3 ボタン）を表示', () => {
    const { getByTestId } = render(
      <G05ResultScreen
        result={makeResult()}
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
      <G05ResultScreen
        result={makeResult()}
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
      <G05ResultScreen
        result={makeResult({ thresholdRatio: 1.5 })}
        previousBestThreshold={1.6}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    expect(queryAllByText(/改善/).length).toBe(0);
  });

  it('未回答時のみ補助テキスト「未回答」が g05-result-detail に出る', () => {
    const { getByTestId } = render(
      <G05ResultScreen
        result={makeResult({
          grading: makeGrading({ correctSide: 'left', userAnswer: null }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    expect(getByTestId('g05-result-detail')).toBeTruthy();
  });

  it('挑戦時には g05-result-detail の補助テキストは出ない（unattempted=false）', () => {
    const { queryByTestId } = render(
      <G05ResultScreen
        result={makeResult({
          grading: makeGrading({ correctSide: 'left', userAnswer: 'left' }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    expect(queryByTestId('g05-result-detail')).toBeNull();
  });

  it('結果画面に SideBySideStimulus が埋め込まれている（g05-result-stimulus）', () => {
    const { getByTestId } = render(
      <G05ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={{ patchSizePx: 80, gapPx: 16 }}
      />,
    );
    expect(getByTestId('g05-result-stimulus')).toBeTruthy();
    expect(getByTestId('g05-result-stimulus-inner')).toBeTruthy();
  });

  it('正解側パッチが highlightSide で選択中（黄 4px 枠）になる：correctSide=left → 左セル checked', () => {
    const { getByTestId } = render(
      <G05ResultScreen
        result={makeResult({
          grading: makeGrading({ correctSide: 'left', userAnswer: 'right' }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={{ patchSizePx: 80, gapPx: 16 }}
      />,
    );
    expect(
      getByTestId('g02-stimulus-left').props.accessibilityState.checked,
    ).toBe(true);
    expect(
      getByTestId('g02-stimulus-right').props.accessibilityState.checked,
    ).toBe(false);
  });

  it('正解側パッチが highlightSide で選択中（黄 4px 枠）になる：correctSide=right → 右セル checked', () => {
    const { getByTestId } = render(
      <G05ResultScreen
        result={makeResult({
          trial: makeTrial({
            left: {
              cpd: 4 / Math.sqrt(1.5),
              contrast: 0.4,
              sigmaDeg: 0.6,
              orientationDeg: 60,
              phaseRad: 0,
            },
            right: {
              cpd: 4 * Math.sqrt(1.5),
              contrast: 0.4,
              sigmaDeg: 0.6,
              orientationDeg: 60,
              phaseRad: 0,
            },
            correctSide: 'right',
          }),
          grading: makeGrading({ correctSide: 'right', userAnswer: 'left' }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={{ patchSizePx: 80, gapPx: 16 }}
      />,
    );
    expect(
      getByTestId('g02-stimulus-right').props.accessibilityState.checked,
    ).toBe(true);
    expect(
      getByTestId('g02-stimulus-left').props.accessibilityState.checked,
    ).toBe(false);
  });

  it('Sprint 20-B-2：閾値カード（result-metric-threshold）はオーバーレイに存在しない', () => {
    const { queryByTestId } = render(
      <G05ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    expect(queryByTestId('result-metric-threshold')).toBeNull();
  });

  it('Sprint 20-B-2：閾値値（1.1 / 2.0）はオーバーレイに表示されない', () => {
    const { queryByText, rerender } = render(
      <G05ResultScreen
        result={makeResult({ thresholdRatio: 1.1 })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    expect(queryByText('1.1')).toBeNull();
    rerender(
      <G05ResultScreen
        result={makeResult({ thresholdRatio: 2.0 })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    expect(queryByText('2.0')).toBeNull();
  });

  it('Sprint 20-B-2：correctSide に ◯ が重畳される（正解時）', () => {
    const { getByTestId } = render(
      <G05ResultScreen
        result={makeResult({
          grading: makeGrading({ correctSide: 'left', userAnswer: 'left' }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    expect(getByTestId('result-overlay-mark-badge-g05-left')).toBeTruthy();
  });
});
