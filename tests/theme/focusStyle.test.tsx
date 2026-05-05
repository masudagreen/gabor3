/**
 * focusStyle テスト（Sprint 7-C / NF-7 / screens.md S7-11）。
 *
 * 過去スプリントの a11y Minor 1（focus outline 1px）→ 3px 化を検証する。
 *
 * - Native では空オブジェクトを返す（outline 系プロパティは Web 専用）
 * - Web ではプラットフォームを差し替えて outlineWidth: 3 が含まれることを確認
 */

import { Platform } from 'react-native';
import { buildFocusStyle } from '../../src/theme/focusStyle';

describe('buildFocusStyle', () => {
  it('Native（jest-expo: ios）では空オブジェクトを返す', () => {
    expect(Platform.OS).toBe('ios');
    expect(buildFocusStyle('#13449D')).toEqual({});
  });

  it('Web では outlineWidth: 3、outlineStyle: solid、outlineOffset: 2 を含む', () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'web',
    });
    try {
      const style = buildFocusStyle('#13449D') as Record<string, unknown>;
      expect(style.outlineColor).toBe('#13449D');
      expect(style.outlineWidth).toBe(3);
      expect(style.outlineStyle).toBe('solid');
      expect(style.outlineOffset).toBe(2);
    } finally {
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        get: () => original,
      });
    }
  });
});
