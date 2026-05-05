/**
 * HomeHeroCTA — F-04 受け入れテスト（spec-v11.md §F-04）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { HomeHeroCTA } from '../../../src/components/v11/HomeHeroCTA';

describe('HomeHeroCTA: F-04', () => {
  it('未完了時はラベル「全ゲーム連続プレイ」+「（約 N 分）」を表示', () => {
    const { getByText } = render(
      <HomeHeroCTA
        enabledGameCount={13}
        todayCompleted={false}
        onPress={jest.fn()}
      />,
    );
    expect(getByText('全ゲーム連続プレイ')).toBeTruthy();
    expect(getByText('（約 13 分）')).toBeTruthy();
    expect(getByText('▶ はじめる')).toBeTruthy();
  });

  it('完了時はラベル「今日のトレーニング完了」+ CTA「もう一度挑戦」を表示', () => {
    const { getByText } = render(
      <HomeHeroCTA
        enabledGameCount={13}
        todayCompleted={true}
        onPress={jest.fn()}
      />,
    );
    expect(getByText('今日のトレーニング完了')).toBeTruthy();
    expect(getByText('もう一度挑戦')).toBeTruthy();
  });

  it('完了時は「✓ 本日完了」装飾タグを表示', () => {
    const { getByText } = render(
      <HomeHeroCTA
        enabledGameCount={13}
        todayCompleted={true}
        onPress={jest.fn()}
      />,
    );
    expect(getByText('✓ 本日完了')).toBeTruthy();
  });

  it('enabledGameCount が動的に反映される（F-18）', () => {
    const { getByText, rerender } = render(
      <HomeHeroCTA
        enabledGameCount={7}
        todayCompleted={false}
        onPress={jest.fn()}
      />,
    );
    expect(getByText('（約 7 分）')).toBeTruthy();
    rerender(
      <HomeHeroCTA
        enabledGameCount={10}
        todayCompleted={false}
        onPress={jest.fn()}
      />,
    );
    expect(getByText('（約 10 分）')).toBeTruthy();
  });

  it('aria-label に「約 N 分」が含まれる', () => {
    const { getByTestId } = render(
      <HomeHeroCTA
        enabledGameCount={13}
        todayCompleted={false}
        onPress={jest.fn()}
      />,
    );
    const cta = getByTestId('home-hero-cta');
    expect(cta.props.accessibilityLabel).toMatch(/約 13 分/);
  });

  it('押下で onPress が呼ばれる', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <HomeHeroCTA
        enabledGameCount={13}
        todayCompleted={false}
        onPress={onPress}
      />,
    );
    fireEvent.press(getByTestId('home-hero-cta'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
