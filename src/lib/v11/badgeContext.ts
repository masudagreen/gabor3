/**
 * badgeContext — Sprint 19 / F-13 バッジ判定用 BadgeEvalContextV11 の組み立て。
 *
 * AsyncStorage から永続化済みデータをロードし、`evaluateBadgesV11` に渡す
 * `BadgeEvalContextV11` を構築する。本モジュールは副作用あり（永続化読込）。
 *
 * 集計の派生：
 *   - perGamePlayCount：全 SessionRecord から gameId 別のカウントを集計
 *   - perGameBestUpdatedCount：全 DailyStats の `gameBestThresholds` キーから「1 度でもベスト更新」を判定
 *     （本仕様では「過去のベスト閾値が記録されていればベスト更新あり」と簡略化）
 *   - fullCourseCompletions：SessionRecord の `sessionType=full-course` から抽出
 *   - totalTrialCount：SessionRecord の `gameResults` 件数合算（各セッション 13 試行想定）
 *
 * spec-v11.md §11 の名前空間内のキーから読み出す。
 */

import { GameIdV11 } from '../../state/gameIds-v11';
import {
  loadAllSessionRecordsV11,
  loadRecentDailyStatsV11,
  loadStreakV11,
  SessionRecordV11,
  StreakV11,
} from '../../state/storage-v11';
import {
  BadgeEvalContextV11,
  FullCourseCompletionV11,
} from './badges';
import { formatDateLocalV11 } from './streak';

/**
 * 全永続化データから BadgeEvalContextV11 を組み立てる。
 *
 * 直近 90 日の DailyStats を読み込む（B-08 14 日 / B-13 全期間ベスト更新を
 * カバーする幅。1 ヶ月分では B-04「30 日連続」が判定できないため 90 日を取る。
 * 1 セッション = 1KB 程度なので 90 件でも数十 KB に収まる）。
 *
 * @param now 判定基準時刻（テスト容易性のため注入可、デフォルト現在時刻）
 */
export async function buildBadgeContextV11(
  now: Date = new Date(),
): Promise<BadgeEvalContextV11> {
  const today = formatDateLocalV11(now);
  const [streak, allSessions, recentDailyStats] = await Promise.all([
    loadStreakV11(),
    loadAllSessionRecordsV11(),
    loadRecentDailyStatsV11(today, 90),
  ]);
  return composeBadgeContext({
    streak,
    allSessions,
    recentDailyStats,
    today,
    now,
  });
}

/**
 * 純関数版：永続化済みデータから BadgeEvalContextV11 を組み立てる（テスト容易）。
 */
export function composeBadgeContext(args: {
  streak: StreakV11;
  allSessions: ReadonlyArray<SessionRecordV11>;
  recentDailyStats: ReadonlyArray<{
    date: string;
    fullCourseCompleted: boolean;
    gameBestThresholds: Partial<Record<GameIdV11, number>>;
    wideScore: number | null;
    sessionCount: number;
  }>;
  today: string;
  now?: Date;
}): BadgeEvalContextV11 {
  const perGamePlayCount: Partial<Record<GameIdV11, number>> = {};
  const perGameBestUpdatedCount: Partial<Record<GameIdV11, number>> = {};
  const fullCourseCompletions: FullCourseCompletionV11[] = [];
  let totalTrialCount = 0;

  for (const session of args.allSessions) {
    for (const r of session.gameResults) {
      perGamePlayCount[r.gameId] = (perGamePlayCount[r.gameId] ?? 0) + 1;
      totalTrialCount += 1;
    }
    if (
      session.sessionType === 'full-course' &&
      session.completedAt != null
    ) {
      fullCourseCompletions.push({
        completedAt: session.completedAt,
        date: session.completedAt.split('T')[0],
      });
    }
  }

  for (const stats of args.recentDailyStats) {
    for (const id of Object.keys(stats.gameBestThresholds) as GameIdV11[]) {
      if (typeof stats.gameBestThresholds[id] === 'number') {
        perGameBestUpdatedCount[id] = (perGameBestUpdatedCount[id] ?? 0) + 1;
      }
    }
  }

  const nowIso = (args.now ?? new Date()).toISOString();
  return {
    streak: args.streak,
    totalTrialCount,
    allDailyStats: args.recentDailyStats.map((s) => ({
      date: s.date,
      fullCourseCompleted: s.fullCourseCompleted,
      gameBestThresholds: s.gameBestThresholds,
      wideScore: s.wideScore,
      sessionCount: s.sessionCount,
    })),
    perGamePlayCount,
    perGameBestUpdatedCount,
    fullCourseCompletions,
    today: args.today,
    now: nowIso,
  };
}
