/**
 * BadgeAwardToast.test.tsx — BG-2（S8、§5.4 / screens.md S8-2）。
 *
 * 検証する観察可能挙動：
 *  - 獲得バッジ名を表示
 *  - 空配列では何も描画しない（演出を出さない）
 *  - 表示開始時に onShown（S9 音/ハプティクス発火点）が 1 度だけ呼ばれる
 *  - 複数同時獲得を 1 トーストに列挙
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { BadgeAwardToast } from '../../../src/components/v2/BadgeAwardToast';
import type { BadgeId } from '../../../src/state/schema';

function renderToast(
  badgeIds: BadgeId[],
  onShown?: (ids: readonly BadgeId[]) => void,
) {
  render(
    <ThemeProvider preference="light" systemScheme="light">
      <BadgeAwardToast badgeIds={badgeIds} onShown={onShown} testId="toast" />
    </ThemeProvider>,
  );
}

describe('BadgeAwardToast', () => {
  it('獲得バッジ名を表示する', () => {
    renderToast(['B-10']);
    expect(screen.getByTestId('toast-name-B-10')).toHaveTextContent('パーフェクト');
  });

  it('複数同時獲得を 1 トーストに列挙する', () => {
    renderToast(['B-01', 'B-09', 'B-10']);
    expect(screen.getByTestId('toast-name-B-01')).toHaveTextContent('はじめの一歩');
    expect(screen.getByTestId('toast-name-B-09')).toHaveTextContent('好調のしるし');
    expect(screen.getByTestId('toast-name-B-10')).toHaveTextContent('パーフェクト');
  });

  it('空配列では何も描画しない（演出を出さない）', () => {
    renderToast([]);
    expect(screen.queryByTestId('toast')).toBeNull();
  });

  it('表示開始時に onShown を 1 度だけ呼ぶ（S9 発火点）', () => {
    const onShown = jest.fn();
    renderToast(['B-01'], onShown);
    expect(onShown).toHaveBeenCalledTimes(1);
    expect(onShown).toHaveBeenCalledWith(['B-01']);
  });
});
