/**
 * 13 ゲーム共通：60 秒経過後の result phase 遷移と ResultOverlay 表示のリグレッション
 * 防止テスト（Sprint 21 ホットフィックス）。
 *
 * 背景：
 *   Sprint 20-B-3 で「g0X-result route 撤去 + PlayScreen 内 result phase 描画」へ
 *   切り替えた。Sprint 21 で 9 ゲームの UI 構造を改訂したが、各 PlayScreen の
 *   `handleTimeUp` → `setPhase('result')` → `<G0XResultScreen>` 描画 → ResultOverlay
 *   表示 という核心動線が **テストで担保されていなかった**（既存テストは onComplete
 *   が呼ばれるところまでしか確認していない）。
 *
 *   実機で「60 秒経過後に解答が出ない」報告があった際、テスト 2307 件 PASS にも
 *   関わらず原因切り分けが困難になる。本テストは：
 *
 *     1. 単体プレイ動線（isCourseMode=false）で 60 秒経過時に
 *        PlayScreen 内に `result-overlay-action-bar` testID（=ResultOverlay の
 *        「次へ」ボタン領域）が描画される
 *     2. `g0X-result-screen` testID（=各 G0XResultScreen ラッパー）が描画される
 *     3. ResultOverlay 内の SR 用テキスト `result-overlay-sr-text` に
 *        「結果。…次へ」と読み上げ文字列が含まれる
 *
 *   を 13 ゲーム分担保する。本テストが PASS していれば、実機での「60 秒経過 →
 *   result phase 遷移 → ResultOverlay 表示」が壊れていない保証になる。
 *
 * 使用パターン：
 *   - `tickMsForTest=10ms` + `totalDurationMsForTest=200ms`：jest fake timer で
 *     瞬時に 60 秒分相当を進める（既存パターン）
 *   - `onComplete` は `Promise.resolve({ previousBest: null, newlyAwardedBadges: [] })`
 *     を返して PlayScreen が PostCompleteData を受け取る経路もカバー
 *   - `isCourseMode=false`（プロップ未指定）で単体プレイ result phase に遷移する
 *     ことを確認（コース時は CourseRunner 側で interstitial を出すため別系統）
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { G01ChangeDetectScreen } from '../../../../src/screens/v11/games/G01ChangeDetectScreen';
import { G02SideBySideTiltScreen } from '../../../../src/screens/v11/games/G02SideBySideTiltScreen';
import { G03PeripheralHuntScreen } from '../../../../src/screens/v11/games/G03PeripheralHuntScreen';
import { G04ContrastDiscrimScreen } from '../../../../src/screens/v11/games/G04ContrastDiscrimScreen';
import { G05SfDiscrimScreen } from '../../../../src/screens/v11/games/G05SfDiscrimScreen';
import { G06WindowSizeScreen } from '../../../../src/screens/v11/games/G06WindowSizeScreen';
import { G07EdgeHuntScreen } from '../../../../src/screens/v11/games/G07EdgeHuntScreen';
import { G08TiltAftereffectScreen } from '../../../../src/screens/v11/games/G08TiltAftereffectScreen';
import { G09LateralMaskingScreen } from '../../../../src/screens/v11/games/G09LateralMaskingScreen';
import { G10TextureSegmentationScreen } from '../../../../src/screens/v11/games/G10TextureSegmentationScreen';
import { G11VernierAlignmentScreen } from '../../../../src/screens/v11/games/G11VernierAlignmentScreen';
import { G12CrowdingScreen } from '../../../../src/screens/v11/games/G12CrowdingScreen';
import { G13EmbeddedNumeralScreen } from '../../../../src/screens/v11/games/G13EmbeddedNumeralScreen';

beforeEach(async () => {
  jest.useFakeTimers();
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

const SHORT_DURATION = 200;
const TICK_MS = 10;

/**
 * 各ゲーム共通の確認ヘルパ：
 *   - 60 秒（= SHORT_DURATION）経過 → onComplete 1 回呼ばれる
 *   - PlayScreen 内に result-overlay-action-bar / g0X-result-screen が描画される
 *   - SR 用テキストに「結果」と「次へ」が含まれる
 *   - onComplete が返す Promise の resolve 後に PostCompleteData が反映される
 *     （本テストでは具体的な反映先は問わず、エラーで落ちないことだけ担保）
 */
async function verifyResultPhaseTransition(args: {
  resultScreenTestId: string;
  rendered: ReturnType<typeof render>;
  onComplete: jest.Mock;
}) {
  const { resultScreenTestId, rendered, onComplete } = args;
  const { findByTestId, getByTestId } = rendered;

  // 1. 60 秒分（+α）の time advance
  await act(async () => {
    jest.advanceTimersByTime(0);
    await Promise.resolve();
  });
  await act(async () => {
    jest.advanceTimersByTime(SHORT_DURATION + TICK_MS * 2);
    await Promise.resolve();
  });

  // 2. onComplete が呼ばれた（既存テストでも担保されている動線）
  await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));

  // 3. result phase の核心要素が描画された
  //    PlayScreen が phase='result' に切り替わり、G0XResultScreen を重畳描画した結果、
  //    ResultOverlay 配下の testID 群が DOM に現れる。
  await findByTestId(resultScreenTestId);
  await findByTestId('result-overlay-action-bar');
  await findByTestId('result-overlay-next');
  await findByTestId('result-overlay-sr-text');

  // 4. SR 用テキストに「結果」「次へ」が含まれる
  const srText = getByTestId('result-overlay-sr-text').props.children;
  const srStr = Array.isArray(srText) ? srText.join('') : String(srText);
  expect(srStr).toContain('結果');
  expect(srStr).toContain('次へ');

  // 5. PostCompleteData の Promise resolve 後にもエラーで落ちない
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

/** PostCompleteData を返す擬似 onComplete */
function makeOnComplete() {
  return jest.fn().mockResolvedValue({
    previousBest: null,
    newlyAwardedBadges: [],
  });
}

describe('Sprint 21 ホットフィックス：60 秒経過後の result phase 遷移（13 ゲーム共通）', () => {
  it('G-01：60 秒経過で result phase に遷移し ResultOverlay を表示', async () => {
    const onComplete = makeOnComplete();
    const rendered = render(
      <G01ChangeDetectScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        rng={() => 0.4}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await verifyResultPhaseTransition({
      resultScreenTestId: 'g01-result-screen',
      rendered,
      onComplete,
    });
  });

  it('G-02：60 秒経過で result phase に遷移し ResultOverlay を表示', async () => {
    const onComplete = makeOnComplete();
    const rendered = render(
      <G02SideBySideTiltScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        rng={() => 0.4}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await verifyResultPhaseTransition({
      resultScreenTestId: 'g02-result-screen',
      rendered,
      onComplete,
    });
  });

  it('G-03：60 秒経過で result phase に遷移し ResultOverlay を表示', async () => {
    const onComplete = makeOnComplete();
    const rendered = render(
      <G03PeripheralHuntScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        rng={() => 0.4}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await verifyResultPhaseTransition({
      resultScreenTestId: 'g03-result-screen',
      rendered,
      onComplete,
    });
  });

  it('G-04：60 秒経過で result phase に遷移し ResultOverlay を表示', async () => {
    const onComplete = makeOnComplete();
    const rendered = render(
      <G04ContrastDiscrimScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        rng={() => 0.4}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await verifyResultPhaseTransition({
      resultScreenTestId: 'g04-result-screen',
      rendered,
      onComplete,
    });
  });

  it('G-05：60 秒経過で result phase に遷移し ResultOverlay を表示', async () => {
    const onComplete = makeOnComplete();
    const rendered = render(
      <G05SfDiscrimScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        rng={() => 0.4}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await verifyResultPhaseTransition({
      resultScreenTestId: 'g05-result-screen',
      rendered,
      onComplete,
    });
  });

  it('G-06：60 秒経過で result phase に遷移し ResultOverlay を表示', async () => {
    const onComplete = makeOnComplete();
    const rendered = render(
      <G06WindowSizeScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        rng={() => 0.4}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await verifyResultPhaseTransition({
      resultScreenTestId: 'g06-result-screen',
      rendered,
      onComplete,
    });
  });

  it('G-07：60 秒経過で result phase に遷移し ResultOverlay を表示', async () => {
    const onComplete = makeOnComplete();
    const rendered = render(
      <G07EdgeHuntScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        rng={() => 0.4}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await verifyResultPhaseTransition({
      resultScreenTestId: 'g07-result-screen',
      rendered,
      onComplete,
    });
  });

  it('G-08：60 秒経過で result phase に遷移し ResultOverlay を表示', async () => {
    const onComplete = makeOnComplete();
    const rendered = render(
      <G08TiltAftereffectScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        rng={() => 0.4}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await verifyResultPhaseTransition({
      resultScreenTestId: 'g08-result-screen',
      rendered,
      onComplete,
    });
  });

  it('G-09：60 秒経過で result phase に遷移し ResultOverlay を表示', async () => {
    const onComplete = makeOnComplete();
    const rendered = render(
      <G09LateralMaskingScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        rng={() => 0.4}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await verifyResultPhaseTransition({
      resultScreenTestId: 'g09-result-screen',
      rendered,
      onComplete,
    });
  });

  it('G-10：60 秒経過で result phase に遷移し ResultOverlay を表示', async () => {
    const onComplete = makeOnComplete();
    const rendered = render(
      <G10TextureSegmentationScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        rng={() => 0.4}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await verifyResultPhaseTransition({
      resultScreenTestId: 'g10-result-screen',
      rendered,
      onComplete,
    });
  });

  it('G-11：60 秒経過で result phase に遷移し ResultOverlay を表示', async () => {
    const onComplete = makeOnComplete();
    const rendered = render(
      <G11VernierAlignmentScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        rng={() => 0.4}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await verifyResultPhaseTransition({
      resultScreenTestId: 'g11-result-screen',
      rendered,
      onComplete,
    });
  });

  it('G-12：60 秒経過で result phase に遷移し ResultOverlay を表示', async () => {
    const onComplete = makeOnComplete();
    const rendered = render(
      <G12CrowdingScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        rng={() => 0.4}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await verifyResultPhaseTransition({
      resultScreenTestId: 'g12-result-screen',
      rendered,
      onComplete,
    });
  });

  it('G-13：60 秒経過で result phase に遷移し ResultOverlay を表示', async () => {
    const onComplete = makeOnComplete();
    const rendered = render(
      <G13EmbeddedNumeralScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
        rng={() => 0.4}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await verifyResultPhaseTransition({
      resultScreenTestId: 'g13-result-screen',
      rendered,
      onComplete,
    });
  });
});

describe('Sprint 22：isCourseMode=true 時も PlayScreen 内 result phase に入る', () => {
  /**
   * 仕様再確定（Sprint 22）：コース時の「60 秒経過後に解答が出ない」報告に対応し、
   * PlayScreen は isCourseMode=true でも phase='result' に遷移して GxxResultScreen
   * を描画する。GxxResultScreen は ResultOverlay に extraStimulus（gabor patches の
   * disabled プレビュー + data-target-id 要素）を渡すため、◯/✕ marks が刺激領域上に
   * 重畳描画される。
   *
   * 代表 1 ゲーム（G-04）で確認すれば 13 ゲーム共通の handleTimeUp パターンを
   * 担保できる。
   */
  it('G-04：isCourseMode=true でも g04-result-screen が描画される', async () => {
    const onComplete = makeOnComplete();
    const { queryByTestId } = render(
      <G04ContrastDiscrimScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        isCourseMode
        nextGameLabel="G-05 空間周波数弁別"
        onCourseAdvance={jest.fn()}
        rng={() => 0.4}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS * 2);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    // result phase に入って G04ResultScreen / ResultOverlay が描画される
    await waitFor(() => expect(queryByTestId('g04-result-screen')).not.toBeNull());
    expect(queryByTestId('result-overlay-action-bar')).not.toBeNull();
    // コース時は course-bar（× + カウントダウン）が出る
    expect(queryByTestId('result-overlay-course-bar')).not.toBeNull();
  });
});
