/**
 * G01ChangeDetectScreen — F-07 G-01 受け入れテスト（spec-v11.md §7.1、screens.md S9-02）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import {
  act,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { G01ChangeDetectScreen } from '../../../../src/screens/v11/games/G01ChangeDetectScreen';

beforeEach(async () => {
  jest.useFakeTimers();
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

// テスト用に short totalDurationMs を使う（60000 を待つと現実的でない）
const SHORT_DURATION = 1000;
const TICK_MS = 100;

describe('G01ChangeDetectScreen: F-07 / OPT-12', () => {
  it('描画クラッシュなしでマウントできる', async () => {
    const { findByTestId } = render(
      <G01ChangeDetectScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={jest.fn()}
        rng={() => 0.5}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    // staircase ロード後は g01-change-detect-screen が出る
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    await findByTestId('g01-change-detect-screen');
  });

  it('「確定」「決定」ボタンは存在しない（OPT-12 確定ボタンなし）', async () => {
    const { queryByText, findByTestId } = render(
      <G01ChangeDetectScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={jest.fn()}
        rng={() => 0.5}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    await findByTestId('g01-change-detect-screen');
    // 「確定」「決定」「完了」ラベルのボタンは存在しない
    expect(queryByText(/^確定$/)).toBeNull();
    expect(queryByText(/^決定$/)).toBeNull();
    expect(queryByText(/^完了$/)).toBeNull();
  });

  it('GameStatusBarV11 が描画され、× で onAbort 確認ダイアログが出る', async () => {
    const { findByTestId, getByText } = render(
      <G01ChangeDetectScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={jest.fn()}
        rng={() => 0.5}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    await findByTestId('g01-change-detect-screen');
    // status bar exists
    await findByTestId('game-status-bar-v11');
    // ConfirmDialog は中断アクション時に出るが、初期は出ない
    expect(() => getByText('ゲームを中断しますか？')).toThrow();
  });

  it('ガイド文「動いていると思うパッチをタップしてください」を表示', async () => {
    const { findByTestId, queryAllByText } = render(
      <G01ChangeDetectScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={jest.fn()}
        rng={() => 0.5}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    await findByTestId('g01-change-detect-screen');
    // ガイド文 + aria-instruction の 2 箇所に含まれる（≥1 件あれば OK）
    expect(queryAllByText(/動いていると思うパッチをタップ/).length).toBeGreaterThanOrEqual(1);
  });

  it('60 秒経過（テストでは SHORT_DURATION）で onComplete が呼ばれる', async () => {
    const onComplete = jest.fn();
    render(
      <G01ChangeDetectScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0.5}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    // staircase ロード（async）→ playing 開始まで進める
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    // SHORT_DURATION 分タイマーを進める
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION + TICK_MS);
      await Promise.resolve();
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const result = onComplete.mock.calls[0][0];
    expect(result.unattempted).toBe(true); // タップなしで時間経過
    expect(result.grading).toBeNull();
    expect(typeof result.thresholdDeg).toBe('number');
  });

  it('内側「中断しますか？」ダイアログ表示中は 60 秒タイマーが停止する（showAbort で paused）', async () => {
    // ホットフィックス：内側 ConfirmDialog（showAbort）表示中も
    // useGameCountdown が paused 扱いになるので、SHORT_DURATION を超えて
    // タイマーを進めても onTimeUp（=onComplete）は発火しない。
    const onComplete = jest.fn();
    const { findByTestId, getByTestId } = render(
      <G01ChangeDetectScreen
        distanceCm={40}
        onAbort={jest.fn()}
        onComplete={onComplete}
        rng={() => 0.5}
        totalDurationMsForTest={SHORT_DURATION}
        tickMsForTest={TICK_MS}
      />,
    );
    // playing 開始
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    await findByTestId('g01-change-detect-screen');
    // × 押下で内側 ConfirmDialog を開く（showAbort=true）
    await act(async () => {
      fireEvent.press(getByTestId('game-status-bar-v11-abort'));
      await Promise.resolve();
    });
    // SHORT_DURATION の数倍進めても onComplete は呼ばれない
    await act(async () => {
      jest.advanceTimersByTime(SHORT_DURATION * 3);
      await Promise.resolve();
    });
    expect(onComplete).not.toHaveBeenCalled();
  });

  // Sprint 20-B-3：F-10 v1.1.1「画面遷移せずに刺激画面のまま結果開示する」
  describe('Sprint 20-B-3：60 秒経過後の結果開示動線', () => {
    it('単体プレイ時：60 秒経過 → 同じ Screen 内に ResultOverlay（result-overlay-action-bar）が表示される（独立画面遷移なし）', async () => {
      const onComplete = jest.fn();
      const { findByTestId, getByTestId } = render(
        <G01ChangeDetectScreen
          distanceCm={40}
          onAbort={jest.fn()}
          onComplete={onComplete}
          rng={() => 0.5}
          totalDurationMsForTest={SHORT_DURATION}
          tickMsForTest={TICK_MS}
          onPlayAgain={jest.fn()}
          onBackToList={jest.fn()}
          onGoHome={jest.fn()}
        />,
      );
      await act(async () => {
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });
      await findByTestId('g01-change-detect-screen');
      // 60 秒経過
      await act(async () => {
        jest.advanceTimersByTime(SHORT_DURATION + 100);
        await Promise.resolve();
      });
      // PlayScreen と同じ container 内で ResultOverlay の action-bar が現れる
      // （独立画面遷移していない＝testID は g01-change-detect-screen のまま）
      expect(getByTestId('g01-change-detect-screen')).toBeTruthy();
      expect(getByTestId('result-overlay-action-bar')).toBeTruthy();
      // 「次へ」ボタンも露出する
      expect(getByTestId('result-overlay-next')).toBeTruthy();
      // onComplete も呼ばれる（永続化トリガ）
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('コースモード時：result phase に入って ResultOverlay(mode="course") を描画する（Sprint 22 仕様）', async () => {
      const onComplete = jest.fn();
      const { findByTestId, getByTestId, queryByTestId } = render(
        <G01ChangeDetectScreen
          distanceCm={40}
          onAbort={jest.fn()}
          onComplete={onComplete}
          rng={() => 0.5}
          totalDurationMsForTest={SHORT_DURATION}
          tickMsForTest={TICK_MS}
          isCourseMode
          nextGameLabel="G-02 左右並び傾き判別"
          onCourseAdvance={jest.fn()}
        />,
      );
      await act(async () => {
        jest.advanceTimersByTime(0);
        await Promise.resolve();
      });
      await findByTestId('g01-change-detect-screen');
      // 60 秒経過
      await act(async () => {
        jest.advanceTimersByTime(SHORT_DURATION + 100);
        await Promise.resolve();
      });
      // Sprint 22：コース時も result phase に入り、ResultOverlay の course-bar
      // （カウントダウン + × ボタン）が描画される。
      expect(getByTestId('result-overlay-action-bar')).toBeTruthy();
      expect(queryByTestId('result-overlay-course-bar')).not.toBeNull();
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });
});
