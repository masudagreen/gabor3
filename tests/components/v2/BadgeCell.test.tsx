/**
 * BadgeCell.test.tsx — BG-1（S8、F-09 バッジ部 / screens.md S8-1）。
 *
 * 検証する観察可能挙動：
 *  - 獲得済み：🏅 + 名称 + 獲得日、aria-label に「獲得済み」
 *  - 未獲得：🔒（形で区別）+ ヒント、aria-label にヒント（色のみ非依存、NF-12）
 *  - タップで条件全文を展開（screens.md S8-1）
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { BadgeCell } from '../../../src/components/v2/BadgeCell';
import type { BadgeViewRow } from '../../../src/lib/v2/badgeView';

function renderCell(row: BadgeViewRow) {
  render(
    <ThemeProvider preference="light" systemScheme="light">
      <BadgeCell row={row} testId="bc" />
    </ThemeProvider>,
  );
}

const earnedRow: BadgeViewRow = {
  id: 'B-01',
  axis: 'streak',
  name: 'はじめの一歩',
  earned: true,
  earnedDate: '2026-05-24',
  hint: '初めてのセッションを完了すると獲得',
  condition: '初めてのセッションを完了する',
};

const lockedRow: BadgeViewRow = {
  id: 'B-03',
  axis: 'streak',
  name: '一週間の習慣',
  earned: false,
  earnedDate: null,
  hint: '7 日連続でプレイすると獲得',
  condition: '7 日連続でプレイする',
};

describe('BadgeCell — 獲得済み', () => {
  it('🏅 + 名称 + 獲得日を表示する', () => {
    renderCell(earnedRow);
    expect(
      screen.getByTestId('bc-icon', { includeHiddenElements: true }),
    ).toHaveTextContent('🏅');
    expect(screen.getByTestId('bc-name')).toHaveTextContent('はじめの一歩');
    expect(screen.getByTestId('bc-status')).toHaveTextContent('2026-05-24 獲得');
  });

  it('aria-label に名称と獲得済みを含む', () => {
    renderCell(earnedRow);
    expect(
      screen.getByLabelText('はじめの一歩、獲得済み（2026-05-24）'),
    ).toBeTruthy();
  });
});

describe('BadgeCell — 未獲得', () => {
  it('🔒（形で区別）+ ヒントを表示する（NF-12）', () => {
    renderCell(lockedRow);
    expect(
      screen.getByTestId('bc-icon', { includeHiddenElements: true }),
    ).toHaveTextContent('🔒');
    expect(screen.getByTestId('bc-status')).toHaveTextContent(
      '7 日連続でプレイすると獲得',
    );
  });

  it('aria-label に名称と未獲得ヒントを含む', () => {
    renderCell(lockedRow);
    expect(
      screen.getByLabelText('一週間の習慣、未獲得：7 日連続でプレイすると獲得'),
    ).toBeTruthy();
  });
});

describe('BadgeCell — 詳細展開', () => {
  it('タップで条件全文を展開し、再タップで閉じる', () => {
    renderCell(lockedRow);
    expect(screen.queryByTestId('bc-condition')).toBeNull();
    fireEvent.press(screen.getByTestId('bc'));
    expect(screen.getByTestId('bc-condition')).toHaveTextContent(
      '7 日連続でプレイする',
    );
    fireEvent.press(screen.getByTestId('bc'));
    expect(screen.queryByTestId('bc-condition')).toBeNull();
  });
});
