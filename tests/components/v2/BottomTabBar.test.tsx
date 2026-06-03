/**
 * BottomTabBar.test.tsx — NV-1（spec F-05 / NF-12 / NF-7）。
 *
 * 3 タブ常時表示・選択状態の提示（aria-selected + 太字 + インジケータ）・押下通知を検証する。
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { BottomTabBar } from '../../../src/components/v2/BottomTabBar';

function renderBar(
  current: 'home' | 'history' | 'settings' = 'home',
) {
  const onTabPress = jest.fn();
  const utils = render(
    <ThemeProvider preference="dark" systemScheme="dark">
      <BottomTabBar current={current} onTabPress={onTabPress} testId="tabbar" />
    </ThemeProvider>,
  );
  return { ...utils, onTabPress };
}

describe('BottomTabBar (NV-1 / F-05)', () => {
  it('ホーム/履歴/設定の 3 タブを常時表示する', () => {
    renderBar();
    expect(screen.getByLabelText('ホームタブ')).toBeTruthy();
    expect(screen.getByLabelText('履歴タブ')).toBeTruthy();
    expect(screen.getByLabelText('設定タブ')).toBeTruthy();
  });

  it('各タブが role=tab を持つ', () => {
    renderBar();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('選択中タブのみ aria-selected=true（色のみ非依存の補強の 1 つ）', () => {
    renderBar('history');
    expect(
      screen.getByLabelText('履歴タブ').props.accessibilityState.selected,
    ).toBe(true);
    expect(
      screen.getByLabelText('ホームタブ').props.accessibilityState.selected,
    ).toBe(false);
    expect(
      screen.getByLabelText('設定タブ').props.accessibilityState.selected,
    ).toBe(false);
  });

  it('選択中ラベルは太字、非選択は medium（NF-12 太字補強）', () => {
    renderBar('home');
    const homeLabel = screen.getByText('ホーム');
    const historyLabel = screen.getByText('履歴');
    const flat = (el: { props: { style: unknown } }) =>
      ([] as { fontWeight?: string }[])
        .concat(el.props.style as never)
        .reduce((acc, s) => ({ ...acc, ...(s ?? {}) }), {} as { fontWeight?: string });
    expect(flat(homeLabel).fontWeight).toBe('700');
    expect(flat(historyLabel).fontWeight).toBe('600');
  });

  it('タブ押下で onTabPress を呼ぶ', () => {
    const { onTabPress } = renderBar('home');
    fireEvent.press(screen.getByLabelText('設定タブ'));
    expect(onTabPress).toHaveBeenCalledWith('settings');
  });
});
