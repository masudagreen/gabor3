/**
 * CooldownScreen の動作テスト。
 * spec.md F-16 / screens.md S5-02。
 */

import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { CooldownScreen } from '../../src/screens/CooldownScreen';

jest.useFakeTimers();

describe('CooldownScreen', () => {
  it('10 秒経過で onComplete が呼ばれる', () => {
    const onComplete = jest.fn();
    render(<CooldownScreen onComplete={onComplete} totalSeconds={10} />);
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('スキップボタンで途中離脱（onComplete が呼ばれる）', () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(
      <CooldownScreen onComplete={onComplete} totalSeconds={10} />,
    );
    fireEvent.press(getByTestId('cooldown-skip'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('カウントダウン数値は 1 秒ごとに減算される', () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(
      <CooldownScreen onComplete={onComplete} totalSeconds={5} />,
    );
    expect(getByTestId('cooldown-number').props.children).toBe(5);
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(getByTestId('cooldown-number').props.children).toBe(4);
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(getByTestId('cooldown-number').props.children).toBe(2);
  });

  it('5 秒以下で aria-live=polite を有効化', () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(
      <CooldownScreen onComplete={onComplete} totalSeconds={5} />,
    );
    expect(getByTestId('cooldown-number').props.accessibilityLiveRegion).toBe(
      'polite',
    );
  });
});
