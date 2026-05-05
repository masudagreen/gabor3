/**
 * バッジ判定ロジック（spec.md §9.3 / screens.md S6-02 / S6-03）。
 *
 * 8 種類のバッジ：
 *   - B-01 はじめの一歩：初回コース完了
 *   - B-02 三日坊主突破：3 日連続コース完了
 *   - B-03 一週間の習慣：7 日連続コース完了
 *   - B-04 一ヶ月の継続：30 日連続コース完了
 *   - B-05 100 試行：累計 100 試行達成（全ゲーム合算）
 *   - B-06 視野ハンター：Game 3 で V1 スコア 80 以上（screens.md：Game 3 ベスト 80 点以上）
 *   - B-07 弁別の達人：Game 2 で V1 スコア 80 以上
 *   - B-08 全方位改善：3 ゲームすべて先週比スコア上昇
 *
 * 純関数。永続化は呼び出し側に任せる。判定タイミング：
 *   - コース完了時：B-01 / B-02 / B-03 / B-04 / B-05 / B-06 / B-07 / B-08
 *   - 単体プレイ完了時：B-05 / B-06 / B-07
 *   - オンボーディング完了時：（B-01 はコース完了時に発火させる、screens.md「初回コース完了」が原典）
 */
import {
  BadgeId,
  BadgeStatus,
  ALL_BADGE_IDS,
  DailyStats,
  Streak,
} from '../state/storage';
import { game2Score, game3Score } from './v1score';
import { formatDateLocal } from './weeklyStats';

export type BadgeCheckContext = {
  /** 現在のストリーク（コース完了済みなら lastCompletedDate=今日） */
  streak: Streak;
  /** 累計試行数（trialCount 合算 or TrialRecord 件数） */
  totalTrialCount: number;
  /** 全 DailyStats（古い→新しい順は問わない） */
  allDailyStats: DailyStats[];
  /** 当日（YYYY-MM-DD）。テスト容易性のため注入可 */
  today: Date;
};

/**
 * 各バッジの「現時点で獲得条件を満たしているか」を判定する純関数。
 *
 * @param badgeId 判定対象バッジ
 * @param ctx 判定コンテキスト
 * @returns true なら獲得条件達成。既に earned=true でも true を返す（呼び出し側で earned 状態を見て分岐）
 */
export function checkBadgeCondition(
  badgeId: BadgeId,
  ctx: BadgeCheckContext,
): boolean {
  switch (badgeId) {
    case 'B-01':
      // 初回コース完了：DailyStats のいずれかで courseCompleted=true
      return ctx.allDailyStats.some((s) => s.courseCompleted);
    case 'B-02':
      return ctx.streak.currentStreak >= 3;
    case 'B-03':
      return ctx.streak.currentStreak >= 7;
    case 'B-04':
      return ctx.streak.currentStreak >= 30;
    case 'B-05':
      return ctx.totalTrialCount >= 100;
    case 'B-06':
      return bestGameScore('game3', ctx.allDailyStats) >= 80;
    case 'B-07':
      return bestGameScore('game2', ctx.allDailyStats) >= 80;
    case 'B-08':
      return checkAllImprovingStatus(ctx.allDailyStats, ctx.today)
        .improvingCount === 3;
  }
}

/**
 * 1 回の判定サイクルで全 8 バッジをチェックし、新たに獲得したバッジ ID を返す。
 *
 * 既に earned=true のバッジは「再獲得」しない（演出は 1 度だけ、F-14）。
 *
 * @param current 現在の BadgeStatus 全件
 * @param ctx 判定コンテキスト
 * @returns
 *   - next: 更新後の BadgeStatus 全件
 *   - newlyEarned: 今回新たに earned=true になったバッジ ID 配列
 */
export function evaluateBadges(
  current: BadgeStatus[],
  ctx: BadgeCheckContext,
): { next: BadgeStatus[]; newlyEarned: BadgeId[] } {
  const earnedAt = ctx.today.toISOString();
  const byId = new Map<BadgeId, BadgeStatus>();
  for (const b of current) byId.set(b.badgeId, b);
  const newlyEarned: BadgeId[] = [];
  const next: BadgeStatus[] = ALL_BADGE_IDS.map((id) => {
    const existing = byId.get(id) ?? {
      badgeId: id,
      earned: false,
      earnedAt: null,
    };
    if (existing.earned) return existing;
    if (checkBadgeCondition(id, ctx)) {
      newlyEarned.push(id);
      return { badgeId: id, earned: true, earnedAt };
    }
    return existing;
  });
  return { next, newlyEarned };
}

/**
 * ゲーム別の「過去全期間のベストスコア（0-100）」を返す。
 * DailyStats.gameNBestThreshold は閾値（小さい方が良い）。各日の閾値からスコアを算出し、最大を取る。
 */
function bestGameScore(
  gameId: 'game1' | 'game2' | 'game3',
  stats: DailyStats[],
): number {
  let max = 0;
  for (const s of stats) {
    const t =
      gameId === 'game1'
        ? s.game1BestThreshold
        : gameId === 'game2'
          ? s.game2BestThreshold
          : s.game3BestThreshold;
    if (t == null) continue;
    const score =
      gameId === 'game2'
        ? game2Score(t)
        : gameId === 'game3'
          ? game3Score(t)
          : 0; // game1 は B-06/B-07 では使わない
    if (score > max) max = score;
  }
  return max;
}

// ---------------------------------------------------------------------------
// B-08 全方位改善：3 ゲームの先週比改善判定（screens.md S6-03 §4）
// ---------------------------------------------------------------------------

export type GameImprovementStatus =
  | 'improving' // 過去 7 日平均が前 7 日平均より閾値が小さい（=改善）
  | 'flat-or-worse' // 横ばい or 悪化
  | 'insufficient-data'; // データ不足（過去 14 日に十分な記録なし）

export type AllImprovingStatus = {
  game1: GameImprovementStatus;
  game2: GameImprovementStatus;
  game3: GameImprovementStatus;
  /** improving の数（0〜3） */
  improvingCount: number;
  /** insufficient-data 含むかどうか */
  hasInsufficientData: boolean;
  /** insufficient-data のゲームに必要な追加日数の概算（最大値） */
  insufficientDaysShort: number;
};

/**
 * 「先週比で改善中」の判定（screens.md S6-03 §4）。
 *
 * - 過去 7 日（today-6 〜 today）の平均閾値 vs 前 7 日（today-13 〜 today-7）の平均閾値
 * - 閾値が小さくなった（角度差が縮まった）= 改善
 * - データ不足（両期間とも 1 日も記録が無い、もしくは片側 0 日）はカウントから除外
 *
 * 「ゲーム別の現在の状態」を表示するため、各ゲームの改善状態を返す。
 */
export function checkAllImprovingStatus(
  stats: DailyStats[],
  today: Date,
): AllImprovingStatus {
  const game1 = checkOneGameImproving('game1', stats, today);
  const game2 = checkOneGameImproving('game2', stats, today);
  const game3 = checkOneGameImproving('game3', stats, today);
  const improvingCount =
    (game1.status === 'improving' ? 1 : 0) +
    (game2.status === 'improving' ? 1 : 0) +
    (game3.status === 'improving' ? 1 : 0);
  const hasInsufficientData =
    game1.status === 'insufficient-data' ||
    game2.status === 'insufficient-data' ||
    game3.status === 'insufficient-data';
  const insufficientDaysShort = Math.max(
    game1.daysShort,
    game2.daysShort,
    game3.daysShort,
  );
  return {
    game1: game1.status,
    game2: game2.status,
    game3: game3.status,
    improvingCount,
    hasInsufficientData,
    insufficientDaysShort,
  };
}

type SingleImprovementResult = {
  status: GameImprovementStatus;
  /** insufficient-data のとき、足りない日数の概算（両期間合計で最低 4 日想定） */
  daysShort: number;
};

function checkOneGameImproving(
  gameId: 'game1' | 'game2' | 'game3',
  stats: DailyStats[],
  today: Date,
): SingleImprovementResult {
  const recent7 = collectThresholds(gameId, stats, today, 0, 6);
  const prev7 = collectThresholds(gameId, stats, today, 7, 13);
  // データ不足の閾値：両期間とも 1 日以上記録があれば算出可。1 日未満の側があれば不足
  const MIN_DAYS_PER_PERIOD = 2; // 安定的な比較に必要な最低日数
  if (
    recent7.length < MIN_DAYS_PER_PERIOD ||
    prev7.length < MIN_DAYS_PER_PERIOD
  ) {
    const total = recent7.length + prev7.length;
    return {
      status: 'insufficient-data',
      daysShort: Math.max(0, MIN_DAYS_PER_PERIOD * 2 - total),
    };
  }
  const recentAvg =
    recent7.reduce((a, b) => a + b, 0) / recent7.length;
  const prevAvg = prev7.reduce((a, b) => a + b, 0) / prev7.length;
  // 閾値は小さい方が良い → recent < prev なら改善
  if (recentAvg < prevAvg) {
    return { status: 'improving', daysShort: 0 };
  }
  return { status: 'flat-or-worse', daysShort: 0 };
}

function collectThresholds(
  gameId: 'game1' | 'game2' | 'game3',
  stats: DailyStats[],
  today: Date,
  startBack: number,
  endBack: number,
): number[] {
  const out: number[] = [];
  const map = new Map<string, DailyStats>();
  for (const s of stats) map.set(s.date, s);
  for (let i = startBack; i <= endBack; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = formatDateLocal(d);
    const stat = map.get(key);
    if (!stat) continue;
    const t =
      gameId === 'game1'
        ? stat.game1BestThreshold
        : gameId === 'game2'
          ? stat.game2BestThreshold
          : stat.game3BestThreshold;
    if (t != null) out.push(t);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 各バッジの表示用メタ情報（screens.md S6-02 / S6-03）
// ---------------------------------------------------------------------------

export type BadgeMeta = {
  id: BadgeId;
  name: string;
  /** 獲得済時の説明（"7 日連続でコースを完了しました"） */
  earnedDescription: string;
  /** 未獲得時の獲得条件文（"7 日連続でコースを完了する"） */
  conditionText: string;
  /** バッジの絵文字（暫定、Sprint 7 以降で SVG イラストに差し替え可） */
  emoji: string;
};

export const BADGE_META: Record<BadgeId, BadgeMeta> = {
  'B-01': {
    id: 'B-01',
    name: 'はじめの一歩',
    earnedDescription: '初めてのおまかせコースを完了しました',
    conditionText: '初めてのおまかせコースを完了する',
    emoji: '🌱',
  },
  'B-02': {
    id: 'B-02',
    name: '三日坊主突破',
    earnedDescription: '3 日連続でコースを完了しました',
    conditionText: '3 日連続でコースを完了する',
    emoji: '🌿',
  },
  'B-03': {
    id: 'B-03',
    name: '一週間の習慣',
    earnedDescription: '7 日連続でコースを完了しました',
    conditionText: '7 日連続でコースを完了する',
    emoji: '📅',
  },
  'B-04': {
    id: 'B-04',
    name: '一ヶ月の継続',
    earnedDescription: '30 日連続でコースを完了しました',
    conditionText: '30 日連続でコースを完了する',
    emoji: '🏔',
  },
  'B-05': {
    id: 'B-05',
    name: '100 試行',
    earnedDescription: '累計 100 試行を達成しました',
    conditionText: '累計 100 試行を達成する',
    emoji: '💯',
  },
  'B-06': {
    id: 'B-06',
    name: '視野ハンター',
    earnedDescription: 'Game 3（周辺視野ハント）で 80 点以上を取りました',
    conditionText: 'Game 3（周辺視野ハント）で V1 スコア 80 点以上を取る',
    emoji: '🎯',
  },
  'B-07': {
    id: 'B-07',
    name: '弁別の達人',
    earnedDescription: 'Game 2（二重表裏判別）で 80 点以上を取りました',
    conditionText: 'Game 2（二重表裏判別）で V1 スコア 80 点以上を取る',
    emoji: '👁',
  },
  'B-08': {
    id: 'B-08',
    name: '全方位改善',
    earnedDescription: '3 ゲームすべてが先週比で改善中になりました',
    conditionText: '3 ゲームすべてで先週比のスコアが改善する',
    emoji: '📈',
  },
};

/**
 * 未獲得バッジの進捗ヒント文言を返す（screens.md S6-03 §4 表に従う）。
 */
export function buildBadgeHint(
  badgeId: BadgeId,
  ctx: BadgeCheckContext,
): string {
  switch (badgeId) {
    case 'B-01':
      return 'まだコース未完了です。「3 分コースを始める」から始めてみましょう';
    case 'B-02': {
      const remaining = Math.max(0, 3 - ctx.streak.currentStreak);
      return remaining === 0 ? 'まもなく獲得！' : `あと ${remaining} 日`;
    }
    case 'B-03': {
      const remaining = Math.max(0, 7 - ctx.streak.currentStreak);
      return remaining === 0 ? 'まもなく獲得！' : `あと ${remaining} 日`;
    }
    case 'B-04': {
      const remaining = Math.max(0, 30 - ctx.streak.currentStreak);
      return remaining === 0 ? 'まもなく獲得！' : `あと ${remaining} 日`;
    }
    case 'B-05':
      return `累計 ${ctx.totalTrialCount} 試行 / 100 試行`;
    case 'B-06': {
      const score = bestGameScore('game3', ctx.allDailyStats);
      const remaining = Math.max(0, 80 - Math.round(score));
      return `Game 3 ベスト ${Math.round(score)} 点 / あと ${remaining} 点`;
    }
    case 'B-07': {
      const score = bestGameScore('game2', ctx.allDailyStats);
      const remaining = Math.max(0, 80 - Math.round(score));
      return `Game 2 ベスト ${Math.round(score)} 点 / あと ${remaining} 点`;
    }
    case 'B-08': {
      const status = checkAllImprovingStatus(ctx.allDailyStats, ctx.today);
      if (status.hasInsufficientData) {
        return `データがもう少し必要です（残り ${status.insufficientDaysShort} 日分）`;
      }
      if (status.improvingCount === 0) {
        return '現在改善中のゲームはまだありません';
      }
      return `3 ゲーム中 ${status.improvingCount} ゲームが先週比で改善中`;
    }
  }
}
