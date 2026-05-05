/**
 * storage-v11 BadgeStatus 永続化テスト — Sprint 19 / F-13。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  KEY_BADGE_V11,
  loadAllBadgeStatusesV11,
  loadBadgeStatusV11,
  saveAllBadgeStatusesV11,
  saveBadgeStatusV11,
} from '../../../src/state/storage-v11';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('storage-v11 BadgeStatus: KEY_BADGE_V11', () => {
  it('プレフィックスは gaboreye:v1.1:badge:<id>', () => {
    expect(KEY_BADGE_V11('B-01')).toBe('gaboreye:v1.1:badge:B-01');
    expect(KEY_BADGE_V11('B-13')).toBe('gaboreye:v1.1:badge:B-13');
  });
});

describe('storage-v11 BadgeStatus: load/save', () => {
  it('未保存なら null', async () => {
    expect(await loadBadgeStatusV11('B-01')).toBeNull();
  });

  it('保存して取り戻すと同じ値', async () => {
    await saveBadgeStatusV11({
      badgeId: 'B-01',
      earned: true,
      earnedAt: '2026-04-30T10:00:00.000Z',
    });
    const loaded = await loadBadgeStatusV11('B-01');
    expect(loaded).toEqual({
      badgeId: 'B-01',
      earned: true,
      earnedAt: '2026-04-30T10:00:00.000Z',
    });
  });

  it('壊れた JSON は null を返す', async () => {
    await AsyncStorage.setItem(KEY_BADGE_V11('B-02'), 'not-json');
    expect(await loadBadgeStatusV11('B-02')).toBeNull();
  });
});

describe('storage-v11 BadgeStatus: saveAll / loadAll', () => {
  it('複数件を一括保存・取得', async () => {
    await saveAllBadgeStatusesV11([
      { badgeId: 'B-01', earned: true, earnedAt: '2026-04-30T10:00:00.000Z' },
      { badgeId: 'B-02', earned: false, earnedAt: null },
      { badgeId: 'B-09', earned: true, earnedAt: '2026-04-29T18:00:00.000Z' },
    ]);
    const all = await loadAllBadgeStatusesV11();
    expect(all).toHaveLength(3);
    const ids = all.map((s) => s.badgeId).sort();
    expect(ids).toEqual(['B-01', 'B-02', 'B-09']);
  });

  it('保存件数 0 なら空配列', async () => {
    expect(await loadAllBadgeStatusesV11()).toEqual([]);
  });
});
