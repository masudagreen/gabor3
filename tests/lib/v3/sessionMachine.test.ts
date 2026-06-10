/**
 * sessionMachine.test.ts — v3.1 セッション統括ロジック（純関数、spec §4.6 / §4.4 / F-04 / F-07）。
 *
 * 検証範囲：
 * - startSession：開始レベル・制限秒・初期集計。
 * - completeRound：ラウンドごとの即昇降（applyResult）・累積経過・集計更新・終了判定。
 * - セッションループ：累積経過が limitSec 到達でラウンド反復終了（最後のラウンドは完走）。
 * - 連続失敗のラウンド/セッション跨ぎ永続（completeRound 連鎖）。
 * - 3 秒開示は累積経過に算入しない（roundPlaySec のみ）。
 * - hasCompletedRounds / shouldContinue（中断記録要否・継続判定）。
 */

import {
  startSession,
  completeRound,
  shouldContinue,
  hasCompletedRounds,
} from '../../../src/lib/v3/sessionMachine';
import type { LevelState } from '../../../src/lib/v3/level';

const L = (
  currentLevel: number,
  consecutiveFailures = 0,
  highestLevel = 0,
): LevelState => ({ currentLevel, consecutiveFailures, highestLevel });

describe('startSession', () => {
  it('開始レベル・制限秒（分×60）・初期集計を設定する', () => {
    const s = startSession(L(7, 1, 6), 5);
    expect(s.startLevel).toBe(7);
    expect(s.levelState).toEqual(L(7, 1, 6));
    expect(s.sessionMinutes).toBe(5);
    expect(s.limitSec).toBe(300);
    expect(s.elapsedSec).toBe(0);
    expect(s.finished).toBe(false);
    expect(s.totals).toEqual({
      roundCount: 0,
      clearCount: 0,
      failCount: 0,
      highestLevelInSession: 7,
      highestClearedLevel: 0,
      clearedLevelParams: [],
    });
  });
});

describe('completeRound（§4.4 即昇降 + §4.6 累積/終了判定）', () => {
  it('クリア → レベル +1・clearCount+1・累積に roundPlaySec を加算・継続', () => {
    const s0 = startSession(L(7), 5);
    const { session, levelDelta, playedLevel } = completeRound(s0, 'clear', 20);
    expect(playedLevel).toBe(7);
    expect(levelDelta).toBe(1);
    expect(session.levelState.currentLevel).toBe(8);
    expect(session.totals.roundCount).toBe(1);
    expect(session.totals.clearCount).toBe(1);
    expect(session.totals.failCount).toBe(0);
    expect(session.totals.highestClearedLevel).toBe(7);
    expect(session.totals.highestLevelInSession).toBe(7);
    expect(session.elapsedSec).toBe(20);
    expect(session.finished).toBe(false);
    expect(shouldContinue(session)).toBe(true);
  });

  it('失敗 → failCount+1・連続失敗 +1（1 回目はレベル不変）', () => {
    const s0 = startSession(L(7), 5);
    const { session, levelDelta } = completeRound(s0, 'fail', 20);
    expect(levelDelta).toBe(0);
    expect(session.levelState.currentLevel).toBe(7);
    expect(session.levelState.consecutiveFailures).toBe(1);
    expect(session.totals.failCount).toBe(1);
    expect(session.totals.highestClearedLevel).toBe(0);
  });

  it('2 連続失敗（ラウンド跨ぎ）でレベル −1・連続失敗 0 リセット', () => {
    let s = startSession(L(7), 5);
    s = completeRound(s, 'fail', 20).session;
    const out = completeRound(s, 'fail', 20);
    expect(out.levelDelta).toBe(-1);
    expect(out.session.levelState.currentLevel).toBe(6);
    expect(out.session.levelState.consecutiveFailures).toBe(0);
    expect(out.session.totals.failCount).toBe(2);
  });

  it('失敗→クリア→失敗 では下がらない（クリアで連続失敗リセット）', () => {
    let s = startSession(L(7), 5);
    s = completeRound(s, 'fail', 20).session; // 連続失敗 1
    s = completeRound(s, 'clear', 20).session; // クリアでリセット & +1 → L8
    const out = completeRound(s, 'fail', 20); // 失敗 1 回目 → 不変
    expect(out.levelDelta).toBe(0);
    expect(out.session.levelState.currentLevel).toBe(8);
  });

  it('3 秒開示は累積に算入しない（roundPlaySec のみ加算される）', () => {
    let s = startSession(L(1), 1); // limit 60 秒
    s = completeRound(s, 'fail', 40).session;
    expect(s.elapsedSec).toBe(40); // 開示 3 秒は含まない
    s = completeRound(s, 'fail', 15).session;
    expect(s.elapsedSec).toBe(55);
    expect(s.finished).toBe(false); // 55 < 60
  });
});

describe('セッションループ（§4.6 累積到達で終了・最後のラウンド完走）', () => {
  it('累積が limitSec 到達でセッション終了（finished=true・shouldContinue=false）', () => {
    let s = startSession(L(1), 1); // limit 60
    s = completeRound(s, 'clear', 30).session; // 30
    expect(s.finished).toBe(false);
    s = completeRound(s, 'clear', 30).session; // 60 → 到達
    expect(s.finished).toBe(true);
    expect(shouldContinue(s)).toBe(false);
  });

  it('最後のラウンドが制限を超えても打ち切らず完走し、その後終了', () => {
    let s = startSession(L(1), 1); // limit 60
    s = completeRound(s, 'clear', 55).session; // 55 < 60 → 継続
    expect(s.finished).toBe(false);
    s = completeRound(s, 'clear', 40).session; // 95 > 60 → 完走後に終了
    expect(s.finished).toBe(true);
    expect(s.totals.roundCount).toBe(2);
  });

  it('終了後の completeRound は無視される（冪等・レベル変化なし）', () => {
    let s = startSession(L(1), 1);
    s = completeRound(s, 'clear', 60).session; // 到達 → finished
    const after = completeRound(s, 'clear', 60);
    expect(after.session).toBe(s); // 変化なし
    expect(after.levelDelta).toBe(0);
  });
});

describe('hasCompletedRounds（F-07 中断記録要否）', () => {
  it('完了済みラウンド 0 件 → false（記録しない）', () => {
    const s = startSession(L(7), 5);
    expect(hasCompletedRounds(s)).toBe(false);
  });
  it('完了済みラウンド 1 件以上 → true（記録する）', () => {
    const s = completeRound(startSession(L(7), 5), 'clear', 20).session;
    expect(hasCompletedRounds(s)).toBe(true);
  });
});

describe('中断時のレベル変化保持（AS-30）', () => {
  it('完了済みラウンドのレベル変化は session.levelState に反映済みで保持される', () => {
    let s = startSession(L(7), 5);
    s = completeRound(s, 'clear', 20).session; // L8
    s = completeRound(s, 'clear', 20).session; // L9
    // 進行中の未完ラウンドは completeRound を呼ばない（破棄）→ levelState は L9 のまま。
    expect(s.levelState.currentLevel).toBe(9);
    expect(s.totals.roundCount).toBe(2);
  });
});
