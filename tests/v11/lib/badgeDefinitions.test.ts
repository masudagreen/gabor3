/**
 * badgeDefinitions テスト — F-13 / spec-v11.md §10。
 *
 * 13 バッジが宣言通りに揃っていることと、メタデータの妥当性を確認する。
 */

import {
  ALL_BADGE_IDS_V11,
  BADGE_DEFINITIONS_V11,
  BadgeIdV11,
  getAllBadgeDefinitions,
  getBadgeDefinition,
} from '../../../src/lib/v11/badgeDefinitions';

describe('badgeDefinitions: ALL_BADGE_IDS_V11', () => {
  it('13 件ある', () => {
    expect(ALL_BADGE_IDS_V11).toHaveLength(13);
  });

  it('B-01 〜 B-13 が宣言順で並ぶ', () => {
    expect(ALL_BADGE_IDS_V11).toEqual([
      'B-01',
      'B-02',
      'B-03',
      'B-04',
      'B-05',
      'B-06',
      'B-07',
      'B-08',
      'B-09',
      'B-10',
      'B-11',
      'B-12',
      'B-13',
    ]);
  });

  it('重複 ID が無い', () => {
    expect(new Set(ALL_BADGE_IDS_V11).size).toBe(ALL_BADGE_IDS_V11.length);
  });
});

describe('badgeDefinitions: BADGE_DEFINITIONS_V11', () => {
  it('13 件すべての定義が存在する', () => {
    for (const id of ALL_BADGE_IDS_V11) {
      expect(BADGE_DEFINITIONS_V11[id]).toBeDefined();
    }
  });

  it('各定義は name / conditionText / emoji を持つ', () => {
    for (const id of ALL_BADGE_IDS_V11) {
      const def = BADGE_DEFINITIONS_V11[id];
      expect(typeof def.name).toBe('string');
      expect(def.name.length).toBeGreaterThan(0);
      expect(typeof def.conditionText).toBe('string');
      expect(def.conditionText.length).toBeGreaterThan(0);
      expect(typeof def.emoji).toBe('string');
    }
  });

  it('B-06 は G-03 単独依存', () => {
    expect(BADGE_DEFINITIONS_V11['B-06'].dependsOnGameIds).toEqual(['G-03']);
  });

  it('B-07 は G-02 単独依存', () => {
    expect(BADGE_DEFINITIONS_V11['B-07'].dependsOnGameIds).toEqual(['G-02']);
  });

  it('B-08 / B-09 / B-10 / B-13 は dependsOnGameIds 未指定（enabled 全集合に対して評価）', () => {
    expect(BADGE_DEFINITIONS_V11['B-08'].dependsOnGameIds).toBeUndefined();
    expect(BADGE_DEFINITIONS_V11['B-09'].dependsOnGameIds).toBeUndefined();
    expect(BADGE_DEFINITIONS_V11['B-10'].dependsOnGameIds).toBeUndefined();
    expect(BADGE_DEFINITIONS_V11['B-13'].dependsOnGameIds).toBeUndefined();
  });

  it('連続日数依存（B-01〜B-04 / B-11 / B-12）には dependsOnGameIds が無い', () => {
    const noDepIds: BadgeIdV11[] = [
      'B-01',
      'B-02',
      'B-03',
      'B-04',
      'B-11',
      'B-12',
    ];
    for (const id of noDepIds) {
      expect(BADGE_DEFINITIONS_V11[id].dependsOnGameIds).toBeUndefined();
    }
  });
});

describe('badgeDefinitions: getAllBadgeDefinitions', () => {
  it('13 件を宣言順で返す', () => {
    const all = getAllBadgeDefinitions();
    expect(all).toHaveLength(13);
    expect(all.map((d) => d.badgeId)).toEqual(ALL_BADGE_IDS_V11);
  });
});

describe('badgeDefinitions: getBadgeDefinition', () => {
  it('既知 ID で定義を返す', () => {
    expect(getBadgeDefinition('B-01')?.name).toBe('はじめの一歩');
    expect(getBadgeDefinition('B-13')?.name).toBe('コンプリート');
  });
});
