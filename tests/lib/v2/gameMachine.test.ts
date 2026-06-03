/**
 * gameMachine.test.ts — 採点 3 方式の状態機械・ラウンド/セッション進行（F-01/F-02/F-04）。
 */

import { mulberry32, Rng } from '../../../src/lib/v2/rng';
import {
  GameConfig,
  GameState,
  initGame,
  gameReducer,
} from '../../../src/lib/v2/gameMachine';
import { isChanging } from '../../../src/lib/v2/patch';
import type { ScoringMode } from '../../../src/state/schema';

function config(over: Partial<GameConfig> = {}): GameConfig {
  return {
    gridSize: 4,
    roundSeconds: 20,
    roundCount: 3,
    rotationSpeed: 6,
    sfChangeSpeed: 0.15,
    scoringMode: 'auto-no-confirm',
    ...over,
  };
}

/** state 内の変化パッチ index 配列。 */
function changingIndices(state: GameState): number[] {
  return state.patches.filter(isChanging).map((p) => p.index);
}

/** 固定 rng（決定論）。 */
function fixedRng(): Rng {
  return mulberry32(123);
}

describe('initGame', () => {
  it('ラウンド 1・playing フェーズ・選択空で開始する', () => {
    const s = initGame(config(), fixedRng());
    expect(s.roundIndex).toBe(1);
    expect(s.phase).toBe('playing');
    expect(s.selected.size).toBe(0);
    expect(s.patches).toHaveLength(16);
    expect(s.roundScores).toHaveLength(0);
    expect(s.sessionScore).toBeNull();
  });
});

describe('TOGGLE（選択トグル）', () => {
  it('選択 → 再選択で解除', () => {
    const rng = fixedRng();
    let s = initGame(config(), rng);
    s = gameReducer(s, { type: 'TOGGLE', index: 0 }, rng);
    expect(s.selected.has(0)).toBe(true);
    s = gameReducer(s, { type: 'TOGGLE', index: 0 }, rng);
    expect(s.selected.has(0)).toBe(false);
  });

  it('revealed フェーズ中のタップは無効（採点後の選択変更を防ぐ）', () => {
    const rng = fixedRng();
    let s = initGame(config(), rng);
    s = gameReducer(s, { type: 'TIMEOUT' }, rng); // 採点 → revealed
    const before = new Set(s.selected);
    s = gameReducer(s, { type: 'TOGGLE', index: 0 }, rng);
    expect(s.selected).toEqual(before);
    expect(s.phase).toBe('revealed');
  });
});

describe('方式①（auto-no-confirm）', () => {
  it('TIMEOUT で採点され revealed になる', () => {
    const rng = fixedRng();
    let s = initGame(config({ scoringMode: 'auto-no-confirm' }), rng);
    s = gameReducer(s, { type: 'TIMEOUT' }, rng);
    expect(s.phase).toBe('revealed');
    expect(s.lastScore).not.toBeNull();
    expect(s.roundScores).toHaveLength(1);
  });

  it('CONFIRM は無視される（確定ボタンなし）', () => {
    const rng = fixedRng();
    let s = initGame(config({ scoringMode: 'auto-no-confirm' }), rng);
    s = gameReducer(s, { type: 'CONFIRM' }, rng);
    expect(s.phase).toBe('playing');
    expect(s.roundScores).toHaveLength(0);
  });

  it('未選択でも TIMEOUT で採点される（TP=0/FP=0）', () => {
    const rng = fixedRng();
    let s = initGame(config({ scoringMode: 'auto-no-confirm' }), rng);
    s = gameReducer(s, { type: 'TIMEOUT' }, rng);
    expect(s.lastScore?.tpCount).toBe(0);
    expect(s.lastScore?.fpCount).toBe(0);
  });
});

describe('方式②（auto-confirm）', () => {
  it('CONFIRM で m 秒を待たず即採点される', () => {
    const rng = fixedRng();
    let s = initGame(config({ scoringMode: 'auto-confirm' }), rng);
    s = gameReducer(s, { type: 'CONFIRM' }, rng);
    expect(s.phase).toBe('revealed');
    expect(s.roundScores).toHaveLength(1);
    expect(s.advancedByAllCorrect).toBe(false);
  });

  it('CONFIRM しなければ TIMEOUT で採点される', () => {
    const rng = fixedRng();
    let s = initGame(config({ scoringMode: 'auto-confirm' }), rng);
    s = gameReducer(s, { type: 'TIMEOUT' }, rng);
    expect(s.phase).toBe('revealed');
  });
});

describe('方式③（all-correct-advance）', () => {
  it('全問正解の瞬間に即採点・即 reveal（advancedByAllCorrect=true）', () => {
    const rng = fixedRng();
    let s = initGame(config({ scoringMode: 'all-correct-advance' }), rng);
    const changing = changingIndices(s);
    // 変化パッチを順に選択。最後の 1 個で全問正解になり即遷移するはず。
    for (let i = 0; i < changing.length; i++) {
      s = gameReducer(s, { type: 'TOGGLE', index: changing[i] }, rng);
    }
    expect(s.phase).toBe('revealed');
    expect(s.advancedByAllCorrect).toBe(true);
    expect(s.lastScore?.fnCount).toBe(0);
    expect(s.lastScore?.fpCount).toBe(0);
  });

  it('誤選択がある間は遷移しない（playing のまま）', () => {
    const rng = fixedRng();
    let s = initGame(config({ scoringMode: 'all-correct-advance' }), rng);
    const changing = changingIndices(s);
    const staticIdx = s.patches.find((p) => !isChanging(p))!.index;
    // 先に静止を誤選択 → 以降は FP>0 が残るので全変化を選んでも遷移しない。
    s = gameReducer(s, { type: 'TOGGLE', index: staticIdx }, rng);
    for (const idx of changing) {
      s = gameReducer(s, { type: 'TOGGLE', index: idx }, rng);
    }
    expect(s.phase).toBe('playing');
  });

  it('選び逃しがある間は遷移しない', () => {
    const rng = fixedRng();
    let s = initGame(config({ scoringMode: 'all-correct-advance' }), rng);
    const changing = changingIndices(s);
    if (changing.length < 2) return; // 変化 1 個の盤面はこのケースに不適
    // 1 個だけ残して選択 → FN>0 で遷移しない
    for (let i = 0; i < changing.length - 1; i++) {
      s = gameReducer(s, { type: 'TOGGLE', index: changing[i] }, rng);
    }
    expect(s.phase).toBe('playing');
  });

  it('TIMEOUT で強制採点される（advancedByAllCorrect=false）', () => {
    const rng = fixedRng();
    let s = initGame(config({ scoringMode: 'all-correct-advance' }), rng);
    s = gameReducer(s, { type: 'TIMEOUT' }, rng);
    expect(s.phase).toBe('revealed');
    expect(s.advancedByAllCorrect).toBe(false);
  });

  it('CONFIRM は無視される', () => {
    const rng = fixedRng();
    let s = initGame(config({ scoringMode: 'all-correct-advance' }), rng);
    s = gameReducer(s, { type: 'CONFIRM' }, rng);
    expect(s.phase).toBe('playing');
  });
});

describe('ラウンド → セッション進行', () => {
  it('NEXT で次ラウンドへ進み、選択がリセットされ新パッチが生成される', () => {
    const rng = fixedRng();
    let s = initGame(config({ roundCount: 3 }), rng);
    s = gameReducer(s, { type: 'TOGGLE', index: 0 }, rng);
    s = gameReducer(s, { type: 'TIMEOUT' }, rng);
    s = gameReducer(s, { type: 'NEXT' }, rng);
    expect(s.roundIndex).toBe(2);
    expect(s.phase).toBe('playing');
    expect(s.selected.size).toBe(0);
    expect(s.lastScore).toBeNull();
  });

  it('最終ラウンド完了でセッション完了に遷移しスコアが確定する', () => {
    const rng = fixedRng();
    let s = initGame(config({ roundCount: 2 }), rng);
    // ラウンド 1：全問正解にして TP を稼ぐ
    for (const idx of changingIndices(s)) {
      s = gameReducer(s, { type: 'TOGGLE', index: idx }, rng);
    }
    if (s.phase === 'playing') s = gameReducer(s, { type: 'TIMEOUT' }, rng);
    s = gameReducer(s, { type: 'NEXT' }, rng);
    // ラウンド 2：全問正解
    for (const idx of changingIndices(s)) {
      s = gameReducer(s, { type: 'TOGGLE', index: idx }, rng);
    }
    if (s.phase === 'playing') s = gameReducer(s, { type: 'TIMEOUT' }, rng);
    s = gameReducer(s, { type: 'NEXT' }, rng);

    expect(s.phase).toBe('session-complete');
    expect(s.roundScores).toHaveLength(2);
    expect(s.sessionScore).toBe(100); // 全正答・誤選択ゼロ
  });

  it('全ラウンド未選択ならセッションスコア 0', () => {
    const rng = fixedRng();
    let s = initGame(config({ roundCount: 3, scoringMode: 'auto-no-confirm' }), rng);
    for (let r = 0; r < 3; r++) {
      s = gameReducer(s, { type: 'TIMEOUT' }, rng);
      s = gameReducer(s, { type: 'NEXT' }, rng);
    }
    expect(s.phase).toBe('session-complete');
    expect(s.sessionScore).toBe(0);
  });

  it('playing 中の NEXT は無視される', () => {
    const rng = fixedRng();
    let s = initGame(config(), rng);
    s = gameReducer(s, { type: 'NEXT' }, rng);
    expect(s.phase).toBe('playing');
    expect(s.roundIndex).toBe(1);
  });

  it('session-complete 後のイベントは状態を変えない', () => {
    const rng = fixedRng();
    let s = initGame(config({ roundCount: 1 }), rng);
    s = gameReducer(s, { type: 'TIMEOUT' }, rng);
    s = gameReducer(s, { type: 'NEXT' }, rng);
    expect(s.phase).toBe('session-complete');
    const snapshot = s;
    s = gameReducer(s, { type: 'TOGGLE', index: 0 }, rng);
    s = gameReducer(s, { type: 'TIMEOUT' }, rng);
    expect(s).toBe(snapshot);
  });
});

describe('採点方式の網羅（全 3 方式が同じ採点規則）', () => {
  const modes: ScoringMode[] = [
    'auto-no-confirm',
    'auto-confirm',
    'all-correct-advance',
  ];
  it.each(modes)('%s：採点で TP/FP/FN が算出される', (mode) => {
    const rng = mulberry32(55);
    let s = initGame(config({ scoringMode: mode }), rng);
    const changing = changingIndices(s);
    s = gameReducer(s, { type: 'TOGGLE', index: changing[0] }, rng);
    if (s.phase === 'playing') s = gameReducer(s, { type: 'TIMEOUT' }, rng);
    expect(s.phase).toBe('revealed');
    expect(s.lastScore).not.toBeNull();
    expect(s.lastScore!.tpCount).toBeGreaterThanOrEqual(1);
  });
});
