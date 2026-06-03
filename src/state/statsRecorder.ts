/**
 * statsRecorder.ts — 完了セッションの永続化と日次/ストリーク/累計の更新を束ねる
 * （spec F-04 / §6.4〜§6.7）。
 *
 * sessionRecorder.ts（SessionRecord の組み立て・保存）に加えて、完了セッション 1 件を
 * 受けて DailyStats（max）/ Streak（連続日数）/ PlayStats（累計）を更新・保存する。
 * 集計の純ロジックは lib/v2/statsAggregation.ts、日付は lib/v2/dateUtil.ts に分離し、
 * 本モジュールは「読み込み → 純関数で次状態を計算 → 保存」の I/O 配線のみを担う。
 *
 * 中断（completedAt=null）は呼ばない（F-07：記録対象外）。完了時のみ呼ぶ。
 */

import { localDateString } from '../lib/v2/dateUtil';
import {
  updateDailyStats,
  updateStreak,
  updatePlayStats,
} from '../lib/v2/statsAggregation';
import type { GameConfig } from '../lib/v2/gameMachine';
import type { RoundScore } from '../lib/v2/scoring';
import type {
  SessionRecord,
  DailyStats,
  Streak,
  PlayStats,
  BadgeStatus,
  BadgeId,
} from './schema';
import { persistCompletedSession } from './sessionRecorder';
import { recordBadgesForSession } from './badgeRecorder';
import {
  loadDailyStats,
  saveDailyStats,
  loadStreak,
  saveStreak,
  loadPlayStats,
  savePlayStats,
} from './repository';

export type CompletedSessionResult = {
  session: SessionRecord;
  dailyStats: DailyStats;
  streak: Streak;
  playStats: PlayStats;
  /** 更新後の全 11 バッジ（spec §5 / §6.8）。 */
  badges: BadgeStatus[];
  /** 今回新規獲得したバッジ ID（結果カード演出・S9 音/ハプティクス用）。 */
  newlyEarnedBadges: BadgeId[];
};

/**
 * 完了セッションを永続化し、日次・ストリーク・累計を更新する（spec §6.4〜§6.7）。
 *
 * @param now 完了日時の Date（テスト決定論のため注入可。既定は new Date()）。
 *            DailyStats の日付・Streak の判定はこの Date のローカル日付を使う。
 */
export async function recordCompletedSession(args: {
  sessionId: string;
  startedAt: string;
  config: GameConfig;
  roundScores: readonly RoundScore[];
  now?: Date;
}): Promise<CompletedSessionResult> {
  const now = args.now ?? new Date();
  const completedAt = now.toISOString();
  const today = localDateString(now);

  const session = await persistCompletedSession({
    sessionId: args.sessionId,
    startedAt: args.startedAt,
    completedAt,
    config: args.config,
    roundScores: args.roundScores,
  });

  const prevDaily = await loadDailyStats(today);
  const dailyStats = updateDailyStats(prevDaily, today, session.sessionScore);
  await saveDailyStats(dailyStats);

  const prevStreak = await loadStreak();
  const streak = updateStreak(prevStreak, today);
  await saveStreak(streak);

  const prevPlay = await loadPlayStats();
  const playStats = updatePlayStats(prevPlay);
  await savePlayStats(playStats);

  // バッジ付与判定（SessionRecord 永続化と Streak 更新の後、spec §5.4）。
  // newlyEarnedBadges は結果カードの獲得演出（S8）・音/ハプティクス（S9）が拾う。
  const { badges, newlyEarned } = await recordBadgesForSession({
    session,
    currentStreak: streak.currentStreak,
    now,
  });

  return {
    session,
    dailyStats,
    streak,
    playStats,
    badges,
    newlyEarnedBadges: newlyEarned,
  };
}
