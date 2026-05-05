/**
 * DistanceReminderV11 — F-16 受け入れテスト（spec-v11.md §F-16）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { DistanceReminderV11 } from '../../../src/components/v11/DistanceReminderV11';

describe('DistanceReminderV11: F-16', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('「画面から N cm 離れてください」を表示', () => {
    const { getByText } = render(
      <DistanceReminderV11
        distanceCm={40}
        onCountdownComplete={jest.fn()}
        onAbort={jest.fn()}
      />,
    );
    expect(getByText(/40cm/)).toBeTruthy();
    expect(getByText(/離れてください/)).toBeTruthy();
  });

  it('初期表示で「3」を表示し、3 秒経過で onCountdownComplete が呼ばれる', () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(
      <DistanceReminderV11
        distanceCm={40}
        onCountdownComplete={onComplete}
        onAbort={jest.fn()}
      />,
    );
    expect(getByTestId('distance-reminder-count').props.children).toBe(3);

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(getByTestId('distance-reminder-count').props.children).toBe(2);

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(getByTestId('distance-reminder-count').props.children).toBe(1);

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(getByTestId('distance-reminder-count').props.children).toBe(0);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('複数 tick 経過しても onCountdownComplete は 1 度だけ', () => {
    const onComplete = jest.fn();
    render(
      <DistanceReminderV11
        distanceCm={40}
        onCountdownComplete={onComplete}
        onAbort={jest.fn()}
      />,
    );
    // 1 秒ずつ進めて React 状態を更新させる（5 秒分）
    for (let i = 0; i < 5; i += 1) {
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    }
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('× ボタンで onAbort が呼ばれる', () => {
    const onAbort = jest.fn();
    const { getByTestId } = render(
      <DistanceReminderV11
        distanceCm={40}
        onCountdownComplete={jest.fn()}
        onAbort={onAbort}
      />,
    );
    fireEvent.press(getByTestId('distance-reminder-abort'));
    expect(onAbort).toHaveBeenCalledTimes(1);
  });

  it('「準備ができました」プライマリボタンは存在しない（v1.1 廃止）', () => {
    const { queryByText } = render(
      <DistanceReminderV11
        distanceCm={40}
        onCountdownComplete={jest.fn()}
        onAbort={jest.fn()}
      />,
    );
    expect(queryByText('準備ができました')).toBeNull();
  });

  it('30cm / 40cm / 50cm すべての設定値で正しく表示', () => {
    for (const d of [30, 40, 50] as const) {
      const { getByText, unmount } = render(
        <DistanceReminderV11
          distanceCm={d}
          onCountdownComplete={jest.fn()}
          onAbort={jest.fn()}
        />,
      );
      expect(getByText(new RegExp(`${d}cm`))).toBeTruthy();
      unmount();
    }
  });

  it('oneEyeGuidance=off では「片目を覆ってください」を表示しない', () => {
    const { queryByText } = render(
      <DistanceReminderV11
        distanceCm={40}
        oneEyeGuidance="off"
        onCountdownComplete={jest.fn()}
        onAbort={jest.fn()}
      />,
    );
    expect(queryByText(/片目を覆ってください/)).toBeNull();
  });

  it('oneEyeGuidance=left のとき「片目を覆ってください」を表示', () => {
    const { getByText } = render(
      <DistanceReminderV11
        distanceCm={40}
        oneEyeGuidance="left"
        onCountdownComplete={jest.fn()}
        onAbort={jest.fn()}
      />,
    );
    expect(getByText(/片目を覆ってください/)).toBeTruthy();
  });

  it('カウントダウン数字の aria-live は polite', () => {
    const { getByTestId } = render(
      <DistanceReminderV11
        distanceCm={40}
        onCountdownComplete={jest.fn()}
        onAbort={jest.fn()}
      />,
    );
    const countNode = getByTestId('distance-reminder-count');
    expect(countNode.props.accessibilityLiveRegion).toBe('polite');
  });

  it('paused=true のあいだはカウントダウンが進まない', () => {
    const onComplete = jest.fn();
    const { getByTestId, rerender } = render(
      <DistanceReminderV11
        distanceCm={40}
        onCountdownComplete={onComplete}
        onAbort={jest.fn()}
        paused
      />,
    );
    expect(getByTestId('distance-reminder-count').props.children).toBe(3);
    // paused のため 5 秒進めても 3 のまま
    for (let i = 0; i < 5; i += 1) {
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    }
    expect(getByTestId('distance-reminder-count').props.children).toBe(3);
    expect(onComplete).not.toHaveBeenCalled();

    // paused を解除すると残り秒数から再開
    rerender(
      <DistanceReminderV11
        distanceCm={40}
        onCountdownComplete={onComplete}
        onAbort={jest.fn()}
        paused={false}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(getByTestId('distance-reminder-count').props.children).toBe(2);
  });

  it('paused 既定 false：従来どおりカウントダウンが進む（後方互換）', () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(
      <DistanceReminderV11
        distanceCm={40}
        onCountdownComplete={onComplete}
        onAbort={jest.fn()}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(getByTestId('distance-reminder-count').props.children).toBe(2);
  });
});
