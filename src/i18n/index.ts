/**
 * i18n/index.ts — Sprint 7-C / spec.md §4「日本語のみ・将来多言語化可能な構造」。
 *
 * 軽量 t() 関数：
 *   - キーは `'home.start_course'` のようなドット区切り
 *   - placeholder は `{{name}}` 形式
 *   - 値が文字列以外（配列など）の場合は `tArray` を使う
 *
 * v1 では ja のみ。v2 で switchLocale() を導入予定。
 */

import { ja, LocaleDict } from './ja';

const dict: LocaleDict = ja;

/**
 * 任意のドット区切りキーで dict を辿るユーティリティ（純関数）。
 */
function resolvePath(d: unknown, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = d;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

/**
 * placeholder を展開する純関数。`{{key}}` を params[key] で置換。
 * params に該当キーが無ければ `{{key}}` のまま残す（フェイルセーフ）。
 */
export function interpolate(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    if (key in params) return String(params[key]);
    return `{{${key}}}`;
  });
}

/**
 * t — 文字列キーを翻訳する。見つからなければキー自身を返す（デバッグしやすさ）。
 */
export function t(
  key: string,
  params?: Record<string, string | number>,
): string {
  const v = resolvePath(dict, key);
  if (typeof v !== 'string') return key;
  return interpolate(v, params);
}

/**
 * tArray — 配列を返す（DisclaimerSheet の警告リストなど）。見つからなければ空配列。
 */
export function tArray(key: string): ReadonlyArray<string> {
  const v = resolvePath(dict, key);
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  return [];
}

export { ja };
export type { LocaleDict };
