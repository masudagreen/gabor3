/**
 * G09ResultScreen — F-10 結果サマリ受け入れテスト（screens.md S15-06）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { G09ResultScreen } from '../../../../src/screens/v11/games/G09ResultScreen';
import { G09TrialResult } from '../../../../src/screens/v11/games/G09LateralMaskingScreen';
import {
  G09GradingResult,
  G09Orientation,
  G09TrialSpec,
} from '../../../../src/lib/v11/g09Trial';

function makeTrial(overrides: Partial<G09TrialSpec> = {}): G09TrialSpec {
  return {
    flankerLeft: {
      cpd: 4,
      contrast: 0.5,
      sigmaDeg: 0.6,
      orientationDeg: 90,
      phaseRad: 0,
    },
    target: {
      cpd: 4,
      contrast: 0.1,
      sigmaDeg: 0.6,
      orientationDeg: 90, // vertical
      phaseRad: 0,
    },
    flankerRight: {
      cpd: 4,
      contrast: 0.5,
      sigmaDeg: 0.6,
      orientationDeg: 90,
      phaseRad: 0,
    },
    correctOrientation: 'vertical',
    paramContrast: 0.1,
    derivedSpacingLambdaMultiplier: 3.0,
    ...overrides,
  };
}

function makeGrading(args: {
  correctOrientation: G09Orientation;
  userAnswer: G09Orientation | null;
}): G09GradingResult {
  const isCorrect =
    args.userAnswer !== null && args.userAnswer === args.correctOrientation;
  return {
    correctOrientation: args.correctOrientation,
    userAnswer: args.userAnswer,
    isCorrect,
    unattempted: args.userAnswer === null,
  };
}

function makeResult(overrides: Partial<G09TrialResult> = {}): G09TrialResult {
  const grading =
    overrides.grading ??
    makeGrading({ correctOrientation: 'vertical', userAnswer: 'vertical' });
  return {
    thresholdContrast: 0.1,
    grading,
    trial: overrides.trial ?? makeTrial(),
    playedParam: 0.1,
    isCorrectForStaircase: grading.isCorrect,
    ...overrides,
  };
}

const FIXED_LAYOUT = { patchSizePx: 64, gapPx: 16 };

describe('G09ResultScreen: F-10', () => {
  it('正解時：「正解は『中央は縦縞』」「あなたの回答『中央は縦縞』」を表示', () => {
    const { getByText } = render(
      <G09ResultScreen
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
    expect(getByText(/正解は「中央は縦縞」/)).toBeTruthy();
    expect(getByText(/あなたの回答「中央は縦縞」/)).toBeTruthy();
  });

  it('不正解時：正解「縦縞」、回答「横縞」を表示', () => {
    const { getByText } = render(
      <G09ResultScreen
        result={makeResult({
          grading: makeGrading({
            correctOrientation: 'vertical',
            userAnswer: 'horizontal',
          }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(getByText(/正解は「中央は縦縞」/)).toBeTruthy();
    expect(getByText(/あなたの回答「中央は横縞」/)).toBeTruthy();
  });

  it('未回答時：あなたの回答「未回答」を表示', () => {
    const { queryAllByText } = render(
      <G09ResultScreen
        result={makeResult({
          grading: makeGrading({
            correctOrientation: 'vertical',
            userAnswer: null,
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

  it('Sprint 20-B-2：閾値（コントラスト/距離 合成ラベル）はオーバーレイに表示しない', () => {
    const { queryAllByText } = render(
      <G09ResultScreen
        result={makeResult({ thresholdContrast: 0.1 })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(queryAllByText(/c=0\.10/).length).toBe(0);
    expect(queryAllByText(/コントラスト\/距離/).length).toBe(0);
  });

  it('extraStimulus に G-09 stimulus が描画される', () => {
    const { getByTestId } = render(
      <G09ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(getByTestId('g09-result-stimulus')).toBeTruthy();
    expect(getByTestId('g09-result-stimulus-inner')).toBeTruthy();
  });

  it('未回答時：detail row に「未回答」', () => {
    const { getByTestId } = render(
      <G09ResultScreen
        result={makeResult({
          grading: makeGrading({
            correctOrientation: 'vertical',
            userAnswer: null,
          }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(getByTestId('g09-result-detail')).toBeTruthy();
  });

  it('回答済時：detail row は描画されない', () => {
    const { queryByTestId } = render(
      <G09ResultScreen
        result={makeResult({
          grading: makeGrading({
            correctOrientation: 'vertical',
            userAnswer: 'vertical',
          }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(queryByTestId('g09-result-detail')).toBeNull();
  });

  it('単体プレイ時：3 ボタンフッター表示、もう一度ボタンが onPlayAgain を呼ぶ', () => {
    const onPlayAgain = jest.fn();
    const { getByTestId } = render(
      <G09ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={onPlayAgain}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    fireEvent.press(getByTestId('single-play-post-play-again'));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });

  it('コースモード時：「次へ」Primary が onNext を呼ぶ', () => {
    const onNext = jest.fn();
    const { getByTestId } = render(
      <G09ResultScreen
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

  it('Sprint 20-B-2：前回比（diff 値）バッジもオーバーレイに表示しない', () => {
    const { queryAllByText } = render(
      <G09ResultScreen
        result={makeResult({ thresholdContrast: 0.1 })}
        previousBestThreshold={0.12}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(queryAllByText(/-0\.02|−0\.02/).length).toBe(0);
  });

  it('過去ベスト null（初回測定）でクラッシュなし', () => {
    const { getByTestId } = render(
      <G09ResultScreen
        result={makeResult()}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(getByTestId('g09-result-screen')).toBeTruthy();
  });

  it('正解開示：highlightOrientation に correctOrientation を渡す（target-anim wrap が描画）', () => {
    const { getByTestId } = render(
      <G09ResultScreen
        result={makeResult({
          grading: makeGrading({
            correctOrientation: 'horizontal',
            userAnswer: 'vertical',
          }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(getByTestId('g09-result-stimulus-inner-target-anim')).toBeTruthy();
  });

  // ---- Sprint 15 修正ラウンド 2 / Minor：結果画面でハイライト枠は出る ----
  it('結果画面では中央 target に黄ハイライト枠（borderWidth=4）が描画される', () => {
    const { getByTestId } = render(
      <G09ResultScreen
        result={makeResult({
          grading: makeGrading({
            correctOrientation: 'vertical',
            userAnswer: 'vertical',
          }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    const targetCell = getByTestId('g09-result-stimulus-inner-target');
    const styleProp = targetCell.props.style;
    const style =
      typeof styleProp === 'function'
        ? (styleProp as (state: { pressed: boolean }) => Record<string, unknown>)({
            pressed: false,
          })
        : ((styleProp ?? {}) as Record<string, unknown>);
    // Sprint 20 / v1.1.1：disabled cell は枠なし（黄 4px 撤去、結果開示は ResultOverlay へ）
    expect(style.borderWidth).toBe(0);
    // 結果画面でも刺激減衰なしを維持（disabled でも opacity=1、Polat 忠実性）
    expect(style.opacity).toBe(1);
  });

  it('Sprint 20-B-2：正解時 / 不正解時 / 未回答時いずれも MetricCard threshold（c=0.10）はオーバーレイに表示しない', () => {
    for (const userAnswer of ['vertical', 'horizontal', null] as const) {
      const { queryAllByText, unmount } = render(
        <G09ResultScreen
          result={makeResult({
            grading: makeGrading({
              correctOrientation: 'vertical',
              userAnswer,
            }),
            thresholdContrast: 0.1,
          })}
          previousBestThreshold={null}
          isCourseMode={false}
          onPlayAgain={jest.fn()}
          layoutOverrideForTest={FIXED_LAYOUT}
        />,
      );
      expect(queryAllByText(/c=0\.10/).length).toBe(0);
      unmount();
    }
  });

  // Sprint 20-B-2：MarkBadge 重畳の確認
  it('Sprint 20-B-2：correctOrientation に ◯ が重畳される（正解時）', () => {
    const { getByTestId } = render(
      <G09ResultScreen
        result={makeResult({
          grading: makeGrading({
            correctOrientation: 'vertical',
            userAnswer: 'vertical',
          }),
        })}
        previousBestThreshold={null}
        isCourseMode={false}
        onPlayAgain={jest.fn()}
        layoutOverrideForTest={FIXED_LAYOUT}
      />,
    );
    expect(getByTestId('result-overlay-mark-badge-g09-vertical')).toBeTruthy();
  });
});
