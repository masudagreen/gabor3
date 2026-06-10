/**
 * badgeComponents.test.tsx — S9 バッジ UI（BG-1 BadgeCell / BG-2 BadgeGrid / BadgeAwardToast）。
 *
 * BadgeCell：獲得＝🏅+獲得日、未獲得＝🔒+ヒント（NF-12 色+形+テキスト）、タップで条件展開、a11y。
 * BadgeGrid：3 軸見出し + 全行をセル化。
 * BadgeAwardToast：新規獲得時のみ 1 度演出、onShown 発火（S10 フック）、空なら非表示。
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { BadgeCell } from '../../../src/components/v3/BadgeCell';
import { BadgeGrid } from '../../../src/components/v3/BadgeGrid';
import { BadgeAwardToast } from '../../../src/components/v3/BadgeAwardToast';
import { buildBadgeRows, type BadgeViewRow } from '../../../src/lib/v3/badgeView';

function dark(ui: React.ReactElement) {
  return render(
    <ThemeProvider preference="dark" systemScheme="dark">
      {ui}
    </ThemeProvider>,
  );
}

const earnedRow: BadgeViewRow = {
  id: 'B-01',
  axis: 'streak',
  name: 'はじめの一歩',
  earned: true,
  earnedDate: '2026-06-10',
  hint: '初めてゲームを完了すると獲得',
  condition: '初めてゲームを完了する（クリア / 失敗いずれか）',
};

const lockedRow: BadgeViewRow = {
  id: 'B-09',
  axis: 'level',
  name: '二桁の壁',
  earned: false,
  earnedDate: null,
  hint: '最高到達レベルが 10 に達すると獲得',
  condition: '最高到達レベルが 10 以上になる',
};

describe('BadgeCell（BG-1 / F-09 バッジ部）', () => {
  it('獲得済み：名称 + 獲得日 + role=button、aria-label に「獲得済み」', () => {
    dark(<BadgeCell row={earnedRow} testId="bc" />);
    const cell = screen.getByTestId('bc');
    expect(cell.props.accessibilityRole).toBe('button');
    expect(cell.props.accessibilityLabel).toContain('獲得済み');
    expect(screen.getByText('はじめの一歩')).toBeTruthy();
    expect(screen.getByText('2026-06-10 獲得')).toBeTruthy();
  });

  it('未獲得：ヒント表示 + aria-label に「未獲得」（色のみ非依存、NF-12）', () => {
    dark(<BadgeCell row={lockedRow} testId="bc" />);
    expect(screen.getByTestId('bc').props.accessibilityLabel).toContain('未獲得');
    expect(screen.getByText('最高到達レベルが 10 に達すると獲得')).toBeTruthy();
  });

  it('タップで条件全文を展開する（screens.md S9-1）', () => {
    dark(<BadgeCell row={lockedRow} testId="bc" />);
    expect(screen.queryByTestId('bc-condition')).toBeNull();
    fireEvent.press(screen.getByTestId('bc'));
    expect(screen.getByTestId('bc-condition')).toBeTruthy();
    expect(screen.getByText('最高到達レベルが 10 以上になる')).toBeTruthy();
  });
});

describe('BadgeGrid（BG-2 / screens.md S9-1）', () => {
  it('3 軸見出しと全 11 セルを表示する', () => {
    dark(<BadgeGrid rows={buildBadgeRows([])} testId="bg" />);
    expect(screen.getByTestId('bg-axis-streak')).toBeTruthy();
    expect(screen.getByTestId('bg-axis-difficulty')).toBeTruthy();
    expect(screen.getByTestId('bg-axis-level')).toBeTruthy();
    expect(screen.getByText('継続日数')).toBeTruthy();
    expect(screen.getByText('高難度到達')).toBeTruthy();
    expect(screen.getByText('高レベル到達')).toBeTruthy();
    for (const id of [
      'B-01', 'B-02', 'B-03', 'B-04', 'B-05',
      'B-06', 'B-07', 'B-08', 'B-09', 'B-10', 'B-11',
    ]) {
      expect(screen.getByTestId(`bg-cell-${id}`)).toBeTruthy();
    }
  });

  it('各軸グリッドは role=list（a11y）', () => {
    dark(<BadgeGrid rows={buildBadgeRows([])} testId="bg" />);
    expect(screen.getByTestId('bg-list-streak').props.accessibilityRole).toBe('list');
  });
});

describe('BadgeAwardToast（BG-2 / §6.4）', () => {
  it('空配列なら何も描画しない', () => {
    dark(<BadgeAwardToast badgeIds={[]} testId="toast" />);
    expect(screen.queryByTestId('toast')).toBeNull();
  });

  it('新規獲得バッジを表示し onShown を 1 度発火（S10 フック）', () => {
    const onShown = jest.fn();
    dark(<BadgeAwardToast badgeIds={['B-06']} onShown={onShown} testId="toast" />);
    expect(screen.getByTestId('toast')).toBeTruthy();
    expect(screen.getByText('振動を見抜く目')).toBeTruthy();
    // aria-live polite で読み上げる。
    expect(screen.getByTestId('toast').props.accessibilityLiveRegion).toBe('polite');
    expect(onShown).toHaveBeenCalledTimes(1);
    expect(onShown).toHaveBeenCalledWith(['B-06']);
  });

  it('複数同時獲得を 1 つのトーストに列挙する', () => {
    dark(<BadgeAwardToast badgeIds={['B-06', 'B-09']} testId="toast" />);
    expect(screen.getByTestId('toast-name-B-06')).toBeTruthy();
    expect(screen.getByTestId('toast-name-B-09')).toBeTruthy();
  });
});
