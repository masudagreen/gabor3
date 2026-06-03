/**
 * ariaWeb.test.tsx — NF-15（WAI-ARIA 状態の DOM 透過）。
 *
 * S10 評価 Minor 1〜4 の是正検証：
 * react-native-web では accessibilityState（checked/expanded/selected）が DOM の
 * aria-* へ自動透過しないため、webAria() で role + aria-* を明示的に渡す方針。
 * - Native（既定 ios）では空 props（aria-* を出さない／accessibilityRole が担う）。
 * - Web では role と該当する aria-checked / aria-expanded / aria-selected を返す。
 */

import { Platform } from 'react-native';
import { webAria } from '../../src/theme/ariaWeb';

function asWeb<T>(fn: () => T): T {
  const original = Platform.OS;
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'web' });
  try {
    return fn();
  } finally {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => original,
    });
  }
}

describe('webAria（NF-15）', () => {
  it('Native（ios）では空オブジェクト（accessibilityRole/State が担う）', () => {
    expect(Platform.OS).toBe('ios');
    expect(webAria('switch', { checked: true })).toEqual({});
    expect(webAria('checkbox', { checked: false })).toEqual({});
  });

  it('Web では role + aria-checked を返す（switch / Toggle）', () => {
    asWeb(() => {
      expect(webAria('switch', { checked: true }, '効果音 ON')).toEqual({
        role: 'switch',
        'aria-checked': true,
        'aria-label': '効果音 ON',
      });
    });
  });

  it('Web では role + aria-checked / aria-selected を返す（radio / SegmentedControl）', () => {
    asWeb(() => {
      expect(webAria('radio', { checked: true, selected: true }, '4')).toEqual({
        role: 'radio',
        'aria-checked': true,
        'aria-selected': true,
        'aria-label': '4',
      });
    });
  });

  it('Web では role + aria-checked + aria-disabled を返す（checkbox / パッチ）', () => {
    asWeb(() => {
      expect(
        webAria('checkbox', { checked: false, disabled: true }, 'パッチ 1-2'),
      ).toEqual({
        role: 'checkbox',
        'aria-checked': false,
        'aria-disabled': true,
        'aria-label': 'パッチ 1-2',
      });
    });
  });

  it('Web では role + aria-expanded を返す（button / バッジセル）', () => {
    asWeb(() => {
      expect(webAria('button', { expanded: true }, 'バッジA')).toEqual({
        role: 'button',
        'aria-expanded': true,
        'aria-label': 'バッジA',
      });
    });
  });

  it('Web で state 未指定でも role と aria-label のみ返す（radiogroup）', () => {
    asWeb(() => {
      expect(webAria('radiogroup', undefined, '採点方式')).toEqual({
        role: 'radiogroup',
        'aria-label': '採点方式',
      });
    });
  });
});
