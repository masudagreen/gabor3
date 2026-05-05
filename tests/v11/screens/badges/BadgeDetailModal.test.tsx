/**
 * BadgeDetailModal テスト — S19-02 / F-13。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import * as registry from '../../../../src/state/gameRegistry';
import { BadgeDetailModal } from '../../../../src/screens/v11/badges/BadgeDetailModal';
import { BadgeEvalContextV11 } from '../../../../src/lib/v11/badges';

const baseCtx: BadgeEvalContextV11 = {
  streak: { currentStreak: 0, longestStreak: 0, lastCompletedDate: null },
  totalTrialCount: 0,
  allDailyStats: [],
  perGamePlayCount: {},
  perGameBestUpdatedCount: {},
  fullCourseCompletions: [],
  today: '2026-04-30',
  now: '2026-04-30T10:00:00.000Z',
};

describe('BadgeDetailModal: 表示', () => {
  it('visible=false なら何も描画しない', () => {
    const { queryByTestId } = render(
      <BadgeDetailModal
        visible={false}
        badgeId={'B-01'}
        status={null}
        ctx={baseCtx}
        onClose={jest.fn()}
      />,
    );
    expect(queryByTestId('badge-detail-modal')).toBeNull();
  });

  it('badgeId=null なら何も描画しない', () => {
    const { queryByTestId } = render(
      <BadgeDetailModal
        visible
        badgeId={null}
        status={null}
        ctx={baseCtx}
        onClose={jest.fn()}
      />,
    );
    expect(queryByTestId('badge-detail-modal')).toBeNull();
  });

  it('B-01 を開くとタイトルにバッジ名が表示', () => {
    const { getByTestId } = render(
      <BadgeDetailModal
        visible
        badgeId={'B-01'}
        status={{ badgeId: 'B-01', earned: false, earnedAt: null }}
        ctx={baseCtx}
        onClose={jest.fn()}
      />,
    );
    const title = getByTestId('badge-detail-title');
    expect(title.props.children.join('')).toContain('はじめの一歩');
  });

  it('未獲得時：状態欄に「未獲得」', () => {
    const { getByTestId } = render(
      <BadgeDetailModal
        visible
        badgeId={'B-01'}
        status={{ badgeId: 'B-01', earned: false, earnedAt: null }}
        ctx={baseCtx}
        onClose={jest.fn()}
      />,
    );
    expect(getByTestId('badge-detail-state').props.children).toContain(
      '未獲得',
    );
  });

  it('獲得済み：状態欄に「獲得済」', () => {
    const { getByTestId } = render(
      <BadgeDetailModal
        visible
        badgeId={'B-01'}
        status={{
          badgeId: 'B-01',
          earned: true,
          earnedAt: '2026-04-30T10:00:00.000Z',
        }}
        ctx={baseCtx}
        onClose={jest.fn()}
      />,
    );
    expect(getByTestId('badge-detail-state').props.children).toContain('獲得済');
  });

  it('未獲得時：進捗ヒントが表示される', () => {
    const { getByTestId } = render(
      <BadgeDetailModal
        visible
        badgeId={'B-05'}
        status={{ badgeId: 'B-05', earned: false, earnedAt: null }}
        ctx={{ ...baseCtx, totalTrialCount: 50 }}
        onClose={jest.fn()}
      />,
    );
    const hint = getByTestId('badge-detail-hint').props.children;
    expect(typeof hint === 'string' ? hint : hint.join('')).toContain('50');
  });
});

describe('BadgeDetailModal: F-18 disabled ゲーム依存', () => {
  it('B-06 で G-03 disabled なら「公開対象外」表記', () => {
    const spy = jest
      .spyOn(registry, 'getEnabledGames')
      .mockReturnValue(
        registry.GAME_REGISTRY.filter((g) => g.gameId !== 'G-03').sort(
          (a, b) => a.order - b.order,
        ),
      );
    try {
      const { getByTestId } = render(
        <BadgeDetailModal
          visible
          badgeId={'B-06'}
          status={{ badgeId: 'B-06', earned: false, earnedAt: null }}
          ctx={baseCtx}
          onClose={jest.fn()}
        />,
      );
      const hint = getByTestId('badge-detail-hint').props.children;
      const text = typeof hint === 'string' ? hint : hint.join('');
      expect(text).toContain('G-03');
      expect(text).toContain('公開対象外');
    } finally {
      spy.mockRestore();
    }
  });
});

describe('BadgeDetailModal: インタラクション', () => {
  it('閉じる IconButton で onClose', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <BadgeDetailModal
        visible
        badgeId={'B-01'}
        status={null}
        ctx={baseCtx}
        onClose={onClose}
      />,
    );
    fireEvent.press(getByTestId('badge-detail-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('「閉じる」Primary ボタンで onClose', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <BadgeDetailModal
        visible
        badgeId={'B-01'}
        status={null}
        ctx={baseCtx}
        onClose={onClose}
      />,
    );
    fireEvent.press(getByTestId('badge-detail-close-primary'));
    expect(onClose).toHaveBeenCalled();
  });
});
