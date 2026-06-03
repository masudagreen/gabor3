/**
 * badgeRecorder.ts — バッジ付与の永続化配線（spec §5.4 / §6.8）。
 *
 * 完了セッション 1 件 + 更新後の Streak から、バッジ付与を判定（lib/v2/badges.ts の
 * evaluateBadges）し、新規/更新ステータスを `gaboreye:v2:badge:*` に保存する。
 * 高スコア累計（B-11 の判定・残り回数）は永続済みの全セッションから算出する。
 *
 * 「読み込み → 純関数で次状態を計算 → 保存」の I/O 配線のみを担う（判定純ロジックは badges.ts）。
 * 戻り値の newlyEarned は結果カードの獲得演出（S8）・音/ハプティクス（S9）が拾う。
 */

import { evaluateBadges } from '../lib/v2/badges';
import { HIGH_SCORE_THRESHOLD } from '../lib/v2/badgeDefinitions';
import type { BadgeId, BadgeStatus, SessionRecord } from './schema';
import {
  loadAllBadgeStatuses,
  loadAllSessions,
  saveBadgeStatus,
} from './repository';

export type BadgeEvaluationResult = {
  /** 更新後の全 11 バッジステータス。 */
  badges: BadgeStatus[];
  /** 今回新規獲得したバッジ ID（演出・音/ハプティクス用）。 */
  newlyEarned: BadgeId[];
};

/**
 * 永続済みの全セッションから、スコア 80 以上の完了セッション数を数える（B-11 用）。
 * 完了済み（completedAt != null）のみを数える。
 */
export function countHighScoreSessions(
  sessions: readonly SessionRecord[],
): number {
  return sessions.filter(
    (s) => s.completedAt != null && s.sessionScore >= HIGH_SCORE_THRESHOLD,
  ).length;
}

/**
 * 完了セッションに対しバッジ付与を判定・保存する（spec §5.4）。
 * recordCompletedSession 内（SessionRecord 永続化と Streak 更新の後）に呼ぶ。
 *
 * @param session       今回完了したセッション（既に永続化済み）
 * @param currentStreak 更新後の連続日数（Streak.currentStreak）
 * @param now           獲得日時の時計（テスト決定論。既定は new Date()）
 */
export async function recordBadgesForSession(args: {
  session: SessionRecord;
  currentStreak: number;
  now?: Date;
}): Promise<BadgeEvaluationResult> {
  const now = args.now ?? new Date();

  const [current, allSessions] = await Promise.all([
    loadAllBadgeStatuses(),
    loadAllSessions(),
  ]);

  const highScoreSessionCount = countHighScoreSessions(allSessions);

  const { next, newlyEarned } = evaluateBadges(
    {
      session: args.session,
      currentStreak: args.currentStreak,
      highScoreSessionCount,
      now,
    },
    current,
  );

  // 新規獲得分のみ保存（既獲得は earnedAt を保持しており書き換え不要）。
  for (const id of newlyEarned) {
    const status = next.find((s) => s.badgeId === id);
    if (status) await saveBadgeStatus(status);
  }

  return { badges: next, newlyEarned };
}
