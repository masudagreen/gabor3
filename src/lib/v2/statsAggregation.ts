/**
 * statsAggregation.ts — セッション完了時の集計（純関数、spec §6.5/§6.6/§6.7）。
 *
 * 完了セッション 1 件から DailyStats（その日の最良スコア max・件数）/ Streak（連続日数）/
 * PlayStats（累計）の次状態を計算する。永続化は state/statsRecorder.ts が担う。
 *
 * 日付依存ロジックはテスト可能にするため、判定対象の日付文字列（YYYY-MM-DD）を引数で
 * 受け取る純関数として実装する（spec AS-20：端末ローカル日付）。S7 履歴・S8 バッジは
 * ここで更新された値を集計元にする。
 */

import { dayDiff } from './dateUtil';
import type { DailyStats, Streak, PlayStats } from '../../state/schema';

/**
 * その日の DailyStats を更新する（spec §6.5）。
 * - 既存なし：bestSessionScore = score、sessionCount = 1
 * - 既存あり：bestSessionScore = max(既存, score)、sessionCount + 1
 */
export function updateDailyStats(
  prev: DailyStats | null,
  date: string,
  sessionScore: number,
): DailyStats {
  if (!prev) {
    return { date, bestSessionScore: sessionScore, sessionCount: 1 };
  }
  return {
    date,
    bestSessionScore: Math.max(prev.bestSessionScore, sessionScore),
    sessionCount: prev.sessionCount + 1,
  };
}

/**
 * Streak を更新する（spec §6.6、ローカル日付・連続日数）。
 * - 同日に再プレイ：連続日数は変えない（lastPlayedDate も同じ）
 * - 前日からの継続（diff=1）：currentStreak + 1
 * - 2 日以上空く（diff>=2）または初回：currentStreak = 1
 * longestStreak は currentStreak の最大値を保持する。
 */
export function updateStreak(prev: Streak, today: string): Streak {
  if (prev.lastPlayedDate == null) {
    return { currentStreak: 1, longestStreak: Math.max(1, prev.longestStreak), lastPlayedDate: today };
  }
  const diff = dayDiff(prev.lastPlayedDate, today);
  if (diff <= 0) {
    // 同日（または過去日＝時計巻き戻し等の防御）：連続日数据え置き
    return prev;
  }
  const current = diff === 1 ? prev.currentStreak + 1 : 1;
  return {
    currentStreak: current,
    longestStreak: Math.max(prev.longestStreak, current),
    lastPlayedDate: today,
  };
}

/** PlayStats を更新する（spec §6.7、累計セッション完了数 +1）。 */
export function updatePlayStats(prev: PlayStats): PlayStats {
  return { totalSessions: prev.totalSessions + 1 };
}
