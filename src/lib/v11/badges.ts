/**
 * badges (v1.1) — F-13 達成バッジ 13 種の判定エンジン（spec-v11.md §F-13 / §10）。
 *
 * 純関数。永続化は `state/storage-v11.ts` の load/save ヘルパーで行う。
 *
 * 13 バッジ：
 *   - B-01 はじめの一歩：初回フルコース完了
 *   - B-02 三日坊主突破：3 日連続フルコース完了
 *   - B-03 一週間の習慣：7 日連続フルコース完了
 *   - B-04 一ヶ月の継続：30 日連続フルコース完了
 *   - B-05 100 試行：累計 100 試行達成（全ゲーム合算）
 *   - B-06 視野ハンター：G-03 でワイドスコア 80 以上
 *   - B-07 弁別の達人：G-02 でワイドスコア 80 以上
 *   - B-08 全方位改善：enabled 全ゲームで前週比スコア上昇
 *   - B-09 探検家：enabled 全ゲームを 1 回以上プレイ
 *   - B-10 全制覇：enabled 全ゲームで 1 度はベスト更新
 *   - B-11 連続マスター：フルコース 14 日連続完了
 *   - B-12 夜更かし返上：22 時前にフルコース完了 7 日連続
 *   - B-13 コンプリート：enabled 全ゲームでワイドスコア 80 以上
 *
 * F-18 受け入れ基準：
 *   - 「`releaseEnabled=false` のゲームに依存するバッジ条件は当該ゲームを除外して評価」
 *   - B-06 / B-07：依存ゲーム単独 → そのゲームが disabled なら獲得不能（hint で明示）
 *   - B-08 / B-09 / B-10 / B-13：enabled 集合に対して評価（disabled は除外）
 *
 * 本モジュールは UI / AsyncStorage 非依存。判定タイミングは：
 *   - フルコース完了時：B-01〜B-04 / B-05 / B-08 / B-09 / B-10 / B-11 / B-12 / B-13
 *   - 単体プレイ完了時：B-05 / B-06 / B-07 / B-09 / B-10 / B-13
 *
 * 1 セッションでまとめて全バッジを再評価し、未獲得 → 獲得遷移を `newlyEarned` で返す。
 */

import { GameIdV11 } from '../../state/gameIds-v11';
import {
  DailyStatsV11,
  StreakV11,
} from '../../state/storage-v11';
import {
  ALL_BADGE_IDS_V11,
  BADGE_DEFINITIONS_V11,
  BadgeIdV11,
} from './badgeDefinitions';
import {
  getReleaseEnabledGameIds,
  getReleaseEnabledGameIdSet,
  isGameReleaseEnabled,
} from './releaseFilter';
import { wideScoreFromDailyBest } from './wideScore';

/**
 * バッジ判定結果：永続化される BadgeStatus。
 * spec-v11.md §9.1 `BadgeStatus`。
 */
export type BadgeStatusV11 = {
  badgeId: BadgeIdV11;
  earned: boolean;
  /** ISO 8601、未獲得なら null */
  earnedAt: string | null;
};

/** 未獲得 13 件の初期状態を作る（永続化されていない場合のデフォルト）。 */
export function createInitialBadgeStatusesV11(): BadgeStatusV11[] {
  return ALL_BADGE_IDS_V11.map((id) => ({
    badgeId: id,
    earned: false,
    earnedAt: null,
  }));
}

/**
 * 1 試行 = ゲーム ID + 完了日時（ISO 8601）。
 *
 * B-12「夜更かし返上」の判定で使用。フルコース完了時刻が 22 時前かをみる。
 * 「ゲーム単体」も含む全試行という意味ではなく、フルコース完了 1 件 = 1 行
 * （B-12 はフルコース完了の時刻評価のため）。
 */
export type FullCourseCompletionV11 = {
  /** ISO 8601 文字列（端末ローカル基準で判定する。spec §11） */
  completedAt: string;
  /** YYYY-MM-DD（端末ローカル）。日数判定用 */
  date: string;
};

/**
 * バッジ判定コンテキスト。
 *
 * - streak：current/longest streak（フルコース連続日数）
 * - totalTrialCount：全ゲーム合算の試行数
 * - allDailyStats：全 DailyStats（ベスト閾値・wideScore 等）
 * - perGamePlayCount：各ゲームの累計プレイ回数（B-09 探検家用）
 * - perGameBestUpdated：各ゲームで「ベスト閾値が更新された」回数（B-10 全制覇用、>= 1 回が条件）
 * - fullCourseCompletions：フルコース完了 1 件 = 1 行（B-12 用、completedAt 時刻判定）
 * - today：判定基準日（YYYY-MM-DD、端末ローカル）。テスト容易性のため注入
 * - now：判定基準時刻（ISO 8601）。`earnedAt` の付与に使う
 */
export type BadgeEvalContextV11 = {
  streak: StreakV11;
  totalTrialCount: number;
  allDailyStats: ReadonlyArray<DailyStatsV11>;
  perGamePlayCount: Partial<Record<GameIdV11, number>>;
  perGameBestUpdatedCount: Partial<Record<GameIdV11, number>>;
  fullCourseCompletions: ReadonlyArray<FullCourseCompletionV11>;
  /** YYYY-MM-DD */
  today: string;
  /** ISO 8601。未指定なら `${today}T00:00:00.000Z` */
  now?: string;
};

/**
 * 個別バッジの「現時点で獲得条件を満たしているか」を判定する純関数。
 *
 * F-18：依存ゲームが disabled なら必ず false（hint で明示）。
 *
 * 既に earned=true でもこの関数は条件達成なら true を返す（呼び出し側の
 * `evaluateBadgesV11` で earned 状態を見て分岐）。
 */
export function checkBadgeConditionV11(
  badgeId: BadgeIdV11,
  ctx: BadgeEvalContextV11,
): boolean {
  switch (badgeId) {
    case 'B-01':
      // 初回フルコース完了：DailyStats のいずれかで fullCourseCompleted=true
      return ctx.allDailyStats.some((s) => s.fullCourseCompleted);
    case 'B-02':
      return ctx.streak.currentStreak >= 3;
    case 'B-03':
      return ctx.streak.currentStreak >= 7;
    case 'B-04':
      return ctx.streak.currentStreak >= 30;
    case 'B-05':
      return ctx.totalTrialCount >= 100;
    case 'B-06':
      // G-03 単独依存：disabled なら獲得不能
      if (!isGameReleaseEnabled('G-03')) return false;
      return bestWideScoreForGame('G-03', ctx.allDailyStats) >= 80;
    case 'B-07':
      // G-02 単独依存：disabled なら獲得不能
      if (!isGameReleaseEnabled('G-02')) return false;
      return bestWideScoreForGame('G-02', ctx.allDailyStats) >= 80;
    case 'B-08':
      // enabled 全ゲームで前週比スコア上昇（disabled は除外集合で評価）
      return checkAllImproving(ctx.allDailyStats, ctx.today);
    case 'B-09': {
      // enabled 全ゲームを 1 回以上プレイ
      const enabledIds = getReleaseEnabledGameIds();
      if (enabledIds.length === 0) return false;
      return enabledIds.every(
        (id) => (ctx.perGamePlayCount[id] ?? 0) >= 1,
      );
    }
    case 'B-10': {
      // enabled 全ゲームで 1 度はベスト更新
      const enabledIds = getReleaseEnabledGameIds();
      if (enabledIds.length === 0) return false;
      return enabledIds.every(
        (id) => (ctx.perGameBestUpdatedCount[id] ?? 0) >= 1,
      );
    }
    case 'B-11':
      // フルコース 14 日連続
      return ctx.streak.currentStreak >= 14;
    case 'B-12':
      // 22 時前にフルコース完了 7 日連続
      return checkBeforeTenPmStreak(ctx.fullCourseCompletions) >= 7;
    case 'B-13': {
      // enabled 全ゲームでワイドスコア 80 以上
      const enabledIds = getReleaseEnabledGameIds();
      if (enabledIds.length === 0) return false;
      return enabledIds.every(
        (id) => bestWideScoreForGame(id, ctx.allDailyStats) >= 80,
      );
    }
  }
}

/**
 * 13 バッジを一括判定し、新たに獲得した ID を返す。
 *
 * @param current 現在の BadgeStatus 全件（13 件）。空配列なら全部未獲得とみなす
 * @param ctx 判定コンテキスト
 * @returns
 *   - next: 更新後の 13 件（獲得済みは earned=true、earnedAt セット）
 *   - newlyEarned: 今回新たに earned=true になった badgeId 配列（演出順）
 */
export function evaluateBadgesV11(
  current: ReadonlyArray<BadgeStatusV11>,
  ctx: BadgeEvalContextV11,
): { next: BadgeStatusV11[]; newlyEarned: BadgeIdV11[] } {
  const earnedAt = ctx.now ?? `${ctx.today}T00:00:00.000Z`;
  const byId = new Map<BadgeIdV11, BadgeStatusV11>();
  for (const b of current) byId.set(b.badgeId, b);
  const newlyEarned: BadgeIdV11[] = [];
  const next: BadgeStatusV11[] = ALL_BADGE_IDS_V11.map((id) => {
    const existing = byId.get(id) ?? {
      badgeId: id,
      earned: false,
      earnedAt: null,
    };
    if (existing.earned) return existing;
    if (checkBadgeConditionV11(id, ctx)) {
      newlyEarned.push(id);
      return { badgeId: id, earned: true, earnedAt };
    }
    return existing;
  });
  return { next, newlyEarned };
}

/**
 * 未獲得バッジ用のヒント文言（バッジ詳細モーダル / 一覧画面で表示）。
 *
 * F-18 反映：依存ゲームが disabled なら「現在 GXX は公開対象外のため取得できません」。
 *
 * @returns 進捗 / 助言の 1 行テキスト
 */
export function buildBadgeHintV11(
  badgeId: BadgeIdV11,
  ctx: BadgeEvalContextV11,
): string {
  const def = BADGE_DEFINITIONS_V11[badgeId];
  // F-18：単独依存ゲームが disabled なら専用文言
  if (def.dependsOnGameIds && def.dependsOnGameIds.length > 0) {
    const disabled = def.dependsOnGameIds.filter(
      (id) => !isGameReleaseEnabled(id),
    );
    if (disabled.length > 0) {
      return `現在 ${disabled.join(', ')} は公開対象外のため、このバッジは取得できません`;
    }
  }
  switch (badgeId) {
    case 'B-01':
      return 'まだフルコース未完了です。「全ゲーム連続プレイ」から始めてみましょう';
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
      const score = bestWideScoreForGame('G-03', ctx.allDailyStats);
      const remaining = Math.max(0, 80 - score);
      return `G-03 ベスト ${score} / あと ${remaining}`;
    }
    case 'B-07': {
      const score = bestWideScoreForGame('G-02', ctx.allDailyStats);
      const remaining = Math.max(0, 80 - score);
      return `G-02 ベスト ${score} / あと ${remaining}`;
    }
    case 'B-08': {
      const enabledIds = getReleaseEnabledGameIds();
      const improvingCount = enabledIds.filter((id) =>
        isOneGameImproving(id, ctx.allDailyStats, ctx.today),
      ).length;
      return `${enabledIds.length} ゲーム中 ${improvingCount} ゲームが先週比で改善中`;
    }
    case 'B-09': {
      const enabledIds = getReleaseEnabledGameIds();
      const played = enabledIds.filter(
        (id) => (ctx.perGamePlayCount[id] ?? 0) >= 1,
      ).length;
      return `${played} / ${enabledIds.length} ゲーム`;
    }
    case 'B-10': {
      const enabledIds = getReleaseEnabledGameIds();
      const updated = enabledIds.filter(
        (id) => (ctx.perGameBestUpdatedCount[id] ?? 0) >= 1,
      ).length;
      return `${updated} / ${enabledIds.length} ゲーム`;
    }
    case 'B-11': {
      const remaining = Math.max(0, 14 - ctx.streak.currentStreak);
      return remaining === 0 ? 'まもなく獲得！' : `あと ${remaining} 日`;
    }
    case 'B-12': {
      const days = checkBeforeTenPmStreak(ctx.fullCourseCompletions);
      const remaining = Math.max(0, 7 - days);
      return remaining === 0
        ? 'まもなく獲得！'
        : `22 時前完了 ${days} 日連続 / あと ${remaining} 日`;
    }
    case 'B-13': {
      const enabledIds = getReleaseEnabledGameIds();
      const reached = enabledIds.filter(
        (id) => bestWideScoreForGame(id, ctx.allDailyStats) >= 80,
      ).length;
      return `${reached} / ${enabledIds.length} ゲームで 80 達成`;
    }
  }
}

// ---------------------------------------------------------------------------
// 内部ヘルパ
// ---------------------------------------------------------------------------

/**
 * 指定ゲームの過去全期間の「最良ワイドスコア」を返す（0〜100 の整数）。
 *
 * DailyStats.gameBestThresholds[gameId] が記録されている全日のうち、
 * その閾値を `wideScoreFromDailyBest` で 0〜100 に正規化した最大値を返す。
 *
 * 1 ゲーム単独のスコア = 当該ゲームだけの集合に対する `wideScoreFromDailyBest`
 * （これは結果として `normalizeThreshold` 1 件の正規化と同等になる）。
 */
export function bestWideScoreForGame(
  gameId: GameIdV11,
  stats: ReadonlyArray<DailyStatsV11>,
): number {
  let best = 0;
  for (const s of stats) {
    const t = s.gameBestThresholds?.[gameId];
    if (typeof t !== 'number') continue;
    const score = wideScoreFromDailyBest({ [gameId]: t });
    if (typeof score === 'number' && score > best) best = score;
  }
  return best;
}

/**
 * 1 ゲームの「過去 7 日 vs 前 7 日」改善判定。
 *
 * spec §F-13 B-08：「enabled 全ゲームで前週比スコア上昇」。
 * 閾値の小さい方が良い（min を best とする規約）→ 過去 7 日平均 < 前 7 日平均なら改善。
 * データ不足（両期間とも 1 件以下）は不改善扱い（false）。
 */
export function isOneGameImproving(
  gameId: GameIdV11,
  stats: ReadonlyArray<DailyStatsV11>,
  todayDateStr: string,
): boolean {
  const map = new Map<string, DailyStatsV11>();
  for (const s of stats) map.set(s.date, s);
  const recent: number[] = [];
  const prev: number[] = [];
  for (let i = 0; i < 14; i++) {
    const dateStr = subDaysIsoLocal(todayDateStr, i);
    const stat = map.get(dateStr);
    if (!stat) continue;
    const t = stat.gameBestThresholds?.[gameId];
    if (typeof t !== 'number') continue;
    if (i < 7) recent.push(t);
    else prev.push(t);
  }
  if (recent.length === 0 || prev.length === 0) return false;
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const prevAvg = prev.reduce((a, b) => a + b, 0) / prev.length;
  return recentAvg < prevAvg;
}

/** 全 enabled ゲームで「先週比改善」しているか。enabled が 0 件なら false。 */
function checkAllImproving(
  stats: ReadonlyArray<DailyStatsV11>,
  todayDateStr: string,
): boolean {
  const enabledIds = getReleaseEnabledGameIds();
  if (enabledIds.length === 0) return false;
  return enabledIds.every((id) => isOneGameImproving(id, stats, todayDateStr));
}

/**
 * 「22 時前にフルコース完了」が連続している日数を返す（B-12）。
 *
 * - completions を `date` 降順にソート
 * - 今日からさかのぼって連続日付を辿る
 * - 各日付について completedAt の時刻 < 22:00（端末ローカル）を満たす完了が
 *   1 件以上あれば連続継続
 *
 * 戻り値：直近からの連続日数（0 以上）
 */
export function checkBeforeTenPmStreak(
  completions: ReadonlyArray<FullCourseCompletionV11>,
): number {
  if (completions.length === 0) return 0;
  // 日付ごとに「22 時前完了の有無」を集約
  const beforeTenMap = new Map<string, boolean>();
  for (const c of completions) {
    const hour = parseHour(c.completedAt);
    if (hour < 22) {
      beforeTenMap.set(c.date, true);
    } else if (!beforeTenMap.has(c.date)) {
      beforeTenMap.set(c.date, false);
    }
  }
  // 最新日から連続でカウント
  const dates = Array.from(beforeTenMap.keys()).sort().reverse();
  if (dates.length === 0) return 0;
  let streak = 0;
  let cursor = dates[0];
  for (const d of dates) {
    if (d !== cursor) break;
    if (!beforeTenMap.get(d)) break;
    streak += 1;
    cursor = subDaysIsoLocal(cursor, 1);
  }
  return streak;
}

/** ISO 8601 文字列のローカル時刻 hour を取得。失敗時は 23（評価で 22 時前ではないとみなす）。 */
function parseHour(iso: string): number {
  // ローカル時刻基準で hour を取る（spec §11 端末ローカル）
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return 23;
  return dt.getHours();
}

/** YYYY-MM-DD から N 日減算した YYYY-MM-DD（端末ローカル）。 */
function subDaysIsoLocal(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map((s) => parseInt(s, 10));
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - n);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

// ---------------------------------------------------------------------------
// テスト・進捗用ヘルパ（UI 側で使う）
// ---------------------------------------------------------------------------

/** 現時点で獲得済み件数（13 件中）。 */
export function countEarnedV11(
  statuses: ReadonlyArray<BadgeStatusV11>,
): number {
  return statuses.filter((s) => s.earned).length;
}

/** badgeId が release-enabled でない依存ゲームに「依存している」か。F-18 詳細モーダル用。 */
export function isBlockedByDisabledGame(badgeId: BadgeIdV11): boolean {
  const def = BADGE_DEFINITIONS_V11[badgeId];
  if (!def.dependsOnGameIds || def.dependsOnGameIds.length === 0) return false;
  const enabled = getReleaseEnabledGameIdSet();
  return def.dependsOnGameIds.some((id) => !enabled.has(id));
}
