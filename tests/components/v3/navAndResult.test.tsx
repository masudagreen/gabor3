/**
 * navAndResult.test.tsx — v3.1 改訂分の UI（BottomTabBar ラベル廃止 / CenterResultMark）。
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { resultV3 } from '../../../src/theme/tokens';
import { BottomTabBar } from '../../../src/components/v3/BottomTabBar';
import { CenterResultMark } from '../../../src/components/v3/CenterResultMark';

function flatStyle(node: { props: { style: unknown } }): Record<string, unknown> {
  const s = node.props.style;
  return Array.isArray(s)
    ? Object.assign({}, ...s.flat(Infinity))
    : (s as Record<string, unknown>);
}

function dark(ui: React.ReactElement) {
  return render(
    <ThemeProvider preference="dark" systemScheme="dark">
      {ui}
    </ThemeProvider>,
  );
}

describe('BottomTabBar（NV-1 / v3.1：アイコンのみ・ラベル廃止）', () => {
  it('タブのテキストラベルは表示しないが SR 用ラベルは保持する', () => {
    dark(<BottomTabBar current="home" onTabPress={() => {}} testId="tabbar" />);
    // 視覚的なテキストラベル（ホーム/履歴/設定）は出さない。
    expect(screen.queryByText('ホーム')).toBeNull();
    expect(screen.queryByText('履歴')).toBeNull();
    expect(screen.queryByText('設定')).toBeNull();
    // スクリーンリーダー用ラベルは保持（NF-7/15）。
    expect(screen.getByLabelText('ホームタブ')).toBeTruthy();
    expect(screen.getByLabelText('履歴タブ')).toBeTruthy();
    expect(screen.getByLabelText('設定タブ')).toBeTruthy();
  });

  it('選択状態は aria-selected で示し、押下で onTabPress を呼ぶ', () => {
    const onTabPress = jest.fn();
    dark(<BottomTabBar current="home" onTabPress={onTabPress} testId="tabbar" />);
    expect(
      screen.getByLabelText('ホームタブ').props.accessibilityState,
    ).toEqual({ selected: true });
    fireEvent.press(screen.getByLabelText('履歴タブ'));
    expect(onTabPress).toHaveBeenCalledWith('history');
  });
});

describe('CenterResultMark（OV-3 / F-03・v3.1：ラウンド全体の大きな ✓/✕）', () => {
  // 装飾（読み上げは ResultOverlayLayer が担う）ため a11y ツリーから隠す。
  // テストでは includeHiddenElements で実体を確認する。
  it('クリアは ✓（緑 checkCorrect）を表示する', () => {
    dark(<CenterResultMark result="clear" testId="mark" />);
    const icon = screen.getByTestId('mark-icon', { includeHiddenElements: true });
    expect(icon.props.children).toBe('✓');
    expect(flatStyle(icon).color).toBe(resultV3.dark.checkCorrect);
  });

  it('失敗は ✕（赤 crossWrong）を表示する', () => {
    dark(<CenterResultMark result="fail" testId="mark" />);
    const icon = screen.getByTestId('mark-icon', { includeHiddenElements: true });
    expect(icon.props.children).toBe('✕');
    expect(flatStyle(icon).color).toBe(resultV3.dark.crossWrong);
  });
});
