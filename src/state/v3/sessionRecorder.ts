/**
 * sessionRecorder.ts — v3.1 完了セッション（= 1 SessionRecord）の永続化と
 * 日次/ストリーク/累計/バッジの更新を束ねる（spec §7.4〜§7.8、F-04/F-08）。
 *
 * v3.1：記録粒度をセッション単位に変更（AS-29）。ラウンド詳細は永続化しない。
 * - SessionRecord を `gaboreye:v3:session:<uuid>` に保存（roundCount/clear/fail/最高到達等）。
 * - DailyStats：その日クリア最高レベル max・sessionCount+1・roundCount += セッションのラウンド数。
 * - Streak：セッション完了日で連続日数更新（§7.6）。
 * - PlayStats：totalSessions+1・totalRounds += ラウンド数（§7.7）。
 * - BadgeStatus：§6 の付与判定。高難度（B-06/07/08）は**そのセッションでクリアした各ラウンドの
 *   levelParams** で判定、継続（B-01〜05）は更新後 streak、高レベル（B-09〜11）は更新後 highestLevel。
 *
 * 中断（F-07 / AS-30）：完了済みラウンドが 1 つ以上ある場合に呼ぶ（その時点までを記録）。
 * 完了済みラウンドが 0 件の中断は本関数を呼ばない（SessionRecord を記録しない、§7.4）。
 * LevelState の永続化（applyResult 反映後）は呼び出し側（sessionFlow）の責務。
 */

import { localDateString } from '../../lib/v2/dateUtil';
import {
  updateDailyStats,
  updateStreak,
  updatePlayStats,
} from '../../lib/v3/statsAggregation';
import { evaluateBadges } from '../../lib/v3/badges';
import { totalLevels, DEFAULT_VARIABLE_ORDER } from '../../lib/v3/level';
import type {
  LevelParams,
  VariableRanges,
  VariableKey,
} from '../../lib/v3/level';
import { defaultVariableRanges } from '../../lib/v3/level';
import type {
  SessionRecord,
  DailyStats,
  Streak,
  PlayStats,
  BadgeStatus,
  BadgeId,
} from './schema';
import {
  saveSessionRecord,
  loadDailyStats,
  saveDailyStats,
  loadStreak,
  saveStreak,
  loadPlayStats,
  savePlayStats,
  loadAllBadgeStatuses,
  saveBadgeStatus,
} from './repository';

/** 完了セッション 1 件の入力（中断で完了済みラウンドありの場合も含む）。 */
export type CompletedSessionInput = {
  sessionId: string;
  /** セッション開始日時（ISO 文字列、テスト決定論のため呼び出し側が用意）。 */
  startedAt: string;
  /** 適用された設定時間（分）。 */
  sessionMinutes: number;
  /** 完了したラウンド数。 */
  roundCount: number;
  /** クリアしたラウンド数。 */
  clearCount: number;
  /** 失敗したラウンド数。 */
  failCount: number;
  /** セッション開始時のレベル。 */
  startLevel: number;
  /** セッション終了時のレベル（= 次セッション開始レベル）。 */
  endLevel: number;
  /** そのセッションで到達した最高レベル（挑戦ベース）。 */
  highestLevelInSession: number;
  /** そのセッションのパッチ視認秒数（= 各ラウンド実プレイ秒数の合計、累計ゲーム時間用）。 */
  playSec: number;
  /** そのセッションでクリアした最高レベル（DailyStats.highestLevelReached 用、クリア 0 件なら 0）。 */
  highestClearedLevel: number;
  /** そのセッションでクリアした各ラウンドのレベル 5 変数（高難度バッジ判定用、§6.2）。 */
  clearedLevelParams: LevelParams[];
  /** 増減反映後の最高到達レベル（LevelState.highestLevel）。高レベルバッジ判定用（§6.3）。 */
  highestLevel: number;
  /** 範囲設定（B-10/B-11 の総レベル数算出用）。未指定はフル範囲。 */
  ranges?: VariableRanges;
  /** 変化順（B-10/B-11 の総レベル数算出用）。未指定はデフォルト順。 */
  order?: readonly VariableKey[];
  /** 完了日時の Date（テスト決定論のため注入可。既定は new Date()）。 */
  now?: Date;
};

/** 完了セッションの SessionRecord を組み立てる（純関数、永続化はしない）。 */
export function buildSessionRecord(
  input: CompletedSessionInput,
  completedAt: string,
): SessionRecord {
  return {
    sessionId: input.sessionId,
    startedAt: input.startedAt,
    completedAt,
    sessionMinutes: input.sessionMinutes,
    roundCount: input.roundCount,
    clearCount: input.clearCount,
    failCount: input.failCount,
    startLevel: input.startLevel,
    endLevel: input.endLevel,
    highestLevelInSession: input.highestLevelInSession,
    playSec: Math.max(0, Math.floor(input.playSec ?? 0)),
  };
}

export type RecordCompletedSessionResult = {
  session: SessionRecord;
  dailyStats: DailyStats;
  streak: Streak;
  playStats: PlayStats;
  /** 更新後の全 11 バッジステータス（§6.4 / BadgeStatus）。 */
  badges: BadgeStatus[];
  /** 今セッションで新規獲得したバッジ ID（獲得演出・音/ハプティクス用）。 */
  newlyEarnedBadges: BadgeId[];
};

/**
 * 完了セッションを永続化し、日次・ストリーク・累計・バッジを更新する（spec §7.4〜§7.8）。
 *
 * バッジ判定（§6.4）：
 *  - 継続（B-01〜05）：更新後 streak.currentStreak。
 *  - 高難度（B-06〜08）：このセッションでクリアした各ラウンドの levelParams を 1 件ずつ評価
 *    （いずれかのラウンドが条件を満たせば獲得）。クリア 0 件なら高難度は獲得しない（§6.2）。
 *  - 高レベル（B-09〜11）：更新後 highestLevel。
 */
export async function recordCompletedSession(
  input: CompletedSessionInput,
): Promise<RecordCompletedSessionResult> {
  const now = input.now ?? new Date();
  const completedAt = now.toISOString();
  const today = localDateString(now);

  const session = buildSessionRecord(input, completedAt);
  await saveSessionRecord(session);

  const prevDaily = await loadDailyStats(today);
  const dailyStats = updateDailyStats(prevDaily, today, {
    highestClearedLevel: input.highestClearedLevel,
    roundCount: input.roundCount,
  });
  await saveDailyStats(dailyStats);

  const prevStreak = await loadStreak();
  const streak = updateStreak(prevStreak, today);
  await saveStreak(streak);

  const prevPlay = await loadPlayStats();
  const playStats = updatePlayStats(prevPlay, input.roundCount, input.playSec);
  await savePlayStats(playStats);

  // バッジ判定（§6.4）。継続/高レベルはセッション末値、高難度はクリア各ラウンドで評価する。
  const ranges = input.ranges ?? defaultVariableRanges();
  const order = input.order ?? DEFAULT_VARIABLE_ORDER;
  const total = totalLevels(ranges, order);
  const currentBadges = await loadAllBadgeStatuses();

  // 高難度バッジはクリアした各ラウンドの levelParams で個別評価するため、クリア params を
  // 1 件ずつ context に通す。クリア 0 件なら 'fail' 相当の params なしで継続/高レベルのみ評価する。
  const clearedParams =
    input.clearedLevelParams.length > 0 ? input.clearedLevelParams : [null];

  let badges: BadgeStatus[] = currentBadges.map((b) => ({ ...b }));
  const newlyEarnedSet = new Set<BadgeId>();
  for (const params of clearedParams) {
    const { next, newlyEarned } = evaluateBadges(
      {
        // params が null（クリア 0 件）のときは高難度を発火させないため fail とし、
        // levelParams にはダミー（endLevel 相当ではなく難度判定を確実に false にする最易）を渡す。
        result: params ? 'clear' : 'fail',
        levelParams: params ?? {
          count: ranges.count[0],
          seconds: ranges.seconds[0],
          direction: 'one-way',
          gridSize: ranges.gridSize[0],
          rotationSpeed: ranges.rotationSpeed[0],
        },
        highestLevel: input.highestLevel,
        totalLevels: total,
        currentStreak: streak.currentStreak,
        now,
      },
      badges,
    );
    badges = next;
    for (const id of newlyEarned) newlyEarnedSet.add(id);
  }

  const newlyEarnedBadges = badges
    .filter((b) => newlyEarnedSet.has(b.badgeId))
    .map((b) => b.badgeId);

  for (const id of newlyEarnedBadges) {
    const status = badges.find((s) => s.badgeId === id);
    if (status) await saveBadgeStatus(status);
  }

  return {
    session,
    dailyStats,
    streak,
    playStats,
    badges,
    newlyEarnedBadges,
  };
}
