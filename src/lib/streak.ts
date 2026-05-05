/**
 * ストリーク更新ロジック（spec.md §9.3 / screens.md S6-04 / §8）。
 *
 * 純関数で実装し、副作用（AsyncStorage への書き込み）は呼び出し側に任せる。
 *
 * 入出力：
 *   - applyCourseCompletion(streak, today)
 *       コース完了時に呼ぶ。同日 2 回目以降は加算しない。
 *   - reconcileStreakOnView(streak, today)
 *       アプリ起動時／ホーム表示時に呼ぶ。0:00 跨ぎでリセット判定する。
 *       警告フラグ（22 時以降未完了）の判定もここで行う。
 *
 * 日付（YYYY-MM-DD）は端末ローカル基準（spec.md A-6）。
 */
import { Streak } from '../state/storage';
import { formatDateLocal } from './weeklyStats';

/** 1 日加算した YYYY-MM-DD を返す（純関数） */
function addDaysIso(dateStr: string, n: number): string {
  // 'YYYY-MM-DD' を端末ローカルとして解釈するため、ローカル時刻で Date 化
  const [y, m, d] = dateStr.split('-').map((s) => parseInt(s, 10));
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return formatDateLocal(dt);
}

/** date1 が date2 の前日かどうか */
export function isYesterday(prev: string, today: string): boolean {
  return addDaysIso(prev, 1) === today;
}

/**
 * コース完了時のストリーク更新（spec.md §9.3）。
 *
 * - lastCompletedDate == today: 同日 2 回目以降。加算しない（既存値を返す）
 * - lastCompletedDate == today の前日: 連続継続、+1
 * - lastCompletedDate == null: 初回完了、currentStreak = 1
 * - lastCompletedDate がそれ以外: 連続途切れ、リセット後に当日完了で 1
 *
 * longestStreak も同時に更新する（max）。
 */
export function applyCourseCompletion(
  streak: Streak,
  today: string,
): { streak: Streak; incremented: boolean } {
  if (streak.lastCompletedDate === today) {
    // 同日 2 回目以降
    return { streak, incremented: false };
  }
  let nextCurrent: number;
  if (
    streak.lastCompletedDate != null &&
    isYesterday(streak.lastCompletedDate, today)
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
 * 0:00 跨ぎでのリセット判定（spec.md §9.3 / screens.md §8）。
 *
 * - lastCompletedDate == null：何もしない
 * - lastCompletedDate == today：今日完了済み、変化なし
 * - lastCompletedDate == 昨日：継続中、変化なし（リセットはしない）
 * - lastCompletedDate が 2 日以上前：currentStreak を 0 にリセット
 *
 * 戻り値：
 *   - streak: 更新後（変化なしなら元のオブジェクトを返す）
 *   - resetWarning: 22 時以降で「昨日完了 / 今日未完了」状態の場合 true
 */
export function reconcileStreakOnView(
  streak: Streak,
  now: Date = new Date(),
): { streak: Streak; resetWarning: boolean } {
  const today = formatDateLocal(now);
  if (streak.lastCompletedDate == null) {
    return { streak, resetWarning: false };
  }
  if (streak.lastCompletedDate === today) {
    // 今日完了済み
    return { streak, resetWarning: false };
  }
  if (isYesterday(streak.lastCompletedDate, today)) {
    // 昨日完了で今日未完了：22 時以降は警告
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
