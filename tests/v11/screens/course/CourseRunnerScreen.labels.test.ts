/**
 * `buildInterstitialLabels` ユニットテスト（Sprint 18 ホットフィックス）。
 *
 * F-10 受け入れ基準：
 *   - コース時の interstitial で「正解は『…』」と「あなたの回答『…』」が
 *     具体的な日本語ラベルで併記される
 *
 * Sprint 18 までは G-01 / G-02 のみ実装、G-03〜G-13 は `'—'` フォールバックだった。
 * ホットフィックスで全 13 ゲームに拡張したため、各ゲームの実 grading shape を
 * mock として渡し「`'—'` ではなく具体的日本語ラベル」が返ることを検証する。
 *
 * 注意：本テストは純粋なロジック検証だが、`CourseRunnerScreen` モジュールには
 * AsyncStorage 経由の永続化処理が同居しているため、import チェーンが native
 * モジュールに到達する。よって既存統合テスト同様に AsyncStorage を mock する。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { buildInterstitialLabels } from '../../../../src/screens/v11/course/CourseRunnerScreen';

describe('buildInterstitialLabels — 全 13 ゲームでラベルが「—」フォールバックにならない', () => {
  it('G-01：選択 ID から「N 列 M 行目」を組み立てる', () => {
    const result = {
      thresholdDeg: 5,
      isCorrectForStaircase: true,
      unattempted: false,
      trial: {
        patches: [
          { id: 'r0c0', isChanging: false },
          { id: 'r0c1', isChanging: true },
          { id: 'r1c0', isChanging: false },
        ],
      },
      grading: {
        correctIds: ['r0c1'],
        incorrectIds: [],
      },
    };
    const labels = buildInterstitialLabels('G-01', result);
    expect(labels.correctAnswer).not.toBe('—');
    expect(labels.correctAnswer).toMatch(/列.*行目/);
    expect(labels.userAnswer).not.toBe('—');
    expect(labels.userAnswer).not.toBeNull();
  });

  it('G-02：correctSide / userAnswer から「左」「右」ラベル', () => {
    const result = {
      thresholdDeg: 4,
      isCorrectForStaircase: true,
      grading: {
        correctSide: 'left' as const,
        userAnswer: 'left' as const,
        isCorrect: true,
        unattempted: false,
      },
    };
    const labels = buildInterstitialLabels('G-02', result);
    expect(labels.correctAnswer).not.toBe('—');
    expect(labels.correctAnswer).toMatch(/左|右/);
    expect(labels.userAnswer).not.toBe('—');
    expect(labels.userAnswer).not.toBeNull();
  });

  it('G-03：correctClockPosition から「3 時の方向」ラベル', () => {
    const result = {
      thresholdDeg: 20,
      isCorrectForStaircase: true,
      grading: {
        correctClockPosition: '3' as const,
        correctPositionIndex: 2 as const,
        userAnswer: '3' as const,
        isCorrect: true,
        unattempted: false,
      },
    };
    const labels = buildInterstitialLabels('G-03', result);
    expect(labels.correctAnswer).not.toBe('—');
    expect(labels.correctAnswer).toMatch(/時/);
    expect(labels.userAnswer).not.toBe('—');
    expect(labels.userAnswer).toMatch(/時/);
  });

  it('G-04：correctSide から「左が濃い」ラベル', () => {
    const result = {
      thresholdContrast: 0.12,
      isCorrectForStaircase: true,
      grading: {
        correctSide: 'left' as const,
        userAnswer: 'left' as const,
        isCorrect: true,
        unattempted: false,
      },
    };
    const labels = buildInterstitialLabels('G-04', result);
    expect(labels.correctAnswer).not.toBe('—');
    expect(labels.correctAnswer).toMatch(/濃|薄/);
    expect(labels.userAnswer).not.toBe('—');
    expect(labels.userAnswer).not.toBeNull();
  });

  it('G-05：correctSide から「左が細かい」ラベル', () => {
    const result = {
      thresholdRatio: 1.4,
      isCorrectForStaircase: true,
      grading: {
        correctSide: 'right' as const,
        userAnswer: 'right' as const,
        isCorrect: true,
        unattempted: false,
      },
    };
    const labels = buildInterstitialLabels('G-05', result);
    expect(labels.correctAnswer).not.toBe('—');
    expect(labels.correctAnswer).toMatch(/細|粗/);
    expect(labels.userAnswer).not.toBe('—');
    expect(labels.userAnswer).not.toBeNull();
  });

  it('G-06：correctSide から「左が大きい」ラベル', () => {
    const result = {
      thresholdRatio: 1.5,
      isCorrectForStaircase: true,
      grading: {
        correctSide: 'left' as const,
        userAnswer: 'left' as const,
        isCorrect: true,
        unattempted: false,
      },
    };
    const labels = buildInterstitialLabels('G-06', result);
    expect(labels.correctAnswer).not.toBe('—');
    expect(labels.correctAnswer).toMatch(/大|小/);
    expect(labels.userAnswer).not.toBe('—');
    expect(labels.userAnswer).not.toBeNull();
  });

  it('G-07：correctIds 配列から「N 行 M 列」連結ラベル', () => {
    const result = {
      thresholdDeg: 5,
      isCorrectForStaircase: true,
      grading: {
        correctIds: ['r1c1', 'r1c3', 'r2c2'],
        userSelectedIds: ['r1c1', 'r1c3', 'r2c2'],
        truePositiveIds: ['r1c1', 'r1c3', 'r2c2'],
        falsePositiveIds: [],
        falseNegativeIds: [],
        isCorrect: true,
        unattempted: false,
      },
    };
    const labels = buildInterstitialLabels('G-07', result);
    expect(labels.correctAnswer).not.toBe('—');
    // buildG07CorrectAnswerLabel は「・」連結 + 行列ラベル
    expect(labels.correctAnswer).toMatch(/行|列/);
    expect(labels.userAnswer).not.toBe('—');
    // 全部正解時：「3/3 個正解」
    expect(labels.userAnswer).toMatch(/個正解/);
  });

  it('G-08：correctDirection から「時計回り」ラベル', () => {
    const result = {
      thresholdDeg: 5,
      isCorrectForStaircase: true,
      grading: {
        correctDirection: 'cw' as const,
        userAnswer: 'cw' as const,
        isCorrect: true,
        unattempted: false,
      },
    };
    const labels = buildInterstitialLabels('G-08', result);
    expect(labels.correctAnswer).not.toBe('—');
    expect(labels.correctAnswer).toMatch(/時計回り/);
    expect(labels.userAnswer).not.toBe('—');
    expect(labels.userAnswer).toMatch(/時計回り/);
  });

  it('G-09：correctOrientation から「中央は縦縞」ラベル', () => {
    const result = {
      thresholdContrast: 0.1,
      isCorrectForStaircase: true,
      grading: {
        correctOrientation: 'vertical' as const,
        userAnswer: 'vertical' as const,
        isCorrect: true,
        unattempted: false,
      },
    };
    const labels = buildInterstitialLabels('G-09', result);
    expect(labels.correctAnswer).not.toBe('—');
    expect(labels.correctAnswer).toMatch(/縦|横/);
    expect(labels.userAnswer).not.toBe('—');
    expect(labels.userAnswer).not.toBeNull();
  });

  it('G-10：correctQuadrant から「左上 / 右下 等」ラベル', () => {
    const result = {
      thresholdDeg: 30,
      isCorrectForStaircase: true,
      grading: {
        correctQuadrant: 'top-left' as const,
        userAnswer: 'top-left' as const,
        isCorrect: true,
        unattempted: false,
      },
    };
    const labels = buildInterstitialLabels('G-10', result);
    expect(labels.correctAnswer).not.toBe('—');
    expect(labels.correctAnswer).toMatch(/上|下/);
    expect(labels.userAnswer).not.toBe('—');
    expect(labels.userAnswer).not.toBeNull();
  });

  it('G-11：correctDirection から「左にずれている / 右にずれている」ラベル', () => {
    const result = {
      thresholdArcmin: 2,
      isCorrectForStaircase: true,
      grading: {
        correctDirection: 'left' as const,
        userAnswer: 'left' as const,
        isCorrect: true,
        unattempted: false,
      },
    };
    const labels = buildInterstitialLabels('G-11', result);
    expect(labels.correctAnswer).not.toBe('—');
    expect(labels.correctAnswer).toMatch(/ずれ/);
    expect(labels.userAnswer).not.toBe('—');
    expect(labels.userAnswer).not.toBeNull();
  });

  it('G-12：correctOrientation から「垂直 / 水平 / 斜め」ラベル', () => {
    const result = {
      thresholdSpacing: 2,
      isCorrectForStaircase: true,
      grading: {
        correctOrientation: 'vertical' as const,
        userAnswer: 'vertical' as const,
        isCorrect: true,
        unattempted: false,
      },
    };
    const labels = buildInterstitialLabels('G-12', result);
    expect(labels.correctAnswer).not.toBe('—');
    expect(labels.correctAnswer).toMatch(/垂直|水平|斜め/);
    expect(labels.userAnswer).not.toBe('—');
    expect(labels.userAnswer).not.toBeNull();
  });

  it('G-13：embeddedDigit から「3」のような数字ラベル', () => {
    const result = {
      thresholdContrast: 0.1,
      isCorrectForStaircase: true,
      grading: {
        embeddedDigit: 3 as const,
        userAnswer: 3 as const,
        isCorrect: true,
        unattempted: false,
      },
    };
    const labels = buildInterstitialLabels('G-13', result);
    expect(labels.correctAnswer).not.toBe('—');
    expect(labels.correctAnswer).toMatch(/[0-9]/);
    expect(labels.userAnswer).not.toBe('—');
    expect(labels.userAnswer).toMatch(/[0-9]/);
  });

  it('grading が欠けている場合：correctAnswer は「—」、userAnswer は null（=「未回答」表示）', () => {
    // grading 完全欠損
    const labels = buildInterstitialLabels('G-04', {
      thresholdContrast: 0.12,
      isCorrectForStaircase: false,
    });
    expect(labels.correctAnswer).toBe('—');
    expect(labels.userAnswer).toBeNull();
  });

  it('未回答（userAnswer=null）の G-02：correct は出るが userAnswer は null', () => {
    const result = {
      thresholdDeg: 4,
      isCorrectForStaircase: false,
      grading: {
        correctSide: 'left' as const,
        userAnswer: null,
        isCorrect: false,
        unattempted: true,
      },
    };
    const labels = buildInterstitialLabels('G-02', result);
    expect(labels.correctAnswer).not.toBe('—');
    expect(labels.correctAnswer).toMatch(/左|右/);
    expect(labels.userAnswer).toBeNull();
  });
});
