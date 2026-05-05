/**
 * AllGamesListScreen — F-04 / F-08 / F-18 受け入れテスト。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { AllGamesListScreen } from '../../../src/screens/v11/AllGamesListScreen';
import { ALL_GAME_IDS_V11 } from '../../../src/state/gameIds-v11';
import { GAME_REGISTRY } from '../../../src/state/gameRegistry';

const ENABLED_IDS = GAME_REGISTRY.filter((g) => g.releaseEnabled).map(
  (g) => g.gameId,
);
const DISABLED_IDS = GAME_REGISTRY.filter((g) => !g.releaseEnabled).map(
  (g) => g.gameId,
);

describe('AllGamesListScreen: F-04 / F-08 / F-18', () => {
  it('enabled ゲームのカードを表示（v1.1.4：9 件、disabled は表示しない）', () => {
    const { getByTestId, queryByTestId } = render(
      <AllGamesListScreen onBack={jest.fn()} />,
    );
    for (const id of ENABLED_IDS) {
      expect(getByTestId(`game-card-${id}`)).toBeTruthy();
    }
    for (const id of DISABLED_IDS) {
      expect(queryByTestId(`game-card-${id}`)).toBeNull();
    }
    void ALL_GAME_IDS_V11; // import 維持
  });

  it('Sprint 8 デフォルトでは全カードが「準備中」（accessibilityState.disabled=true）', () => {
    const { getByTestId } = render(<AllGamesListScreen onBack={jest.fn()} />);
    // enabled な全カードが disabled 状態
    for (const id of ENABLED_IDS) {
      const card = getByTestId(`game-card-${id}`);
      expect(card.props.accessibilityState).toMatchObject({ disabled: true });
    }
  });

  it('準備中カードのタップで onSelectUnimplemented が呼ばれる（onSelectGame は呼ばれない）', () => {
    const onUnimpl = jest.fn();
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <AllGamesListScreen
        onBack={jest.fn()}
        onSelectGame={onSelect}
        onSelectUnimplemented={onUnimpl}
      />,
    );
    fireEvent.press(getByTestId('game-card-G-04'));
    expect(onUnimpl).toHaveBeenCalledTimes(1);
    expect(onUnimpl.mock.calls[0][0].gameId).toBe('G-04');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('implementedGameIds に含まれるゲームは active、タップで onSelectGame が呼ばれる', () => {
    const onSelect = jest.fn();
    const onUnimpl = jest.fn();
    const { getByTestId } = render(
      <AllGamesListScreen
        onBack={jest.fn()}
        implementedGameIds={['G-04']}
        onSelectGame={onSelect}
        onSelectUnimplemented={onUnimpl}
      />,
    );
    fireEvent.press(getByTestId('game-card-G-04'));
    expect(onSelect).toHaveBeenCalledWith('G-04');
    expect(onUnimpl).not.toHaveBeenCalled();
    // 他のゲームは依然 unimplemented
    fireEvent.press(getByTestId('game-card-G-01'));
    expect(onUnimpl).toHaveBeenCalledTimes(1);
  });

  it('戻るボタンで onBack が呼ばれる', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(<AllGamesListScreen onBack={onBack} />);
    fireEvent.press(getByTestId('all-games-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('「単体プレイ」タイトルと「9 種類」を表示（v1.1.4：enabled 9 ゲーム）', () => {
    const { getByText } = render(<AllGamesListScreen onBack={jest.fn()} />);
    expect(getByText('単体プレイ')).toBeTruthy();
    expect(getByText(/9 種類/)).toBeTruthy();
  });

  it('準備中カードは accessibilityState.disabled=true', () => {
    const { getByTestId } = render(
      <AllGamesListScreen onBack={jest.fn()} />,
    );
    const card = getByTestId('game-card-G-01');
    expect(card.props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('実装済みカードは accessibilityState.disabled=false', () => {
    const { getByTestId } = render(
      <AllGamesListScreen
        onBack={jest.fn()}
        implementedGameIds={['G-04']}
      />,
    );
    const card = getByTestId('game-card-G-04');
    expect(card.props.accessibilityState).toMatchObject({ disabled: false });
  });
});
