/**
 * level.ts — v3.0 レベルシステム中核ロジック（純関数）。spec §4 / F-04。
 *
 * このモジュールは描画・永続化・UI に一切依存しない純ロジック層（S2）。
 * - レベル番号 ⇄ 5 変数の mixed-radix オドメータ相互変換（§4.2）
 * - クリア/失敗からのレベル昇降（§4.4, F-04）
 * - 範囲変更時のクランプ（§4.5）
 *
 * 永続化（LevelState の AsyncStorage 読み書き）・設定の保存は S3 で行う。
 * ここで定義する LevelState は spec §7.3 の形に一致する純データ型。
 */

// ───────────────────────────────────────────────────────────
// 1. 5 変数の値集合とキー（spec §4.1、確定値・易 → 難順）
// ───────────────────────────────────────────────────────────

/**
 * レベルを決める変数のキー（v3.2）。
 * 最内側 `repeat`（繰り返し回数、radix=n）＋外側 4 変数。
 * v3.1 の `count`（個数）は難易度軸から除外し（→ roundGen で countRange ランダム）、
 * 代わりに `repeat` を最内側軸として追加した（spec §4.1/§4.2・AS-35）。
 */
export type VariableKey =
  | 'repeat'
  | 'seconds'
  | 'direction'
  | 'gridSize'
  | 'rotationSpeed';

/** 回転方向。'one-way'=一方向（易）/ 'oscillate'=振動（難）。 */
export type Direction = 'one-way' | 'oscillate';

/** 格子サイズ。3=3x3（最易）… 6=6x6（最難）。v3.1 で 5/6 を追加（§4.1）。 */
export type GridSize = 3 | 4 | 5 | 6;

/**
 * 各変数の**全集合**（易 → 難順、spec §4.1 v3.1 拡張）。
 * インデックス 0 が最易。配列の並びが難易度の単調順序を表す。
 *
 * 外側 4 変数（v3.1）は両側／難側に拡張済み（§4.1）：
 * - seconds: 60,55,50,45（長い=易）と 15,10（短い=難）を両側に追加。
 * - gridSize: 5x5,6x6 を難側に追加。
 * - rotationSpeed: 7,6.5（速い=易）と 1.5,1（遅い=難）を両側に追加。
 *
 * `repeat`（v3.2）は最内側軸で、有効範囲 = [1..n]（n=repeatCount 設定、1〜6・既定 4）。
 * 各値は同一難易度の「全て探せ」1 ラウンドを表し、難易度は変えない（spec §4.1/§4.2・AS-35）。
 *
 * **既定の有効集合は `defaultVariableRanges()`（n=4・外側 v3.0 同一）であり、追加値は既定 OFF**（AS-27）。
 */
export const VALUE_SETS = {
  repeat: [1, 2, 3, 4, 5, 6] as const,
  seconds: [60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10] as const,
  direction: ['one-way', 'oscillate'] as const,
  gridSize: [3, 4, 5, 6] as const,
  rotationSpeed: [7, 6.5, 6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1] as const,
} as const;

/**
 * 「既定の有効集合」（spec §4.1 / §7.2「既定 ON」列・AS-27/AS-37）。
 * 外側 4 変数は v3.0 と同一。`repeat` は既定 n=4 → [1,2,3,4]。
 * 追加値（時間 60/55/50/45/15/10・サイズ 5x5/6x6・回転速度 7/6.5/1.5/1）はデフォルト OFF。
 * 総レベル数 = n×(5×2×2×9) = 4×180 = 720（v3.1 と不変）。
 */
export const DEFAULT_VALUE_SETS = {
  repeat: [1, 2, 3, 4] as const,
  seconds: [40, 35, 30, 25, 20] as const,
  direction: ['one-way', 'oscillate'] as const,
  gridSize: [3, 4] as const,
  rotationSpeed: [6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2] as const,
} as const;

/** repeat 軸の radix の許容範囲（設定 repeatCount、spec §4.1/AS-37）。 */
export const MIN_REPEAT_COUNT = 1;
export const MAX_REPEAT_COUNT = 6;
export const DEFAULT_REPEAT_COUNT = 4;

/**
 * デフォルトの変化順（最内側 LSB → 最外側 MSB、spec §4.2 / AS-35）。
 * 繰り返し → 時間 → 回転方向 → サイズ → 回転速度。
 * **`repeat` は常に最内側固定**（設定の変化順組み替え対象は外側 4 変数のみ）。
 */
export const DEFAULT_VARIABLE_ORDER: readonly VariableKey[] = [
  'repeat',
  'seconds',
  'direction',
  'gridSize',
  'rotationSpeed',
];

/** 変化順の組み替え対象となる外側 4 変数（repeat を除く、spec §4.2）。 */
export const OUTER_VARIABLE_KEYS: readonly VariableKey[] = [
  'seconds',
  'direction',
  'gridSize',
  'rotationSpeed',
];

/**
 * 各変数の有効値部分集合（範囲設定、spec §7.2 Settings.variableRanges）。
 * 各配列は VALUE_SETS の部分集合で、易 → 難順を保つ前提。
 * S2 ではデフォルト = フル範囲を受け取る純関数として扱う（S3 で永続化）。
 */
export interface VariableRanges {
  /** 繰り返し軸の有効範囲 = [1..n]（n=repeatCount）。最内側固定（spec §4.2・AS-35/AS-37）。 */
  repeat: readonly number[];
  seconds: readonly number[];
  direction: readonly Direction[];
  gridSize: readonly GridSize[];
  rotationSpeed: readonly number[];
}

/**
 * 既定の有効集合（`defaultVariableRanges`、spec §7.2 / AS-27）。
 * **v3.0 と同一**（追加値 OFF）。総レベル数 720。
 */
export function defaultVariableRanges(): VariableRanges {
  return {
    repeat: [...DEFAULT_VALUE_SETS.repeat],
    seconds: [...DEFAULT_VALUE_SETS.seconds],
    direction: [...DEFAULT_VALUE_SETS.direction],
    gridSize: [...DEFAULT_VALUE_SETS.gridSize],
    rotationSpeed: [...DEFAULT_VALUE_SETS.rotationSpeed],
  };
}

/** repeatCount（n）から repeat 軸の有効範囲 [1..n] を作る（spec §4.1・AS-37）。 */
export function repeatRange(repeatCount: number): number[] {
  const n = Math.min(
    Math.max(Math.trunc(repeatCount), MIN_REPEAT_COUNT),
    MAX_REPEAT_COUNT,
  );
  return VALUE_SETS.repeat.slice(0, n);
}

/**
 * 全集合をすべて有効にした VariableRanges を返す（§4.1 全集合）。
 * 総レベル数 = 6×11×2×4×13 = 6864（理論上限）。設定 UI の「全選択」用。
 */
export function fullVariableRanges(): VariableRanges {
  return {
    repeat: [...VALUE_SETS.repeat],
    seconds: [...VALUE_SETS.seconds],
    direction: [...VALUE_SETS.direction],
    gridSize: [...VALUE_SETS.gridSize],
    rotationSpeed: [...VALUE_SETS.rotationSpeed],
  };
}

/**
 * あるレベルが決定する変数の実値（spec §4.2）。
 * `repeat`＝繰り返し回（1..n、難易度中立）。個数は含まない（roundGen で countRange ランダム）。
 */
export interface LevelParams {
  /** 繰り返し回（1..n）。難易度は変えず、何回目のラウンドかを表す（spec §4.2・AS-35）。 */
  repeat: number;
  seconds: number;
  direction: Direction;
  gridSize: GridSize;
  rotationSpeed: number;
}

// ───────────────────────────────────────────────────────────
// 2. mixed-radix オドメータ（spec §4.2）
// ───────────────────────────────────────────────────────────

/** 変化順に並んだ各変数の有効値配列（最内側 → 最外側）を取り出す。 */
function orderedAxes(
  order: readonly VariableKey[],
  ranges: VariableRanges,
): { key: VariableKey; values: readonly unknown[] }[] {
  return order.map((key) => ({ key, values: ranges[key] as readonly unknown[] }));
}

/**
 * 総レベル数（各変数の有効段数の積）。spec §4.2。
 * デフォルト・フル範囲では 4×5×2×2×9 = 720。
 */
export function totalLevels(
  ranges: VariableRanges,
  order: readonly VariableKey[] = DEFAULT_VARIABLE_ORDER,
): number {
  return order.reduce((product, key) => product * ranges[key].length, 1);
}

/**
 * 空間周波数（cpd, cycles per degree）のレベル連動レンジ。
 * 最易（レベル 1）= CPD_MIN、最難（最高レベル）= CPD_MAX に線形補間する。
 * CPD_MAX=6 は文献上のヒト・コントラスト感度ピーク（6〜8 cpd）寄りの値。
 */
export const CPD_MIN = 1.5;
export const CPD_MAX = 6;

/**
 * レベル番号 → 空間周波数（cpd）。レベル 1 で CPD_MIN、最高レベル `total` で CPD_MAX に
 * 線形補間する（§4.1 の難易度単調順序に沿って高レベルほど高周波＝細かく見えにくい）。
 *
 * `total` はレベル範囲設定（variableRanges）で変わりうるため、呼び出し側で
 * `totalLevels(ranges, order)` を計算して渡すこと。
 *
 * - `total <= 1`（有効レベルが 1 段のみ）のときは CPD_MIN を返す（0 除算回避）。
 * - `level` は [1, total] にクランプする。
 *
 * 純関数。
 */
export function cpdForLevel(level: number, total: number): number {
  if (total <= 1) return CPD_MIN;
  const clamped = Math.min(Math.max(level, 1), total);
  const ratio = (clamped - 1) / (total - 1);
  return CPD_MIN + (CPD_MAX - CPD_MIN) * ratio;
}

/**
 * レベル番号 L（1 始まり）→ 5 変数の実値（spec §4.2）。
 *
 * (L-1) を mixed-radix で展開する。最内側変数（order[0]）が最下位桁。
 * 桁の値 = 各変数の有効値配列のインデックス（易 → 難順）。
 *
 * @param level 1 始まりのレベル番号。
 * @param order 変化順（最内側 → 最外側）。デフォルトは個数→時間→方向→サイズ→速度。
 * @param ranges 各変数の有効値集合（部分集合可）。
 * @throws level が [1, totalLevels] の範囲外のとき。
 */
export function levelToParams(
  level: number,
  order: readonly VariableKey[] = DEFAULT_VARIABLE_ORDER,
  ranges: VariableRanges = defaultVariableRanges(),
): LevelParams {
  const total = totalLevels(ranges, order);
  if (!Number.isInteger(level) || level < 1 || level > total) {
    throw new RangeError(
      `level ${level} is out of range [1, ${total}]`,
    );
  }

  const axes = orderedAxes(order, ranges);
  let remainder = level - 1;
  const indices = new Map<VariableKey, number>();
  for (const axis of axes) {
    const radix = axis.values.length;
    indices.set(axis.key, remainder % radix);
    remainder = Math.floor(remainder / radix);
  }

  return {
    repeat: ranges.repeat[indices.get('repeat')!],
    seconds: ranges.seconds[indices.get('seconds')!],
    direction: ranges.direction[indices.get('direction')!],
    gridSize: ranges.gridSize[indices.get('gridSize')!],
    rotationSpeed: ranges.rotationSpeed[indices.get('rotationSpeed')!],
  };
}

/**
 * 5 変数の実値 → レベル番号 L（1 始まり）。levelToParams の逆変換。
 * 各値が ranges 内に存在することが前提。
 *
 * @throws いずれかの値が ranges 内に見つからないとき。
 */
export function paramsToLevel(
  params: LevelParams,
  order: readonly VariableKey[] = DEFAULT_VARIABLE_ORDER,
  ranges: VariableRanges = defaultVariableRanges(),
): number {
  const axes = orderedAxes(order, ranges);
  let level = 0;
  let place = 1;
  for (const axis of axes) {
    const value = params[axis.key];
    const index = (axis.values as readonly unknown[]).indexOf(value);
    if (index < 0) {
      throw new RangeError(
        `value ${String(value)} for ${axis.key} is not in the active range`,
      );
    }
    level += index * place;
    place *= axis.values.length;
  }
  return level + 1;
}

// ───────────────────────────────────────────────────────────
// 3. レベル昇降（spec §4.4, F-04）
// ───────────────────────────────────────────────────────────

/** ゲーム結果の 2 値（spec §4.3, AS-5）。中断はここに含めない（記録対象外）。 */
export type GameResult = 'clear' | 'fail';

/** レベル進行状態（spec §7.3、1 レコード）。 */
export interface LevelState {
  /** 現在の挑戦レベル（1 始まり）。初期値 1。 */
  currentLevel: number;
  /** 連続失敗カウント（永続）。0/1。2 到達でレベル −1 し 0 リセット。 */
  consecutiveFailures: number;
  /** 過去最高到達レベル（クリアした最高レベル）。未クリアは 0。 */
  highestLevel: number;
}

/** レベル変化量（spec §7.4 GameRecord.levelDelta）。クランプで動かなければ 0。 */
export type LevelDelta = -1 | 0 | 1;

/** applyResult の戻り値。新しい LevelState と、UI 告知用の levelDelta。 */
export interface ApplyResultOutcome {
  levelState: LevelState;
  levelDelta: LevelDelta;
}

/** 初期 LevelState（初回起動・全データ削除後、spec §7.9 / AS-15）。 */
export function initialLevelState(): LevelState {
  return { currentLevel: 1, consecutiveFailures: 0, highestLevel: 0 };
}

/**
 * ゲーム結果（クリア/失敗）を現在の LevelState に適用する（spec §4.4, F-04）。
 *
 * - clear → consecutiveFailures=0、currentLevel+1（上限 totalLevels でクランプ）、
 *           highestLevel を max で更新。levelDelta=+1（クランプ時 0）。
 * - fail  → consecutiveFailures+1。2 到達でレベル−1（下限 1 でクランプ）し
 *           consecutiveFailures=0。1 回目はレベル不変（levelDelta=0）。
 *
 * 中断は本関数を呼ばない（レベル・連続失敗・記録に影響しない）。
 * 純関数。引数 levelState は変更しない。永続化は S3。
 */
export function applyResult(
  levelState: LevelState,
  result: GameResult,
  ranges: VariableRanges = defaultVariableRanges(),
  order: readonly VariableKey[] = DEFAULT_VARIABLE_ORDER,
): ApplyResultOutcome {
  const total = totalLevels(ranges, order);

  if (result === 'clear') {
    const nextLevel = Math.min(levelState.currentLevel + 1, total);
    const delta: LevelDelta = nextLevel > levelState.currentLevel ? 1 : 0;
    return {
      levelState: {
        currentLevel: nextLevel,
        consecutiveFailures: 0,
        highestLevel: Math.max(levelState.highestLevel, levelState.currentLevel),
      },
      levelDelta: delta,
    };
  }

  // result === 'fail'
  const failures = levelState.consecutiveFailures + 1;
  if (failures < 2) {
    return {
      levelState: { ...levelState, consecutiveFailures: failures },
      levelDelta: 0,
    };
  }

  // 2 連続失敗 → レベル −1（下限 1 でクランプ）し連続失敗を 0 リセット。
  const nextLevel = Math.max(levelState.currentLevel - 1, 1);
  const delta: LevelDelta = nextLevel < levelState.currentLevel ? -1 : 0;
  return {
    levelState: {
      currentLevel: nextLevel,
      consecutiveFailures: 0,
      highestLevel: levelState.highestLevel,
    },
    levelDelta: delta,
  };
}

// ───────────────────────────────────────────────────────────
// 4. 範囲変更時のクランプ（spec §4.5, F-13）
// ───────────────────────────────────────────────────────────

/**
 * 現在レベルを新しい有効レベル範囲 [1, newTotalLevels] にクランプする（spec §4.5）。
 * 範囲・変化順を変えると総レベル数が変わるため、現在レベルが新上限を超えたら丸める。
 *
 * 純関数。number → number。LevelState 全体のクランプは clampLevelState を使う。
 */
export function clampLevelToRange(
  currentLevel: number,
  newTotalLevels: number,
): number {
  if (newTotalLevels < 1) {
    return 1;
  }
  return Math.min(Math.max(currentLevel, 1), newTotalLevels);
}

/**
 * 範囲・変化順の変更を LevelState に反映する（spec §4.5, F-13）。
 * - currentLevel を新しい有効範囲にクランプする。
 * - consecutiveFailures を 0 にリセットする（梯子が変わったため）。
 * - highestLevel も新上限でクランプする（過去最高が新範囲を超え得るため）。
 *
 * 純関数。引数 levelState は変更しない。
 */
export function clampLevelState(
  levelState: LevelState,
  ranges: VariableRanges,
  order: readonly VariableKey[] = DEFAULT_VARIABLE_ORDER,
): LevelState {
  const total = totalLevels(ranges, order);
  return {
    currentLevel: clampLevelToRange(levelState.currentLevel, total),
    consecutiveFailures: 0,
    highestLevel: Math.min(levelState.highestLevel, total),
  };
}
