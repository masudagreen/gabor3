/**
 * focusStyle テスト（NF-7 / NF-9）。
 *
 * S5 評価 Critical 修正：常時 outline（インライン）→ Web 大域 CSS の `:focus-visible` のみ。
 *
 * - buildFocusStyle / useFocusStyle はインライン outline を返さない（空オブジェクト）。
 * - installFocusVisibleStyle / setFocusRingColor は document が無い環境（Native/テスト）で
 *   no-op（例外を投げない）。
 * - Web + document 在りでは `:focus-visible` ルールを 1 度注入し、focus ring 色を CSS 変数へ反映する。
 */

import { Platform } from 'react-native';
import {
  buildFocusStyle,
  installFocusVisibleStyle,
  setFocusRingColor,
} from '../../src/theme/focusStyle';

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

describe('buildFocusStyle（インライン outline は返さない）', () => {
  it('Native では空オブジェクト', () => {
    expect(Platform.OS).toBe('ios');
    expect(buildFocusStyle('#13449D')).toEqual({});
  });

  it('Web でも空オブジェクト（focus-visible は大域 CSS が担当）', () => {
    asWeb(() => {
      expect(buildFocusStyle('#13449D')).toEqual({});
    });
  });
});

describe('installFocusVisibleStyle / setFocusRingColor', () => {
  it('document が無い環境（Native/テスト）では例外を投げず no-op', () => {
    expect(() => installFocusVisibleStyle()).not.toThrow();
    expect(() => setFocusRingColor('#13449D')).not.toThrow();
  });

  it('Web + document 在りでは :focus-visible ルールを注入し、focus ring 色を CSS 変数へ反映', () => {
    const appended: Array<{ id?: string; textContent?: string }> = [];
    const setProperty = jest.fn();
    const fakeDoc = {
      createElement: () => ({} as Record<string, unknown>),
      head: { appendChild: (el: { id?: string; textContent?: string }) => appended.push(el) },
      documentElement: { style: { setProperty } },
    };
    // @ts-expect-error テスト用に global.document を差し替える
    global.document = fakeDoc;
    try {
      asWeb(() => {
        installFocusVisibleStyle();
        setFocusRingColor('#13449D');
      });
      expect(appended).toHaveLength(1);
      expect(appended[0].id).toBe('ge-focus-visible');
      expect(appended[0].textContent).toContain(':focus-visible');
      expect(setProperty).toHaveBeenCalledWith('--ge-focus-ring', '#13449D');
    } finally {
      // @ts-expect-error クリーンアップ
      delete global.document;
    }
  });
});
