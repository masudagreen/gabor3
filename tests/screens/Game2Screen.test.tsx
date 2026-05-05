/**
 * Game2Screen の挙動確認（amendment 後：左右並び 5 秒同時提示 + 3 秒回答 + 60 秒セッション）。
 *
 * spec.md §7.2 / screens.md S1-03 受け入れ基準：
 *   - 初回のみ固視点 → 左右並び 5 秒提示 → 回答受付（最大 3 秒）→ フィードバック → 次試行
 *   - 試行間はガボール継続表示（消えない、fixation スキップ、直接 presentation）
 *   - 3 秒以内未回答 → 不正解扱い（noResponse、staircase up）
 *   - 60 秒経過で強制終了 → onComplete
 *   - 30 試行達成で終了 → onComplete
 *   - 回答ボタン「左 / 右」2 個 + ガボール画像タップでも回答可
 *   - 設問「どちらが時計回りに傾いていますか？」
 */

import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Game2Screen } from '../../src/screens/Game2Screen';
import { GAME2 } from '../../src/lib/game2';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// 描画コストの高い GaborPatch をモック（Image が data URL に解像する）
jest.mock('../../src/components/GaborPatch', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    GaborPatch: (props: { sizePx: number; ariaLabel?: string; testId?: string }) =>
      React.createElement(View, {
        testID: props.testId,
        accessibilityLabel: props.ariaLabel,
        style: { width: props.sizePx, height: props.sizePx },
      }),
  };
});

jest.useFakeTimers();

async function settleStaircaseLoad(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    jest.advanceTimersByTime(0);
  });
}

describe('Game2Screen (amendment)', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  it('描画クラッシュせず、設問テキストと回答ボタンが表示される', async () => {
    const { getByTestId, getByText } = render(
      <Game2Screen distanceCm={40} onAbort={jest.fn()} onComplete={jest.fn()} />,
    );
    await settleStaircaseLoad();

    expect(getByText(/どちらが時計回りに傾いていますか/)).toBeTruthy();
    expect(getByTestId('answer-left')).toBeTruthy();
    expect(getByTestId('answer-right')).toBeTruthy();
  });

  it('fixation(500ms) → presentation でガボールペアが描画される', async () => {
    const { getByTestId, queryByTestId } = render(
      <Game2Screen distanceCm={40} onAbort={jest.fn()} onComplete={jest.fn()} />,
    );
    await settleStaircaseLoad();

    // 初期は fixation：固視点 testId が見え、ガボールペアはまだ
    expect(getByTestId('game2-fixation')).toBeTruthy();
    expect(queryByTestId('game2-pair')).toBeNull();

    // 500ms 経過 → presentation
    act(() => {
      jest.advanceTimersByTime(GAME2.fixationDurationMs);
    });
    expect(getByTestId('game2-pair')).toBeTruthy();
  });

  it('提示 5 秒は回答ボタン disabled、5 秒経過後に enabled になる', async () => {
    const { getByTestId } = render(
      <Game2Screen distanceCm={40} onAbort={jest.fn()} onComplete={jest.fn()} />,
    );
    await settleStaircaseLoad();

    // fixation を消化
    act(() => {
      jest.advanceTimersByTime(GAME2.fixationDurationMs);
    });
    // presentation 中はボタン disabled
    const left = getByTestId('answer-left');
    expect(left.props.accessibilityState?.disabled).toBe(true);

    // 5 秒経過 → answer フェーズで enabled
    act(() => {
      jest.advanceTimersByTime(GAME2.presentationDurationMs);
    });
    const leftAfter = getByTestId('answer-left');
    expect(leftAfter.props.accessibilityState?.disabled).toBe(false);
  });

  it('3 秒以内未回答（タイムアウト）でも次試行に進み、onComplete は呼ばれない', async () => {
    const onComplete = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <Game2Screen distanceCm={40} onAbort={jest.fn()} onComplete={onComplete} />,
    );
    await settleStaircaseLoad();

    // fixation 500 → presentation 5000 → response 3000(timeout) → feedback 1500 → 直接 presentation（次試行）
    // 試行間で fixation には戻らずガボールが消えない（amendment 2026-04-30）
    await act(async () => {
      jest.advanceTimersByTime(GAME2.fixationDurationMs);
    });
    await act(async () => {
      jest.advanceTimersByTime(GAME2.presentationDurationMs);
    });
    await act(async () => {
      jest.advanceTimersByTime(GAME2.responseTimeLimitMs);
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      jest.advanceTimersByTime(GAME2.feedbackDurationMs);
    });

    // 30 試行未満かつ 60 秒未満なので onComplete は呼ばれていない
    expect(onComplete).not.toHaveBeenCalled();
    // 次試行は fixation を経ずに presentation で開始（ガボールが連続表示）
    expect(queryByTestId('game2-fixation')).toBeNull();
    expect(getByTestId('game2-pair')).toBeTruthy();
  });

  it('60 秒経過で onComplete が呼ばれセッションが終了する', async () => {
    const onComplete = jest.fn();
    render(
      <Game2Screen distanceCm={40} onAbort={jest.fn()} onComplete={onComplete} />,
    );
    await settleStaircaseLoad();

    // 1 試行 = fixation(500) + presentation(5000) + response(3000) + feedback(1000) = 9500ms
    // タイムアウトを繰り返し、60 秒に到達するまで進める。各フェーズで microtask flush。
    for (let i = 0; i < 7 && !onComplete.mock.calls.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => {
        jest.advanceTimersByTime(GAME2.fixationDurationMs);
      });
      // eslint-disable-next-line no-await-in-loop
      await act(async () => {
        jest.advanceTimersByTime(GAME2.presentationDurationMs);
      });
      // eslint-disable-next-line no-await-in-loop
      await act(async () => {
        jest.advanceTimersByTime(GAME2.responseTimeLimitMs);
        await Promise.resolve();
        await Promise.resolve();
      });
      // eslint-disable-next-line no-await-in-loop
      await act(async () => {
        jest.advanceTimersByTime(GAME2.feedbackDurationMs);
      });
    }
    // 6.5 試行分（≒ 61.75 秒）経過 → 60 秒制限到達
    expect(onComplete).toHaveBeenCalled();
  });

  it('左ボタン押下で finalizeTrial が走り、次試行は fixation を経ず直接 presentation に進む', async () => {
    const { getByTestId, queryByTestId } = render(
      <Game2Screen distanceCm={40} onAbort={jest.fn()} onComplete={jest.fn()} />,
    );
    await settleStaircaseLoad();

    // fixation → presentation を消化
    await act(async () => {
      jest.advanceTimersByTime(GAME2.fixationDurationMs);
    });
    await act(async () => {
      jest.advanceTimersByTime(GAME2.presentationDurationMs);
    });

    // answer 中に左を押す
    await act(async () => {
      fireEvent.press(getByTestId('answer-left'));
      await Promise.resolve();
    });

    // feedback 経過 → 次試行は presentation から（fixation スキップ、ガボール継続表示）
    await act(async () => {
      jest.advanceTimersByTime(GAME2.feedbackDurationMs);
    });
    expect(queryByTestId('game2-fixation')).toBeNull();
    expect(getByTestId('game2-pair')).toBeTruthy();
  });

  it('answer フェーズでガボール画像（左パッチ）をタップしても回答できる', async () => {
    const { getByTestId, queryByTestId } = render(
      <Game2Screen distanceCm={40} onAbort={jest.fn()} onComplete={jest.fn()} />,
    );
    await settleStaircaseLoad();

    await act(async () => {
      jest.advanceTimersByTime(GAME2.fixationDurationMs);
    });
    await act(async () => {
      jest.advanceTimersByTime(GAME2.presentationDurationMs);
    });

    // answer 中にガボール左画像をタップ
    await act(async () => {
      fireEvent.press(getByTestId('game2-pair-left'));
      await Promise.resolve();
    });

    // feedback 経過 → 次試行 presentation（タップで次へ進む）
    await act(async () => {
      jest.advanceTimersByTime(GAME2.feedbackDurationMs);
    });
    expect(queryByTestId('game2-fixation')).toBeNull();
    expect(getByTestId('game2-pair')).toBeTruthy();
  });

  it('中断 × ボタンで ConfirmDialog 経由で onAbort を呼べる', async () => {
    const onAbort = jest.fn();
    const { getByTestId, getByText } = render(
      <Game2Screen distanceCm={40} onAbort={onAbort} onComplete={jest.fn()} />,
    );
    await settleStaircaseLoad();

    fireEvent.press(getByTestId('status-abort'));
    fireEvent.press(getByText('中断する'));
    expect(onAbort).toHaveBeenCalled();
  });
});
