/**
 * gameMachine.ts — v3.0 ゲーム機械（spec §4.3 / F-01 ロジック / F-03 判定）。
 *
 * v3.0 → v3.1 の本質的変更（spec §0 改訂 B / AS-24 / §4.3）：
 * - **全問正解での即時締め切りを廃止**。各ラウンドは「時間」秒だけ続き、
 *   **締切（TIMEOUT＝時間到達）時にのみクリア/失敗を判定**する（v2.0 自動採点①スタイルへ回帰）。
 *   TOGGLE はいくら全問正解に達しても締め切らない（注視時間を一定に保つ）。
 * - 1 ラウンド = 1 レベル挑戦。セッション（指定時間までのラウンド反復）の統括は
 *   lib/v3/sessionMachine.ts が担う（本機械は 1 ラウンドのみを駆動）。
 * - 採点 3 方式・部分点・0〜100 スコアは v3.0 で全廃済み。結果は clear/fail の 2 値。
 *
 * 描画に依存しない純粋な reducer + 初期化関数。カウントダウン UI・✅/❌ オーバーレイの
 * 「見た目」と t 秒の供給は UI 層（v3.1-B）。本機械は TOGGLE / TIMEOUT を入力イベントとして受け、
 * 締切判定・結果開示フェーズへの遷移を駆動する。
 *
 * クリア判定（§4.3）：締切時に回転パッチ集合と選択集合が過不足なく一致（誤選択 0 ∧ 選び逃し 0）。
 * - TIMEOUT → その時点の正誤で締め切り（全問正解なら clear、そうでなければ fail）。
 * - `isAllCorrect` は締切時の判定補助として残す（playing 中の即時締切トリガーには使わない）。
 */

import { PatchDef, isChanging } from './patch';
import {
  generateRound,
  generateRoundFromLevel,
  levelParamsToRoundGen,
  DEFAULT_COUNT_RANGE,
  type CountRangePreset,
} from './roundGen';
import type { LevelParams, GameResult } from './level';
import { Rng } from '../v2/rng';

/** ゲームのフェーズ。 */
export type GamePhase =
  | 'playing' // 試行中（選択トグル可、正誤フィードバックなし）
  | 'revealed'; // 締め切り済み・結果開示中（タップ無効）

/** ゲームの構成（現在レベルとその難易度変数）。 */
export type GameConfig = {
  /** 挑戦レベル番号（表示・記録用）。チュートリアルは 0。 */
  level: number;
  /** そのレベルの難易度変数の実値（levelToParams の結果）。 */
  params: LevelParams;
  /**
   * 【v3.2】本番の回転個数ランダム範囲プリセット（spec §4.9・AS-36）。
   * 未指定は既定。`fixedCount` が指定されている場合は無視される。
   */
  countRange?: CountRangePreset;
  /**
   * 【v3.2】回転個数を明示的に固定する（チュートリアル Lv0 用、spec §4.8）。
   * 指定時は countRange のランダム抽選より優先し、この個数で生成する（格子容量でクランプ）。
   */
  fixedCount?: number;
  /**
   * 【v3.2】個数を画面に明示するか（spec §4.8/§4.9）。
   * チュートリアル（Lv0）= true（「◯個探せ」）、本番 = false（「全て探せ」）。既定 false。
   */
  showCount?: boolean;
};

/** ゲーム状態（1 ゲーム = 1 レベル挑戦）。 */
export type GameState = {
  config: GameConfig;
  phase: GamePhase;
  /** 格子のパッチ定義。 */
  patches: PatchDef[];
  /** 選択中のパッチ index 集合。 */
  selected: Set<number>;
  /**
   * 締切後の結果（revealed フェーズでのみ非 null）。
   * 'clear' = 締切時に過不足なく選択 / 'fail' = 誤選択・選び逃し・時間切れ未選択。
   */
  result: GameResult | null;
};

/** 入力イベント。確定ボタン（v2 方式②）は v3 に存在しないため CONFIRM はない。 */
export type GameEvent =
  | { type: 'TOGGLE'; index: number } // パッチのタップ（選択トグル）
  | { type: 'TIMEOUT' }; // 制限時間（seconds）満了

/**
 * クリア判定（§4.3）：選択集合が回転パッチ集合と過不足なく一致するか。
 * 誤選択（静止を選んでいる）や選び逃し（回転を選んでいない）がある間は false。
 * 回転パッチが 1 つ以上あることが前提（レベルの count ≥ 1 で常に成立）。
 */
export function isAllCorrect(
  patches: readonly PatchDef[],
  selected: ReadonlySet<number>,
): boolean {
  let changingCount = 0;
  for (const patch of patches) {
    const picked = selected.has(patch.index);
    if (isChanging(patch)) {
      changingCount++;
      if (!picked) return false; // 選び逃し
    } else if (picked) {
      return false; // 誤選択
    }
  }
  return changingCount > 0;
}

/** 回転（変化）パッチの個数を数える（表示・読み上げ用、v3.2）。 */
export function countRotatingPatches(patches: readonly PatchDef[]): number {
  let n = 0;
  for (const patch of patches) if (isChanging(patch)) n++;
  return n;
}

/**
 * ゲーム開始（格子を生成し playing フェーズへ）。
 * v3.2：個数は `fixedCount`（チュートリアル）優先、なければ `countRange` からランダム抽選（§4.9）。
 */
export function initGame(config: GameConfig, rng: Rng): GameState {
  const patches =
    config.fixedCount != null
      ? generateRound(rng, levelParamsToRoundGen(config.params, config.fixedCount))
      : generateRoundFromLevel(
          rng,
          config.params,
          config.countRange ?? DEFAULT_COUNT_RANGE,
        );
  return {
    config,
    phase: 'playing',
    patches,
    selected: new Set<number>(),
    result: null,
  };
}

/** 締め切って revealed フェーズへ遷移した新 state を返す。 */
function close(state: GameState, result: GameResult): GameState {
  return {
    ...state,
    phase: 'revealed',
    result,
  };
}

/**
 * 状態遷移（純関数）。
 *
 * - TOGGLE：playing 中のみ選択をトグル。**全問正解に達しても締め切らない**（v3.1 / AS-24）。
 *   各ラウンドは必ず制限時間まで続く。
 * - TIMEOUT：playing 中のみ締め切り（§4.3 締切時判定）。全問正解（FP0∧FN0∧changing>0）なら
 *   clear、そうでなければ fail。未選択のまま時間切れも fail（選び逃し）。
 * - revealed 中の TOGGLE / TIMEOUT は無効（締切後の状態変更防止）。
 */
export function gameReducer(state: GameState, event: GameEvent): GameState {
  switch (event.type) {
    case 'TOGGLE': {
      if (state.phase !== 'playing') return state;
      const selected = new Set(state.selected);
      if (selected.has(event.index)) selected.delete(event.index);
      else selected.add(event.index);
      // v3.1：全問正解での即時締め切りは廃止。締切は TIMEOUT のみ（AS-24）。
      return { ...state, selected };
    }

    case 'TIMEOUT': {
      if (state.phase !== 'playing') return state;
      const result: GameResult = isAllCorrect(state.patches, state.selected)
        ? 'clear'
        : 'fail';
      return close(state, result);
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// 結果開示の分類（S5 の ✅/❌ オーバーレイ用、F-03 / system §1.3）
// ---------------------------------------------------------------------------

/**
 * 各パッチの正誤区分（締め切り後の開示用）。
 * - 'correct'：回転パッチを正しく選んだ（✅ 実線・不透明）。
 * - 'missed' ：回転パッチを選び逃した（✅ 薄め）。
 * - 'wrong'  ：静止パッチを誤選択した（❌）。
 * - 'none'   ：静止パッチを選ばなかった（オーバーレイなし）。
 */
export type RevealKind = 'correct' | 'missed' | 'wrong' | 'none';

/** 1 パッチの開示情報。 */
export type RevealItem = {
  index: number;
  kind: RevealKind;
};

/**
 * 締め切り後、各パッチの開示区分を導出する（純関数、F-03）。
 * patches の順（行優先 index）で返す。
 */
export function deriveReveal(
  patches: readonly PatchDef[],
  selected: ReadonlySet<number>,
): RevealItem[] {
  return patches.map((patch) => {
    const picked = selected.has(patch.index);
    let kind: RevealKind;
    if (isChanging(patch)) {
      kind = picked ? 'correct' : 'missed';
    } else {
      kind = picked ? 'wrong' : 'none';
    }
    return { index: patch.index, kind };
  });
}
