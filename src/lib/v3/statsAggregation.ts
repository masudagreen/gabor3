/**
 * statsAggregation.ts — v3.1 セッション完了時の集計（純関数、spec §7.5/§7.6/§7.7）。
 *
 * v3.1：記録粒度を**セッション単位**に変更（AS-29）。
 * - DailyStats：その日にクリアした最高レベル（max）/ セッション完了件数 sessionCount /
 *   （任意）ラウンド完了件数 roundCount。
 * - Streak：セッション完了日を基準に連続日数を更新。
 * - PlayStats：累計セッション数 totalSessions（+ 任意 totalRounds）。
 *
 * 日付依存ロジックはテスト可能にするため日付文字列（YYYY-MM-DD）を引数で受け取る純関数とする
 * （spec AS-20：端末ローカル日付）。日次到達レベルは**クリア基準**（§7.5「クリア基準。代表値 max」）。
 * 永続化は state/v3/gameRecorder.ts が担う。
 */

import { dayDiff } from '../v2/dateUtil';
import type { DailyStats, Streak, PlayStats } from '../../state/v3/schema';

/** 1 セッションの集計入力（DailyStats 更新用）。 */
export type SessionDailyInput = {
  /** そのセッションで到達した最高レベル（クリアしたラウンドの max）。クリア 0 件なら 0。 */
  highestClearedLevel: number;
  /** そのセッションで完了したラウンド数（DailyStats.roundCount 加算用）。 */
  roundCount: number;
};

/**
 * その日の DailyStats をセッション完了で更新する（spec §7.5、v3.1）。
 *
 * - highestLevelReached：その日にクリアした最高レベルの max（失敗のみのセッションは上げない）。
 * - sessionCount：セッション完了件数 +1。
 * - roundCount：そのセッションのラウンド完了数を加算。
 */
export function updateDailyStats(
  prev: DailyStats | null,
  date: string,
  input: SessionDailyInput,
): DailyStats {
  const reached = Math.max(0, input.highestClearedLevel);
  if (!prev) {
    return {
      date,
      highestLevelReached: reached,
      sessionCount: 1,
      roundCount: input.roundCount,
    };
  }
  return {
    date,
    highestLevelReached: Math.max(prev.highestLevelReached, reached),
    sessionCount: prev.sessionCount + 1,
    roundCount: prev.roundCount + input.roundCount,
  };
}

/**
 * Streak をセッション完了で更新する（spec §7.6、ローカル日付・連続日数）。
 * - 同日に再プレイ：連続日数据え置き
 * - 前日からの継続（diff=1）：currentStreak + 1
 * - 2 日以上空く（diff>=2）または初回：currentStreak = 1
 * longestStreak は currentStreak の最大値を保持する。
 */
export function updateStreak(prev: Streak, today: string): Streak {
  if (prev.lastPlayedDate == null) {
    return {
      currentStreak: 1,
      longestStreak: Math.max(1, prev.longestStreak),
      lastPlayedDate: today,
    };
  }
  const diff = dayDiff(prev.lastPlayedDate, today);
  if (diff <= 0) {
    // 同日（または時計巻き戻し等の防御）：据え置き
    return prev;
  }
  const current = diff === 1 ? prev.currentStreak + 1 : 1;
  return {
    currentStreak: current,
    longestStreak: Math.max(prev.longestStreak, current),
    lastPlayedDate: today,
  };
}

/**
 * PlayStats をセッション完了で更新する（spec §7.7、v3.1）。
 * 累計セッション数 +1、累計ラウンド数 += そのセッションのラウンド数、
 * 累計ゲーム時間（秒）+= そのセッションのパッチ視認秒数（playSec）。
 */
export function updatePlayStats(
  prev: PlayStats,
  roundCount: number,
  playSec: number = 0,
): PlayStats {
  return {
    totalSessions: prev.totalSessions + 1,
    totalRounds: prev.totalRounds + roundCount,
    totalPlaySec: prev.totalPlaySec + Math.max(0, Math.floor(playSec)),
  };
}
