/**
 * dataTargetIdWiring — Sprint 20 ラウンド 3 リグレッションテスト。
 *
 * 13 ゲームの PlayScreen / ResultScreen で、`resultMarks.ts` が
 * 出力する `targetId` に対応する DOM 要素が `data-target-id` 属性を
 * 持って存在することを保証する。
 *
 * 背景：ラウンド 2 評価で、ResultOverlay の MarkBadge 重畳が
 * **G-02 / G-08 の 2 ゲームでしか機能しない**問題が判明した。
 * 残り 11 ゲームでは PlayScreen / ResultScreen 側で
 * `SideBySideStimulus` / `ImageChoiceCell` / `AnswerChoiceGroup` 等に
 * 渡す `dataTargetId` 系 prop が漏れ、`document.querySelector` で
 * MarkBadge の絶対配置先が見つからず fallback 領域へ落ちていた。
 *
 * 本テストは 13 ゲーム全部で「resultMarks.ts の出力する targetId と
 * 同じ文字列を `data-target-id` 属性に持つ DOM 要素」が、結果開示時に
 * extraStimulus 領域内（または PlayScreen 上）に存在することを検証する。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { act, render } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// PlayScreens
import { G01ChangeDetectScreen } from '../../../../src/screens/v11/games/G01ChangeDetectScreen';
import { G03PeripheralHuntScreen } from '../../../../src/screens/v11/games/G03PeripheralHuntScreen';
import { G04ContrastDiscrimScreen } from '../../../../src/screens/v11/games/G04ContrastDiscrimScreen';
import { G05SfDiscrimScreen } from '../../../../src/screens/v11/games/G05SfDiscrimScreen';
import { G06WindowSizeScreen } from '../../../../src/screens/v11/games/G06WindowSizeScreen';
import { G07EdgeHuntScreen } from '../../../../src/screens/v11/games/G07EdgeHuntScreen';
import { G09LateralMaskingScreen } from '../../../../src/screens/v11/games/G09LateralMaskingScreen';
import { G10TextureSegmentationScreen } from '../../../../src/screens/v11/games/G10TextureSegmentationScreen';
import { G11VernierAlignmentScreen } from '../../../../src/screens/v11/games/G11VernierAlignmentScreen';
import { G12CrowdingScreen } from '../../../../src/screens/v11/games/G12CrowdingScreen';
import { G13EmbeddedNumeralScreen } from '../../../../src/screens/v11/games/G13EmbeddedNumeralScreen';

// G-08 / G-02 は既に動作しているがリグレッション防止のため検証
import { G02SideBySideTiltScreen } from '../../../../src/screens/v11/games/G02SideBySideTiltScreen';
import { G08TiltAftereffectScreen } from '../../../../src/screens/v11/games/G08TiltAftereffectScreen';

// ResultScreens
import { G01ResultScreen } from '../../../../src/screens/v11/games/G01ResultScreen';
import { G03ResultScreen } from '../../../../src/screens/v11/games/G03ResultScreen';
import { G04ResultScreen } from '../../../../src/screens/v11/games/G04ResultScreen';
import { G05ResultScreen } from '../../../../src/screens/v11/games/G05ResultScreen';
import { G06ResultScreen } from '../../../../src/screens/v11/games/G06ResultScreen';
import { G07ResultScreen } from '../../../../src/screens/v11/games/G07ResultScreen';
import { G09ResultScreen } from '../../../../src/screens/v11/games/G09ResultScreen';
import { G10ResultScreen } from '../../../../src/screens/v11/games/G10ResultScreen';
import { G11ResultScreen } from '../../../../src/screens/v11/games/G11ResultScreen';
import { G12ResultScreen } from '../../../../src/screens/v11/games/G12ResultScreen';
import { G13ResultScreen } from '../../../../src/screens/v11/games/G13ResultScreen';

// trial builders（Result Screens のテスト用にダミー trial を作る）
import { buildGame1Trial } from '../../../../src/lib/game1';
import { buildG03Trial } from '../../../../src/lib/v11/g03Trial';
import { buildG04Trial } from '../../../../src/lib/v11/g04Trial';
import { buildG05Trial } from '../../../../src/lib/v11/g05Trial';
import { buildG06Trial } from '../../../../src/lib/v11/g06Trial';
import { buildG07Trial } from '../../../../src/lib/v11/g07Trial';
import { buildG09Trial } from '../../../../src/lib/v11/g09Trial';
import { buildG10Trial } from '../../../../src/lib/v11/g10Trial';
import { buildG11Trial } from '../../../../src/lib/v11/g11Trial';
import { buildG12Trial } from '../../../../src/lib/v11/g12Trial';
import { buildG13Trial } from '../../../../src/lib/v11/g13Trial';

beforeEach(async () => {
  jest.useFakeTimers();
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

const SHORT_DURATION = 1000;
const TICK_MS = 100;

/**
 * ツリー全体を走査し、`data-target-id` 属性または
 * `dataSet.targetId` を持つ要素の targetId 一覧を返す。
 *
 * react-native-web 互換のため両形式を受け入れる。
 */
function collectTargetIds(root: { props: Record<string, unknown>; children?: unknown }): string[] {
  const found: string[] = [];
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const obj = node as { props?: Record<string, unknown>; children?: unknown };
    const props = obj.props ?? {};
    const direct = props['data-target-id'];
    if (typeof direct === 'string') {
      found.push(direct);
    } else {
      const ds = props.dataSet as { targetId?: string } | undefined;
      if (ds && typeof ds.targetId === 'string') {
        found.push(ds.targetId);
      }
    }
    const children = obj.children ?? props.children;
    if (Array.isArray(children)) {
      for (const c of children) visit(c);
    } else if (children) {
      visit(children);
    }
  };
  visit(root);
  return found;
}

describe('Sprint 20 ラウンド 3：13 ゲーム横断 data-target-id 配線リグレッション', () => {
  describe('PlayScreen 上で resultMarks.ts と一致する targetId が DOM に出る', () => {
    it('G-01：MorphGridStimulus の各セルに `g01-r{row}c{col}` 形式の data-target-id が付く', async () => {
      const { findByTestId, toJSON } = render(
        <G01ChangeDetectScreen
          distanceCm={40}
          onAbort={jest.fn()}
          onComplete={jest.fn()}
          rng={() => 0.4}
          totalDurationMsForTest={SHORT_DURATION}
          tickMsForTest={TICK_MS}
        />,
      );
      await act(async () => {
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });
      await findByTestId('g01-change-detect-screen');
      const tree = toJSON() as unknown as Parameters<typeof collectTargetIds>[0];
      const ids = collectTargetIds(tree);
      // 3×3 / 4×4 / 5×5 のいずれかなので最低 9 個（rows*cols）の g01-r{x}c{y} がある
      const g01Ids = ids.filter((id) => id.startsWith('g01-'));
      expect(g01Ids.length).toBeGreaterThanOrEqual(9);
      // フォーマット検証
      expect(g01Ids.every((id) => /^g01-r\d+c\d+$/.test(id))).toBe(true);
    });

    it('G-02：左右パッチに `g02-left` / `g02-right` が付く（既存動作のリグレッション防止）', async () => {
      const { findByTestId, toJSON } = render(
        <G02SideBySideTiltScreen
          distanceCm={40}
          onAbort={jest.fn()}
          onComplete={jest.fn()}
          rng={() => 0.4}
          totalDurationMsForTest={SHORT_DURATION}
          tickMsForTest={TICK_MS}
        />,
      );
      await act(async () => {
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });
      await findByTestId('g02-side-by-side-tilt-screen');
      const ids = collectTargetIds(toJSON() as unknown as Parameters<typeof collectTargetIds>[0]);
      expect(ids).toContain('g02-left');
      expect(ids).toContain('g02-right');
    });

    it('G-03（v1.1.2 Sprint 21 直接選択化）：円周 8 個に `g03-pos-{12|1.5|...}` が付く（刺激領域のみ、answer choice 撤去）', async () => {
      const { findByTestId, toJSON } = render(
        <G03PeripheralHuntScreen
          distanceCm={40}
          onAbort={jest.fn()}
          onComplete={jest.fn()}
          rng={() => 0.4}
          totalDurationMsForTest={SHORT_DURATION}
          tickMsForTest={TICK_MS}
        />,
      );
      await act(async () => {
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });
      await findByTestId('g03-peripheral-hunt-screen');
      const ids = collectTargetIds(toJSON() as unknown as Parameters<typeof collectTargetIds>[0]);
      const g03Pos = ids.filter((id) => id.startsWith('g03-pos-'));
      // Sprint 21：clock-8 ボタン撤去後は刺激領域のみ = 8 個
      expect(g03Pos.length).toBeGreaterThanOrEqual(8);
      // 各位置が含まれる
      ['12', '1.5', '3', '4.5', '6', '7.5', '9', '10.5'].forEach((pos) => {
        expect(ids).toContain(`g03-pos-${pos}`);
      });
    });

    it('G-04：左右パッチに `g04-left` / `g04-right` が付く', async () => {
      const { findByTestId, toJSON } = render(
        <G04ContrastDiscrimScreen
          distanceCm={40}
          onAbort={jest.fn()}
          onComplete={jest.fn()}
          rng={() => 0.4}
          totalDurationMsForTest={SHORT_DURATION}
          tickMsForTest={TICK_MS}
        />,
      );
      await act(async () => {
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });
      await findByTestId('g04-contrast-discrim-screen');
      const ids = collectTargetIds(toJSON() as unknown as Parameters<typeof collectTargetIds>[0]);
      expect(ids).toContain('g04-left');
      expect(ids).toContain('g04-right');
    });

    it('G-05：左右パッチに `g05-left` / `g05-right` が付く', async () => {
      const { findByTestId, toJSON } = render(
        <G05SfDiscrimScreen
          distanceCm={40}
          onAbort={jest.fn()}
          onComplete={jest.fn()}
          rng={() => 0.4}
          totalDurationMsForTest={SHORT_DURATION}
          tickMsForTest={TICK_MS}
        />,
      );
      await act(async () => {
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });
      await findByTestId('g05-sf-discrim-screen');
      const ids = collectTargetIds(toJSON() as unknown as Parameters<typeof collectTargetIds>[0]);
      expect(ids).toContain('g05-left');
      expect(ids).toContain('g05-right');
    });

    it('G-06：左右パッチに `g06-left` / `g06-right` が付く', async () => {
      const { findByTestId, toJSON } = render(
        <G06WindowSizeScreen
          distanceCm={40}
          onAbort={jest.fn()}
          onComplete={jest.fn()}
          rng={() => 0.4}
          totalDurationMsForTest={SHORT_DURATION}
          tickMsForTest={TICK_MS}
        />,
      );
      await act(async () => {
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });
      await findByTestId('g06-window-size-screen');
      const ids = collectTargetIds(toJSON() as unknown as Parameters<typeof collectTargetIds>[0]);
      expect(ids).toContain('g06-left');
      expect(ids).toContain('g06-right');
    });

    it('G-07：4×4 セル各 16 個に `g07-r{row}c{col}` が付く', async () => {
      const { findByTestId, toJSON } = render(
        <G07EdgeHuntScreen
          distanceCm={40}
          onAbort={jest.fn()}
          onComplete={jest.fn()}
          rng={() => 0.4}
          totalDurationMsForTest={SHORT_DURATION}
          tickMsForTest={TICK_MS}
        />,
      );
      await act(async () => {
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });
      await findByTestId('g07-edge-hunt-screen');
      const ids = collectTargetIds(toJSON() as unknown as Parameters<typeof collectTargetIds>[0]);
      const g07Ids = ids.filter((id) => id.startsWith('g07-'));
      expect(g07Ids.length).toBe(16);
      expect(g07Ids.every((id) => /^g07-r[0-3]c[0-3]$/.test(id))).toBe(true);
    });

    it('G-08：下部左右テストパッチに `g08-test-left` / `g08-test-right` が付く（既存動作のリグレッション防止）', async () => {
      const { findByTestId, toJSON } = render(
        <G08TiltAftereffectScreen
          distanceCm={40}
          onAbort={jest.fn()}
          onComplete={jest.fn()}
          rng={() => 0.4}
          totalDurationMsForTest={SHORT_DURATION}
          tickMsForTest={TICK_MS}
        />,
      );
      await act(async () => {
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });
      await findByTestId('g08-tilt-aftereffect-screen');
      const ids = collectTargetIds(toJSON() as unknown as Parameters<typeof collectTargetIds>[0]);
      expect(ids).toContain('g08-test-left');
      expect(ids).toContain('g08-test-right');
    });

    it('G-09：中央 target に `g09-{vertical|horizontal}` が付き、両ボタンにも付く', async () => {
      const { findByTestId, toJSON } = render(
        <G09LateralMaskingScreen
          distanceCm={40}
          onAbort={jest.fn()}
          onComplete={jest.fn()}
          rng={() => 0.4}
          totalDurationMsForTest={SHORT_DURATION}
          tickMsForTest={TICK_MS}
        />,
      );
      await act(async () => {
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });
      await findByTestId('g09-lateral-masking-screen');
      const ids = collectTargetIds(toJSON() as unknown as Parameters<typeof collectTargetIds>[0]);
      // ボタン側
      expect(ids).toContain('g09-vertical');
      expect(ids).toContain('g09-horizontal');
      // target 側（正解向きに対応するもの）
      const targetIds = ids.filter((id) =>
        id === 'g09-vertical' || id === 'g09-horizontal',
      );
      // 2 個のボタン + 1 個の target = 3 個（正解向きのみ重複）
      expect(targetIds.length).toBeGreaterThanOrEqual(3);
    });

    it('G-10（v1.1.2 Sprint 21 直接選択化）：4 象限 ImageChoiceCell に `g10-{tl|tr|bl|br}` が付く（grid-4 ボタン撤去）', async () => {
      const { findByTestId, toJSON } = render(
        <G10TextureSegmentationScreen
          distanceCm={40}
          onAbort={jest.fn()}
          onComplete={jest.fn()}
          rng={() => 0.4}
          totalDurationMsForTest={SHORT_DURATION}
          tickMsForTest={TICK_MS}
        />,
      );
      await act(async () => {
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });
      await findByTestId('g10-texture-segmentation-screen');
      const ids = collectTargetIds(toJSON() as unknown as Parameters<typeof collectTargetIds>[0]);
      ['g10-tl', 'g10-tr', 'g10-bl', 'g10-br'].forEach((id) => {
        expect(ids).toContain(id);
      });
    });

    it('G-11（v1.1.2 Sprint 21 直接選択化）：下左右テストパッチに `g11-test-left` / `g11-test-right` が付く（horizontal-2 ボタン撤去）', async () => {
      const { findByTestId, toJSON } = render(
        <G11VernierAlignmentScreen
          distanceCm={40}
          onAbort={jest.fn()}
          onComplete={jest.fn()}
          rng={() => 0.4}
          totalDurationMsForTest={SHORT_DURATION}
          tickMsForTest={TICK_MS}
        />,
      );
      await act(async () => {
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });
      await findByTestId('g11-vernier-alignment-screen');
      const ids = collectTargetIds(toJSON() as unknown as Parameters<typeof collectTargetIds>[0]);
      expect(ids).toContain('g11-test-left');
      expect(ids).toContain('g11-test-right');
    });

    it('G-12：4 つの向きボタンに `g12-{vertical|horizontal|diagonalRight|diagonalLeft}` が付く', async () => {
      const { findByTestId, toJSON } = render(
        <G12CrowdingScreen
          distanceCm={40}
          onAbort={jest.fn()}
          onComplete={jest.fn()}
          rng={() => 0.4}
          totalDurationMsForTest={SHORT_DURATION}
          tickMsForTest={TICK_MS}
        />,
      );
      await act(async () => {
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });
      await findByTestId('g12-crowding-screen');
      const ids = collectTargetIds(toJSON() as unknown as Parameters<typeof collectTargetIds>[0]);
      ['g12-vertical', 'g12-horizontal', 'g12-diagonalRight', 'g12-diagonalLeft'].forEach((id) => {
        expect(ids).toContain(id);
      });
    });

    it('G-13：keypad 10 ボタン全部に `g13-key-{0..9}` が付く', async () => {
      const { findByTestId, toJSON } = render(
        <G13EmbeddedNumeralScreen
          distanceCm={40}
          onAbort={jest.fn()}
          onComplete={jest.fn()}
          rng={() => 0.4}
          totalDurationMsForTest={SHORT_DURATION}
          tickMsForTest={TICK_MS}
        />,
      );
      await act(async () => {
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });
      await findByTestId('g13-embedded-numeral-screen');
      const ids = collectTargetIds(toJSON() as unknown as Parameters<typeof collectTargetIds>[0]);
      for (let d = 0; d <= 9; d++) {
        expect(ids).toContain(`g13-key-${d}`);
      }
    });
  });

  describe('ResultScreen の extraStimulus 内に対応 targetId が出る（コース時 + 単体時の result phase）', () => {
    const baseProps = {
      previousBestThreshold: null,
      isCourseMode: false,
      onPlayAgain: jest.fn(),
      onBackToList: jest.fn(),
      onGoHome: jest.fn(),
      newlyAwardedBadges: [],
    };

    it('G-01 Result：MorphGridStimulus 再描画で 9 個以上の `g01-r*c*` が出る', () => {
      const trial = buildGame1Trial(0.5, () => 0.4);
      const { toJSON } = render(
        <G01ResultScreen
          {...baseProps}
          result={{
            thresholdDeg: 1,
            grading: null,
            unattempted: false,
            trial,
            playedParam: 0.5,
            isCorrectForStaircase: true,
          }}
          selectedIds={[]}
        />,
      );
      const ids = collectTargetIds(toJSON() as unknown as Parameters<typeof collectTargetIds>[0]);
      const g01 = ids.filter((id) => id.startsWith('g01-'));
      expect(g01.length).toBeGreaterThanOrEqual(9);
    });

    it('G-03 Result（v1.1.2 Sprint 21）：RadialEightStimulus に `g03-pos-{12|...}` が 8 個以上出る', () => {
      const trial = buildG03Trial(15, () => 0.4);
      const { toJSON } = render(
        <G03ResultScreen
          {...baseProps}
          result={{
            thresholdDeg: 15,
            grading: {
              correctClockPosition: trial.oddClockPosition,
              correctPositionIndex: trial.oddPositionIndex,
              userAnswer: null,
              isCorrect: false,
              unattempted: true,
            },
            trial,
            playedParam: 15,
            isCorrectForStaircase: false,
          }}
        />,
      );
      const ids = collectTargetIds(toJSON() as unknown as Parameters<typeof collectTargetIds>[0]);
      const g03 = ids.filter((id) => id.startsWith('g03-pos-'));
      expect(g03.length).toBeGreaterThanOrEqual(8);
    });

    it('G-04 Result：SideBySideStimulus に `g04-left` / `g04-right` が出る', () => {
      const trial = buildG04Trial(0.15, () => 0.4);
      const { toJSON } = render(
        <G04ResultScreen
          {...baseProps}
          result={{
            thresholdContrast: 0.15,
            grading: {
              correctSide: trial.correctSide,
              userAnswer: null,
              isCorrect: false,
              unattempted: true,
            },
            trial,
            playedParam: 0.15,
            isCorrectForStaircase: false,
          }}
        />,
      );
      const ids = collectTargetIds(toJSON() as unknown as Parameters<typeof collectTargetIds>[0]);
      expect(ids).toContain('g04-left');
      expect(ids).toContain('g04-right');
    });

    it('G-05 Result：SideBySideStimulus に `g05-left` / `g05-right` が出る', () => {
      const trial = buildG05Trial(1.5, () => 0.4);
      const { toJSON } = render(
        <G05ResultScreen
          {...baseProps}
          result={{
            thresholdRatio: 1.5,
            grading: {
              correctSide: trial.correctSide,
              userAnswer: null,
              isCorrect: false,
              unattempted: true,
            },
            trial,
            playedParam: 1.5,
            isCorrectForStaircase: false,
          }}
        />,
      );
      const ids = collectTargetIds(toJSON() as unknown as Parameters<typeof collectTargetIds>[0]);
      expect(ids).toContain('g05-left');
      expect(ids).toContain('g05-right');
    });

    it('G-06 Result：SideBySideStimulus に `g06-left` / `g06-right` が出る', () => {
      const trial = buildG06Trial(1.5, () => 0.4);
      const { toJSON } = render(
        <G06ResultScreen
          {...baseProps}
          result={{
            thresholdRatio: 1.5,
            grading: {
              correctSide: trial.correctSide,
              userAnswer: null,
              isCorrect: false,
              unattempted: true,
            },
            trial,
            playedParam: 1.5,
            isCorrectForStaircase: false,
          }}
        />,
      );
      const ids = collectTargetIds(toJSON() as unknown as Parameters<typeof collectTargetIds>[0]);
      expect(ids).toContain('g06-left');
      expect(ids).toContain('g06-right');
    });

    it('G-07 Result：GaborGridStimulus に `g07-r*c*` が 16 個出る', () => {
      const trial = buildG07Trial(5, () => 0.4);
      const { toJSON } = render(
        <G07ResultScreen
          {...baseProps}
          result={{
            thresholdDeg: 5,
            grading: {
              correctIds: trial.correctIds,
              userSelectedIds: [],
              truePositiveIds: [],
              falsePositiveIds: [],
              falseNegativeIds: trial.correctIds,
              isCorrect: false,
              unattempted: true,
            },
            trial,
            userSelectedIds: [],
            playedParam: 5,
            isCorrectForStaircase: false,
          }}
        />,
      );
      const ids = collectTargetIds(toJSON() as unknown as Parameters<typeof collectTargetIds>[0]);
      const g07 = ids.filter((id) => id.startsWith('g07-'));
      expect(g07.length).toBe(16);
    });

    it('G-09 Result：LateralMaskingStimulus 中央 target に `g09-{correctOrientation}` が出る', () => {
      const trial = buildG09Trial(0.1, () => 0.4);
      const { toJSON } = render(
        <G09ResultScreen
          {...baseProps}
          result={{
            thresholdContrast: 0.1,
            grading: {
              correctOrientation: trial.correctOrientation,
              userAnswer: null,
              isCorrect: false,
              unattempted: true,
            },
            trial,
            playedParam: 0.1,
            isCorrectForStaircase: false,
          }}
        />,
      );
      const ids = collectTargetIds(toJSON() as unknown as Parameters<typeof collectTargetIds>[0]);
      expect(ids).toContain(`g09-${trial.correctOrientation}`);
    });

    it('G-10 Result：4 象限ボタンに `g10-{tl|tr|bl|br}` が出る', () => {
      const trial = buildG10Trial(30, () => 0.4);
      const { toJSON } = render(
        <G10ResultScreen
          {...baseProps}
          result={{
            thresholdDeg: 30,
            grading: {
              correctQuadrant: trial.correctQuadrant,
              userAnswer: null,
              isCorrect: false,
              unattempted: true,
            },
            trial,
            playedParam: 30,
            isCorrectForStaircase: false,
          }}
        />,
      );
      const ids = collectTargetIds(toJSON() as unknown as Parameters<typeof collectTargetIds>[0]);
      ['g10-tl', 'g10-tr', 'g10-bl', 'g10-br'].forEach((id) => {
        expect(ids).toContain(id);
      });
    });

    it('G-11 Result（v1.1.2 Sprint 21）：G11VernierStimulus 下左右テストパッチに `g11-test-left` / `g11-test-right` が出る', () => {
      const trial = buildG11Trial(2, () => 0.4);
      const { toJSON } = render(
        <G11ResultScreen
          {...baseProps}
          result={{
            thresholdArcmin: 2,
            grading: {
              correctDirection: trial.correctDirection,
              userAnswer: null,
              isCorrect: false,
              unattempted: true,
              correctSide: trial.correctSide,
              userAnswerSide: null,
            },
            trial,
            playedParam: 2,
            isCorrectForStaircase: false,
          }}
        />,
      );
      const ids = collectTargetIds(toJSON() as unknown as Parameters<typeof collectTargetIds>[0]);
      expect(ids).toContain('g11-test-left');
      expect(ids).toContain('g11-test-right');
    });

    it('G-12 Result：4 向きボタンに `g12-{orientation}` が出る', () => {
      const trial = buildG12Trial(2, () => 0.4);
      const { toJSON } = render(
        <G12ResultScreen
          {...baseProps}
          result={{
            thresholdSpacing: 2,
            grading: {
              correctOrientation: trial.correctOrientation,
              userAnswer: null,
              isCorrect: false,
              unattempted: true,
            },
            trial,
            playedParam: 2,
            isCorrectForStaircase: false,
          }}
        />,
      );
      const ids = collectTargetIds(toJSON() as unknown as Parameters<typeof collectTargetIds>[0]);
      ['g12-vertical', 'g12-horizontal', 'g12-diagonalRight', 'g12-diagonalLeft'].forEach((id) => {
        expect(ids).toContain(id);
      });
    });

    it('G-13 Result：keypad 10 ボタンに `g13-key-{0..9}` が出る', () => {
      const trial = buildG13Trial(0.1, () => 0.4);
      const { toJSON } = render(
        <G13ResultScreen
          {...baseProps}
          result={{
            thresholdContrast: 0.1,
            grading: {
              embeddedDigit: trial.embeddedDigit,
              userAnswer: null,
              isCorrect: false,
              unattempted: true,
            },
            trial,
            playedParam: 0.1,
            isCorrectForStaircase: false,
          }}
        />,
      );
      const ids = collectTargetIds(toJSON() as unknown as Parameters<typeof collectTargetIds>[0]);
      for (let d = 0; d <= 9; d++) {
        expect(ids).toContain(`g13-key-${d}`);
      }
    });
  });
});
