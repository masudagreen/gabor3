/**
 * G04ResultScreen — F-10 結果サマリ受け入れテスト（screens.md S12-03）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { G04ResultScreen } from '../../../../src/screens/v11/games/G04ResultScreen';
import { G04TrialResult } from '../../../../src/screens/v11/games/G04ContrastDiscrimScreen';
import {
  G04GradingResult,
  G04Side,
  G04TrialSpec,
} from '../../../../src/lib/v11/g04Trial';

function makeTrial(overrides: Partial<G04TrialSpec> = {}): G04TrialSpec {
  return {
    left: {
      cpd: 3,
      contrast: 0.375,
      sigmaDeg: 0.6,
      orientationDeg: 60,
      phaseRad: 0,
    },
    right: {
      cpd: 3,
      contrast: 0.225,
      sigmaDeg: 0.6,
      orientationDeg: 60,
      phaseRad: 0,
    },
    correctSide: 'left',
    paramValueContrast: 0.15,
    baseContrast: 0.3,
    ...overrides,
  };
}

function makeGrading(args: {
  correctSide: G04Side;
  userAnswer: G04Side | null;
}): G04GradingResult {
  const isCorrect =
    args.userAnswer !== null && args.userAnswer === args.correctSide;
  return {
    correctSide: args.correctSide,
    userAnswer: args.userAnswer,
    isCorrect,
    unattempted: args.userAnswer === null,
  };
}

function makeResult(overrides: Partial<G04TrialResult> = {}): G04TrialResult {
  const grading =
    overrides.grading ??
    makeGrading({ correctSide: 'left', userAnswer: 'left' });
  return {
    thresholdContrast: 0.15,
    grading,
    trial: overrides.trial ?? makeTrial(),
    playedParam: 0.15,
    isCorrectForStaircase: grading.isCorrect,
    ...overrides,
  };
}

describe('G04ResultScreen: F-10', () => {
  it('正解時：「正解は『左が濃い』」「あなたの回答『左が濃い』」を表示', () => {
    const { getByText } = render(
      <G04ResultScreen
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
    expect(getByText(/正解は「左が濃い」/)).toBeTruthy();
    expect(getByText(/あなたの回答「左が濃い」/)).toBeTruthy();
  });

  it('不正解時：「正解は『左が濃い』」「あなたの回答『右が濃い』」を表示', () => {
    const { getByText } = render(
      <G04ResultScreen
        result={makeResult({
          grading: makeGrading({ correctSide: 'left', userAnswer: 'right' }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    expect(getByText(/正解は「左が濃い」/)).toBeTruthy();
    expect(getByText(/あなたの回答「右が濃い」/)).toBeTruthy();
  });

  it('未回答時：あなたの回答「未回答」を表示', () => {
    const { queryAllByText } = render(
      <G04ResultScreen
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

  it('Sprint 20-B-2：閾値（コントラスト差）はオーバーレイに表示しない', () => {
    const { queryByText } = render(
      <G04ResultScreen
        result={makeResult({ thresholdContrast: 0.15 })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    expect(queryByText('0.15')).toBeNull();
    expect(queryByText('コントラスト差')).toBeNull();
  });

  it('Sprint 20-B-2：前回比（初回測定）もオーバーレイに表示しない', () => {
    const { queryAllByText } = render(
      <G04ResultScreen
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
      <G04ResultScreen
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
      <G04ResultScreen
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
      <G04ResultScreen
        result={makeResult({ thresholdContrast: 0.15 })}
        previousBestThreshold={0.18}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    expect(queryAllByText(/改善/).length).toBe(0);
  });

  it('未回答時のみ補助テキスト「未回答」が g04-result-detail に出る', () => {
    const { getByTestId } = render(
      <G04ResultScreen
        result={makeResult({
          grading: makeGrading({ correctSide: 'left', userAnswer: null }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    expect(getByTestId('g04-result-detail')).toBeTruthy();
  });

  it('挑戦時には g04-result-detail の補助テキストは出ない（unattempted=false）', () => {
    const { queryByTestId } = render(
      <G04ResultScreen
        result={makeResult({
          grading: makeGrading({ correctSide: 'left', userAnswer: 'left' }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    expect(queryByTestId('g04-result-detail')).toBeNull();
  });

  it('結果画面に SideBySideStimulus が埋め込まれている（g04-result-stimulus）', () => {
    const { getByTestId } = render(
      <G04ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={{ patchSizePx: 80, gapPx: 16 }}
      />,
    );
    expect(getByTestId('g04-result-stimulus')).toBeTruthy();
    expect(getByTestId('g04-result-stimulus-inner')).toBeTruthy();
  });

  it('正解側パッチが highlightSide で選択中（黄 4px 枠）になる：correctSide=left → 左セル checked', () => {
    const { getByTestId } = render(
      <G04ResultScreen
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
      <G04ResultScreen
        result={makeResult({
          trial: makeTrial({
            left: {
              cpd: 3,
              contrast: 0.225,
              sigmaDeg: 0.6,
              orientationDeg: 60,
              phaseRad: 0,
            },
            right: {
              cpd: 3,
              contrast: 0.375,
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
      <G04ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    expect(queryByTestId('result-metric-threshold')).toBeNull();
  });

  it('Sprint 20-B-2：閾値 0.05（最難）もオーバーレイに表示されない', () => {
    const { queryByText } = render(
      <G04ResultScreen
        result={makeResult({ thresholdContrast: 0.05 })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    expect(queryByText('0.05')).toBeNull();
  });

  // Sprint 20-B-2：MarkBadge 重畳の確認
  it('Sprint 20-B-2：correctSide に ◯ が重畳される（正解時）', () => {
    const { getByTestId } = render(
      <G04ResultScreen
        result={makeResult({
          grading: makeGrading({ correctSide: 'left', userAnswer: 'left' }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    expect(getByTestId('result-overlay-mark-badge-g04-left')).toBeTruthy();
  });
});
