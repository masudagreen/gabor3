/**
 * badges.ts — バッジ付与判定（純関数、spec §5 / §5.4 / screens.md S8）。
 *
 * セッション完了コンテキスト（今回のスコア・paramsSnapshot・連続日数・高スコア累計）から
 * 新たに獲得するバッジを判定する。永続化は state/repository.ts、完了時配線は
 * state/statsRecorder.ts（recordCompletedSession の後）が担う。
 *
 * 設計原則：
 *  - 日付/連続日数依存はテスト可能にするため context.currentStreak で注入する（自前で算出しない）。
 *  - 既に獲得済みのバッジは二重獲得しない（earnedAt を保持する）。
 *  - 「全問正答（クリア）」= そのセッション全体で fnCount=0 かつ fpCount=0 で、変化パッチが 1 つ以上
 *    存在したこと（誤選択も選び逃しもない満点的セッション）。
 */

import type { BadgeId, BadgeStatus, SessionRecord } from '../../state/schema';
import {
  BADGE_IDS,
} from '../../state/schema';
import {
  SLOW_ROTATION_MAX,
  SMALL_SF_CHANGE_MAX,
  HIGH_SCORE_THRESHOLD,
  PERFECT_SCORE,
  STABLE_HIGH_SCORE_COUNT,
} from './badgeDefinitions';

/**
 * バッジ判定に必要なセッション完了コンテキスト。
 * 日付・連続日数・高スコア累計はテスト決定論のため呼び出し側から注入する。
 */
export type BadgeContext = {
  /** 今回完了したセッション（paramsSnapshot / rounds / sessionScore を参照）。 */
  session: SessionRecord;
  /** 今回完了時点の連続日数（Streak.currentStreak）。 */
  currentStreak: number;
  /**
   * スコア 80 以上を達成した累計セッション数（今回のセッションを含む）。
   * B-11（あと {n} 回）の残り計算と付与判定に使う。
   */
  highScoreSessionCount: number;
  /** 獲得日時（ISO 文字列）。テスト決定論のため注入可。既定は new Date()。 */
  now?: Date;
};

export type EvaluateBadgesResult = {
  /** 全 11 バッジの更新後ステータス（earned / earnedAt）。 */
  next: BadgeStatus[];
  /** 今回新たに獲得したバッジ ID（演出・音/ハプティクス用、表示順）。 */
  newlyEarned: BadgeId[];
};

/**
 * セッション全体が「全問正答（クリア）」か（高難度バッジ B-06/B-07 用）。
 * 変化パッチが 1 つ以上あり、誤選択（FP）も選び逃し（FN）も全ラウンドでゼロ。
 */
export function isSessionPerfectClear(session: SessionRecord): boolean {
  let totalChanging = 0;
  let totalFp = 0;
  let totalFn = 0;
  for (const r of session.rounds) {
    totalChanging += r.changingPatchCount;
    totalFp += r.fpCount;
    totalFn += r.fnCount;
  }
  return totalChanging > 0 && totalFp === 0 && totalFn === 0;
}

/** 今回のセッションが各バッジの条件を満たすか（既獲得は考慮しない素の判定）。 */
export function meetsBadgeCondition(
  badgeId: BadgeId,
  ctx: BadgeContext,
): boolean {
  const { session, currentStreak, highScoreSessionCount } = ctx;
  const { a, b } = session.paramsSnapshot;
  const score = session.sessionScore;

  switch (badgeId) {
    // 継続日数軸（B-01 は初回完了＝連続 1 以上）
    case 'B-01':
      return currentStreak >= 1;
    case 'B-02':
      return currentStreak >= 3;
    case 'B-03':
      return currentStreak >= 7;
    case 'B-04':
      return currentStreak >= 14;
    case 'B-05':
      return currentStreak >= 30;

    // 高難度クリア軸（paramsSnapshot × 全問正答 / 高スコア）
    case 'B-06':
      return a <= SLOW_ROTATION_MAX && isSessionPerfectClear(session);
    case 'B-07':
      return b <= SMALL_SF_CHANGE_MAX && isSessionPerfectClear(session);
    case 'B-08':
      return (
        a <= SLOW_ROTATION_MAX &&
        b <= SMALL_SF_CHANGE_MAX &&
        score >= HIGH_SCORE_THRESHOLD
      );

    // 高スコア軸
    case 'B-09':
      return score >= HIGH_SCORE_THRESHOLD;
    case 'B-10':
      return score >= PERFECT_SCORE;
    case 'B-11':
      return highScoreSessionCount >= STABLE_HIGH_SCORE_COUNT;

    default:
      return false;
  }
}

/**
 * 全 11 バッジの付与を判定する（spec §5.4）。
 *
 * @param ctx       セッション完了コンテキスト
 * @param current   現在の全バッジステータス（順不同可。欠けている分は未獲得とみなす）
 * @returns next（更新後の全 11 バッジ）と newlyEarned（今回新規獲得した ID）
 *
 * 既に earned のバッジは earnedAt を保持し、再付与しない（二重獲得しない）。
 */
export function evaluateBadges(
  ctx: BadgeContext,
  current: readonly BadgeStatus[],
): EvaluateBadgesResult {
  const now = ctx.now ?? new Date();
  const earnedAt = now.toISOString();

  const byId = new Map<BadgeId, BadgeStatus>();
  for (const s of current) byId.set(s.badgeId, s);

  const next: BadgeStatus[] = [];
  const newlyEarned: BadgeId[] = [];

  for (const id of BADGE_IDS) {
    const prev = byId.get(id) ?? { badgeId: id, earned: false, earnedAt: null };
    if (prev.earned) {
      // 既獲得は維持（earnedAt 保持・二重獲得しない）
      next.push(prev);
      continue;
    }
    if (meetsBadgeCondition(id, ctx)) {
      next.push({ badgeId: id, earned: true, earnedAt });
      newlyEarned.push(id);
    } else {
      next.push(prev);
    }
  }

  return { next, newlyEarned };
}

/**
 * B-11（スコア 80 以上を累計 5 回）の残り回数を返す（未獲得時の動的ヒント用）。
 * 既に達成済みなら 0。
 */
export function remainingForStableHighScore(highScoreSessionCount: number): number {
  return Math.max(0, STABLE_HIGH_SCORE_COUNT - highScoreSessionCount);
}
