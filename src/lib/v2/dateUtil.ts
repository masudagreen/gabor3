/**
 * dateUtil.ts — 端末ローカル日付ユーティリティ（spec AS-20、ISO 週・月曜開始）。
 *
 * 「今日」「連続日数」は端末ローカル日付で判定する。日付依存ロジックをテスト可能に
 * するため、すべて Date を引数注入できる純関数として実装する（実行時は new Date()）。
 *
 * ストリーク・日次集計は本ファイルの `localDateString` / `dayDiff` を共通の土台にする。
 */

/** Date → 端末ローカルの YYYY-MM-DD 文字列（spec §6.5）。 */
export function localDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** YYYY-MM-DD → ローカル 0 時の Date（日数差計算用）。 */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map((s) => parseInt(s, 10));
  return new Date(y, m - 1, d);
}

/**
 * 2 つの YYYY-MM-DD の日数差（later - earlier）。
 * 同日 = 0、翌日 = 1。タイムゾーンに依存しないようローカル 0 時で計算する。
 */
export function dayDiff(earlier: string, later: string): number {
  const a = parseLocalDate(earlier).getTime();
  const b = parseLocalDate(later).getTime();
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((b - a) / msPerDay);
}
