/**
 * G03ResultScreen — F-10 結果サマリ受け入れテスト（screens.md S11-03）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { G03ResultScreen } from '../../../../src/screens/v11/games/G03ResultScreen';
import { G03TrialResult } from '../../../../src/screens/v11/games/G03PeripheralHuntScreen';
import {
  G03ClockPosition,
  G03GradingResult,
  G03TrialSpec,
  GAME3_V11,
  G03_CLOCK_POSITIONS,
  indexForClockPosition,
} from '../../../../src/lib/v11/g03Trial';

function makeTrial(oddPos: G03ClockPosition = '3'): G03TrialSpec {
  const oddIdx = indexForClockPosition(oddPos);
  const patches = Array.from({ length: 8 }, (_, i) => ({
    cpd: GAME3_V11.cpd,
    contrast: GAME3_V11.baseContrast,
    sigmaDeg: GAME3_V11.sigmaDeg,
    orientationDeg: i === oddIdx ? 70 : 45,
    phaseRad: 0,
  }));
  return {
    patches,
    oddPositionIndex: oddIdx,
    oddClockPosition: oddPos,
    baseOrientationDeg: 45,
    oddOrientationDeg: 70,
    paramValueDeg: 25,
    eccentricityDeg: 8,
  };
}

function makeGrading(args: {
  correctClockPosition: G03ClockPosition;
  userAnswer: G03ClockPosition | null;
}): G03GradingResult {
  const isCorrect =
    args.userAnswer !== null && args.userAnswer === args.correctClockPosition;
  return {
    correctClockPosition: args.correctClockPosition,
    correctPositionIndex: indexForClockPosition(args.correctClockPosition),
    userAnswer: args.userAnswer,
    isCorrect,
    unattempted: args.userAnswer === null,
  };
}

function makeResult(overrides: Partial<G03TrialResult> = {}): G03TrialResult {
  const grading =
    overrides.grading ??
    makeGrading({ correctClockPosition: '3', userAnswer: '3' });
  return {
    thresholdDeg: 25.0,
    grading,
    trial: overrides.trial ?? makeTrial('3'),
    playedParam: 25,
    isCorrectForStaircase: grading.isCorrect,
    ...overrides,
  };
}

const FIXED_LAYOUT = { framePx: 280, patchSizePx: 50 };

describe('G03ResultScreen: F-10', () => {
  it('正解時：「正解は『3 時の方向』」「あなたの回答『3 時の方向』」を表示', () => {
    const { getByText } = render(
      <G03ResultScreen
        result={makeResult({
          grading: makeGrading({
            correctClockPosition: '3',
            userAnswer: '3',
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
    expect(getByText(/正解は「3 時の方向」/)).toBeTruthy();
    expect(getByText(/あなたの回答「3 時の方向」/)).toBeTruthy();
  });

  it('不正解時：「あなたの回答『6 時の方向』」を表示', () => {
    const { getByText } = render(
      <G03ResultScreen
        result={makeResult({
          grading: makeGrading({
            correctClockPosition: '3',
            userAnswer: '6',
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
    expect(getByText(/あなたの回答「6 時の方向」/)).toBeTruthy();
  });

  it('未回答時：「あなたの回答『未回答』」を表示', () => {
    const { getByText } = render(
      <G03ResultScreen
        result={makeResult({
          grading: makeGrading({
            correctClockPosition: '3',
            userAnswer: null,
          }),
          isCorrectForStaircase: false,
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(getByText(/あなたの回答「未回答」/)).toBeTruthy();
  });

  it('Sprint 20-B-2：閾値（向き差・°）はオーバーレイに表示しない', () => {
    const { queryByText } = render(
      <G03ResultScreen
        result={makeResult({ thresholdDeg: 25.0 })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(queryByText('25.0°')).toBeNull();
    expect(queryByText('向き差')).toBeNull();
  });

  it('Sprint 20-B-2：前回比（初回測定）もオーバーレイに表示しない', () => {
    const { queryAllByText } = render(
      <G03ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(queryAllByText('初回測定').length).toBe(0);
  });

  it('単体モード：3 ボタンフッター（同じゲームをもう一度 / 一覧へ戻る / ホーム）', () => {
    const { getByTestId } = render(
      <G03ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    // SinglePlayPostFooter が ResultOverlay 内で描画される
    expect(getByTestId('result-overlay-single-footer')).toBeTruthy();
    expect(getByTestId('single-play-post-play-again')).toBeTruthy();
    expect(getByTestId('single-play-post-back-to-list')).toBeTruthy();
    expect(getByTestId('single-play-post-go-home')).toBeTruthy();
  });

  it('正解開示：g03-result-stimulus（RadialEightStimulus）が埋め込まれ、矢印が表示される', () => {
    const { getByTestId } = render(
      <G03ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(getByTestId('g03-result-stimulus')).toBeTruthy();
    // RadialEightStimulus が correctIndexHighlight を受けて矢印を出す
    expect(getByTestId('g03-correct-arrow')).toBeTruthy();
  });

  it('Sprint 20-B-2：前回比（改善 / 悪化）バッジもオーバーレイに表示しない', () => {
    const { queryByText, queryAllByText } = render(
      <G03ResultScreen
        result={makeResult({ thresholdDeg: 22.0 })}
        previousBestThreshold={25}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(queryByText('-3.0')).toBeNull();
    expect(queryAllByText(/改善/).length).toBe(0);
  });

  it('「もう一度」タップで onPlayAgain が呼ばれる', () => {
    const onPlayAgain = jest.fn();
    const { getByText } = render(
      <G03ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={onPlayAgain}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    // SinglePlayPostFooter のボタン文言は「同じゲームをもう一度」
    fireEvent.press(getByText('同じゲームをもう一度'));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });

  // Sprint 20-B-2：MarkBadge 重畳の確認
  it('Sprint 20-B-2：correctClockPosition に ◯ が重畳される（正解時）', () => {
    const { getByTestId } = render(
      <G03ResultScreen
        result={makeResult({
          grading: makeGrading({ correctClockPosition: '3', userAnswer: '3' }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(getByTestId('result-overlay-mark-badge-g03-pos-3')).toBeTruthy();
  });
});

describe('G03ResultScreen: 各時計位置', () => {
  const expectedLabel: Record<string, string> = {
    '12': '12 時の方向',
    '1.5': '1 時 30 分の方向',
    '3': '3 時の方向',
    '4.5': '4 時 30 分の方向',
    '6': '6 時の方向',
    '7.5': '7 時 30 分の方向',
    '9': '9 時の方向',
    '10.5': '10 時 30 分の方向',
  };
  it.each(G03_CLOCK_POSITIONS.map((p) => [p]))(
    '正解 %s → 日本語ラベルが「正解は」「あなたの回答」両方に表示',
    (pos) => {
      const label = expectedLabel[pos];
      const { getByText } = render(
        <G03ResultScreen
          result={makeResult({
            grading: makeGrading({
              correctClockPosition: pos,
              userAnswer: pos,
            }),
            trial: makeTrial(pos),
          })}
          previousBestThreshold={null}
          isCourseMode={false}
          onPlayAgain={jest.fn()}
          onBackToList={jest.fn()}
          onGoHome={jest.fn()}
          layoutOverrideForTest={FIXED_LAYOUT}
        />,
      );
      expect(getByText(new RegExp(`正解は「${label}」`))).toBeTruthy();
      expect(getByText(new RegExp(`あなたの回答「${label}」`))).toBeTruthy();
    },
  );
});
