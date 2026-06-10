/**
 * sessionFlow.ts — v3.1 セッションフローの I/O 配線（§4.4 / §4.6 / F-04 / F-07 / F-08）。
 *
 * sessionMachine（純ロジック）と repository / sessionRecorder（永続化）を結ぶ：
 *  - resolveCompletedRound：1 ラウンド締切（clear/fail）ごとに completeRound を適用し、
 *    更新後 LevelState を `gaboreye:v3:levelState` に**即永続化**（連続失敗・currentLevel が
 *    ラウンド/セッション/再起動跨ぎで保持される＝F-04）。記録（SessionRecord）はまだ書かない。
 *  - finalizeSession：セッション終了（または完了済みラウンドありの中断）時に SessionRecord・
 *    DailyStats・Streak・PlayStats・バッジを永続化（§7.4〜§7.8、F-08）。
 *  - abortSession：完了済みラウンドが 1 つ以上あれば finalizeSession を呼ぶ。0 件なら何も記録
 *    しない（未完ラウンドは破棄、レベル変化はラウンド完了時に既に永続済みのため保持される、AS-30）。
 *
 * 中断時に「進行中の未完ラウンド」は resolveCompletedRound を呼ばないことで破棄される
 * （UI 層が締切前の中断では本関数を呼ばない＝F-07）。
 */

import {
  completeRound,
  type SessionState,
  type SessionLevelConfig,
} from '../../lib/v3/sessionMachine';
import { hasCompletedRounds } from '../../lib/v3/sessionMachine';
import type { GameResult, LevelDelta } from '../../lib/v3/level';
import { saveLevelState } from './repository';
import {
  recordCompletedSession,
  type RecordCompletedSessionResult,
} from './sessionRecorder';

export type ResolveRoundInput = {
  /** 現在のセッション状態（startSession / 前ラウンドの出力）。 */
  session: SessionState;
  /** そのラウンドの締切判定（clear/fail）。 */
  result: GameResult;
  /** そのラウンドの実プレイ秒数（= 挑戦レベルの seconds）。 */
  roundPlaySec: number;
  /** 範囲・変化順（applyResult のクランプ用）。未指定はフル範囲・デフォルト順。 */
  levelConfig?: SessionLevelConfig;
};

export type ResolveRoundOutcome = {
  /** ラウンド完了後の新しいセッション状態（次ラウンドは session.levelState.currentLevel で生成）。 */
  session: SessionState;
  /** このラウンドによるレベル変化（+1 / 0 / -1）。LD 告知用。 */
  levelDelta: LevelDelta;
  /** このラウンドで挑戦したレベル番号。 */
  playedLevel: number;
  /** セッションを継続すべきか（false なら finalizeSession へ）。 */
  shouldContinue: boolean;
};

/**
 * 1 ラウンド締切（clear/fail）を解決する（§4.4 即昇降 + LevelState 永続）。
 * SessionRecord はまだ書かない（セッション末に finalizeSession でまとめて記録）。
 */
export async function resolveCompletedRound(
  input: ResolveRoundInput,
): Promise<ResolveRoundOutcome> {
  const { session, levelDelta, playedLevel } = completeRound(
    input.session,
    input.result,
    input.roundPlaySec,
    input.levelConfig,
  );

  // 各ラウンド完了で LevelState を即永続化（再起動跨ぎの連続失敗・現在レベル保持＝F-04）。
  await saveLevelState(session.levelState);

  return {
    session,
    levelDelta,
    playedLevel,
    shouldContinue: !session.finished,
  };
}

export type FinalizeSessionInput = {
  /** 終了（または中断確定）したセッション状態。 */
  session: SessionState;
  /** セッション ID（uuid 等）。 */
  sessionId: string;
  /** セッション開始日時（ISO 文字列）。 */
  startedAt: string;
  /** 範囲・変化順（バッジ総レベル数算出用）。未指定はフル範囲・デフォルト順。 */
  levelConfig?: SessionLevelConfig;
  /** 完了日時（テスト決定論のため注入可）。 */
  now?: Date;
};

/**
 * セッションを確定記録する（§7.4〜§7.8 / F-08）。SessionRecord・日次・ストリーク・累計・バッジを永続化。
 * 完了済みラウンドが 1 つ以上あること（hasCompletedRounds）を前提に呼ぶ。
 */
export async function finalizeSession(
  input: FinalizeSessionInput,
): Promise<RecordCompletedSessionResult> {
  const { session } = input;
  return recordCompletedSession({
    sessionId: input.sessionId,
    startedAt: input.startedAt,
    sessionMinutes: session.sessionMinutes,
    roundCount: session.totals.roundCount,
    clearCount: session.totals.clearCount,
    failCount: session.totals.failCount,
    startLevel: session.startLevel,
    endLevel: session.levelState.currentLevel,
    highestLevelInSession: session.totals.highestLevelInSession,
    // パッチ視認時間（完了済みラウンドの実プレイ秒数合計）。累計ゲーム時間の集計元。
    playSec: session.elapsedSec,
    highestClearedLevel: session.totals.highestClearedLevel,
    clearedLevelParams: session.totals.clearedLevelParams,
    highestLevel: session.levelState.highestLevel,
    ranges: input.levelConfig?.ranges,
    order: input.levelConfig?.order,
    now: input.now,
  });
}

/**
 * セッション中断（F-07 / AS-30）を解決する。
 * - 完了済みラウンドが 1 つ以上 → finalizeSession（その時点までを記録、§7.4）。
 * - 完了済みラウンドが 0 件 → 何も記録しない（SessionRecord を作らない）。
 *   いずれの場合も、完了済みラウンドのレベル変化は resolveCompletedRound で既に永続済みのため保持。
 *
 * @returns 記録した場合は RecordCompletedSessionResult、未記録なら null。
 */
export async function abortSession(
  input: FinalizeSessionInput,
): Promise<RecordCompletedSessionResult | null> {
  if (!hasCompletedRounds(input.session)) {
    return null;
  }
  return finalizeSession(input);
}
