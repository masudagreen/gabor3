/**
 * 3-down/1-up staircase 法（spec.md §6.3）。
 *
 * 規則：
 *   - 3 連続正解で param を 1 step 下げる（=難しく）
 *   - 1 誤答 / 未回答で param を 1 step 上げる（=易しく）
 *   - step size は最初 4 unit、1 reversal 後 2 unit、3 reversal 以降 1 unit
 *   - 方向反転（reversal）が起きた回数をカウント
 *   - param は [min, max] にクランプ
 *
 * 閾値推定：最終 6 reversal の param 平均（reversal が 6 未満なら最終値）。
 *
 * データモデル `StaircaseState` は spec.md §12.1 に従う。
 */

export type Direction = 'up' | 'down' | 'none';

export type GameId = 'game1' | 'game2' | 'game3';

/** spec.md §12.1 `StaircaseState` */
export type StaircaseState = {
  gameId: GameId;
  currentParam: number;
  currentStep: number;
  reversalCount: number;
  lastDirection: Direction;
  consecutiveCorrect: number;
  updatedAt: string; // ISO 8601
};

/** 各ゲームのパラメータ範囲・初期値（spec.md §7.1〜§7.3） */
export type StaircaseConfig = {
  initialParam: number;
  initialStep: number;
  minParam: number;
  maxParam: number;
};

export const STAIRCASE_CONFIGS: Record<GameId, StaircaseConfig> = {
  // Game 1：易 8°／中 5°／難 3°、staircase で動かす
  game1: { initialParam: 5, initialStep: 1, minParam: 1, maxParam: 10 },
  // Game 2：1°〜10°（初期 6°、§7.2）
  game2: { initialParam: 6, initialStep: 4, minParam: 1, maxParam: 10 },
  // Game 3：5°〜45°（初期 30°、§7.3）
  game3: { initialParam: 30, initialStep: 4, minParam: 5, maxParam: 45 },
};

/** 1 試行の結果（採点者の出力） */
export type TrialOutcome = 'correct' | 'incorrect' | 'noResponse';

/**
 * 初期化：新規 staircase 状態を生成する。
 */
export function createStaircase(
  gameId: GameId,
  config: StaircaseConfig = STAIRCASE_CONFIGS[gameId],
  now: () => string = () => new Date().toISOString(),
): StaircaseState {
  return {
    gameId,
    currentParam: config.initialParam,
    currentStep: config.initialStep,
    reversalCount: 0,
    lastDirection: 'none',
    consecutiveCorrect: 0,
    updatedAt: now(),
  };
}

/** リセット：保存された状態を初期値に戻す（設定 → staircase リセット）。 */
export function resetStaircase(
  state: StaircaseState,
  config: StaircaseConfig = STAIRCASE_CONFIGS[state.gameId],
  now: () => string = () => new Date().toISOString(),
): StaircaseState {
  return createStaircase(state.gameId, config, now);
}

/**
 * step size を reversal 数に応じて段階的に縮める（spec.md §6.3）。
 *   reversal 0 回目：初期 step（4）
 *   reversal 1 回後：2
 *   reversal 3 回以降：1
 */
export function stepSizeFor(reversalCount: number, initialStep: number): number {
  if (reversalCount === 0) return initialStep;
  if (reversalCount < 3) return Math.max(initialStep / 2, 1);
  return Math.max(initialStep / 4, 1);
}

/**
 * 1 試行分の結果を staircase に適用し、新状態を返す。
 *
 * - correct: consecutiveCorrect++。3 になったら param 下げ、reversal 判定、consecutive リセット。
 * - incorrect / noResponse: 即座に param 上げ、reversal 判定、consecutive リセット。
 *
 * クランプ：param が min/max を超えた場合は端で止める（reversal 判定はクランプ前の方向で行う）。
 */
export function applyTrialResult(
  state: StaircaseState,
  outcome: TrialOutcome,
  config: StaircaseConfig = STAIRCASE_CONFIGS[state.gameId],
  now: () => string = () => new Date().toISOString(),
): StaircaseState {
  const isCorrect = outcome === 'correct';

  let consecutiveCorrect = isCorrect ? state.consecutiveCorrect + 1 : 0;
  let newDirection: Direction = state.lastDirection;
  let newParam = state.currentParam;
  let reversalCount = state.reversalCount;
  let currentStep = state.currentStep;
  let triggerStep = false;

  if (isCorrect) {
    if (consecutiveCorrect >= 3) {
      // 3 連続正解 → 難しく（param 下げ）
      newDirection = 'down';
      triggerStep = true;
      consecutiveCorrect = 0;
    }
  } else {
    // 1 つでも誤答 → 易しく（param 上げ）
    newDirection = 'up';
    triggerStep = true;
  }

  if (triggerStep) {
    // reversal 判定（方向が変わったら +1）
    const isReversal =
      state.lastDirection !== 'none' && state.lastDirection !== newDirection;
    if (isReversal) {
      reversalCount = state.reversalCount + 1;
      // step size はこの reversal 後の値を採用
      currentStep = stepSizeFor(reversalCount, config.initialStep);
    }

    const delta = newDirection === 'down' ? -currentStep : currentStep;
    newParam = clamp(state.currentParam + delta, config.minParam, config.maxParam);
  }

  return {
    gameId: state.gameId,
    currentParam: newParam,
    currentStep,
    reversalCount,
    lastDirection: triggerStep ? newDirection : state.lastDirection,
    consecutiveCorrect,
    updatedAt: now(),
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * 試行履歴から閾値を推定する（spec.md §6.3）。
 * 最終 6 reversal の param 平均、reversal が 6 未満なら最終値。
 */
export function estimateThreshold(
  trialHistory: Array<{ paramValue: number; outcome: TrialOutcome }>,
  fallback: number,
): number {
  // reversal が起きた試行の paramValue を抽出（その試行の入力 param 値）。
  // 「方向が変わった瞬間の param」を採るため、適用前の direction 列を構築する。
  const directions: Direction[] = [];
  let lastDir: Direction = 'none';
  let consecutive = 0;
  for (const t of trialHistory) {
    let dir: Direction = lastDir;
    if (t.outcome === 'correct') {
      consecutive += 1;
      if (consecutive >= 3) {
        dir = 'down';
        consecutive = 0;
      }
    } else {
      dir = 'up';
      consecutive = 0;
    }
    directions.push(dir);
    if (dir !== lastDir && dir !== 'none' && lastDir !== 'none') {
      // reversal occurred
    }
    lastDir = dir;
  }

  // reversal の試行 index を抽出（前の dir と異なるもの）
  const reversalParams: number[] = [];
  let prev: Direction = 'none';
  for (let i = 0; i < directions.length; i += 1) {
    const cur = directions[i];
    if (cur !== prev && prev !== 'none' && cur !== 'none') {
      reversalParams.push(trialHistory[i].paramValue);
    }
    prev = cur;
  }

  if (reversalParams.length >= 6) {
    const last6 = reversalParams.slice(-6);
    return last6.reduce((s, v) => s + v, 0) / last6.length;
  }
  if (trialHistory.length === 0) return fallback;
  return trialHistory[trialHistory.length - 1].paramValue;
}
