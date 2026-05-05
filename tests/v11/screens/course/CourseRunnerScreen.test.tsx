/**
 * CourseRunnerScreen — S18-02 統合テスト。
 *
 * 13 ゲームの実体は重いので各ゲームスクリーンを mock する。テストは
 * 「finish」ボタンを押すと当該ゲームの onComplete が呼ばれる仕組み。
 *
 * 検証ポイント：
 *   - phase 遷移：distance-reminder → game(0) → interstitial(0) → game(1) → ...
 *     → cooldown → complete
 *   - 中断ダイアログ：× タップで開く、「中断する」で onExitToHome 発火
 *   - 完了時：SessionRecord / DailyStats / Streak が永続化される
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// jest.mock の factory は hoisted されるため、外部関数を参照できない。
// 各 mock を独立したインライン factory として記述する。

jest.mock('../../../../src/screens/v11/games/G01ChangeDetectScreen', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const R = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { Pressable, Text, View } = require('react-native');
  return {
    // paused props は中断ダイアログ表示中の伝播を検証するため受け取り、
    // 専用の testID に値を含めて外部から観察可能にする（既存テストへの影響なし）。
    G01ChangeDetectScreen: (props: {
      onComplete: (r: unknown) => void;
      onAbort: () => void;
      paused?: boolean;
      onCourseAdvance?: () => void;
    }) => {
      // 各 render 時の paused 値を globalThis 上のテスト用ログに push する
      // （Modal 表示中は testID で探索できないため、こちらで観察する）。
      const log = (
        globalThis as { __mockG01PausedLog?: Array<boolean | undefined> }
      ).__mockG01PausedLog;
      if (Array.isArray(log)) log.push(props.paused);
      // paused の真偽に応じて、testID を切り替えた marker View を条件付きで出す。
      // testID を動的書き換えにすると React Test Renderer のクエリで取りこぼす
      // 場合があるため、true / false それぞれの専用ノードを使い分ける形にする。
      const pausedMarker = props.paused === true
        ? R.createElement(View, { testID: 'mock-G-01-paused-true' })
        : R.createElement(View, { testID: 'mock-G-01-paused-false' });
      return R.createElement(
        View,
        { testID: 'mock-G-01-play' },
        pausedMarker,
        R.createElement(
          Pressable,
          {
            testID: 'mock-G-01-finish',
            onPress: () =>
              props.onComplete({
                thresholdDeg: 5,
                isCorrectForStaircase: true,
                unattempted: false,
                trial: { changingPatchIds: ['p1'] },
              }),
          },
          R.createElement(Text, null, 'finish'),
        ),
        R.createElement(
          Pressable,
          { testID: 'mock-G-01-abort', onPress: props.onAbort },
          R.createElement(Text, null, 'abort'),
        ),
        R.createElement(
          Pressable,
          {
            testID: 'mock-G-01-advance',
            onPress: () => (props as { onCourseAdvance?: () => void }).onCourseAdvance && (props as { onCourseAdvance?: () => void }).onCourseAdvance!(),
          },
          R.createElement(Text, null, 'advance'),
        ),
      );
    },
  };
});

jest.mock('../../../../src/screens/v11/games/G02SideBySideTiltScreen', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const R = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { Pressable, Text, View } = require('react-native');
  return {
    G02SideBySideTiltScreen: (props: {
      onComplete: (r: unknown) => void;
      onAbort: () => void;
      onCourseAdvance?: () => void;
    }) =>
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
                },
              }),
          },
          R.createElement(Text, null, 'finish'),
        ),
        R.createElement(
          Pressable,
          { testID: 'mock-G-02-abort', onPress: props.onAbort },
          R.createElement(Text, null, 'abort'),
        ),
        R.createElement(
          Pressable,
          { testID: 'mock-G-02-advance', onPress: () => props.onCourseAdvance && props.onCourseAdvance() },
          R.createElement(Text, null, 'advance'),
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
    G03PeripheralHuntScreen: (props: {
      onComplete: (r: unknown) => void;
      onAbort: () => void;
      onCourseAdvance?: () => void;
    }) =>
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
                grading: { unattempted: false },
              }),
          },
          R.createElement(Text, null, 'finish'),
        ),
        R.createElement(
          Pressable,
          { testID: 'mock-G-03-abort', onPress: props.onAbort },
          R.createElement(Text, null, 'abort'),
        ),
        R.createElement(
          Pressable,
          { testID: 'mock-G-03-advance', onPress: () => props.onCourseAdvance && props.onCourseAdvance() },
          R.createElement(Text, null, 'advance'),
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
    G04ContrastDiscrimScreen: (props: {
      onComplete: (r: unknown) => void;
      onAbort: () => void;
      onCourseAdvance?: () => void;
    }) =>
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
                grading: { unattempted: false },
              }),
          },
          R.createElement(Text, null, 'finish'),
        ),
        R.createElement(
          Pressable,
          { testID: 'mock-G-04-abort', onPress: props.onAbort },
          R.createElement(Text, null, 'abort'),
        ),
        R.createElement(
          Pressable,
          { testID: 'mock-G-04-advance', onPress: () => props.onCourseAdvance && props.onCourseAdvance() },
          R.createElement(Text, null, 'advance'),
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
    G05SfDiscrimScreen: (props: {
      onComplete: (r: unknown) => void;
      onAbort: () => void;
      onCourseAdvance?: () => void;
    }) =>
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
                grading: { unattempted: false },
              }),
          },
          R.createElement(Text, null, 'finish'),
        ),
        R.createElement(
          Pressable,
          { testID: 'mock-G-05-abort', onPress: props.onAbort },
          R.createElement(Text, null, 'abort'),
        ),
        R.createElement(
          Pressable,
          { testID: 'mock-G-05-advance', onPress: () => props.onCourseAdvance && props.onCourseAdvance() },
          R.createElement(Text, null, 'advance'),
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
    G06WindowSizeScreen: (props: {
      onComplete: (r: unknown) => void;
      onAbort: () => void;
      onCourseAdvance?: () => void;
    }) =>
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
                grading: { unattempted: false },
              }),
          },
          R.createElement(Text, null, 'finish'),
        ),
        R.createElement(
          Pressable,
          { testID: 'mock-G-06-abort', onPress: props.onAbort },
          R.createElement(Text, null, 'abort'),
        ),
        R.createElement(
          Pressable,
          { testID: 'mock-G-06-advance', onPress: () => props.onCourseAdvance && props.onCourseAdvance() },
          R.createElement(Text, null, 'advance'),
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
    G07EdgeHuntScreen: (props: {
      onComplete: (r: unknown) => void;
      onAbort: () => void;
      onCourseAdvance?: () => void;
    }) =>
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
                grading: { unattempted: false },
              }),
          },
          R.createElement(Text, null, 'finish'),
        ),
        R.createElement(
          Pressable,
          { testID: 'mock-G-07-abort', onPress: props.onAbort },
          R.createElement(Text, null, 'abort'),
        ),
        R.createElement(
          Pressable,
          { testID: 'mock-G-07-advance', onPress: () => props.onCourseAdvance && props.onCourseAdvance() },
          R.createElement(Text, null, 'advance'),
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
    G08TiltAftereffectScreen: (props: {
      onComplete: (r: unknown) => void;
      onAbort: () => void;
      onCourseAdvance?: () => void;
    }) =>
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
                grading: { unattempted: false },
              }),
          },
          R.createElement(Text, null, 'finish'),
        ),
        R.createElement(
          Pressable,
          { testID: 'mock-G-08-abort', onPress: props.onAbort },
          R.createElement(Text, null, 'abort'),
        ),
        R.createElement(
          Pressable,
          { testID: 'mock-G-08-advance', onPress: () => props.onCourseAdvance && props.onCourseAdvance() },
          R.createElement(Text, null, 'advance'),
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
    G09LateralMaskingScreen: (props: {
      onComplete: (r: unknown) => void;
      onAbort: () => void;
      onCourseAdvance?: () => void;
    }) =>
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
                grading: { unattempted: false },
              }),
          },
          R.createElement(Text, null, 'finish'),
        ),
        R.createElement(
          Pressable,
          { testID: 'mock-G-09-abort', onPress: props.onAbort },
          R.createElement(Text, null, 'abort'),
        ),
        R.createElement(
          Pressable,
          { testID: 'mock-G-09-advance', onPress: () => props.onCourseAdvance && props.onCourseAdvance() },
          R.createElement(Text, null, 'advance'),
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
    G10TextureSegmentationScreen: (props: {
      onComplete: (r: unknown) => void;
      onAbort: () => void;
      onCourseAdvance?: () => void;
    }) =>
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
                grading: { unattempted: false },
              }),
          },
          R.createElement(Text, null, 'finish'),
        ),
        R.createElement(
          Pressable,
          { testID: 'mock-G-10-abort', onPress: props.onAbort },
          R.createElement(Text, null, 'abort'),
        ),
        R.createElement(
          Pressable,
          { testID: 'mock-G-10-advance', onPress: () => props.onCourseAdvance && props.onCourseAdvance() },
          R.createElement(Text, null, 'advance'),
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
    G11VernierAlignmentScreen: (props: {
      onComplete: (r: unknown) => void;
      onAbort: () => void;
      onCourseAdvance?: () => void;
    }) =>
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
                grading: { unattempted: false },
              }),
          },
          R.createElement(Text, null, 'finish'),
        ),
        R.createElement(
          Pressable,
          { testID: 'mock-G-11-abort', onPress: props.onAbort },
          R.createElement(Text, null, 'abort'),
        ),
        R.createElement(
          Pressable,
          { testID: 'mock-G-11-advance', onPress: () => props.onCourseAdvance && props.onCourseAdvance() },
          R.createElement(Text, null, 'advance'),
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
    G12CrowdingScreen: (props: {
      onComplete: (r: unknown) => void;
      onAbort: () => void;
      onCourseAdvance?: () => void;
    }) =>
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
                grading: { unattempted: false },
              }),
          },
          R.createElement(Text, null, 'finish'),
        ),
        R.createElement(
          Pressable,
          { testID: 'mock-G-12-abort', onPress: props.onAbort },
          R.createElement(Text, null, 'abort'),
        ),
        R.createElement(
          Pressable,
          { testID: 'mock-G-12-advance', onPress: () => props.onCourseAdvance && props.onCourseAdvance() },
          R.createElement(Text, null, 'advance'),
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
    G13EmbeddedNumeralScreen: (props: {
      onComplete: (r: unknown) => void;
      onAbort: () => void;
      onCourseAdvance?: () => void;
    }) =>
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
                grading: { unattempted: false },
              }),
          },
          R.createElement(Text, null, 'finish'),
        ),
        R.createElement(
          Pressable,
          { testID: 'mock-G-13-abort', onPress: props.onAbort },
          R.createElement(Text, null, 'abort'),
        ),
        R.createElement(
          Pressable,
          { testID: 'mock-G-13-advance', onPress: () => props.onCourseAdvance && props.onCourseAdvance() },
          R.createElement(Text, null, 'advance'),
        ),
      ),
  };
});

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CourseRunnerScreen } from '../../../../src/screens/v11/course/CourseRunnerScreen';
import {
  KEY_PREFIX_V11,
  loadDailyStatsV11,
  loadStreakV11,
} from '../../../../src/state/storage-v11';
import { getEnabledGames } from '../../../../src/state/gameRegistry';

const TODAY = '2026-04-30';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('CourseRunnerScreen — phase 遷移統合', () => {
  it('初期描画：distance-reminder', () => {
    const { getByTestId } = render(
      <CourseRunnerScreen
        distanceCm={40}
        oneEyeGuidance="off"
        sessionId="S1"
        startedAt="2026-04-30T08:00:00.000Z"
        todayLocal={TODAY}
        onExitToHome={() => {}}
        onOpenProgress={() => {}}
        countdownOverrides={{
          distanceReminderInitialSec: 1,
          interstitialInitialSec: 1,
          cooldownInitialSec: 1,
          tickMs: 5,
        }}
      />,
    );
    expect(getByTestId('course-runner-distance')).toBeTruthy();
  });

  it('distance-reminder 経過 → game(0) 遷移', () => {
    jest.useFakeTimers();
    const { queryByTestId } = render(
      <CourseRunnerScreen
        distanceCm={40}
        oneEyeGuidance="off"
        sessionId="S1"
        startedAt="2026-04-30T08:00:00.000Z"
        todayLocal={TODAY}
        onExitToHome={() => {}}
        onOpenProgress={() => {}}
        countdownOverrides={{
          distanceReminderInitialSec: 1,
          interstitialInitialSec: 1,
          cooldownInitialSec: 1,
          tickMs: 10,
        }}
      />,
    );
    expect(queryByTestId('course-runner-distance')).toBeTruthy();
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(queryByTestId('course-runner-game')).toBeTruthy();
    const enabled = getEnabledGames();
    expect(queryByTestId(`mock-${enabled[0].gameId}-play`)).toBeTruthy();
    jest.useRealTimers();
  });

  it('全 13 ゲーム順次完了 → cooldown → complete + 永続化', async () => {
    jest.useFakeTimers();
    const onExitToHome = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <CourseRunnerScreen
        distanceCm={40}
        oneEyeGuidance="off"
        sessionId="S1"
        startedAt="2026-04-30T08:00:00.000Z"
        todayLocal={TODAY}
        onExitToHome={onExitToHome}
        onOpenProgress={() => {}}
        countdownOverrides={{
          distanceReminderInitialSec: 1,
          interstitialInitialSec: 1,
          cooldownInitialSec: 1,
          tickMs: 5,
        }}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(20);
    });
    const enabled = getEnabledGames();
    for (let i = 0; i < enabled.length; i++) {
      expect(queryByTestId('course-runner-game')).toBeTruthy();
      // Sprint 22：finish + mock-advance で次の phase へ進める（CourseRunner は
      // game / interstitial 両 phase を course-runner-game testID で render する。
      // mock-advance が onCourseAdvance を発火 → advanceFromInterstitial → 次ゲーム）。
      act(() => {
        fireEvent.press(getByTestId(`mock-${enabled[i].gameId}-finish`));
      });
      act(() => {
        fireEvent.press(getByTestId(`mock-${enabled[i].gameId}-advance`));
      });
    }
    expect(queryByTestId('course-runner-cooldown')).toBeTruthy();
    act(() => {
      jest.advanceTimersByTime(20);
    });
    expect(queryByTestId('course-runner-complete')).toBeTruthy();
    jest.useRealTimers();

    await waitFor(async () => {
      const streak = await loadStreakV11();
      expect(streak.currentStreak).toBe(1);
    });
    const stats = await loadDailyStatsV11(TODAY);
    expect(stats.fullCourseCompleted).toBe(true);
    expect(stats.wideScore).not.toBeNull();
    const keys = await AsyncStorage.getAllKeys();
    expect(keys.some((k) => k.startsWith(`${KEY_PREFIX_V11}session:`))).toBe(
      true,
    );
  }, 20000);

  it('中断ダイアログ：distance-reminder で × → 中断で onExitToHome 発火', () => {
    const onExitToHome = jest.fn();
    const { getByTestId, getByText } = render(
      <CourseRunnerScreen
        distanceCm={40}
        oneEyeGuidance="off"
        sessionId="S1"
        startedAt="2026-04-30T08:00:00.000Z"
        todayLocal={TODAY}
        onExitToHome={onExitToHome}
        onOpenProgress={() => {}}
        countdownOverrides={{
          distanceReminderInitialSec: 100,
          tickMs: 1000,
        }}
      />,
    );
    fireEvent.press(getByTestId('distance-reminder-abort'));
    expect(getByText('コースを中断しますか？')).toBeTruthy();
    fireEvent.press(getByText('中断する'));
    expect(onExitToHome).toHaveBeenCalledTimes(1);
  });

  it('中断ダイアログ：「続ける」で onExitToHome 発火しない', () => {
    const onExitToHome = jest.fn();
    const { getByTestId, getByText, queryByText } = render(
      <CourseRunnerScreen
        distanceCm={40}
        oneEyeGuidance="off"
        sessionId="S1"
        startedAt="2026-04-30T08:00:00.000Z"
        todayLocal={TODAY}
        onExitToHome={onExitToHome}
        onOpenProgress={() => {}}
        countdownOverrides={{
          distanceReminderInitialSec: 100,
          tickMs: 1000,
        }}
      />,
    );
    fireEvent.press(getByTestId('distance-reminder-abort'));
    fireEvent.press(getByText('続ける'));
    expect(onExitToHome).not.toHaveBeenCalled();
    expect(queryByText('コースを中断しますか？')).toBeNull();
  });

  it('完了画面：「ホームへ」タップで onExitToHome', async () => {
    jest.useFakeTimers();
    const onExitToHome = jest.fn();
    const { getByTestId } = render(
      <CourseRunnerScreen
        distanceCm={40}
        oneEyeGuidance="off"
        sessionId="S1"
        startedAt="2026-04-30T08:00:00.000Z"
        todayLocal={TODAY}
        onExitToHome={onExitToHome}
        onOpenProgress={() => {}}
        countdownOverrides={{
          distanceReminderInitialSec: 1,
          interstitialInitialSec: 1,
          cooldownInitialSec: 1,
          tickMs: 5,
        }}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(20);
    });
    const enabled = getEnabledGames();
    for (let i = 0; i < enabled.length; i++) {
      act(() => {
        fireEvent.press(getByTestId(`mock-${enabled[i].gameId}-finish`));
      });
      act(() => {
        fireEvent.press(getByTestId(`mock-${enabled[i].gameId}-advance`));
      });
      act(() => {
        jest.advanceTimersByTime(20);
      });
    }
    act(() => {
      jest.advanceTimersByTime(20);
    });
    jest.useRealTimers();
    await waitFor(() => {
      expect(getByTestId('course-complete-home')).toBeTruthy();
    });
    fireEvent.press(getByTestId('course-complete-home'));
    expect(onExitToHome).toHaveBeenCalled();
  }, 20000);

  // Sprint 22：CourseRunner は interstitial UI を直接持たなくなった
  // （PlayScreen 内 result phase の ResultOverlay が担当）。本テストが
  // 検証していた「× → カウントダウン停止 → 中断」の動線は ResultOverlay /
  // PlayScreen 単体テストに移行（重複防止）。
  it.skip('中断ダイアログ：interstitial 中に × → カウントダウン停止 → 「中断する」で onExitToHome 発火', () => {
    // Modal 表示中は @testing-library/react-native 12+ が Modal 配下のみ
    // 探索対象とするため、abort 直後の countdown 検査は ConfirmDialog を
    // 閉じた後に行う（= 進まなかったことを間接的に確認）。
    jest.useFakeTimers();
    const onExitToHome = jest.fn();
    const { getByTestId, getByText } = render(
      <CourseRunnerScreen
        distanceCm={40}
        oneEyeGuidance="off"
        sessionId="S1"
        startedAt="2026-04-30T08:00:00.000Z"
        todayLocal={TODAY}
        onExitToHome={onExitToHome}
        onOpenProgress={() => {}}
        countdownOverrides={{
          distanceReminderInitialSec: 1,
          interstitialInitialSec: 10,
          cooldownInitialSec: 10,
          tickMs: 1000,
        }}
      />,
    );
    // distance-reminder → game(0)
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    const enabled = getEnabledGames();
    // 1 ゲーム完了 → interstitial へ
    act(() => {
      fireEvent.press(getByTestId(`mock-${enabled[0].gameId}-finish`));
    });
    expect(getByTestId('course-runner-interstitial')).toBeTruthy();
    // interstitial カウントダウン初期は 10
    expect(getByTestId('result-overlay-countdown').props.children).toEqual([
      '⏱ ',
      10,
    ]);
    // 中断ボタン押下
    fireEvent.press(getByTestId('result-overlay-abort'));
    expect(getByText('コースを中断しますか？')).toBeTruthy();
    // 「中断する」で onExitToHome 発火
    fireEvent.press(getByText('中断する'));
    expect(onExitToHome).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  // Sprint 22：同上。CourseRunner の標準 interstitial countdown は撤去された。
  it.skip('中断ダイアログ：interstitial で × → 「続ける」後に同じ残り秒から再開（pause 検証）', () => {
    jest.useFakeTimers();
    const onExitToHome = jest.fn();
    const { getByTestId, getByText, queryByText } = render(
      <CourseRunnerScreen
        distanceCm={40}
        oneEyeGuidance="off"
        sessionId="S1"
        startedAt="2026-04-30T08:00:00.000Z"
        todayLocal={TODAY}
        onExitToHome={onExitToHome}
        onOpenProgress={() => {}}
        countdownOverrides={{
          distanceReminderInitialSec: 1,
          interstitialInitialSec: 10,
          cooldownInitialSec: 10,
          tickMs: 1000,
        }}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    const enabled = getEnabledGames();
    act(() => {
      fireEvent.press(getByTestId(`mock-${enabled[0].gameId}-finish`));
    });
    // interstitial で 2 tick 進めてから中断（state set → re-render → 次 setTimeout
    // のサイクルを回すために 1 秒ずつ 2 回 act）
    for (let i = 0; i < 2; i += 1) {
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    }
    expect(getByTestId('result-overlay-countdown').props.children).toEqual([
      '⏱ ',
      8,
    ]);
    fireEvent.press(getByTestId('result-overlay-abort'));
    // ダイアログ中に 5 秒分進める（pause が効くため tick しない想定）
    for (let i = 0; i < 5; i += 1) {
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    }
    // 「続ける」でダイアログを閉じる
    fireEvent.press(getByText('続ける'));
    expect(queryByText('コースを中断しますか？')).toBeNull();
    expect(onExitToHome).not.toHaveBeenCalled();
    // pause が効いていれば残り 8 秒のままのはず。1 秒進めると 7 になる。
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(getByTestId('result-overlay-countdown').props.children).toEqual([
      '⏱ ',
      7,
    ]);
    jest.useRealTimers();
  });

  it('中断ダイアログ：cooldown 中に × → 「中断する」で onExitToHome 発火', () => {
    jest.useFakeTimers();
    const onExitToHome = jest.fn();
    const { getByTestId, getByText } = render(
      <CourseRunnerScreen
        distanceCm={40}
        oneEyeGuidance="off"
        sessionId="S1"
        startedAt="2026-04-30T08:00:00.000Z"
        todayLocal={TODAY}
        onExitToHome={onExitToHome}
        onOpenProgress={() => {}}
        countdownOverrides={{
          distanceReminderInitialSec: 1,
          interstitialInitialSec: 1,
          cooldownInitialSec: 10,
          tickMs: 5,
        }}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(20);
    });
    const enabled = getEnabledGames();
    for (let i = 0; i < enabled.length; i++) {
      act(() => {
        fireEvent.press(getByTestId(`mock-${enabled[i].gameId}-finish`));
      });
      act(() => {
        fireEvent.press(getByTestId(`mock-${enabled[i].gameId}-advance`));
      });
    }
    expect(getByTestId('course-runner-cooldown')).toBeTruthy();
    expect(getByTestId('course-cooldown-count').props.children).toBe(10);
    // 中断ボタン押下
    fireEvent.press(getByTestId('course-cooldown-abort'));
    expect(getByText('コースを中断しますか？')).toBeTruthy();
    // 「中断する」で onExitToHome
    fireEvent.press(getByText('中断する'));
    expect(onExitToHome).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('中断ダイアログ：cooldown で × → 「続ける」後に同じ残り秒から再開（pause 検証）', () => {
    jest.useFakeTimers();
    const onExitToHome = jest.fn();
    const { getByTestId, getByText, queryByText } = render(
      <CourseRunnerScreen
        distanceCm={40}
        oneEyeGuidance="off"
        sessionId="S1"
        startedAt="2026-04-30T08:00:00.000Z"
        todayLocal={TODAY}
        onExitToHome={onExitToHome}
        onOpenProgress={() => {}}
        countdownOverrides={{
          distanceReminderInitialSec: 1,
          interstitialInitialSec: 1,
          cooldownInitialSec: 10,
          tickMs: 5,
        }}
      />,
    );
    // distance-reminder（1 秒, tick 5ms）を抜ける
    act(() => {
      jest.advanceTimersByTime(20);
    });
    const enabled = getEnabledGames();
    for (let i = 0; i < enabled.length; i++) {
      act(() => {
        fireEvent.press(getByTestId(`mock-${enabled[i].gameId}-finish`));
      });
      // Sprint 22：mock の advance を押して次へ進める
      act(() => {
        fireEvent.press(getByTestId(`mock-${enabled[i].gameId}-advance`));
      });
    }
    expect(getByTestId('course-runner-cooldown')).toBeTruthy();
    // cooldown は同じ tickMs=5ms。2 tick 進める = 10ms（複数 act で
    // re-render を経由させる必要あり）
    for (let i = 0; i < 2; i += 1) {
      act(() => {
        jest.advanceTimersByTime(5);
      });
    }
    expect(getByTestId('course-cooldown-count').props.children).toBe(8);
    fireEvent.press(getByTestId('course-cooldown-abort'));
    // ダイアログ中に 100 tick 分進めても pause が効いていれば残 8 のまま
    for (let i = 0; i < 100; i += 1) {
      act(() => {
        jest.advanceTimersByTime(5);
      });
    }
    fireEvent.press(getByText('続ける'));
    expect(queryByText('コースを中断しますか？')).toBeNull();
    expect(onExitToHome).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(5);
    });
    expect(getByTestId('course-cooldown-count').props.children).toBe(7);
    jest.useRealTimers();
  });

  it('完了画面：「進捗グラフを見る」タップで onOpenProgress', async () => {
    jest.useFakeTimers();
    const onOpenProgress = jest.fn();
    const { getByTestId } = render(
      <CourseRunnerScreen
        distanceCm={40}
        oneEyeGuidance="off"
        sessionId="S1"
        startedAt="2026-04-30T08:00:00.000Z"
        todayLocal={TODAY}
        onExitToHome={() => {}}
        onOpenProgress={onOpenProgress}
        countdownOverrides={{
          distanceReminderInitialSec: 1,
          interstitialInitialSec: 1,
          cooldownInitialSec: 1,
          tickMs: 5,
        }}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(20);
    });
    const enabled = getEnabledGames();
    for (let i = 0; i < enabled.length; i++) {
      act(() => {
        fireEvent.press(getByTestId(`mock-${enabled[i].gameId}-finish`));
      });
      act(() => {
        fireEvent.press(getByTestId(`mock-${enabled[i].gameId}-advance`));
      });
      act(() => {
        jest.advanceTimersByTime(20);
      });
    }
    act(() => {
      jest.advanceTimersByTime(20);
    });
    jest.useRealTimers();
    await waitFor(() => {
      expect(getByTestId('course-complete-progress')).toBeTruthy();
    });
    fireEvent.press(getByTestId('course-complete-progress'));
    expect(onOpenProgress).toHaveBeenCalled();
  }, 20000);

  it('ゲーム phase 初期描画ではゲームに paused=false が伝播される（外側 paused 既定）', () => {
    // 仕様：CourseRunner は game phase で paused を伝播しない（=undefined）。
    // mock 側は `props.paused === true` の三項演算で paused=false 用ノードを
    // 出すため、初期描画では `mock-G-01-paused-false` が見える。
    jest.useFakeTimers();
    const { queryByTestId } = render(
      <CourseRunnerScreen
        distanceCm={40}
        oneEyeGuidance="off"
        sessionId="S1"
        startedAt="2026-04-30T08:00:00.000Z"
        todayLocal={TODAY}
        onExitToHome={() => {}}
        onOpenProgress={() => {}}
        countdownOverrides={{
          distanceReminderInitialSec: 1,
          interstitialInitialSec: 1,
          cooldownInitialSec: 1,
          tickMs: 5,
        }}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(20);
    });
    expect(queryByTestId('course-runner-game')).toBeTruthy();
    expect(queryByTestId('mock-G-01-paused-false')).toBeTruthy();
    expect(queryByTestId('mock-G-01-paused-true')).toBeNull();
    jest.useRealTimers();
  });

  it('ゲーム phase 中の × は他ゲーム phase（G-07 等）でも外側 ConfirmDialog を出さない', () => {
    // ホットフィックスのリグレッションを 2 ゲーム目以降でも担保するための確認。
    // 1 ゲーム目を完了 → interstitial → 2 ゲーム目（G-02）へ進めた状態で
    // mock-onAbort を押下し、外側ダイアログが現れず onExitToHome が直接呼ばれる
    // ことを確認する。
    jest.useFakeTimers();
    const onExitToHome = jest.fn();
    const { getByTestId, queryByText } = render(
      <CourseRunnerScreen
        distanceCm={40}
        oneEyeGuidance="off"
        sessionId="S1"
        startedAt="2026-04-30T08:00:00.000Z"
        todayLocal={TODAY}
        onExitToHome={onExitToHome}
        onOpenProgress={() => {}}
        countdownOverrides={{
          distanceReminderInitialSec: 1,
          interstitialInitialSec: 1,
          cooldownInitialSec: 1,
          tickMs: 5,
        }}
      />,
    );
    // distance-reminder → game(0)（=G-01）
    act(() => {
      jest.advanceTimersByTime(20);
    });
    const enabled = getEnabledGames();
    // 1 ゲーム目 finish → interstitial → mock-advance → 2 ゲーム目（=G-02）
    act(() => {
      fireEvent.press(getByTestId(`mock-${enabled[0].gameId}-finish`));
    });
    act(() => {
      fireEvent.press(getByTestId(`mock-${enabled[0].gameId}-advance`));
    });
    act(() => {
      jest.advanceTimersByTime(20);
    });
    expect(getByTestId(`mock-${enabled[1].gameId}-play`)).toBeTruthy();
    // 2 ゲーム目で abort
    act(() => {
      fireEvent.press(getByTestId(`mock-${enabled[1].gameId}-abort`));
    });
    expect(queryByText('コースを中断しますか？')).toBeNull();
    expect(onExitToHome).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('ゲーム phase の × は CourseRunner 側の外側 ConfirmDialog を出さず、内側ダイアログ（各ゲーム Screen 内）に委ねる', () => {
    // ホットフィックス：以前は CourseRunner も game phase で「コースを中断しますか？」
    // ダイアログを出していたため、各ゲーム Screen の「ゲームを中断しますか？」と
    // 二段階確認になっていた。本フィックスで CourseRunner 側を撤去し、内側
    // ダイアログ確定 → onAbort（=onExitToHome）の動線に一本化した。
    //
    // mock 化された G01 では内側ダイアログ自体は描画されないため、ここでは
    // 「× → CourseRunner の外側ダイアログテキストが現れない」と
    // 「mock-onAbort 押下 → onExitToHome がそのまま呼ばれる」を検証する。
    jest.useFakeTimers();
    const onExitToHome = jest.fn();
    const { getByTestId, queryByText } = render(
      <CourseRunnerScreen
        distanceCm={40}
        oneEyeGuidance="off"
        sessionId="S1"
        startedAt="2026-04-30T08:00:00.000Z"
        todayLocal={TODAY}
        onExitToHome={onExitToHome}
        onOpenProgress={() => {}}
        countdownOverrides={{
          distanceReminderInitialSec: 1,
          interstitialInitialSec: 1,
          cooldownInitialSec: 1,
          tickMs: 5,
        }}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(20);
    });
    expect(getByTestId('course-runner-game')).toBeTruthy();

    // mock の onAbort は内側ダイアログ「中断する」確定後に呼ばれる相当として、
    // CourseRunner 側は外側 ConfirmDialog を出さず、即 onExitToHome を呼ぶ。
    act(() => {
      fireEvent.press(getByTestId('mock-G-01-abort'));
    });
    // 外側 ConfirmDialog の文言が出ていない（=二重表示が解消されている）
    expect(queryByText('コースを中断しますか？')).toBeNull();
    // onExitToHome がそのまま 1 回だけ呼ばれる
    expect(onExitToHome).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
