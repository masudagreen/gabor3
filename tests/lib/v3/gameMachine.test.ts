/**
 * gameMachine.test.ts — v3.2 ゲーム機械の単体テスト（spec §4.3 / §4.8 / §4.9 / F-01 / F-03）。
 *
 * 検証範囲：
 * - 1 ゲーム = 1 ラウンド = 1 レベル挑戦。
 * - v3.2：個数はレベル外。`initGame` は `fixedCount`（チュートリアル）優先、
 *   なければ `countRange` から個数をランダム抽選する。
 * - countRotatingPatches で回転個数を数える（「全て探せ」読み上げ用）。
 * - TOGGLE による選択トグル / クリア判定 / TIMEOUT 締切 / revealed 無効化。
 * - deriveReveal の分類（correct/missed/wrong/none）。
 */

import {
  GameConfig,
  GameState,
  initGame,
  gameReducer,
  isAllCorrect,
  countRotatingPatches,
  deriveReveal,
} from '../../../src/lib/v3/gameMachine';
import { PatchDef, isChanging } from '../../../src/lib/v3/patch';
import { mulberry32 } from '../../../src/lib/v2/rng';
import { levelToParams } from '../../../src/lib/v3/level';

/**
 * テスト決定論のため、個数は `fixedCount` で固定する（v3.2：個数はレベル外）。
 * fixedCount を渡さないテストは countRange のランダム抽選を確認する用途に限る。
 */
function configForLevel(level: number, fixedCount = 1): GameConfig {
  return { level, params: levelToParams(level), fixedCount };
}

/** 回転パッチの index 一覧。 */
function changingIndices(patches: readonly PatchDef[]): number[] {
  return patches.filter(isChanging).map((p) => p.index);
}

/** 静止パッチの index 一覧。 */
function staticIndices(patches: readonly PatchDef[]): number[] {
  return patches.filter((p) => !isChanging(p)).map((p) => p.index);
}

/** すべての回転パッチを選択した state を作る（ヘルパ）。 */
function selectAllChanging(state: GameState): GameState {
  let s = state;
  for (const idx of changingIndices(state.patches)) {
    s = gameReducer(s, { type: 'TOGGLE', index: idx });
  }
  return s;
}

describe('initGame', () => {
  it('playing フェーズで開始し、レベルの難易度変数で格子を生成する', () => {
    const state = initGame(configForLevel(1, 1), mulberry32(1));
    expect(state.phase).toBe('playing');
    expect(state.result).toBeNull();
    expect(state.selected.size).toBe(0);
    // L1 = 3x3、fixedCount=1
    expect(state.patches).toHaveLength(9);
    expect(changingIndices(state.patches)).toHaveLength(1);
  });

  it('config を保持する（level / params）', () => {
    const cfg = configForLevel(5, 1);
    const state = initGame(cfg, mulberry32(2));
    expect(state.config.level).toBe(5);
    expect(state.config.params).toEqual(levelToParams(5));
  });

  it('fixedCount を指定すると常にその個数で回転パッチを配置する（チュートリアル §4.8）', () => {
    for (const fixedCount of [1, 2, 3, 4]) {
      const state = initGame(configForLevel(1, fixedCount), mulberry32(fixedCount));
      expect(countRotatingPatches(state.patches)).toBe(fixedCount);
    }
  });

  it('fixedCount なし（countRange ランダム）では個数がシードで変動しうる（§4.9）', () => {
    const counts = new Set<number>();
    for (let seed = 1; seed <= 100; seed++) {
      const state = initGame(
        { level: 41, params: levelToParams(41), countRange: 'cells_minus_1' }, // 4x4
        mulberry32(seed),
      );
      counts.add(countRotatingPatches(state.patches));
    }
    expect(counts.size).toBeGreaterThan(1);
  });

  it('fixedCount は countRange より優先される', () => {
    const state = initGame(
      { level: 41, params: levelToParams(41), countRange: 'cells_minus_1', fixedCount: 2 },
      mulberry32(7),
    );
    expect(countRotatingPatches(state.patches)).toBe(2);
  });

  it('showCount フラグは config に保持される（個数表示の有無・§4.8）', () => {
    const tutorial = initGame(
      { level: 0, params: levelToParams(1), fixedCount: 3, showCount: true },
      mulberry32(1),
    );
    expect(tutorial.config.showCount).toBe(true);
    const normal = initGame(configForLevel(1, 1), mulberry32(1));
    expect(normal.config.showCount).toBeUndefined();
  });
});

describe('countRotatingPatches（回転個数を数える・「全て探せ」読み上げ用）', () => {
  it('回転パッチ数を正しく数える', () => {
    const state = initGame(configForLevel(1, 3), mulberry32(5));
    expect(countRotatingPatches(state.patches)).toBe(3);
    expect(countRotatingPatches(state.patches)).toBe(changingIndices(state.patches).length);
  });

  it('静止のみ（極端ケース）でも 0 を返す純粋カウント', () => {
    const allStatic: PatchDef[] = [
      { index: 0, changeKind: null, initialOrientationDeg: 0, rotationSpeed: 6, rotationDir: 'cw', direction: 'one-way' },
      { index: 1, changeKind: null, initialOrientationDeg: 30, rotationSpeed: 6, rotationDir: 'cw', direction: 'one-way' },
    ];
    expect(countRotatingPatches(allStatic)).toBe(0);
  });
});

describe('isAllCorrect（§4.3 クリア判定）', () => {
  it('回転集合と選択集合が一致したら true', () => {
    const state = initGame(configForLevel(4, 4), mulberry32(3)); // 3x3・fixedCount=4
    const changing = changingIndices(state.patches);
    const sel = new Set(changing);
    expect(isAllCorrect(state.patches, sel)).toBe(true);
  });

  it('選び逃し（FN>0）があると false', () => {
    const state = initGame(configForLevel(3, 3), mulberry32(4));
    const changing = changingIndices(state.patches);
    const sel = new Set(changing.slice(0, changing.length - 1)); // 1 個足りない
    expect(isAllCorrect(state.patches, sel)).toBe(false);
  });

  it('誤選択（FP>0）があると false', () => {
    const state = initGame(configForLevel(1, 1), mulberry32(5));
    const changing = changingIndices(state.patches);
    const stat = staticIndices(state.patches);
    const sel = new Set([...changing, stat[0]]); // 静止を 1 個含む
    expect(isAllCorrect(state.patches, sel)).toBe(false);
  });

  it('未選択（空集合）は false', () => {
    const state = initGame(configForLevel(1, 1), mulberry32(6));
    expect(isAllCorrect(state.patches, new Set())).toBe(false);
  });
});

describe('TOGGLE による選択', () => {
  it('未選択を選択、再 TOGGLE で解除', () => {
    const state = initGame(configForLevel(1, 1), mulberry32(7));
    const stat = staticIndices(state.patches)[0];
    const s1 = gameReducer(state, { type: 'TOGGLE', index: stat });
    expect(s1.selected.has(stat)).toBe(true);
    const s2 = gameReducer(s1, { type: 'TOGGLE', index: stat });
    expect(s2.selected.has(stat)).toBe(false);
  });
});

describe('v3.1：全問正解でも即時締め切りしない（§4.3 / AS-24）', () => {
  it('回転を過不足なく選んでも playing のまま（締切は TIMEOUT のみ）', () => {
    const state = initGame(configForLevel(1, 1), mulberry32(8));
    const final = selectAllChanging(state);
    expect(final.phase).toBe('playing'); // 即時締め切りしない
    expect(final.result).toBeNull();
    expect(isAllCorrect(final.patches, final.selected)).toBe(true);
  });

  it('回転 2 個を全部選んでも締め切らず、TIMEOUT で clear になる', () => {
    const state = initGame(configForLevel(2, 2), mulberry32(9));
    const changing = changingIndices(state.patches);
    expect(changing).toHaveLength(2);
    const s1 = gameReducer(state, { type: 'TOGGLE', index: changing[0] });
    expect(s1.phase).toBe('playing');
    const s2 = gameReducer(s1, { type: 'TOGGLE', index: changing[1] });
    expect(s2.phase).toBe('playing'); // v3.1：まだ締め切らない
    const s3 = gameReducer(s2, { type: 'TIMEOUT' });
    expect(s3.phase).toBe('revealed');
    expect(s3.result).toBe('clear');
  });

  it('静止を選んだまま回転も全選択しても playing のまま（FP>0）', () => {
    const state = initGame(configForLevel(1, 1), mulberry32(10));
    const stat = staticIndices(state.patches)[0];
    const s1 = gameReducer(state, { type: 'TOGGLE', index: stat });
    const s2 = selectAllChanging(s1);
    expect(s2.phase).toBe('playing');
  });
});

describe('TIMEOUT による締め切り', () => {
  it('全問正解状態で TIMEOUT → clear', () => {
    const state = initGame(configForLevel(1, 1), mulberry32(11));
    const full = selectAllChanging(state);
    expect(full.phase).toBe('playing');
    const timedOut = gameReducer(full, { type: 'TIMEOUT' });
    expect(timedOut.phase).toBe('revealed');
    expect(timedOut.result).toBe('clear');
  });

  it('未選択のまま TIMEOUT → fail', () => {
    const state = initGame(configForLevel(1, 1), mulberry32(21));
    const timedOut = gameReducer(state, { type: 'TIMEOUT' });
    expect(timedOut.phase).toBe('revealed');
    expect(timedOut.result).toBe('fail');
  });

  it('選び逃しありで TIMEOUT → fail', () => {
    const state = initGame(configForLevel(3, 3), mulberry32(12));
    const changing = changingIndices(state.patches);
    let s = state;
    s = gameReducer(s, { type: 'TOGGLE', index: changing[0] });
    s = gameReducer(s, { type: 'TIMEOUT' });
    expect(s.result).toBe('fail');
  });

  it('誤選択ありで TIMEOUT → fail', () => {
    const state = initGame(configForLevel(2, 2), mulberry32(13));
    const changing = changingIndices(state.patches);
    const stat = staticIndices(state.patches)[0];
    let s = state;
    s = gameReducer(s, { type: 'TOGGLE', index: changing[0] });
    s = gameReducer(s, { type: 'TOGGLE', index: stat });
    s = gameReducer(s, { type: 'TIMEOUT' });
    expect(s.result).toBe('fail');
  });
});

describe('revealed フェーズの入力無効化', () => {
  it('締め切り後の TOGGLE は無視', () => {
    const state = initGame(configForLevel(1, 1), mulberry32(15));
    const revealed = gameReducer(state, { type: 'TIMEOUT' });
    const stat = staticIndices(state.patches)[0];
    const after = gameReducer(revealed, { type: 'TOGGLE', index: stat });
    expect(after).toBe(revealed); // 変化なし
  });

  it('締め切り後の TIMEOUT は無視', () => {
    const state = initGame(configForLevel(1, 1), mulberry32(16));
    const revealed = gameReducer(state, { type: 'TIMEOUT' });
    const after = gameReducer(revealed, { type: 'TIMEOUT' });
    expect(after).toBe(revealed);
  });
});

describe('1 ゲーム = 1 レベル挑戦（複数ラウンドなし）', () => {
  it('締め切り後に次ラウンドへ進む遷移が存在しない（revealed が終端）', () => {
    const state = initGame(configForLevel(1, 1), mulberry32(17));
    const revealed = gameReducer(state, { type: 'TIMEOUT' });
    expect(revealed.phase).toBe('revealed');
    expect(gameReducer(revealed, { type: 'TIMEOUT' }).phase).toBe('revealed');
    expect(
      gameReducer(revealed, { type: 'TOGGLE', index: 0 }).phase,
    ).toBe('revealed');
  });
});

describe('deriveReveal（F-03 ✅/❌ 分類）', () => {
  it('正選択=correct / 選び逃し=missed / 誤選択=wrong / 静止無選択=none', () => {
    const state = initGame(configForLevel(3, 3), mulberry32(18));
    const changing = changingIndices(state.patches);
    const stat = staticIndices(state.patches);
    const selected = new Set<number>([changing[0], changing[1], stat[0]]);
    const reveal = deriveReveal(state.patches, selected);
    const byIndex = new Map(reveal.map((r) => [r.index, r.kind]));

    expect(byIndex.get(changing[0])).toBe('correct');
    expect(byIndex.get(changing[1])).toBe('correct');
    expect(byIndex.get(changing[2])).toBe('missed');
    expect(byIndex.get(stat[0])).toBe('wrong');
    expect(byIndex.get(stat[1])).toBe('none');
  });

  it('全問正解クリア時は回転=correct・静止=none のみ', () => {
    const state = initGame(configForLevel(1, 1), mulberry32(19));
    const final = selectAllChanging(state);
    const reveal = deriveReveal(final.patches, final.selected);
    for (const r of reveal) {
      expect(['correct', 'none']).toContain(r.kind);
    }
    expect(reveal.filter((r) => r.kind === 'correct')).toHaveLength(1);
  });

  it('patches の順（行優先 index）で返す', () => {
    const state = initGame(configForLevel(1, 1), mulberry32(20));
    const reveal = deriveReveal(state.patches, new Set());
    expect(reveal.map((r) => r.index)).toEqual(
      state.patches.map((p) => p.index),
    );
  });
});
