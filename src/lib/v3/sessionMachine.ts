/**
 * sessionMachine.ts — v3.1 セッション統括ロジック（純関数、spec §4.6 / §4.4 / F-01 / F-04 / F-07）。
 *
 * v3.1：1 セッション = `sessionMinutes`×60 秒を超えるまでラウンドを反復（AS-22）。
 * 本モジュールは「セッション = ラウンド列」の進行を**描画・永続化・タイマー実体に依存しない
 * 純データ／純関数**として表現する（UI 配線・記録 I/O は state 層 / v3.1-B）。
 *
 * 責務：
 * - セッション開始（開始レベル・設定時間を固定）。
 * - 各ラウンド完了時に：
 *   1. レベル昇降を即適用（§4.4 applyResult。連続失敗カウント・currentLevel は永続前提で連続更新）。
 *   2. 累積経過時間を更新（各ラウンドの実プレイ秒数の合計。3 秒開示は算入しない＝予測可能性、§4.6）。
 *   3. 集計（ラウンド数・クリア/失敗数・到達最高レベル・クリア最高レベル）を更新。
 *   4. 累積 < sessionMinutes×60 なら継続（更新後レベルで次ラウンド）、到達/超過なら終了。
 * - 中断（F-07 / AS-30）：進行中の未完ラウンドは破棄（applySession を呼ばない）。
 *   完了済みラウンドの集計・レベル変化はそのまま保持される（巻き戻さない）。
 *
 * 永続化（LevelState / SessionRecord / DailyStats / Streak / PlayStats）は
 * state/v3/sessionRecorder.ts が本モジュールの出力を入力に行う。
 */

import {
  applyResult,
  levelToParams,
  type GameResult,
  type LevelParams,
  type LevelState,
  type LevelDelta,
  type VariableRanges,
  type VariableKey,
} from './level';

/** セッションの集計（記録粒度＝セッション、spec §7.4）。 */
export type SessionTotals = {
  /** 完了したラウンド数。 */
  roundCount: number;
  /** クリアしたラウンド数。 */
  clearCount: number;
  /** 失敗したラウンド数。 */
  failCount: number;
  /** そのセッションで挑戦した最高レベル（クリア/失敗問わず到達した最大の currentLevel）。 */
  highestLevelInSession: number;
  /** そのセッションでクリアした最高レベル（DailyStats.highestLevelReached 用。クリア 0 件なら 0）。 */
  highestClearedLevel: number;
  /**
   * このセッションでクリアした各ラウンドのレベル 5 変数（高難度バッジ B-06/07/08 判定用、§6.2）。
   * SessionRecord には永続化しない（バッジ判定はセッション末に本配列で行う、§7.4）。
   */
  clearedLevelParams: LevelParams[];
};

/** セッション状態（純データ）。 */
export type SessionState = {
  /** セッション開始時のレベル（SessionRecord.startLevel）。 */
  startLevel: number;
  /** 現在のレベル進行状態（ラウンドごとに連続更新）。 */
  levelState: LevelState;
  /** 適用された設定時間（分）。 */
  sessionMinutes: number;
  /** セッション制限（秒）= sessionMinutes×60。 */
  limitSec: number;
  /** これまでに完了したラウンドの実プレイ秒数の累積（3 秒開示は含めない）。 */
  elapsedSec: number;
  /** 集計（ラウンド数・クリア/失敗・到達最高）。 */
  totals: SessionTotals;
  /** セッションが終了したか（累積が limitSec 以上に達したラウンド完了後 true）。 */
  finished: boolean;
};

/** 範囲・変化順（applyResult のクランプ用）。未指定はフル範囲・デフォルト順。 */
export type SessionLevelConfig = {
  ranges?: VariableRanges;
  order?: readonly VariableKey[];
};

/**
 * セッションを開始する（spec §4.6）。
 *
 * @param startLevelState 開始時の LevelState（前セッションから引き継いだ永続値）。
 * @param sessionMinutes  設定時間（分）。1〜15 想定（呼び出し側で sanitize 済み前提）。
 */
export function startSession(
  startLevelState: LevelState,
  sessionMinutes: number,
): SessionState {
  return {
    startLevel: startLevelState.currentLevel,
    levelState: startLevelState,
    sessionMinutes,
    limitSec: sessionMinutes * 60,
    elapsedSec: 0,
    totals: {
      roundCount: 0,
      clearCount: 0,
      failCount: 0,
      highestLevelInSession: startLevelState.currentLevel,
      highestClearedLevel: 0,
      clearedLevelParams: [],
    },
    finished: false,
  };
}

/** completeRound の戻り値。 */
export type CompleteRoundOutcome = {
  /** ラウンド完了後の新しいセッション状態（次ラウンドは next.levelState.currentLevel で生成）。 */
  session: SessionState;
  /** このラウンドによるレベル変化（+1 / 0 / -1）。UI 告知用。 */
  levelDelta: LevelDelta;
  /** このラウンドで挑戦したレベル番号（記録・告知用）。 */
  playedLevel: number;
};

/**
 * 1 ラウンドの完了（締切判定済み）をセッションに反映する（spec §4.4 / §4.6）。
 *
 * - レベル昇降を即適用（applyResult）。連続失敗カウント・currentLevel を連続更新（§4.4）。
 * - 累積経過に**そのラウンドの実プレイ秒数**を加算（3 秒開示は算入しない）。
 * - 集計（ラウンド数・クリア/失敗・到達最高・クリア最高）を更新。
 * - 加算後の累積が limitSec 以上なら finished=true（このラウンドが最後＝完走、§4.6）。
 *
 * 純関数。引数 session は変更しない。中断時（未完ラウンド）は本関数を呼ばない（F-07）。
 *
 * @param session     現在のセッション状態（finished=false 前提。finished 後の呼び出しは無視）。
 * @param result      そのラウンドの締切判定（'clear' / 'fail'）。
 * @param roundPlaySec そのラウンドの実プレイ秒数（= 挑戦レベルの seconds）。
 * @param levelConfig 範囲・変化順（applyResult のクランプ用）。
 */
export function completeRound(
  session: SessionState,
  result: GameResult,
  roundPlaySec: number,
  levelConfig: SessionLevelConfig = {},
): CompleteRoundOutcome {
  if (session.finished) {
    // セッション終了後の余分な完了は無視（冪等）。レベル変化なし。
    return { session, levelDelta: 0, playedLevel: session.levelState.currentLevel };
  }

  const playedLevel = session.levelState.currentLevel;
  const { levelState: nextLevelState, levelDelta } = applyResult(
    session.levelState,
    result,
    levelConfig.ranges,
    levelConfig.order,
  );

  const cleared = result === 'clear';
  const elapsedSec = session.elapsedSec + roundPlaySec;
  const clearedLevelParams = cleared
    ? [
        ...session.totals.clearedLevelParams,
        levelToParams(playedLevel, levelConfig.order, levelConfig.ranges),
      ]
    : session.totals.clearedLevelParams;
  const totals: SessionTotals = {
    roundCount: session.totals.roundCount + 1,
    clearCount: session.totals.clearCount + (cleared ? 1 : 0),
    failCount: session.totals.failCount + (cleared ? 0 : 1),
    highestLevelInSession: Math.max(
      session.totals.highestLevelInSession,
      playedLevel,
    ),
    highestClearedLevel: cleared
      ? Math.max(session.totals.highestClearedLevel, playedLevel)
      : session.totals.highestClearedLevel,
    clearedLevelParams,
  };

  return {
    session: {
      ...session,
      levelState: nextLevelState,
      elapsedSec,
      totals,
      // 完走後に累積が制限以上ならセッション終了（最後のラウンドは打ち切らず完走済み、§4.6）。
      finished: elapsedSec >= session.limitSec,
    },
    levelDelta,
    playedLevel,
  };
}

/**
 * 次のラウンドを開始すべきか（spec §4.6 ステップ 5）。
 * セッション終了フラグが立っていない（= 累積 < limitSec）間は true。
 *
 * 純関数。`completeRound` が finished を設定するため、本関数は `!finished` を返すだけ。
 */
export function shouldContinue(session: SessionState): boolean {
  return !session.finished;
}

/**
 * 中断時のセッション要約を確定する（F-07 / AS-30）。
 *
 * 進行中の未完ラウンドは completeRound を呼ばず破棄するため、本関数は呼び出し時点の
 * 集計（完了済みラウンドのみ）をそのまま返す。完了済みラウンドのレベル変化は session.levelState
 * に既に反映済み（永続保持）。
 *
 * @returns 完了済みラウンドが 1 つ以上あるか（SessionRecord を記録すべきか、§7.4）。
 */
export function hasCompletedRounds(session: SessionState): boolean {
  return session.totals.roundCount > 0;
}
