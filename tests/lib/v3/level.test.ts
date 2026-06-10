/**
 * level.test.ts — v3.0 レベルシステム中核ロジックの単体テスト（spec §4 / F-04）。
 *
 * 検証範囲：
 * - 値集合とキー（§4.1 確定値）
 * - mixed-radix オドメータ：levelToParams / paramsToLevel / totalLevels（§4.2）
 *   境界・桁上がり（L1/L2/L4→L5/L20→L21/L720）・部分範囲・代替変化順
 * - レベル昇降：applyResult（§4.4, F-04）クリア+1/失敗1回不変/2連続失敗−1/
 *   連続失敗永続/クランプ
 * - 範囲変更時のクランプ：clampLevelToRange / clampLevelState（§4.5）
 */

import {
  VALUE_SETS,
  DEFAULT_VALUE_SETS,
  DEFAULT_VARIABLE_ORDER,
  defaultVariableRanges,
  fullVariableRanges,
  totalLevels,
  levelToParams,
  paramsToLevel,
  initialLevelState,
  applyResult,
  clampLevelToRange,
  clampLevelState,
  type VariableRanges,
  type LevelState,
  type LevelParams,
} from '../../../src/lib/v3/level';

const FULL = defaultVariableRanges();

// ───────────────────────────────────────────────────────────
// §4.1 値集合とキー
// ───────────────────────────────────────────────────────────

describe('VALUE_SETS（§4.1 拡張全集合・易 → 難、v3.1）', () => {
  it('全集合が spec §4.1 v3.1 拡張と一致する', () => {
    expect(VALUE_SETS.count).toEqual([1, 2, 3, 4, 5, 6]);
    expect(VALUE_SETS.seconds).toEqual([60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10]);
    expect(VALUE_SETS.direction).toEqual(['one-way', 'oscillate']);
    expect(VALUE_SETS.gridSize).toEqual([3, 4, 5, 6]);
    expect(VALUE_SETS.rotationSpeed).toEqual([
      7, 6.5, 6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1,
    ]);
  });

  it('全集合をすべて ON にした理論上限は 6×11×2×4×13 = 6864', () => {
    expect(totalLevels(fullVariableRanges(), DEFAULT_VARIABLE_ORDER)).toBe(6864);
  });

  it('インデックス 0 が各変数の最易値（全集合）', () => {
    expect(VALUE_SETS.count[0]).toBe(1);
    expect(VALUE_SETS.seconds[0]).toBe(60);
    expect(VALUE_SETS.direction[0]).toBe('one-way');
    expect(VALUE_SETS.gridSize[0]).toBe(3);
    expect(VALUE_SETS.rotationSpeed[0]).toBe(7);
  });

  it('各変数の末尾が最難値（全集合）', () => {
    expect(VALUE_SETS.count.at(-1)).toBe(6);
    expect(VALUE_SETS.seconds.at(-1)).toBe(10);
    expect(VALUE_SETS.direction.at(-1)).toBe('oscillate');
    expect(VALUE_SETS.gridSize.at(-1)).toBe(6);
    expect(VALUE_SETS.rotationSpeed.at(-1)).toBe(1);
  });

  it('既定の有効集合（DEFAULT_VALUE_SETS / defaultVariableRanges）は v3.0 と同一（追加値 OFF・720）', () => {
    expect(DEFAULT_VALUE_SETS.count).toEqual([1, 2, 3, 4]);
    expect(DEFAULT_VALUE_SETS.seconds).toEqual([40, 35, 30, 25, 20]);
    expect(DEFAULT_VALUE_SETS.gridSize).toEqual([3, 4]);
    expect(DEFAULT_VALUE_SETS.rotationSpeed).toEqual([6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2]);
    expect(defaultVariableRanges().count).toEqual([1, 2, 3, 4]);
    expect(totalLevels(defaultVariableRanges(), DEFAULT_VARIABLE_ORDER)).toBe(720);
  });

  it('デフォルト変化順は個数→時間→方向→サイズ→速度（最内側→最外側）', () => {
    expect(DEFAULT_VARIABLE_ORDER).toEqual([
      'count',
      'seconds',
      'direction',
      'gridSize',
      'rotationSpeed',
    ]);
  });
});

// ───────────────────────────────────────────────────────────
// §4.2 totalLevels
// ───────────────────────────────────────────────────────────

describe('totalLevels（§4.2 総レベル数 = 段数の積）', () => {
  it('デフォルト・フル範囲は 4×5×2×2×9 = 720', () => {
    expect(totalLevels(FULL)).toBe(720);
  });

  it('変化順を変えても積は不変（720）', () => {
    const order = ['rotationSpeed', 'gridSize', 'direction', 'seconds', 'count'] as const;
    expect(totalLevels(FULL, order)).toBe(720);
  });

  it('部分範囲では段数の積が変わる', () => {
    const ranges: VariableRanges = {
      count: [1, 2],
      seconds: [40, 35, 30],
      direction: ['one-way'],
      gridSize: [3, 4],
      rotationSpeed: [6, 5.5],
    };
    // 2×3×1×2×2 = 24
    expect(totalLevels(ranges)).toBe(24);
  });

  it('全変数 1 値なら総レベル数 1', () => {
    const ranges: VariableRanges = {
      count: [1],
      seconds: [40],
      direction: ['one-way'],
      gridSize: [3],
      rotationSpeed: [6],
    };
    expect(totalLevels(ranges)).toBe(1);
  });
});

// ───────────────────────────────────────────────────────────
// §4.1 拡張全集合での梯子（v3.1）
// ───────────────────────────────────────────────────────────

describe('拡張全集合の梯子（v3.1・fullVariableRanges）', () => {
  const FULL_ALL = fullVariableRanges();

  it('全集合 L1 = 全変数最易（個数1, 時60, 一方向, 3x3, 速7）', () => {
    expect(levelToParams(1, DEFAULT_VARIABLE_ORDER, FULL_ALL)).toEqual<LevelParams>({
      count: 1,
      seconds: 60,
      direction: 'one-way',
      gridSize: 3,
      rotationSpeed: 7,
    });
  });

  it('全集合 L2 = 個数だけ 1 段難化（個数2）', () => {
    expect(levelToParams(2, DEFAULT_VARIABLE_ORDER, FULL_ALL).count).toBe(2);
  });

  it('全集合 L6→L7 で個数が最難 6 → リセットし時間 1 段難化（桁上がり）', () => {
    // 個数全集合 6 値：L1..L6 が個数 1..6・他最易。L7 で個数 1 に戻り seconds 1 段難化。
    expect(levelToParams(6, DEFAULT_VARIABLE_ORDER, FULL_ALL)).toMatchObject({
      count: 6,
      seconds: 60,
    });
    expect(levelToParams(7, DEFAULT_VARIABLE_ORDER, FULL_ALL)).toMatchObject({
      count: 1,
      seconds: 55,
    });
  });

  it('全集合の最終レベル（6864）= 全変数最難（個数6, 時10, 振動, 6x6, 速1）', () => {
    expect(levelToParams(6864, DEFAULT_VARIABLE_ORDER, FULL_ALL)).toEqual<LevelParams>({
      count: 6,
      seconds: 10,
      direction: 'oscillate',
      gridSize: 6,
      rotationSpeed: 1,
    });
  });

  it('levelToParams ⇄ paramsToLevel が全集合でも往復一致（境界）', () => {
    for (const lv of [1, 7, 100, 3000, 6864]) {
      const p = levelToParams(lv, DEFAULT_VARIABLE_ORDER, FULL_ALL);
      expect(paramsToLevel(p, DEFAULT_VARIABLE_ORDER, FULL_ALL)).toBe(lv);
    }
  });

  it('範囲外（6865）は RangeError', () => {
    expect(() => levelToParams(6865, DEFAULT_VARIABLE_ORDER, FULL_ALL)).toThrow(RangeError);
  });
});

// ───────────────────────────────────────────────────────────
// §4.2 levelToParams — 境界と桁上がり
// ───────────────────────────────────────────────────────────

describe('levelToParams（§4.2 デフォルト梯子・境界・桁上がり）', () => {
  it('L1 = 全変数最易（個数1, 時40, 一方向, 3x3, 速6）', () => {
    expect(levelToParams(1)).toEqual<LevelParams>({
      count: 1,
      seconds: 40,
      direction: 'one-way',
      gridSize: 3,
      rotationSpeed: 6,
    });
  });

  it('L2 = 個数だけ 1 段難化（個数2, 他は最易）', () => {
    expect(levelToParams(2)).toEqual<LevelParams>({
      count: 2,
      seconds: 40,
      direction: 'one-way',
      gridSize: 3,
      rotationSpeed: 6,
    });
  });

  it('L3 = 個数3 / L4 = 個数4（最内側が進む）', () => {
    expect(levelToParams(3).count).toBe(3);
    expect(levelToParams(4).count).toBe(4);
    expect(levelToParams(4).seconds).toBe(40);
  });

  it('L4 → L5 で count 桁上がり（個数 4→1・時間 40→35）', () => {
    expect(levelToParams(4)).toMatchObject({ count: 4, seconds: 40 });
    expect(levelToParams(5)).toMatchObject({
      count: 1,
      seconds: 35,
      direction: 'one-way',
      gridSize: 3,
      rotationSpeed: 6,
    });
  });

  it('L20 = 個数4・時20・一方向・3x3・速6（seconds 最難・direction 桁前）', () => {
    expect(levelToParams(20)).toEqual<LevelParams>({
      count: 4,
      seconds: 20,
      direction: 'one-way',
      gridSize: 3,
      rotationSpeed: 6,
    });
  });

  it('L20 → L21 で seconds 桁上がり → direction が 1 段（振動へ）', () => {
    expect(levelToParams(21)).toEqual<LevelParams>({
      count: 1,
      seconds: 40,
      direction: 'oscillate',
      gridSize: 3,
      rotationSpeed: 6,
    });
  });

  it('L40 → L41 で direction 桁上がり → gridSize が 1 段（4x4へ）', () => {
    // direction は count(4)×seconds(5)=20 レベルごとに 1 段。
    // L21..L40 = 振動・3x3。L41 で gridSize が 4x4 へ、direction は一方向に戻る。
    expect(levelToParams(40)).toMatchObject({
      count: 4,
      seconds: 20,
      direction: 'oscillate',
      gridSize: 3,
    });
    expect(levelToParams(41)).toEqual<LevelParams>({
      count: 1,
      seconds: 40,
      direction: 'one-way',
      gridSize: 4,
      rotationSpeed: 6,
    });
  });

  it('L80 → L81 で gridSize 桁上がり → rotationSpeed が 1 段（5.5へ）', () => {
    // count×seconds×direction×gridSize = 4×5×2×2 = 80 レベルで rotationSpeed 1 段。
    expect(levelToParams(80)).toMatchObject({
      count: 4,
      seconds: 20,
      direction: 'oscillate',
      gridSize: 4,
      rotationSpeed: 6,
    });
    expect(levelToParams(81)).toEqual<LevelParams>({
      count: 1,
      seconds: 40,
      direction: 'one-way',
      gridSize: 3,
      rotationSpeed: 5.5,
    });
  });

  it('L720 = 全変数最難（個数4, 時20, 振動, 4x4, 速2）', () => {
    expect(levelToParams(720)).toEqual<LevelParams>({
      count: 4,
      seconds: 20,
      direction: 'oscillate',
      gridSize: 4,
      rotationSpeed: 2,
    });
  });

  it('全 720 レベルが一意な組み合わせを生む（全単射）', () => {
    const seen = new Set<string>();
    for (let l = 1; l <= 720; l++) {
      const p = levelToParams(l);
      const key = `${p.count}|${p.seconds}|${p.direction}|${p.gridSize}|${p.rotationSpeed}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
    expect(seen.size).toBe(720);
  });

  it('範囲外レベル（0 / 721 / 非整数）は RangeError', () => {
    expect(() => levelToParams(0)).toThrow(RangeError);
    expect(() => levelToParams(721)).toThrow(RangeError);
    expect(() => levelToParams(1.5)).toThrow(RangeError);
    expect(() => levelToParams(-1)).toThrow(RangeError);
  });
});

describe('levelToParams（部分範囲・代替変化順）', () => {
  it('部分範囲ではその有効値集合の中で梯子が組まれる', () => {
    const ranges: VariableRanges = {
      count: [2, 3],
      seconds: [30, 25],
      direction: ['oscillate'],
      gridSize: [4],
      rotationSpeed: [3, 2.5],
    };
    // 総数 2×2×1×1×2 = 8
    expect(totalLevels(ranges)).toBe(8);
    expect(levelToParams(1, DEFAULT_VARIABLE_ORDER, ranges)).toEqual<LevelParams>({
      count: 2,
      seconds: 30,
      direction: 'oscillate',
      gridSize: 4,
      rotationSpeed: 3,
    });
    expect(levelToParams(8, DEFAULT_VARIABLE_ORDER, ranges)).toEqual<LevelParams>({
      count: 3,
      seconds: 25,
      direction: 'oscillate',
      gridSize: 4,
      rotationSpeed: 2.5,
    });
  });

  it('変化順を変えると最内側変数が変わる（時間を最内側に）', () => {
    const order = ['seconds', 'count', 'direction', 'gridSize', 'rotationSpeed'] as const;
    // L1 は全最易、L2 は最内側 = seconds が 1 段進む。
    expect(levelToParams(1, order)).toMatchObject({ count: 1, seconds: 40 });
    expect(levelToParams(2, order)).toMatchObject({ count: 1, seconds: 35 });
    // seconds は 5 値。L5=seconds最難, L6 で seconds 桁上がり → count が 1 段。
    expect(levelToParams(5, order)).toMatchObject({ count: 1, seconds: 20 });
    expect(levelToParams(6, order)).toMatchObject({ count: 2, seconds: 40 });
  });
});

// ───────────────────────────────────────────────────────────
// §4.2 paramsToLevel — 逆変換
// ───────────────────────────────────────────────────────────

describe('paramsToLevel（levelToParams の逆変換）', () => {
  it('全 720 レベルで levelToParams ∘ paramsToLevel が恒等', () => {
    for (let l = 1; l <= 720; l++) {
      expect(paramsToLevel(levelToParams(l))).toBe(l);
    }
  });

  it('代表値で逆変換が正しい', () => {
    expect(paramsToLevel({ count: 1, seconds: 40, direction: 'one-way', gridSize: 3, rotationSpeed: 6 })).toBe(1);
    expect(paramsToLevel({ count: 4, seconds: 20, direction: 'oscillate', gridSize: 4, rotationSpeed: 2 })).toBe(720);
    expect(paramsToLevel({ count: 1, seconds: 40, direction: 'oscillate', gridSize: 3, rotationSpeed: 6 })).toBe(21);
  });

  it('範囲外の値は RangeError', () => {
    // gridSize 4x4 を無効化した範囲で 4 を渡す。
    const ranges: VariableRanges = { ...FULL, gridSize: [3] };
    expect(() =>
      paramsToLevel(
        { count: 1, seconds: 40, direction: 'one-way', gridSize: 4, rotationSpeed: 6 },
        DEFAULT_VARIABLE_ORDER,
        ranges,
      ),
    ).toThrow(RangeError);
  });
});

// ───────────────────────────────────────────────────────────
// §4.4 / F-04 applyResult — レベル昇降
// ───────────────────────────────────────────────────────────

describe('initialLevelState（AS-15 初期状態）', () => {
  it('currentLevel=1, consecutiveFailures=0, highestLevel=0', () => {
    expect(initialLevelState()).toEqual<LevelState>({
      currentLevel: 1,
      consecutiveFailures: 0,
      highestLevel: 0,
    });
  });
});

describe('applyResult — クリア（§4.4 / F-04）', () => {
  it('クリアで currentLevel が +1 され levelDelta=+1', () => {
    const out = applyResult({ currentLevel: 5, consecutiveFailures: 0, highestLevel: 4 }, 'clear');
    expect(out.levelState.currentLevel).toBe(6);
    expect(out.levelDelta).toBe(1);
  });

  it('クリアで連続失敗カウントがリセットされる（失敗1回→クリアで0）', () => {
    const out = applyResult({ currentLevel: 5, consecutiveFailures: 1, highestLevel: 4 }, 'clear');
    expect(out.levelState.consecutiveFailures).toBe(0);
    expect(out.levelState.currentLevel).toBe(6);
  });

  it('クリアで highestLevel がクリアしたレベルで更新される（max）', () => {
    const out = applyResult({ currentLevel: 10, consecutiveFailures: 0, highestLevel: 7 }, 'clear');
    expect(out.levelState.highestLevel).toBe(10);
  });

  it('クリアしたレベルが既存 highestLevel 以下なら highestLevel は不変', () => {
    const out = applyResult({ currentLevel: 5, consecutiveFailures: 0, highestLevel: 12 }, 'clear');
    expect(out.levelState.highestLevel).toBe(12);
  });

  it('上限レベルでクリアしても +1 されず levelDelta=0（クランプ）', () => {
    const out = applyResult({ currentLevel: 720, consecutiveFailures: 0, highestLevel: 719 }, 'clear');
    expect(out.levelState.currentLevel).toBe(720);
    expect(out.levelDelta).toBe(0);
    expect(out.levelState.highestLevel).toBe(720);
  });

  it('部分範囲の上限でクリアしてもクランプされる', () => {
    const ranges: VariableRanges = {
      count: [1, 2],
      seconds: [40],
      direction: ['one-way'],
      gridSize: [3],
      rotationSpeed: [6],
    };
    // 総数 2。L2 でクリアしても 2 のまま。
    const out = applyResult({ currentLevel: 2, consecutiveFailures: 0, highestLevel: 1 }, 'clear', ranges);
    expect(out.levelState.currentLevel).toBe(2);
    expect(out.levelDelta).toBe(0);
  });
});

describe('applyResult — 失敗（§4.4 / F-04）', () => {
  it('失敗 1 回目はレベル不変・連続失敗 1・levelDelta=0', () => {
    const out = applyResult({ currentLevel: 5, consecutiveFailures: 0, highestLevel: 4 }, 'fail');
    expect(out.levelState.currentLevel).toBe(5);
    expect(out.levelState.consecutiveFailures).toBe(1);
    expect(out.levelDelta).toBe(0);
  });

  it('2 連続失敗でレベル −1・連続失敗 0 リセット・levelDelta=-1', () => {
    const out = applyResult({ currentLevel: 5, consecutiveFailures: 1, highestLevel: 4 }, 'fail');
    expect(out.levelState.currentLevel).toBe(4);
    expect(out.levelState.consecutiveFailures).toBe(0);
    expect(out.levelDelta).toBe(-1);
  });

  it('L1 で 2 連続失敗してもレベルは下がらず levelDelta=0（下限クランプ）', () => {
    const out = applyResult({ currentLevel: 1, consecutiveFailures: 1, highestLevel: 0 }, 'fail');
    expect(out.levelState.currentLevel).toBe(1);
    expect(out.levelState.consecutiveFailures).toBe(0);
    expect(out.levelDelta).toBe(0);
  });

  it('失敗で highestLevel は変化しない', () => {
    const out = applyResult({ currentLevel: 5, consecutiveFailures: 1, highestLevel: 8 }, 'fail');
    expect(out.levelState.highestLevel).toBe(8);
  });
});

describe('applyResult — 連続失敗シナリオ（F-04 受け入れ基準）', () => {
  it('失敗→クリア→失敗ではレベルが下がらない（クリアで連続失敗リセット）', () => {
    let state: LevelState = { currentLevel: 5, consecutiveFailures: 0, highestLevel: 4 };
    state = applyResult(state, 'fail').levelState; // failures=1
    expect(state.consecutiveFailures).toBe(1);
    state = applyResult(state, 'clear').levelState; // failures=0, level 6
    expect(state.consecutiveFailures).toBe(0);
    expect(state.currentLevel).toBe(6);
    const out = applyResult(state, 'fail'); // failures=1（2 連続ではない）
    expect(out.levelState.currentLevel).toBe(6);
    expect(out.levelDelta).toBe(0);
  });

  it('連続失敗カウントは永続値（state に保持され関数間で引き継がれる）', () => {
    // applyResult は state を読み取り次 state を返す。永続化は S3 だが、
    // ここでは「カウントが state に正しく蓄積される」ことを確認する。
    let state: LevelState = initialLevelState();
    state = { ...state, currentLevel: 10 };
    const after1 = applyResult(state, 'fail').levelState;
    expect(after1.consecutiveFailures).toBe(1);
    // 別の関数呼び出し（=再起動相当）でも state を渡せば 1 から続く。
    const after2 = applyResult(after1, 'fail').levelState;
    expect(after2.consecutiveFailures).toBe(0);
    expect(after2.currentLevel).toBe(9);
  });

  it('4 連続失敗で 2 段下がる（2 回ごとに −1）', () => {
    let state: LevelState = { currentLevel: 10, consecutiveFailures: 0, highestLevel: 9 };
    state = applyResult(state, 'fail').levelState; // f=1, lvl=10
    state = applyResult(state, 'fail').levelState; // f=0, lvl=9
    state = applyResult(state, 'fail').levelState; // f=1, lvl=9
    state = applyResult(state, 'fail').levelState; // f=0, lvl=8
    expect(state.currentLevel).toBe(8);
    expect(state.consecutiveFailures).toBe(0);
  });

  it('引数 levelState を変更しない（純関数）', () => {
    const original: LevelState = { currentLevel: 5, consecutiveFailures: 1, highestLevel: 4 };
    const snapshot = { ...original };
    applyResult(original, 'fail');
    expect(original).toEqual(snapshot);
  });
});

// ───────────────────────────────────────────────────────────
// §4.5 範囲変更時のクランプ
// ───────────────────────────────────────────────────────────

describe('clampLevelToRange（§4.5）', () => {
  it('範囲内ならそのまま', () => {
    expect(clampLevelToRange(50, 720)).toBe(50);
  });

  it('新上限を超えたら新上限に丸める', () => {
    expect(clampLevelToRange(700, 100)).toBe(100);
  });

  it('1 未満は 1 に丸める', () => {
    expect(clampLevelToRange(0, 720)).toBe(1);
    expect(clampLevelToRange(-5, 720)).toBe(1);
  });

  it('新上限ちょうどはそのまま', () => {
    expect(clampLevelToRange(100, 100)).toBe(100);
  });

  it('新上限が 0 以下でも最低 1 を返す', () => {
    expect(clampLevelToRange(50, 0)).toBe(1);
  });
});

describe('clampLevelState（§4.5 / F-13 範囲変更反映）', () => {
  it('範囲縮小で現在レベルが新上限にクランプされ連続失敗が 0 リセット', () => {
    const ranges: VariableRanges = {
      count: [1, 2],
      seconds: [40],
      direction: ['one-way'],
      gridSize: [3],
      rotationSpeed: [6],
    };
    // 新総数 2。
    const out = clampLevelState(
      { currentLevel: 500, consecutiveFailures: 1, highestLevel: 480 },
      ranges,
    );
    expect(out.currentLevel).toBe(2);
    expect(out.consecutiveFailures).toBe(0);
    expect(out.highestLevel).toBe(2);
  });

  it('範囲内に収まっていてもレベルは保持し連続失敗だけ 0 リセット', () => {
    const out = clampLevelState(
      { currentLevel: 50, consecutiveFailures: 1, highestLevel: 60 },
      FULL,
    );
    expect(out.currentLevel).toBe(50);
    expect(out.consecutiveFailures).toBe(0);
    expect(out.highestLevel).toBe(60);
  });

  it('highestLevel も新上限でクランプされる', () => {
    const ranges: VariableRanges = {
      count: [1, 2, 3, 4],
      seconds: [40, 35],
      direction: ['one-way'],
      gridSize: [3],
      rotationSpeed: [6],
    };
    // 新総数 4×2=8。
    const out = clampLevelState(
      { currentLevel: 3, consecutiveFailures: 1, highestLevel: 100 },
      ranges,
    );
    expect(out.highestLevel).toBe(8);
    expect(out.currentLevel).toBe(3);
  });

  it('引数 levelState を変更しない（純関数）', () => {
    const original: LevelState = { currentLevel: 500, consecutiveFailures: 1, highestLevel: 480 };
    const snapshot = { ...original };
    clampLevelState(original, FULL);
    expect(original).toEqual(snapshot);
  });
});
