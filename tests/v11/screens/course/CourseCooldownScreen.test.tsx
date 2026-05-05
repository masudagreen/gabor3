/**
 * CourseCooldownScreen — S18-05 / F-15 受け入れテスト。
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { CourseCooldownScreen } from '../../../../src/screens/v11/course/CourseCooldownScreen';

describe('CourseCooldownScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('初期カウントダウン 10', () => {
    const { getByTestId } = render(
      <CourseCooldownScreen onCompleted={() => {}} />,
    );
    expect(getByTestId('course-cooldown-count').props.children).toBe(10);
  });

  it('10 秒経過で onCompleted 自動発火', () => {
    const onCompleted = jest.fn();
    render(
      <CourseCooldownScreen
        onCompleted={onCompleted}
        initialSecondsForTest={10}
        tickMsForTest={1000}
      />,
    );
    for (let i = 0; i < 11; i++) {
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    }
    expect(onCompleted).toHaveBeenCalledTimes(1);
  });

  it('スキップタップで onCompleted 即発火', () => {
    const onCompleted = jest.fn();
    const { getByTestId } = render(
      <CourseCooldownScreen onCompleted={onCompleted} />,
    );
    fireEvent.press(getByTestId('course-cooldown-skip'));
    expect(onCompleted).toHaveBeenCalledTimes(1);
  });

  it('スキップ連打しても onCompleted は 1 回のみ', () => {
    const onCompleted = jest.fn();
    const { getByTestId } = render(
      <CourseCooldownScreen onCompleted={onCompleted} />,
    );
    fireEvent.press(getByTestId('course-cooldown-skip'));
    fireEvent.press(getByTestId('course-cooldown-skip'));
    fireEvent.press(getByTestId('course-cooldown-skip'));
    expect(onCompleted).toHaveBeenCalledTimes(1);
  });

  it('a11y：カウントダウンは aria-live polite', () => {
    const { getByTestId } = render(
      <CourseCooldownScreen onCompleted={() => {}} />,
    );
    const cd = getByTestId('course-cooldown-count');
    expect(cd.props.accessibilityLiveRegion).toBe('polite');
  });

  it('「目を休めましょう」見出しがある', () => {
    const { getByText } = render(
      <CourseCooldownScreen onCompleted={() => {}} />,
    );
    expect(getByText('目を休めましょう')).toBeTruthy();
  });

  it('onAbort 未指定時：中断ボタンは描画されない（後方互換）', () => {
    const { queryByTestId } = render(
      <CourseCooldownScreen onCompleted={() => {}} />,
    );
    expect(queryByTestId('course-cooldown-abort')).toBeNull();
  });

  it('onAbort 指定時：中断ボタン押下で onAbort 発火', () => {
    const onAbort = jest.fn();
    const { getByTestId } = render(
      <CourseCooldownScreen onCompleted={() => {}} onAbort={onAbort} />,
    );
    fireEvent.press(getByTestId('course-cooldown-abort'));
    expect(onAbort).toHaveBeenCalledTimes(1);
  });

  it('paused=true のあいだはカウントダウンが進まず onCompleted も呼ばれない', () => {
    const onCompleted = jest.fn();
    const { getByTestId, rerender } = render(
      <CourseCooldownScreen
        onCompleted={onCompleted}
        initialSecondsForTest={10}
        tickMsForTest={1000}
        paused
      />,
    );
    for (let i = 0; i < 15; i += 1) {
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    }
    expect(getByTestId('course-cooldown-count').props.children).toBe(10);
    expect(onCompleted).not.toHaveBeenCalled();

    rerender(
      <CourseCooldownScreen
        onCompleted={onCompleted}
        initialSecondsForTest={10}
        tickMsForTest={1000}
        paused={false}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(getByTestId('course-cooldown-count').props.children).toBe(9);
  });
});
