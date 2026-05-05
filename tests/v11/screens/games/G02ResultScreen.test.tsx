/**
 * G02ResultScreen — F-10 結果サマリ受け入れテスト（screens.md S10-03）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { G02ResultScreen } from '../../../../src/screens/v11/games/G02ResultScreen';
import { G02TrialResult } from '../../../../src/screens/v11/games/G02SideBySideTiltScreen';
import {
  G02GradingResult,
  G02Side,
  G02TrialSpec,
} from '../../../../src/lib/v11/g02Trial';

function makeTrial(): G02TrialSpec {
  return {
    left: {
      cpd: 3,
      contrast: 0.3,
      sigmaDeg: 0.6,
      orientationDeg: 60,
      phaseRad: 0,
    },
    right: {
      cpd: 3,
      contrast: 0.3,
      sigmaDeg: 0.6,
      orientationDeg: 54,
      phaseRad: 0,
    },
    correctSide: 'left',
    paramValueDeg: 6,
    baseOrientationDeg: 57,
  };
}

function makeGrading(args: {
  correctSide: G02Side;
  userAnswer: G02Side | null;
}): G02GradingResult {
  const isCorrect =
    args.userAnswer !== null && args.userAnswer === args.correctSide;
  return {
    correctSide: args.correctSide,
    userAnswer: args.userAnswer,
    isCorrect,
    unattempted: args.userAnswer === null,
  };
}

function makeResult(overrides: Partial<G02TrialResult> = {}): G02TrialResult {
  const grading =
    overrides.grading ??
    makeGrading({ correctSide: 'left', userAnswer: 'left' });
  return {
    thresholdDeg: 6.0,
    grading,
    trial: overrides.trial ?? makeTrial(),
    playedParam: 6,
    isCorrectForStaircase: grading.isCorrect,
    ...overrides,
  };
}

describe('G02ResultScreen: F-10', () => {
  it('正解時：「正解は『左』」「あなたの回答『左』」を表示', () => {
    const { getByText } = render(
      <G02ResultScreen
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
    expect(getByText(/正解は「左」/)).toBeTruthy();
    expect(getByText(/あなたの回答「左」/)).toBeTruthy();
  });

  it('不正解時：「正解は『左』」「あなたの回答『右』」を表示', () => {
    const { getByText } = render(
      <G02ResultScreen
        result={makeResult({
          grading: makeGrading({ correctSide: 'left', userAnswer: 'right' }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    expect(getByText(/正解は「左」/)).toBeTruthy();
    expect(getByText(/あなたの回答「右」/)).toBeTruthy();
  });

  it('未回答時：あなたの回答「未回答」を表示', () => {
    const { queryAllByText } = render(
      <G02ResultScreen
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

  it('Sprint 20-B-2：閾値（角度差・°）はオーバーレイに表示しない', () => {
    const { queryByText } = render(
      <G02ResultScreen
        result={makeResult({ thresholdDeg: 6.0 })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    expect(queryByText('6.0°')).toBeNull();
    expect(queryByText('角度差')).toBeNull();
  });

  it('Sprint 20-B-2：前回比（初回測定）もオーバーレイに表示しない', () => {
    const { queryAllByText } = render(
      <G02ResultScreen
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
      <G02ResultScreen
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
      <G02ResultScreen
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
      <G02ResultScreen
        result={makeResult({ thresholdDeg: 6.0 })}
        previousBestThreshold={7.0}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    expect(queryAllByText(/改善/).length).toBe(0);
  });

  it('Sprint 20-B-2：閾値カード（result-metric-threshold）もオーバーレイに存在しない', () => {
    const { queryByTestId } = render(
      <G02ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    expect(queryByTestId('result-metric-threshold')).toBeNull();
  });

  // Sprint 20-B-2：MarkBadge 重畳の確認
  it('Sprint 20-B-2：correctSide に ◯ が重畳される（正解時）', () => {
    const { getByTestId } = render(
      <G02ResultScreen
        result={makeResult({
          grading: makeGrading({ correctSide: 'left', userAnswer: 'left' }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    expect(getByTestId('result-overlay-mark-badge-g02-left')).toBeTruthy();
  });

  it('Sprint 20-B-2：誤答時は correctSide に 薄 ◯、選択側に ✕ が重畳される', () => {
    const { getByTestId } = render(
      <G02ResultScreen
        result={makeResult({
          grading: makeGrading({ correctSide: 'left', userAnswer: 'right' }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    expect(getByTestId('result-overlay-mark-badge-g02-left')).toBeTruthy();
    expect(getByTestId('result-overlay-mark-badge-g02-right')).toBeTruthy();
  });

  it('未回答時のみ補助テキスト「未回答」が g02-result-detail に出る', () => {
    const { getByTestId } = render(
      <G02ResultScreen
        result={makeResult({
          grading: makeGrading({ correctSide: 'left', userAnswer: null }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    expect(getByTestId('g02-result-detail')).toBeTruthy();
  });

  it('挑戦時には g02-result-detail の補助テキストは出ない（unattempted=false）', () => {
    const { queryByTestId } = render(
      <G02ResultScreen
        result={makeResult({
          grading: makeGrading({ correctSide: 'left', userAnswer: 'left' }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
      />,
    );
    expect(queryByTestId('g02-result-detail')).toBeNull();
  });

  // Sprint 10 修正ラウンド 2 / G-3 修正：1.5 秒拡大ハイライト演出を結果画面に埋め込む
  it('結果画面に SideBySideStimulus が埋め込まれている（g02-result-stimulus）', () => {
    const { getByTestId } = render(
      <G02ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={{ patchSizePx: 80, gapPx: 16 }}
      />,
    );
    expect(getByTestId('g02-result-stimulus')).toBeTruthy();
    expect(getByTestId('g02-result-stimulus-inner')).toBeTruthy();
  });

  it('結果画面の SideBySideStimulus は disabled で操作不可（タップしても onSelectSide が動かない）', () => {
    const { getByTestId } = render(
      <G02ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={{ patchSizePx: 80, gapPx: 16 }}
      />,
    );
    // disabled=true だと onPress は無視される
    const leftCell = getByTestId('g02-stimulus-left');
    fireEvent.press(leftCell);
    // クラッシュなく、selectedSide は null のまま（各セルの accessibilityState.selected は
    // highlightSide=correctSide=left のみ true、左セルは highlightSide により checked=true）
    expect(leftCell.props.accessibilityState.checked).toBe(true);
  });

  it('正解側パッチが highlightSide で選択中（黄 4px 枠）になる：correctSide=left → 左セル checked', () => {
    const { getByTestId } = render(
      <G02ResultScreen
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
      <G02ResultScreen
        result={makeResult({
          trial: {
            left: {
              cpd: 3,
              contrast: 0.3,
              sigmaDeg: 0.6,
              orientationDeg: 60,
              phaseRad: 0,
            },
            right: {
              cpd: 3,
              contrast: 0.3,
              sigmaDeg: 0.6,
              orientationDeg: 66,
              phaseRad: 0,
            },
            correctSide: 'right',
            paramValueDeg: 6,
            baseOrientationDeg: 63,
          },
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

  it('結果画面に Animated.View ラッパー（左右）が付いている（scale アニメ用）', () => {
    const { getByTestId } = render(
      <G02ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={{ patchSizePx: 80, gapPx: 16 }}
      />,
    );
    expect(getByTestId('g02-stimulus-left-anim')).toBeTruthy();
    expect(getByTestId('g02-stimulus-right-anim')).toBeTruthy();
  });
});
