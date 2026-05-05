/**
 * v1.1 staircase ロジック（spec-v11.md §F-09、§6.3）。
 *
 * v1 の `src/lib/staircase.ts`（試行内 3-down/1-up + 6 reversal 平均）とは
 * **別物**。v1.1 はセッション間 staircase で、以下のルールで動く：
 *
 *   - 1 セッション = 1 試行 = 1 結果
 *   - 連続 3 セッション正解で次回パラメータが 1 step **難方向**へ動く
 *   - 1 セッション不正解で次回パラメータが 1 step **易方向**へ動く
 *   - パラメータは min/max でクランプ
 *   - 閾値は **直近 5 セッションのパラメータ平均値**（5 セッション未満なら全件平均）
 *
 * 「難方向」と「易方向」の向きはゲームによって異なるため、`paramRange` の
 * `min`（易しい端）と `max`（難しい端）の定義に従って解釈する。たとえば
 * G-04 コントラスト弁別では「コントラスト差 0.05（min、難）〜 0.30（max、易）」
 * のため、難方向は値を**減らす**方向となる。
 *
 * 本モジュールでは `paramRange.min` を「難しい端」、`paramRange.max` を
 * 「易しい端」として一元管理する設計に統一する。これは gameRegistry の
 * `paramRange` 定義と整合する：
 *
 *   - G-01：min=1（難・小角度差） / max=10（易・大角度差）
 *   - G-04：min=0.05（難・低差） / max=0.30（易・大差）
 *   - G-13：min=0.03（難・低コントラスト） / max=0.30（易・高コントラスト）
 *
 * → 全ゲーム共通で「**正解で min 方向（難）、不正解で max 方向（易）**」。
 *
 * 状態の永続化は `state/storage-v11.ts` の `loadStaircaseV11` /
 * `saveStaircaseV11` で行う（gameId 単位の独立キー）。
 */

import { GameIdV11 } from '../../state/gameIds-v11';
import { GAME_REGISTRY, ParamRange } from '../../state/gameRegistry';

/** spec-v11.md §9.1 `StaircaseState` v1.1 */
export type StaircaseStateV11 = {
  gameId: GameIdV11;
  /** 次回プレイ時に使う難易度パラメータ値（クランプ済み） */
  currentParam: number;
  /** 連続正解数（3 で難化トリガー → 0 にリセット） */
  consecutiveCorrect: number;
  /**
   * 直近 5 セッションのパラメータ値。最新が末尾。
   * 閾値推定：このリストの算術平均（5 件未満なら全件）
   */
  recentResults: number[];
  /** ISO 8601 文字列、最終更新日時 */
  updatedAt: string;
};

/** 1 セッションの採点結果 */
export type SessionOutcomeV11 = 'correct' | 'incorrect';

/** ゲーム ID から paramRange を引く（gameRegistry 由来）。 */
function paramRangeFor(gameId: GameIdV11): ParamRange {
  const def = GAME_REGISTRY.find((g) => g.gameId === gameId);
  if (!def) {
    throw new Error(`Unknown gameId: ${gameId}`);
  }
  return def.paramRange;
}

/** 初期 staircase 状態を生成する。 */
export function createStaircaseV11(
  gameId: GameIdV11,
  now: () => string = () => new Date().toISOString(),
): StaircaseStateV11 {
  const range = paramRangeFor(gameId);
  return {
    gameId,
    currentParam: range.initial,
    consecutiveCorrect: 0,
    recentResults: [],
    updatedAt: now(),
  };
}

/**
 * 1 セッションの結果を staircase に適用し、次状態を返す。
 *
 * - correct: consecutiveCorrect++。3 になったら currentParam を 1 step 難方向
 *   （= min 方向）へ動かし、consecutiveCorrect を 0 にリセット
 * - incorrect: 即座に currentParam を 1 step 易方向（= max 方向）へ動かし、
 *   consecutiveCorrect を 0 にリセット
 *
 * `recentResults` には**今回適用したセッションのパラメータ値**（適用前の
 * `state.currentParam`）を末尾に追加し、5 件を超えたら先頭から落とす。
 *
 * クランプ：[paramRange.min, paramRange.max] の範囲を超えたら端で止める。
 */
export function applySessionResultV11(
  state: StaircaseStateV11,
  outcome: SessionOutcomeV11,
  now: () => string = () => new Date().toISOString(),
): StaircaseStateV11 {
  const range = paramRangeFor(state.gameId);
  const playedParam = state.currentParam;

  let consecutiveCorrect: number;
  let nextParam = state.currentParam;

  if (outcome === 'correct') {
    consecutiveCorrect = state.consecutiveCorrect + 1;
    if (consecutiveCorrect >= 3) {
      // 3 連続正解 → 難方向（min 方向）へ 1 step
      nextParam = clamp(state.currentParam - range.step, range.min, range.max);
      consecutiveCorrect = 0;
    }
  } else {
    // 不正解 → 易方向（max 方向）へ 1 step、consecutive リセット
    nextParam = clamp(state.currentParam + range.step, range.min, range.max);
    consecutiveCorrect = 0;
  }

  // recentResults は「実際にプレイした param」を記録する（次回のではなく今回の）。
  // これにより閾値推定は「直近 5 セッションで実際に出題された難度の平均」になる。
  const recent = [...state.recentResults, playedParam];
  if (recent.length > 5) {
    recent.splice(0, recent.length - 5);
  }

  return {
    gameId: state.gameId,
    currentParam: nextParam,
    consecutiveCorrect,
    recentResults: recent,
    updatedAt: now(),
  };
}

/**
 * 直近 5 セッションのパラメータ平均から閾値を推定する。
 *
 * - recentResults が空：fallback（呼び出し元で gameRegistry の initial を渡す）
 * - 1〜4 件：全件平均
 * - 5 件以上：最新 5 件の平均
 */
export function estimateThresholdV11(
  state: StaircaseStateV11,
  fallback?: number,
): number {
  const arr = state.recentResults;
  if (arr.length === 0) {
    if (typeof fallback === 'number') return fallback;
    return paramRangeFor(state.gameId).initial;
  }
  const window = arr.length > 5 ? arr.slice(-5) : arr;
  const sum = window.reduce((s, v) => s + v, 0);
  return sum / window.length;
}

/** 設定画面「staircase をリセット」用の純関数版リセット。 */
export function resetStaircaseStateV11(
  state: StaircaseStateV11,
  now: () => string = () => new Date().toISOString(),
): StaircaseStateV11 {
  return createStaircaseV11(state.gameId, now);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
