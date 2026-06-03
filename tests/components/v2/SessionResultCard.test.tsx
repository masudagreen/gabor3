/**
 * SessionResultCard.test.tsx — RC-1（S6-3、F-08 / F-04）。
 *
 * 検証する観察可能挙動：
 *  - 0〜100 スコア表示
 *  - 今日のストリーク表示（1 日以上）/ 0 日の案内
 *  - 「もう一度」で onReplay
 *  - スクリーンリーダー用 region ラベル
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { SessionResultCard } from '../../../src/components/v2/SessionResultCard';

function renderCard(
  over: Partial<React.ComponentProps<typeof SessionResultCard>> = {},
) {
  const onReplay = jest.fn();
  render(
    <ThemeProvider preference="light" systemScheme="light">
      <SessionResultCard score={72} streak={5} onReplay={onReplay} testId="rc" {...over} />
    </ThemeProvider>,
  );
  return { onReplay };
}

describe('SessionResultCard — 表示（F-08/F-04）', () => {
  it('セッションスコアを表示する', () => {
    renderCard({ score: 72 });
    expect(screen.getByTestId('rc-score').props.children).toBe('72');
  });

  it('連続日数（1 日以上）を表示する', () => {
    renderCard({ streak: 5 });
    expect(screen.getByText('連続 5 日')).toBeTruthy();
  });

  it('連続 0 日は「今日からスタート」を表示する', () => {
    renderCard({ streak: 0 });
    expect(screen.getByText('今日からスタート')).toBeTruthy();
  });

  it('region ラベルにスコアと連続日数を含む', () => {
    renderCard({ score: 88, streak: 3 });
    expect(
      screen.getByLabelText(
        'セッション結果。スコア 88 点（100 点満点）。連続 3 日',
      ),
    ).toBeTruthy();
  });
});

describe('SessionResultCard — もう一度（F-08）', () => {
  it('「もう一度」押下で onReplay が呼ばれる', () => {
    const { onReplay } = renderCard();
    fireEvent.press(screen.getByTestId('rc-replay'));
    expect(onReplay).toHaveBeenCalledTimes(1);
  });
});

describe('SessionResultCard — バッジ獲得演出（§5.4 / S8-2）', () => {
  it('新規獲得バッジがあると獲得演出を重畳表示する', () => {
    renderCard({ newlyEarnedBadges: ['B-10'] });
    expect(screen.getByTestId('rc-badge-toast')).toBeTruthy();
    expect(screen.getByTestId('rc-badge-toast-name-B-10')).toHaveTextContent(
      'パーフェクト',
    );
  });

  it('新規獲得バッジが無いと演出を表示しない', () => {
    renderCard({ newlyEarnedBadges: [] });
    expect(screen.queryByTestId('rc-badge-toast')).toBeNull();
  });

  it('獲得演出の表示開始時に onBadgeShown が 1 度だけ呼ばれる（S9 発火点）', () => {
    const onBadgeShown = jest.fn();
    renderCard({ newlyEarnedBadges: ['B-01', 'B-09'], onBadgeShown });
    expect(onBadgeShown).toHaveBeenCalledTimes(1);
    expect(onBadgeShown).toHaveBeenCalledWith(['B-01', 'B-09']);
  });
});
