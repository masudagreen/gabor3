/**
 * badges.ts — v3.0 バッジ付与判定（純関数、spec §6 / F-09 バッジ部）。
 *
 * ゲーム完了コンテキスト（クリアした GameRecord.levelParams / 最高到達レベル /
 * 連続日数 / 総レベル数）から、新たに獲得するバッジを判定する。
 * 永続化は state/v3/repository.ts、完了時配線は state/v3/gameRecorder.ts が担う。
 *
 * 設計原則：
 *  - 日付/連続日数依存はテスト可能にするため context.currentStreak で注入する（自前算出しない）。
 *  - 既獲得のバッジは二重獲得しない（earnedAt を保持する）。
 *  - 高難度（B-06/07/08）は **クリアした**ゲームの levelParams のみで判定（失敗は対象外、spec §6.2）。
 *  - 高レベル（B-09/10/11）は LevelState.highestLevel（クリアした最高レベル）で判定（spec §6.3）。
 *  - B-10/B-11 は割合ベース（総レベル数の 50% / 85%）。範囲設定で総レベル数が変わっても
 *    観察可能な「中盤 / 終盤」を保つ（system §9.3）。
 */

import type { BadgeId, BadgeStatus } from '../../state/v3/schema';
import { BADGE_IDS } from '../../state/v3/schema';
import type { GameResult, LevelParams } from './level';
import {
  STREAK_THRESHOLDS,
  SLOW_ROTATION_MAX,
  MASTER_MIN_COUNT,
  MASTER_MIN_GRID_SIZE,
  MASTER_MAX_ROTATION_SPEED,
  HIGH_LEVEL_ABSOLUTE,
  MID_LEVEL_RATIO,
  HIGH_LEVEL_RATIO,
} from './badgeDefinitions';

/**
 * バッジ判定に必要なゲーム完了コンテキスト。
 * 高難度は「今回クリアしたレベルの 5 変数」、高レベルは「最高到達レベル」、
 * 継続は「連続日数」を入力に取る（spec §6 / sprint-9 screens.md「判定の入力」）。
 */
export type BadgeContext = {
  /** 今回のゲーム結果（'clear' / 'fail'）。高難度バッジは clear のみ対象。 */
  result: GameResult;
  /** 今回挑戦したレベルの 5 変数の実値（GameRecord.levelParams）。 */
  levelParams: LevelParams;
  /** 更新後の最高到達レベル（LevelState.highestLevel）。 */
  highestLevel: number;
  /** 現在の有効レベル範囲の総レベル数（B-10/B-11 割合判定用）。 */
  totalLevels: number;
  /** 今回完了時点の連続日数（Streak.currentStreak）。 */
  currentStreak: number;
  /** 獲得日時（ISO 文字列）。テスト決定論のため注入可。既定は new Date()。 */
  now?: Date;
};

export type EvaluateBadgesResult = {
  /** 全 11 バッジの更新後ステータス（earned / earnedAt）。 */
  next: BadgeStatus[];
  /** 今回新たに獲得したバッジ ID（演出・音/ハプティクス用、表示順）。 */
  newlyEarned: BadgeId[];
};

/** B-08「達人の眼」の最難域条件をクリアしたレベルが満たすか（spec §6.2 / system §9.3）。 */
export function isMasterLevel(params: LevelParams): boolean {
  return (
    params.count >= MASTER_MIN_COUNT &&
    params.gridSize >= MASTER_MIN_GRID_SIZE &&
    params.direction === 'oscillate' &&
    params.rotationSpeed <= MASTER_MAX_ROTATION_SPEED
  );
}

/** B-10「熟達者」のしきい値レベル（総レベル数の 50%、切り上げ）。 */
export function midLevelThreshold(totalLevels: number): number {
  return Math.ceil(totalLevels * MID_LEVEL_RATIO);
}

/** B-11「頂を目指して」のしきい値レベル（総レベル数の 85%、切り上げ）。 */
export function highLevelThreshold(totalLevels: number): number {
  return Math.ceil(totalLevels * HIGH_LEVEL_RATIO);
}

/** 今回のコンテキストが各バッジの条件を満たすか（既獲得は考慮しない素の判定）。 */
export function meetsBadgeCondition(
  badgeId: BadgeId,
  ctx: BadgeContext,
): boolean {
  const { result, levelParams, highestLevel, totalLevels, currentStreak } = ctx;
  const cleared = result === 'clear';

  switch (badgeId) {
    // 継続日数軸（B-01〜B-05、Streak.currentStreak）。
    case 'B-01':
      return currentStreak >= STREAK_THRESHOLDS['B-01'];
    case 'B-02':
      return currentStreak >= STREAK_THRESHOLDS['B-02'];
    case 'B-03':
      return currentStreak >= STREAK_THRESHOLDS['B-03'];
    case 'B-04':
      return currentStreak >= STREAK_THRESHOLDS['B-04'];
    case 'B-05':
      return currentStreak >= STREAK_THRESHOLDS['B-05'];

    // 高難度到達軸（B-06〜B-08）。クリアしたレベルの levelParams のみで判定（spec §6.2）。
    case 'B-06':
      return cleared && levelParams.direction === 'oscillate';
    case 'B-07':
      return cleared && levelParams.rotationSpeed <= SLOW_ROTATION_MAX;
    case 'B-08':
      return cleared && isMasterLevel(levelParams);

    // 高レベル到達軸（B-09〜B-11、LevelState.highestLevel）。
    case 'B-09':
      return highestLevel >= HIGH_LEVEL_ABSOLUTE;
    case 'B-10':
      return highestLevel >= midLevelThreshold(totalLevels);
    case 'B-11':
      return highestLevel >= highLevelThreshold(totalLevels);

    default:
      return false;
  }
}

/**
 * 全 11 バッジの付与を判定する（spec §6.4）。
 *
 * @param ctx     ゲーム完了コンテキスト
 * @param current 現在の全バッジステータス（順不同可。欠けは未獲得とみなす）
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
