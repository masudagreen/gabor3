/**
 * streak v1.1 — F-12 ストリークと日次ベスト（spec-v11.md §F-12）。
 *
 * 純関数で実装し、副作用（AsyncStorage への書き込み）は呼び出し側に任せる。
 *
 * - applyCourseCompletionV11(streak, today)
 *     全ゲーム連続コース完了時に呼ぶ。同日 2 回目以降は加算しない。
 * - reconcileStreakOnViewV11(streak, now)
 *     アプリ起動時／ホーム表示時に呼ぶ。0:00 跨ぎでリセット判定する。
 *     22 時以降未完了で警告フラグを返す。
 *
 * 受け入れ基準（spec §F-12）：
 *   - [x] 全ゲーム連続コース完了でストリーク +1（同日 2 回目以降は加算しない）
 *   - [x] 0:00（端末ローカル時刻）跨ぎで前日コース未完了ならストリークが 0 にリセット
 *   - [x] ストリーク表示には「今日終わるとリセットされます」の警告が前日 22 時以降に出る
 *
 * 日付（YYYY-MM-DD）は端末ローカル基準（spec §11）。
 */

import { StreakV11 } from '../../state/storage-v11';

/** ローカル時刻の YYYY-MM-DD を返す純関数。 */
export function formatDateLocalV11(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 1 日加算した YYYY-MM-DD を返す（端末ローカル）。 */
function addDaysIso(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map((s) => parseInt(s, 10));
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return formatDateLocalV11(dt);
}

/** prev が today の前日かどうか（端末ローカル）。 */
export function isYesterdayV11(prev: string, today: string): boolean {
  return addDaysIso(prev, 1) === today;
}

/**
 * フルコース完了時のストリーク更新（spec-v11.md §F-12）。
 *
 * - lastCompletedDate == today: 同日 2 回目以降。加算しない（incremented=false）
 * - lastCompletedDate == 昨日: 連続継続、+1
 * - lastCompletedDate == null: 初回完了、currentStreak=1
 * - lastCompletedDate がそれ以外: 連続途切れ、当日完了で 1
 *
 * longestStreak は同時に更新する（max）。
 */
export function applyCourseCompletionV11(
  streak: StreakV11,
  today: string,
): { streak: StreakV11; incremented: boolean } {
  if (streak.lastCompletedDate === today) {
    return { streak, incremented: false };
  }
  let nextCurrent: number;
  if (
    streak.lastCompletedDate != null &&
    isYesterdayV11(streak.lastCompletedDate, today)
  ) {
    nextCurrent = streak.currentStreak + 1;
  } else {
    nextCurrent = 1;
  }
  const nextLongest = Math.max(streak.longestStreak, nextCurrent);
  return {
    streak: {
      currentStreak: nextCurrent,
      longestStreak: nextLongest,
      lastCompletedDate: today,
    },
    incremented: true,
  };
}

/**
 * 0:00 跨ぎでのリセット判定（spec-v11.md §F-12）。
 *
 * - lastCompletedDate == null：何もしない
 * - lastCompletedDate == today：今日完了済み、変化なし
 * - lastCompletedDate == 昨日：継続中、変化なし（22 時以降は警告）
 * - lastCompletedDate が 2 日以上前：currentStreak を 0 にリセット
 *
 * @returns
 *   - streak: 更新後（変化なしなら元のオブジェクト）
 *   - resetWarning: 22 時以降で「昨日完了 / 今日未完了」の場合 true
 */
export function reconcileStreakOnViewV11(
  streak: StreakV11,
  now: Date = new Date(),
): { streak: StreakV11; resetWarning: boolean } {
  const today = formatDateLocalV11(now);
  if (streak.lastCompletedDate == null) {
    return { streak, resetWarning: false };
  }
  if (streak.lastCompletedDate === today) {
    return { streak, resetWarning: false };
  }
  if (isYesterdayV11(streak.lastCompletedDate, today)) {
    const hour = now.getHours();
    return { streak, resetWarning: hour >= 22 };
  }
  // 2 日以上前 → リセット
  return {
    streak: {
      currentStreak: 0,
      longestStreak: streak.longestStreak,
      lastCompletedDate: null,
    },
    resetWarning: false,
  };
}
