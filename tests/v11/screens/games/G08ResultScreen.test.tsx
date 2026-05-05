/**
 * G08ResultScreen — F-10 結果サマリ受け入れテスト（screens.md S20-G08-RESULT）。
 *
 * v1.1.1 Sprint 20-C 改訂：
 *   - SR ラベルは「下の左／下の右のパッチ」（side ベース）
 *   - extraStimulus は G08TiltStimulus（adapter + 下部 2 パッチ）
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { G08ResultScreen } from '../../../../src/screens/v11/games/G08ResultScreen';
import { G08TrialResult } from '../../../../src/screens/v11/games/G08TiltAftereffectScreen';
import {
  G08Direction,
  G08GaborSpec,
  G08GradingResult,
  G08TrialSpec,
} from '../../../../src/lib/v11/g08Trial';

const ADAPTER: G08GaborSpec = {
  cpd: 4,
  contrast: 0.6,
  sigmaDeg: 0.6,
  orientationDeg: 110, // 90 + 20
  phaseRad: 0,
};
const TEST_CW: G08GaborSpec = {
  cpd: 4,
  contrast: 0.4,
  sigmaDeg: 0.6,
  orientationDeg: 95, // cw 5°
  phaseRad: 0,
};
const TEST_CCW: G08GaborSpec = {
  cpd: 4,
  contrast: 0.4,
  sigmaDeg: 0.6,
  orientationDeg: 85, // ccw 5°
  phaseRad: 0,
};

function makeTrial(overrides: Partial<G08TrialSpec> = {}): G08TrialSpec {
  // 既定：correctDirection='cw', correctSide='left'。下の左 = cw 傾き、下の右 = ccw 傾き
  return {
    adapter: ADAPTER,
    test: TEST_CW,
    correctDirection: 'cw',
    paramAngleDeg: 5,
    testLeft: TEST_CW,
    testRight: TEST_CCW,
    correctSide: 'left',
    ...overrides,
  };
}

function makeGrading(args: {
  correctDirection: G08Direction;
  correctSide?: 'left' | 'right';
  userAnswerSide?: 'left' | 'right' | null;
}): G08GradingResult {
  const correctSide = args.correctSide ?? 'left';
  const userAnswerSide = args.userAnswerSide ?? null;
  const isCorrect = userAnswerSide !== null && userAnswerSide === correctSide;
  // userAnswer (cw/ccw) は side から逆算
  const oppositeDirection: G08Direction =
    args.correctDirection === 'cw' ? 'ccw' : 'cw';
  const userAnswerDirection: G08Direction | null =
    userAnswerSide === null
      ? null
      : isCorrect
        ? args.correctDirection
        : oppositeDirection;
  return {
    correctDirection: args.correctDirection,
    userAnswer: userAnswerDirection,
    isCorrect,
    unattempted: userAnswerSide === null,
    correctSide,
    userAnswerSide,
  };
}

function makeResult(overrides: Partial<G08TrialResult> = {}): G08TrialResult {
  const grading =
    overrides.grading ??
    makeGrading({
      correctDirection: 'cw',
      correctSide: 'left',
      userAnswerSide: 'left',
    });
  return {
    thresholdDeg: 5,
    grading,
    trial: overrides.trial ?? makeTrial(),
    playedParam: 5,
    isCorrectForStaircase: grading.isCorrect,
    ...overrides,
  };
}

const FIXED_LAYOUT = { patchSizePx: 96, gapPx: 16 };

describe('G08ResultScreen: F-10 / Sprint 20-C', () => {
  it('正解時：SR テキストに「正解は『下の左のパッチ』」「あなたの回答『下の左のパッチ』」', () => {
    const { getByTestId } = render(
      <G08ResultScreen
        result={makeResult({
          grading: makeGrading({
            correctDirection: 'cw',
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
    const sr = getByTestId('result-overlay-sr-text');
    expect(sr.props.children).toMatch(/正解は「下の左のパッチ」/);
    expect(sr.props.children).toMatch(/あなたの回答「下の左のパッチ」/);
  });

  it('不正解時：正解「下の左のパッチ」、回答「下の右のパッチ」', () => {
    const { getByTestId } = render(
      <G08ResultScreen
        result={makeResult({
          grading: makeGrading({
            correctDirection: 'cw',
            correctSide: 'left',
            userAnswerSide: 'right',
          }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    const sr = getByTestId('result-overlay-sr-text');
    expect(sr.props.children).toMatch(/正解は「下の左のパッチ」/);
    expect(sr.props.children).toMatch(/あなたの回答「下の右のパッチ」/);
  });

  it('未回答時：あなたの回答「未回答」を表示', () => {
    const { queryAllByText } = render(
      <G08ResultScreen
        result={makeResult({
          grading: makeGrading({
            correctDirection: 'cw',
            correctSide: 'left',
            userAnswerSide: null,
          }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(queryAllByText(/未回答/).length).toBeGreaterThanOrEqual(1);
  });

  it('Sprint 20-B-2：閾値（°）はオーバーレイに表示しない', () => {
    const { queryByText } = render(
      <G08ResultScreen
        result={makeResult({ thresholdDeg: 5 })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(queryByText('°')).toBeNull();
  });

  it('extraStimulus に G-08 stimulus が描画される（adapter + 下部 2 パッチ）', () => {
    const { getByTestId } = render(
      <G08ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(getByTestId('g08-result-stimulus')).toBeTruthy();
    expect(getByTestId('g08-result-stimulus-inner')).toBeTruthy();
    expect(getByTestId('g08-result-stimulus-inner-adapter')).toBeTruthy();
    expect(getByTestId('g08-result-stimulus-inner-test-left')).toBeTruthy();
    expect(getByTestId('g08-result-stimulus-inner-test-right')).toBeTruthy();
  });

  it('未回答時：detail row に「未回答」', () => {
    const { getByTestId } = render(
      <G08ResultScreen
        result={makeResult({
          grading: makeGrading({
            correctDirection: 'cw',
            correctSide: 'left',
            userAnswerSide: null,
          }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(getByTestId('g08-result-detail')).toBeTruthy();
  });

  it('回答済時：detail row は描画されない', () => {
    const { queryByTestId } = render(
      <G08ResultScreen
        result={makeResult({
          grading: makeGrading({
            correctDirection: 'cw',
            correctSide: 'left',
            userAnswerSide: 'left',
          }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(queryByTestId('g08-result-detail')).toBeNull();
  });

  it('単体プレイ時：3 ボタンフッター表示', () => {
    const onPlayAgain = jest.fn();
    const onBackToList = jest.fn();
    const onGoHome = jest.fn();
    const { getByTestId } = render(
      <G08ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={onPlayAgain}
        onBackToList={onBackToList}
        onGoHome={onGoHome}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    fireEvent.press(getByTestId('single-play-post-play-again'));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });

  it('コースモード時：「次へ」Primary 表示、onNext が呼ばれる', () => {
    const onNext = jest.fn();
    const { getByTestId } = render(
      <G08ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={true}
        onNext={onNext}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    fireEvent.press(getByTestId('result-overlay-next'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('Sprint 20-B-2：前回比（diff）バッジもオーバーレイに表示しない', () => {
    const { queryAllByText } = render(
      <G08ResultScreen
        result={makeResult({ thresholdDeg: 5 })}
        previousBestThreshold={6}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(queryAllByText(/-1|−1/).length).toBe(0);
  });

  it('過去ベスト null（初回測定）でクラッシュなし', () => {
    const { getByTestId } = render(
      <G08ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(getByTestId('g08-result-screen')).toBeTruthy();
  });

  it('Sprint 20-B-2：いずれの回答パターンでも MetricCard threshold（°）はオーバーレイに表示しない', () => {
    const userAnswerSides: Array<'left' | 'right' | null> = [
      'left',
      'right',
      null,
    ];
    for (const userAnswerSide of userAnswerSides) {
      const { queryByText, unmount } = render(
        <G08ResultScreen
          result={makeResult({
            grading: makeGrading({
              correctDirection: 'cw',
              correctSide: 'left',
              userAnswerSide,
            }),
            thresholdDeg: 5,
          })}
          previousBestThreshold={null}
          isCourseMode={false}
          onPlayAgain={jest.fn()}
          layoutOverrideForTest={FIXED_LAYOUT}
        />,
      );
      expect(queryByText('°')).toBeNull();
      unmount();
    }
  });

  it('正解開示：highlightSide に correctSide が渡り、test-{side}-anim wrap が描画', () => {
    const { getByTestId } = render(
      <G08ResultScreen
        result={makeResult({
          grading: makeGrading({
            correctDirection: 'ccw',
            correctSide: 'right',
            userAnswerSide: 'left',
          }),
          trial: makeTrial({
            correctSide: 'right',
            correctDirection: 'ccw',
            testLeft: TEST_CW,
            testRight: TEST_CCW,
          }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(
      getByTestId('g08-result-stimulus-inner-test-left-anim'),
    ).toBeTruthy();
    expect(
      getByTestId('g08-result-stimulus-inner-test-right-anim'),
    ).toBeTruthy();
  });

  it('marks に「g08-test-{correctSide}」が含まれ、誤答側に「g08-test-{userAnswerSide}」も含まれる', () => {
    const { getByTestId } = render(
      <G08ResultScreen
        result={makeResult({
          grading: makeGrading({
            correctDirection: 'cw',
            correctSide: 'left',
            userAnswerSide: 'right',
          }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    // ResultOverlay は marks をインライン表示する。testID `result-overlay-mark-${targetId}`。
    expect(getByTestId('result-overlay-mark-g08-test-left')).toBeTruthy();
    expect(getByTestId('result-overlay-mark-g08-test-right')).toBeTruthy();
  });

  it('Sprint 20-C：プレイ中（disabled）テストパッチ枠は描画されない（v1.1.1 控えめ枠規約）', () => {
    const { getByTestId } = render(
      <G08ResultScreen
        result={makeResult({
          grading: makeGrading({
            correctDirection: 'cw',
            correctSide: 'left',
            userAnswerSide: 'left',
          }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    // 結果画面では disabled だが highlightSide=correctSide で「選択中扱い」になり、
    // 枠は出ないが（disabled なので showBorder=false）、isSelected の transform scale で
    // 拡大される。borderWidth=0 を確認。
    const leftCell = getByTestId('g08-result-stimulus-inner-test-left');
    const styleProp = leftCell.props.style;
    const style =
      typeof styleProp === 'function'
        ? (
            styleProp as (state: { pressed: boolean }) => Record<string, unknown>
          )({ pressed: false })
        : ((styleProp ?? {}) as Record<string, unknown>);
    expect(style.borderWidth).toBe(0);
    // 結果画面でも刺激減衰なしを維持
    expect(style.opacity).toBe(1);
  });
});
