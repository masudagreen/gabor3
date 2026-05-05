/**
 * releaseFilter テスト — F-18 / spec-v11.md §F-18 / §15。
 *
 * `releaseEnabled` フラグの動的反映を、`gameRegistry` を spy / mock することで検証する。
 */

import * as registry from '../../../src/state/gameRegistry';
import {
  getReleaseEnabledGameCount,
  getReleaseEnabledGameIdSet,
  getReleaseEnabledGameIds,
  getReleaseEnabledGames,
  isGameReleaseEnabled,
} from '../../../src/lib/v11/releaseFilter';

describe('releaseFilter: 既定状態（v1.1.4：9 ゲーム enabled、G-09/10/11/12 除外）', () => {
  it('getReleaseEnabledGames は 9 件返す', () => {
    expect(getReleaseEnabledGames()).toHaveLength(9);
  });

  it('getReleaseEnabledGameIds は order 昇順（G-09/10/11/12 を除く 9 件）', () => {
    const ids = getReleaseEnabledGameIds();
    expect(ids).toEqual([
      'G-01',
      'G-02',
      'G-03',
      'G-04',
      'G-05',
      'G-06',
      'G-07',
      'G-08',
      'G-13',
    ]);
  });

  it('getReleaseEnabledGameCount は 9', () => {
    expect(getReleaseEnabledGameCount()).toBe(9);
  });

  it('isGameReleaseEnabled は enabled ゲームで true、disabled で false', () => {
    for (const id of getReleaseEnabledGameIds()) {
      expect(isGameReleaseEnabled(id)).toBe(true);
    }
    for (const id of ['G-09', 'G-10', 'G-11', 'G-12'] as const) {
      expect(isGameReleaseEnabled(id)).toBe(false);
    }
  });

  it('getReleaseEnabledGameIdSet は Set 型を返す（9 件）', () => {
    const s = getReleaseEnabledGameIdSet();
    expect(s instanceof Set).toBe(true);
    expect(s.size).toBe(9);
  });
});

describe('releaseFilter: 一部 disabled（mock で 3 件 disabled）', () => {
  let spy: jest.SpyInstance;

  beforeEach(() => {
    // G-01 / G-03 / G-13 を disabled にする
    spy = jest
      .spyOn(registry, 'getEnabledGames')
      .mockReturnValue(
        registry.GAME_REGISTRY.filter(
          (g) => !['G-01', 'G-03', 'G-13'].includes(g.gameId),
        ).sort((a, b) => a.order - b.order),
      );
  });

  afterEach(() => {
    spy.mockRestore();
  });

  it('getReleaseEnabledGames は 10 件', () => {
    expect(getReleaseEnabledGames()).toHaveLength(10);
  });

  it('getReleaseEnabledGameIds に disabled は含まれない', () => {
    const ids = getReleaseEnabledGameIds();
    expect(ids).not.toContain('G-01');
    expect(ids).not.toContain('G-03');
    expect(ids).not.toContain('G-13');
    expect(ids).toContain('G-02');
    expect(ids).toContain('G-12');
  });

  it('isGameReleaseEnabled：disabled ゲームで false', () => {
    expect(isGameReleaseEnabled('G-01')).toBe(false);
    expect(isGameReleaseEnabled('G-03')).toBe(false);
    expect(isGameReleaseEnabled('G-13')).toBe(false);
  });

  it('isGameReleaseEnabled：enabled ゲームで true', () => {
    expect(isGameReleaseEnabled('G-02')).toBe(true);
    expect(isGameReleaseEnabled('G-12')).toBe(true);
  });

  it('getReleaseEnabledGameCount は 10', () => {
    expect(getReleaseEnabledGameCount()).toBe(10);
  });
});

describe('releaseFilter: 全 disabled（極端ケース）', () => {
  let spy: jest.SpyInstance;

  beforeEach(() => {
    spy = jest.spyOn(registry, 'getEnabledGames').mockReturnValue([]);
  });

  afterEach(() => {
    spy.mockRestore();
  });

  it('getReleaseEnabledGames は空配列', () => {
    expect(getReleaseEnabledGames()).toHaveLength(0);
  });

  it('getReleaseEnabledGameCount は 0', () => {
    expect(getReleaseEnabledGameCount()).toBe(0);
  });

  it('isGameReleaseEnabled：すべて false', () => {
    expect(isGameReleaseEnabled('G-01')).toBe(false);
  });
});
