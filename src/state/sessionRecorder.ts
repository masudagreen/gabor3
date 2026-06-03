/**
 * sessionRecorder.ts — 完了したゲームセッションを SessionRecord（spec §6.4）へ
 * 変換し、S2 の repository で永続化する（F-04 / §6）。
 *
 * 中断（completedAt=null）は記録対象外（F-07）。本モジュールは完了セッションのみを
 * 受け取り保存する。日次集計・ストリーク・バッジは S7/S8 が担当（ここでは行わない）。
 */

import type { GameConfig } from '../lib/v2/gameMachine';
import { RoundScore, computeSessionScore, toRoundRecord } from '../lib/v2/scoring';
import type { ParamsSnapshot, RoundRecord, SessionRecord } from './schema';
import { saveSession } from './repository';

export function paramsSnapshotOf(config: GameConfig): ParamsSnapshot {
  return {
    n: config.gridSize,
    m: config.roundSeconds,
    r: config.roundCount,
    a: config.rotationSpeed,
    b: config.sfChangeSpeed,
    scoringMode: config.scoringMode,
  };
}

/**
 * 完了セッションの SessionRecord を組み立てる（純関数、永続化はしない）。
 * sessionId / startedAt / completedAt は呼び出し側が用意する（テスト決定論のため）。
 */
export function buildSessionRecord(args: {
  sessionId: string;
  startedAt: string;
  completedAt: string;
  config: GameConfig;
  roundScores: readonly RoundScore[];
}): SessionRecord {
  const rounds: RoundRecord[] = args.roundScores.map((s, i) =>
    toRoundRecord(s, i + 1),
  );
  return {
    sessionId: args.sessionId,
    startedAt: args.startedAt,
    completedAt: args.completedAt,
    paramsSnapshot: paramsSnapshotOf(args.config),
    rounds,
    sessionScore: computeSessionScore(args.roundScores),
  };
}

/** 完了セッションを永続化する（F-04 / §6.4）。 */
export async function persistCompletedSession(args: {
  sessionId: string;
  startedAt: string;
  completedAt: string;
  config: GameConfig;
  roundScores: readonly RoundScore[];
}): Promise<SessionRecord> {
  const record = buildSessionRecord(args);
  await saveSession(record);
  return record;
}
