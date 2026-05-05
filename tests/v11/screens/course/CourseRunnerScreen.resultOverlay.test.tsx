/**
 * Sprint 21 ホットフィックス（コース動線）：CourseRunner の interstitial phase で
 * ResultOverlay が**実体として**描画されているか、および「次へ」進行できるかの
 * リグレッション防止テスト。
 *
 * 背景：
 *   ユーザー実機報告（2026-04-30）：
 *   > 全ゲーム連続コースで 60 秒後に解答が出ません。単品（単体プレイ）では出ます。
 *
 *   既存の `CourseRunnerScreen.test.tsx` は phase 遷移自体は検証していたが
 *   （`getByTestId('course-runner-interstitial')` まで）、その配下に **ResultOverlay
 *   の action bar / next button / mark** が描画されているかを直接 assert していなかった。
 *   そのため、interstitial phase 内の ResultOverlay 描画ロジックが壊れた場合に
 *   検出できないリスクがあった。
 *
 *   Playwright headless での実機検証では 13 ゲームすべて 60 秒経過後に
 *   ResultOverlay が正しく表示されていることを確認済み（dev サーバー稼働中）。
 *   本テストは jest 環境でも同等の保証をすることでリグレッションを防止する。
 *
 *   ※ ユーザー報告と実機検証の乖離原因はブラウザキャッシュの可能性が高い。
 *     本テストは「コードが壊れていないこと」を継続的に保証する。
 *
 * 検証する核心動線：
 *   1. distance-reminder → game(0) → onComplete → interstitial(0) の遷移時に
 *      ResultOverlay の **action bar + next button + sr-text** が描画される
 *   2. SR テキストには「結果」「正解は…」「次へ」が含まれる（読み上げ妥当性）
 *   3. 13 ゲーム連続で同じ遷移が成立する（G-01 〜 G-13）
 *   4. interstitial の「次へ」ボタンを押すと次のゲーム phase（or cooldown）に進む
 *   5. mode='course' であること（カウントダウン表示が出る）
 *
 * 実装方針：
 *   - 各 G0XScreen は `CourseRunnerScreen.test.tsx` と同様にインライン mock 化
 *     （13 ゲームすべての本実装を抱えるとテストが重い）
 *   - mock の onComplete payload は `extractCourseGameOutcome` と
 *     `buildMarksForGame` / `buildInterstitialLabels` の両方が機能するように
 *     `trial`（G-01 のみ）/ `grading`（全ゲーム）を含める
 *   - 各ゲームの interstitial で `result-overlay-action-bar` / `result-overlay-next` /
 *     `result-overlay-sr-text` が見えることを検証
 *   - 「次へ」を押下し、次の game phase へ遷移することを検証
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// 13 ゲーム mock（CourseRunnerScreen.test.tsx と同じパターン、payload は
// `extractCourseGameOutcome` / `buildMarksForGame` / `buildInterstitialLabels`
// が成功する shape にしておく）。

jest.mock('../../../../src/screens/v11/games/G01ChangeDetectScreen', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const R = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { Pressable, Text, View } = require('react-native');
  return {
    G01ChangeDetectScreen: (props: { onComplete: (r: unknown) => void }) =>
      R.createElement(
        View,
        { testID: 'mock-G-01-play' },
        R.createElement(
          Pressable,
          {
            testID: 'mock-G-01-finish',
            onPress: () =>
              props.onComplete({
                thresholdDeg: 5,
                isCorrectForStaircase: true,
                unattempted: false,
                trial: {
                  patches: [
                    { id: 'p1', row: 0, col: 0, isChanging: true },
                    { id: 'p2', row: 1, col: 1, isChanging: false },
                  ],
                  changingPatchIds: ['p1'],
                  config: { rows: 3, cols: 3 },
                },
                grading: {
                  unattempted: false,
                  correctIds: ['p1'],
                  incorrectIds: [],
                  isCorrectForStaircase: true,
                },
              }),
          },
          R.createElement(Text, null, 'finish'),
        ),
      ),
  };
});

jest.mock('../../../../src/screens/v11/games/G02SideBySideTiltScreen', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const R = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { Pressable, Text, View } = require('react-native');
  return {
    G02SideBySideTiltScreen: (props: { onComplete: (r: unknown) => void }) =>
      R.createElement(
        View,
        { testID: 'mock-G-02-play' },
        R.createElement(
          Pressable,
          {
            testID: 'mock-G-02-finish',
            onPress: () =>
              props.onComplete({
                thresholdDeg: 4,
                isCorrectForStaircase: true,
                grading: {
                  unattempted: false,
                  correctSide: 'left',
                  userAnswer: 'left',
                  isCorrect: true,
                },
              }),
          },
          R.createElement(Text, null, 'finish'),
        ),
      ),
  };
});

jest.mock('../../../../src/screens/v11/games/G03PeripheralHuntScreen', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const R = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { Pressable, Text, View } = require('react-native');
  return {
    G03PeripheralHuntScreen: (props: { onComplete: (r: unknown) => void }) =>
      R.createElement(
        View,
        { testID: 'mock-G-03-play' },
        R.createElement(
          Pressable,
          {
            testID: 'mock-G-03-finish',
            onPress: () =>
              props.onComplete({
                thresholdDeg: 20,
                isCorrectForStaircase: true,
                grading: {
                  unattempted: false,
                  correctClockPosition: 6,
                  userAnswer: 6,
                  isCorrect: true,
                },
              }),
          },
          R.createElement(Text, null, 'finish'),
        ),
      ),
  };
});

jest.mock('../../../../src/screens/v11/games/G04ContrastDiscrimScreen', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const R = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { Pressable, Text, View } = require('react-native');
  return {
    G04ContrastDiscrimScreen: (props: { onComplete: (r: unknown) => void }) =>
      R.createElement(
        View,
        { testID: 'mock-G-04-play' },
        R.createElement(
          Pressable,
          {
            testID: 'mock-G-04-finish',
            onPress: () =>
              props.onComplete({
                thresholdContrast: 0.12,
                isCorrectForStaircase: true,
                grading: {
                  unattempted: false,
                  correctSide: 'left',
                  userAnswer: 'left',
                  isCorrect: true,
                },
              }),
          },
          R.createElement(Text, null, 'finish'),
        ),
      ),
  };
});

jest.mock('../../../../src/screens/v11/games/G05SfDiscrimScreen', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const R = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { Pressable, Text, View } = require('react-native');
  return {
    G05SfDiscrimScreen: (props: { onComplete: (r: unknown) => void }) =>
      R.createElement(
        View,
        { testID: 'mock-G-05-play' },
        R.createElement(
          Pressable,
          {
            testID: 'mock-G-05-finish',
            onPress: () =>
              props.onComplete({
                thresholdRatio: 1.4,
                isCorrectForStaircase: true,
                grading: {
                  unattempted: false,
                  correctSide: 'left',
                  userAnswer: 'left',
                  isCorrect: true,
                },
              }),
          },
          R.createElement(Text, null, 'finish'),
        ),
      ),
  };
});

jest.mock('../../../../src/screens/v11/games/G06WindowSizeScreen', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const R = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { Pressable, Text, View } = require('react-native');
  return {
    G06WindowSizeScreen: (props: { onComplete: (r: unknown) => void }) =>
      R.createElement(
        View,
        { testID: 'mock-G-06-play' },
        R.createElement(
          Pressable,
          {
            testID: 'mock-G-06-finish',
            onPress: () =>
              props.onComplete({
                thresholdRatio: 1.5,
                isCorrectForStaircase: true,
                grading: {
                  unattempted: false,
                  correctSide: 'right',
                  userAnswer: 'right',
                  isCorrect: true,
                },
              }),
          },
          R.createElement(Text, null, 'finish'),
        ),
      ),
  };
});

jest.mock('../../../../src/screens/v11/games/G07EdgeHuntScreen', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const R = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { Pressable, Text, View } = require('react-native');
  return {
    G07EdgeHuntScreen: (props: { onComplete: (r: unknown) => void }) =>
      R.createElement(
        View,
        { testID: 'mock-G-07-play' },
        R.createElement(
          Pressable,
          {
            testID: 'mock-G-07-finish',
            onPress: () =>
              props.onComplete({
                thresholdDeg: 5,
                isCorrectForStaircase: true,
                grading: {
                  unattempted: false,
                  correctIds: ['c1', 'c2'],
                  truePositiveIds: ['c1', 'c2'],
                  falsePositiveIds: [],
                  falseNegativeIds: [],
                  userSelectedIds: ['c1', 'c2'],
                  isCorrectForStaircase: true,
                },
              }),
          },
          R.createElement(Text, null, 'finish'),
        ),
      ),
  };
});

jest.mock('../../../../src/screens/v11/games/G08TiltAftereffectScreen', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const R = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { Pressable, Text, View } = require('react-native');
  return {
    G08TiltAftereffectScreen: (props: { onComplete: (r: unknown) => void }) =>
      R.createElement(
        View,
        { testID: 'mock-G-08-play' },
        R.createElement(
          Pressable,
          {
            testID: 'mock-G-08-finish',
            onPress: () =>
              props.onComplete({
                thresholdDeg: 5,
                isCorrectForStaircase: true,
                grading: {
                  unattempted: false,
                  correctDirection: 'cw',
                  userAnswer: 'cw',
                  isCorrect: true,
                },
              }),
          },
          R.createElement(Text, null, 'finish'),
        ),
      ),
  };
});

jest.mock('../../../../src/screens/v11/games/G09LateralMaskingScreen', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const R = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { Pressable, Text, View } = require('react-native');
  return {
    G09LateralMaskingScreen: (props: { onComplete: (r: unknown) => void }) =>
      R.createElement(
        View,
        { testID: 'mock-G-09-play' },
        R.createElement(
          Pressable,
          {
            testID: 'mock-G-09-finish',
            onPress: () =>
              props.onComplete({
                thresholdContrast: 0.1,
                isCorrectForStaircase: true,
                grading: {
                  unattempted: false,
                  correctOrientation: 'vertical',
                  userAnswer: 'vertical',
                  isCorrect: true,
                },
              }),
          },
          R.createElement(Text, null, 'finish'),
        ),
      ),
  };
});

jest.mock('../../../../src/screens/v11/games/G10TextureSegmentationScreen', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const R = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { Pressable, Text, View } = require('react-native');
  return {
    G10TextureSegmentationScreen: (props: { onComplete: (r: unknown) => void }) =>
      R.createElement(
        View,
        { testID: 'mock-G-10-play' },
        R.createElement(
          Pressable,
          {
            testID: 'mock-G-10-finish',
            onPress: () =>
              props.onComplete({
                thresholdDeg: 30,
                isCorrectForStaircase: true,
                grading: {
                  unattempted: false,
                  correctQuadrant: 'tl',
                  userAnswer: 'tl',
                  isCorrect: true,
                },
              }),
          },
          R.createElement(Text, null, 'finish'),
        ),
      ),
  };
});

jest.mock('../../../../src/screens/v11/games/G11VernierAlignmentScreen', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const R = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { Pressable, Text, View } = require('react-native');
  return {
    G11VernierAlignmentScreen: (props: { onComplete: (r: unknown) => void }) =>
      R.createElement(
        View,
        { testID: 'mock-G-11-play' },
        R.createElement(
          Pressable,
          {
            testID: 'mock-G-11-finish',
            onPress: () =>
              props.onComplete({
                thresholdArcmin: 2,
                isCorrectForStaircase: true,
                grading: {
                  unattempted: false,
                  correctDirection: 'right',
                  userAnswer: 'right',
                  isCorrect: true,
                },
              }),
          },
          R.createElement(Text, null, 'finish'),
        ),
      ),
  };
});

jest.mock('../../../../src/screens/v11/games/G12CrowdingScreen', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const R = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { Pressable, Text, View } = require('react-native');
  return {
    G12CrowdingScreen: (props: { onComplete: (r: unknown) => void }) =>
      R.createElement(
        View,
        { testID: 'mock-G-12-play' },
        R.createElement(
          Pressable,
          {
            testID: 'mock-G-12-finish',
            onPress: () =>
              props.onComplete({
                thresholdSpacing: 2,
                isCorrectForStaircase: true,
                grading: {
                  unattempted: false,
                  correctOrientation: 'horizontal',
                  userAnswer: 'horizontal',
                  isCorrect: true,
                },
              }),
          },
          R.createElement(Text, null, 'finish'),
        ),
      ),
  };
});

jest.mock('../../../../src/screens/v11/games/G13EmbeddedNumeralScreen', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const R = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { Pressable, Text, View } = require('react-native');
  return {
    G13EmbeddedNumeralScreen: (props: { onComplete: (r: unknown) => void }) =>
      R.createElement(
        View,
        { testID: 'mock-G-13-play' },
        R.createElement(
          Pressable,
          {
            testID: 'mock-G-13-finish',
            onPress: () =>
              props.onComplete({
                thresholdContrast: 0.1,
                isCorrectForStaircase: true,
                grading: {
                  unattempted: false,
                  embeddedDigit: 7,
                  userAnswer: 7,
                  isCorrect: true,
                },
              }),
          },
          R.createElement(Text, null, 'finish'),
        ),
      ),
  };
});

import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CourseRunnerScreen } from '../../../../src/screens/v11/course/CourseRunnerScreen';
import { getEnabledGames } from '../../../../src/state/gameRegistry';

const TODAY = '2026-04-30';

beforeEach(async () => {
  await AsyncStorage.clear();
});

/**
 * 共通レンダ：distance-reminder を瞬時に通過し、game(0) phase に到達した
 * CourseRunner を返す。
 */
function renderCourseAtFirstGame() {
  jest.useFakeTimers();
  const onExitToHome = jest.fn();
  const onOpenProgress = jest.fn();
  const utils = render(
    <CourseRunnerScreen
      distanceCm={40}
      oneEyeGuidance="off"
      sessionId="S1"
      startedAt="2026-04-30T08:00:00.000Z"
      todayLocal={TODAY}
      onExitToHome={onExitToHome}
      onOpenProgress={onOpenProgress}
      countdownOverrides={{
        distanceReminderInitialSec: 1,
        interstitialInitialSec: 10,
        cooldownInitialSec: 10,
        tickMs: 5,
      }}
    />,
  );
  // distance-reminder を抜ける
  act(() => {
    jest.advanceTimersByTime(20);
  });
  return { ...utils, onExitToHome, onOpenProgress };
}

// Sprint 22：本テストファイルは旧設計（CourseRunner が直接 ResultOverlay を描画）
// 用に書かれており、コース時の result UI は PlayScreen 内 result phase に移管された。
// 同等の検証は tests/v11/screens/games/playScreensResultPhaseTransition.test.tsx
// が担う（13 ゲームの result phase + course mode の course-bar 検証）。
describe.skip('Sprint 21 ホットフィックス（コース動線）：interstitial で ResultOverlay 実体描画', () => {
  it('1 ゲーム完了 → interstitial で ResultOverlay の action-bar / next / sr-text が描画される', () => {
    const { getByTestId, queryByTestId } = renderCourseAtFirstGame();
    const enabled = getEnabledGames();

    // 1 ゲーム目（=G-01）finish → interstitial(0) へ
    act(() => {
      fireEvent.press(getByTestId(`mock-${enabled[0].gameId}-finish`));
    });

    // CourseRunner の interstitial wrapper が見える
    expect(getByTestId('course-runner-interstitial')).toBeTruthy();

    // ResultOverlay が実体として描画されている
    //   - action bar（「次へ」ボタンを内包する領域）
    //   - 次へボタン本体
    //   - SR 用テキスト（読み上げ妥当性）
    //   - course mode のカウントダウン表示
    expect(getByTestId('result-overlay-action-bar')).toBeTruthy();
    expect(getByTestId('result-overlay-next')).toBeTruthy();
    expect(getByTestId('result-overlay-sr-text')).toBeTruthy();
    expect(getByTestId('result-overlay-countdown')).toBeTruthy();

    // 「課題：interstitial wrapper はあるが ResultOverlay 自体が無い」
    // という壊れ方を防ぐため、course-interstitial-result-screen testID も確認
    expect(getByTestId('course-interstitial-result-screen')).toBeTruthy();

    // SR テキストには G-01 の結果情報が含まれる
    const srText = getByTestId('result-overlay-sr-text').props.children;
    const srStr = Array.isArray(srText) ? srText.join('') : String(srText);
    expect(srStr).toContain('結果');
    expect(srStr).toContain('G-01');
    expect(srStr).toContain('正解は');
    expect(srStr).toContain('次へ');

    // course-runner-game wrapper は消えている（phase 遷移済み）
    expect(queryByTestId('course-runner-game')).toBeNull();

    jest.useRealTimers();
  });

  it('「次へ」ボタンを押下するとカウントダウンを待たずに次のゲーム phase に遷移する', () => {
    const { getByTestId, queryByTestId } = renderCourseAtFirstGame();
    const enabled = getEnabledGames();

    // 1 ゲーム目 finish → interstitial
    act(() => {
      fireEvent.press(getByTestId(`mock-${enabled[0].gameId}-finish`));
    });
    expect(getByTestId('course-runner-interstitial')).toBeTruthy();

    // 「次へ」を押下 → 次の game phase（=G-02）に遷移
    act(() => {
      fireEvent.press(getByTestId('result-overlay-next'));
    });
    expect(queryByTestId('course-runner-interstitial')).toBeNull();
    expect(getByTestId('course-runner-game')).toBeTruthy();
    expect(getByTestId(`mock-${enabled[1].gameId}-play`)).toBeTruthy();

    jest.useRealTimers();
  });

  it('13 ゲーム連続：各ゲーム interstitial で ResultOverlay の action-bar/next が常に描画される', () => {
    const { getByTestId, queryByTestId } = renderCourseAtFirstGame();
    const enabled = getEnabledGames();

    for (let i = 0; i < enabled.length; i++) {
      // game(i) phase で finish 押下 → interstitial(i) へ
      expect(getByTestId('course-runner-game')).toBeTruthy();
      expect(getByTestId(`mock-${enabled[i].gameId}-play`)).toBeTruthy();
      act(() => {
        fireEvent.press(getByTestId(`mock-${enabled[i].gameId}-finish`));
      });

      // interstitial(i) で ResultOverlay 実体が描画されている
      expect(getByTestId('course-runner-interstitial')).toBeTruthy();
      expect(getByTestId('result-overlay-action-bar')).toBeTruthy();
      expect(getByTestId('result-overlay-next')).toBeTruthy();
      expect(getByTestId('result-overlay-sr-text')).toBeTruthy();
      expect(getByTestId('result-overlay-countdown')).toBeTruthy();

      const srText = getByTestId('result-overlay-sr-text').props.children;
      const srStr = Array.isArray(srText) ? srText.join('') : String(srText);
      expect(srStr).toContain(enabled[i].gameId);
      expect(srStr).toContain('結果');
      expect(srStr).toContain('次へ');

      // 「次へ」を押下して次へ
      act(() => {
        fireEvent.press(getByTestId('result-overlay-next'));
      });
    }

    // 全ゲーム終了後は cooldown へ
    expect(queryByTestId('course-runner-interstitial')).toBeNull();
    expect(getByTestId('course-runner-cooldown')).toBeTruthy();

    jest.useRealTimers();
  });

  it('G-04 / G-10 / G-11 のような構造改訂ゲームでも interstitial で ResultOverlay が出る', () => {
    // Sprint 21 で UI 構造を改訂したゲーム（直接選択化、4 象限化、上下構造）を
    // 代表 3 件として、interstitial 遷移が壊れていないことを確認。
    // ※ 13 ゲーム共通の遷移は前テストで既に担保済みだが、
    //   構造改訂ゲームは将来のリグレッションリスクが高いため明示的に確認する。
    const { getByTestId } = renderCourseAtFirstGame();
    const enabled = getEnabledGames();
    const targets: ReadonlyArray<typeof enabled[number]['gameId']> = [
      'G-04',
      'G-10',
      'G-11',
    ];

    for (const targetId of targets) {
      // 各 target ゲームの index を求めて、そこまで進める
      const targetIdx = enabled.findIndex((g) => g.gameId === targetId);
      // 現在 index を逆算（前のテスト分の進行がないので毎回 0 から）
      // …とできないため、各 target ごとに renderCourseAtFirstGame をやり直す
      // …のではなく、このループ内で 0 から target まで連続的に進める。
      // 簡素化のため、target ごとに renderCourseAtFirstGame しなおす
      // のではなく、配列の最後の target まで進める形にする。
      // 実装上は target を昇順で並べているので順次 finish → next で
      // 進めれば良い。
      void targetIdx;
    }

    // 配列順 (G-04 < G-10 < G-11) で進める
    let cursor = 0;
    for (const targetId of targets) {
      const targetIdx = enabled.findIndex((g) => g.gameId === targetId);
      // cursor から targetIdx-1 まで finish + next で進める
      while (cursor < targetIdx) {
        act(() => {
          fireEvent.press(getByTestId(`mock-${enabled[cursor].gameId}-finish`));
        });
        act(() => {
          fireEvent.press(getByTestId('result-overlay-next'));
        });
        cursor += 1;
      }
      // target ゲームに到達 → finish
      expect(getByTestId(`mock-${targetId}-play`)).toBeTruthy();
      act(() => {
        fireEvent.press(getByTestId(`mock-${targetId}-finish`));
      });
      // interstitial で ResultOverlay の核心要素が描画されている
      expect(getByTestId('course-runner-interstitial')).toBeTruthy();
      expect(getByTestId('result-overlay-action-bar')).toBeTruthy();
      expect(getByTestId('result-overlay-next')).toBeTruthy();
      expect(getByTestId('result-overlay-sr-text')).toBeTruthy();
      const srText = getByTestId('result-overlay-sr-text').props.children;
      const srStr = Array.isArray(srText) ? srText.join('') : String(srText);
      expect(srStr).toContain(targetId);
      // 次へボタンを押して次のゲームへ進む
      act(() => {
        fireEvent.press(getByTestId('result-overlay-next'));
      });
      cursor = targetIdx + 1;
    }

    jest.useRealTimers();
  });

  it('interstitial の ResultOverlay は mode="course" として描画される（カウントダウン10秒）', () => {
    const { getByTestId } = renderCourseAtFirstGame();
    const enabled = getEnabledGames();
    act(() => {
      fireEvent.press(getByTestId(`mock-${enabled[0].gameId}-finish`));
    });
    // course mode の ResultOverlay は course-bar と countdown を持つ
    expect(getByTestId('result-overlay-course-bar')).toBeTruthy();
    expect(getByTestId('result-overlay-countdown')).toBeTruthy();
    // 初期カウントダウンは interstitialInitialSec=10 と同じ
    expect(getByTestId('result-overlay-countdown').props.children).toEqual([
      '⏱ ',
      10,
    ]);
    jest.useRealTimers();
  });
});
