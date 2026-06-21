/**
 * schema.test.ts — v3.0 データモデル既定値・列挙（spec §7、凍結済み）。
 *
 * §7 からの逸脱（独自フィールド）が無いことを構造で検証する。
 */

import {
  SCHEMA_VERSION,
  V3_PREFIX,
  LEGACY_PREFIXES,
  BADGE_IDS,
  DARK_MODES,
  ONE_EYE_GUIDANCE_OPTIONS,
  VIEWING_DISTANCE_OPTIONS,
  defaultSettings,
  defaultUserProfile,
  defaultStreak,
  defaultPlayStats,
  defaultBadgeStatus,
} from '../../../src/state/v3/schema';
import { DEFAULT_VARIABLE_ORDER } from '../../../src/lib/v3/level';

describe('v3 名前空間・スキーマバージョン', () => {
  it('プレフィックスは gaboreye:v3:', () => {
    expect(V3_PREFIX).toBe('gaboreye:v3:');
  });
  it('schemaVersion は 3.2.0（v3.2 再凍結）', () => {
    expect(SCHEMA_VERSION).toBe('3.2.0');
  });
  it('消去対象の旧名前空間に v1/v1.1/v1.2/v2 を含む（v2 追加 F-11）', () => {
    expect(LEGACY_PREFIXES).toEqual([
      'gaboreye:v1:',
      'gaboreye:v1.1:',
      'gaboreye:v1.2:',
      'gaboreye:v2:',
    ]);
  });
});

describe('既定 Settings（§7.2）', () => {
  it('フィールドは §7.2 の 9 種のみ（v3.2：repeatCount/countRange 追加・スコア系/手動スライダー系を含まない）', () => {
    const s = defaultSettings();
    expect(Object.keys(s).sort()).toEqual(
      [
        'countRange',
        'darkMode',
        'hapticsEnabled',
        'oneEyeGuidance',
        'repeatCount',
        'sessionMinutes',
        'soundEnabled',
        'variableOrder',
        'variableRanges',
      ].sort(),
    );
  });
  it('sessionMinutes 既定は 5（§7.2 / AS-23）', () => {
    expect(defaultSettings().sessionMinutes).toBe(5);
  });
  it('repeatCount 既定は 4・countRange 既定は half（§4.9 / AS-37）', () => {
    expect(defaultSettings().repeatCount).toBe(4);
    expect(defaultSettings().countRange).toBe('half');
  });
  it('v2 廃止フィールドを持たない', () => {
    const s = defaultSettings() as Record<string, unknown>;
    for (const removed of [
      'gridSize',
      'roundSeconds',
      'roundCount',
      'rotationSpeed',
      'sfChangeSpeed',
      'scoringMode',
      'progressiveModeEnabled',
      'progressionState',
    ]) {
      expect(s[removed]).toBeUndefined();
    }
  });
  it('範囲はフル・変化順はデフォルト・継承項目は既定', () => {
    const s = defaultSettings();
    expect(s.variableRanges.repeat).toEqual([1, 2, 3, 4]);
    expect(s.variableRanges.seconds).toEqual([40, 35, 30, 25, 20]);
    expect(s.variableRanges.direction).toEqual(['one-way', 'oscillate']);
    expect(s.variableRanges.gridSize).toEqual([3, 4]);
    expect(s.variableRanges.rotationSpeed).toEqual([
      6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2,
    ]);
    expect(s.variableOrder).toEqual([...DEFAULT_VARIABLE_ORDER]);
    expect(s.darkMode).toBe('system');
    expect(s.soundEnabled).toBe(true);
    expect(s.hapticsEnabled).toBe(true);
    expect(s.oneEyeGuidance).toBe('off');
  });
});

describe('既定 UserProfile / Streak / PlayStats / BadgeStatus（§7.1/§7.6/§7.7/§7.8）', () => {
  it('UserProfile は §7.1 準拠（schemaVersion 3.2.0・既定距離 40・tutorialCompleted=false）', () => {
    const p = defaultUserProfile('2026-06-10T00:00:00.000Z', 'iphone');
    expect(p.onboardingCompleted).toBe(false);
    expect(p.tutorialCompleted).toBe(false);
    expect(p.disclaimerAgreedAt).toBeNull();
    expect(p.ageGroup).toBe('unspecified');
    expect(p.viewingDistanceCm).toBe(40);
    expect(p.schemaVersion).toBe('3.2.0');
  });
  it('Streak 既定', () => {
    expect(defaultStreak()).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      lastPlayedDate: null,
    });
  });
  it('PlayStats は totalSessions/totalRounds（v3.1：旧 totalGames を置換）', () => {
    const ps = defaultPlayStats() as Record<string, unknown>;
    expect(ps.totalSessions).toBe(0);
    expect(ps.totalRounds).toBe(0);
    expect(ps.totalGames).toBeUndefined();
  });
  it('BadgeStatus は B-01〜B-11 の 11 種', () => {
    expect(BADGE_IDS).toHaveLength(11);
    expect(BADGE_IDS[0]).toBe('B-01');
    expect(BADGE_IDS[10]).toBe('B-11');
    expect(defaultBadgeStatus('B-06')).toEqual({
      badgeId: 'B-06',
      earned: false,
      earnedAt: null,
    });
  });
});

describe('列挙の選択肢', () => {
  it('darkMode / oneEyeGuidance / viewingDistance', () => {
    expect(DARK_MODES).toEqual(['system', 'light', 'dark']);
    expect(ONE_EYE_GUIDANCE_OPTIONS).toEqual(['off', 'left', 'right', 'alternate']);
    expect(VIEWING_DISTANCE_OPTIONS).toEqual([30, 40, 50]);
  });
});
