/**
 * gameMachine.ts — 変化検出ゲームの状態機械（spec F-01 / F-02 / F-04）。
 *
 * 描画に依存しない純粋な reducer + 初期化関数として実装する（S3 範囲）。
 * カウントダウン・タイマー・描画・✅/❌ オーバーレイの「見た目」は S4 が担う。
 * 本機械は「m 秒満了」「確定操作」「全問正解到達」を入力イベントとして受け、
 * 採点・結果開示フェーズ・次ラウンド進行・セッションスコア集計を駆動する。
 *
 * 採点 3 方式（ScoringMode）：
 * - auto-no-confirm（①）：TIMEOUT のみで採点。CONFIRM は無視。
 * - auto-confirm（②）：TIMEOUT または CONFIRM で採点。
 * - all-correct-advance（③）：選択が全問正解になった瞬間（TOGGLE 内）に採点、
 *   または TIMEOUT で強制採点。CONFIRM は無視。
 */

import { PatchDef } from './patch';
import {
  RoundScore,
  isAllCorrect,
  scoreRound,
  computeSessionScore,
} from './scoring';
import { RoundGenParams, generateRound } from './roundGen';
import { Rng } from './rng';
import type { ScoringMode } from '../../state/schema';

/** ラウンドのフェーズ。 */
export type RoundPhase =
  | 'playing' // 試行中（選択トグル可、正誤フィードバックなし）
  | 'revealed' // 採点済み・結果開示中（タップ無効）
  | 'session-complete'; // 全ラウンド完了

export type GameConfig = {
  gridSize: number;
  roundSeconds: number; // m
  roundCount: number; // r
  rotationSpeed: number; // a
  sfChangeSpeed: number; // b
  scoringMode: ScoringMode;
};

export type GameState = {
  config: GameConfig;
  /** 現在のラウンド番号（1..r） */
  roundIndex: number;
  phase: RoundPhase;
  /** 現在ラウンドのパッチ定義 */
  patches: PatchDef[];
  /** 選択中のパッチ index 集合 */
  selected: Set<number>;
  /** 採点済みなら現在ラウンドの採点結果（revealed フェーズで参照） */
  lastScore: RoundScore | null;
  /** これまで採点した全ラウンドの結果（セッションスコア集計用） */
  roundScores: RoundScore[];
  /**
   * 方式③で「全問正解により即遷移したか」のフラグ（S4 の開示時間差分用）。
   * revealed フェーズでのみ意味を持つ。
   */
  advancedByAllCorrect: boolean;
  /** セッション完了時の 0〜100 スコア（session-complete でのみ確定） */
  sessionScore: number | null;
};

export type GameEvent =
  | { type: 'TOGGLE'; index: number } // パッチのタップ（選択トグル）
  | { type: 'CONFIRM' } // 方式②の確定ボタン
  | { type: 'TIMEOUT' } // m 秒満了
  | { type: 'NEXT' }; // 結果開示後、次ラウンド/完了へ進む

function toParams(config: GameConfig): RoundGenParams {
  return {
    gridSize: config.gridSize,
    rotationSpeed: config.rotationSpeed,
    sfChangeSpeed: config.sfChangeSpeed,
  };
}

/** ゲーム開始（ラウンド 1 を生成し playing フェーズへ）。 */
export function initGame(config: GameConfig, rng: Rng): GameState {
  return {
    config,
    roundIndex: 1,
    phase: 'playing',
    patches: generateRound(rng, toParams(config)),
    selected: new Set<number>(),
    lastScore: null,
    roundScores: [],
    advancedByAllCorrect: false,
    sessionScore: null,
  };
}

/** 採点して revealed フェーズへ遷移した新 state を返す。 */
function reveal(
  state: GameState,
  advancedByAllCorrect: boolean,
): GameState {
  const score = scoreRound(state.patches, state.selected);
  return {
    ...state,
    phase: 'revealed',
    lastScore: score,
    roundScores: [...state.roundScores, score],
    advancedByAllCorrect,
  };
}

/** 次ラウンドへ進む。最終ラウンドならセッション完了に遷移する。 */
function advance(state: GameState, rng: Rng): GameState {
  const nextIndex = state.roundIndex + 1;
  if (nextIndex > state.config.roundCount) {
    return {
      ...state,
      phase: 'session-complete',
      sessionScore: computeSessionScore(state.roundScores),
    };
  }
  return {
    ...state,
    roundIndex: nextIndex,
    phase: 'playing',
    patches: generateRound(rng, toParams(state.config)),
    selected: new Set<number>(),
    lastScore: null,
    advancedByAllCorrect: false,
  };
}

/**
 * 状態遷移（純関数）。rng は次ラウンド生成のために注入する。
 *
 * 注意：方式③は TOGGLE 時点で全問正解になった瞬間に即採点・即 reveal する
 *（screens.md §2 方式③：m 秒を待たず次へ）。S4 はこの reveal を短い正解
 * フィードバック（advancedByAllCorrect=true）として 0.6 秒だけ表示し NEXT を送る。
 */
export function gameReducer(
  state: GameState,
  event: GameEvent,
  rng: Rng,
): GameState {
  switch (event.type) {
    case 'TOGGLE': {
      if (state.phase !== 'playing') return state; // 開示中・完了後は無効
      const selected = new Set(state.selected);
      if (selected.has(event.index)) selected.delete(event.index);
      else selected.add(event.index);
      const next = { ...state, selected };

      // 方式③：全問正解に到達した瞬間に即採点・即遷移（reveal）。
      if (
        state.config.scoringMode === 'all-correct-advance' &&
        isAllCorrect(state.patches, selected)
      ) {
        return reveal(next, true);
      }
      return next;
    }

    case 'CONFIRM': {
      // 方式②のみ有効。①③では確定ボタンが存在しないため無視。
      if (state.phase !== 'playing') return state;
      if (state.config.scoringMode !== 'auto-confirm') return state;
      return reveal(state, false);
    }

    case 'TIMEOUT': {
      // 全方式共通：m 秒満了で採点（未選択でも採点、TP=0/FP=0）。
      if (state.phase !== 'playing') return state;
      return reveal(state, false);
    }

    case 'NEXT': {
      // 結果開示後の進行。playing/complete では無視。
      if (state.phase !== 'revealed') return state;
      return advance(state, rng);
    }

    default:
      return state;
  }
}
