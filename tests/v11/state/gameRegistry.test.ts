/**
 * gameRegistry — F-08 受け入れ基準テスト（spec-v11.md §F-08 / Sprint 8）。
 */

import {
  GAME_REGISTRY,
  getAllGames,
  getEnabledGames,
  getEnabledGameCount,
  getGameDefinition,
  _isRegistryCompleteForTests,
} from '../../../src/state/gameRegistry';
import { ALL_GAME_IDS_V11 } from '../../../src/state/gameIds-v11';

describe('gameRegistry: F-08', () => {
  it('レジストリには 13 ゲーム全件が登録される', () => {
    expect(GAME_REGISTRY.length).toBe(13);
    expect(_isRegistryCompleteForTests()).toBe(true);
  });

  it('ALL_GAME_IDS_V11 と GAME_REGISTRY の gameId 集合が一致する', () => {
    const registryIds = new Set(GAME_REGISTRY.map((g) => g.gameId));
    const allIds = new Set(ALL_GAME_IDS_V11);
    expect(registryIds.size).toBe(allIds.size);
    for (const id of allIds) expect(registryIds.has(id)).toBe(true);
  });

  it('各ゲームに releaseEnabled が付与される（v1.1.4：G-09/10/11/12 を除外、9 ゲーム公開）', () => {
    const disabled: ReadonlyArray<string> = ['G-09', 'G-10', 'G-11', 'G-12'];
    for (const g of GAME_REGISTRY) {
      expect(typeof g.releaseEnabled).toBe('boolean');
      if (disabled.includes(g.gameId)) {
        expect(g.releaseEnabled).toBe(false);
      } else {
        expect(g.releaseEnabled).toBe(true);
      }
    }
  });

  it('getEnabledGames() は order 昇順で返す（v1.1.4：9 ゲーム）', () => {
    const enabled = getEnabledGames();
    expect(enabled.length).toBe(9);
    for (let i = 1; i < enabled.length; i += 1) {
      expect(enabled[i].order).toBeGreaterThan(enabled[i - 1].order);
    }
  });

  it('getEnabledGameCount() は 9 を返す（v1.1.4：G-09/10/11/12 をリリース除外）', () => {
    expect(getEnabledGameCount()).toBe(9);
  });

  it('getGameDefinition で各 gameId を引ける', () => {
    for (const id of ALL_GAME_IDS_V11) {
      const def = getGameDefinition(id);
      expect(def).toBeDefined();
      expect(def?.gameId).toBe(id);
    }
  });

  it('getGameDefinition で未登録 ID は undefined', () => {
    // @ts-expect-error 故意の不正値
    expect(getGameDefinition('G-99')).toBeUndefined();
  });

  it('全ゲームの paramRange は min < initial < max を満たす（または順序整合）', () => {
    for (const g of GAME_REGISTRY) {
      const { min, max, initial, step } = g.paramRange;
      expect(min).toBeLessThan(max);
      expect(initial).toBeGreaterThanOrEqual(min);
      expect(initial).toBeLessThanOrEqual(max);
      expect(step).toBeGreaterThan(0);
    }
  });

  it('order に重複がない', () => {
    const orders = GAME_REGISTRY.map((g) => g.order);
    const unique = new Set(orders);
    expect(unique.size).toBe(orders.length);
  });

  it('getAllGames() は GAME_REGISTRY と同じ件数を返す', () => {
    expect(getAllGames().length).toBe(GAME_REGISTRY.length);
  });

  it('releaseEnabled=false のゲームは getEnabledGames から除外される（F-18 シミュレーション）', () => {
    // 動作シミュレーション：filter 関数で false を含む配列を渡しても、
    // 関数自身が gameRegistry を参照する以上、実装では releaseEnabled が
    // 決定する。本テストは将来 F-18 で false 化されたときの除外動作を
    // 保証する仕様契約として、現時点では filter 句の存在を検証する。
    const enabled = getEnabledGames();
    for (const g of enabled) expect(g.releaseEnabled).toBe(true);
  });
});
