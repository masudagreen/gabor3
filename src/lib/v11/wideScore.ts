/**
 * wideScore — F-11 ワイドスコア計算（spec-v11.md §F-11）。
 *
 * 定義（spec §F-11）：
 *   - `releaseEnabled=true` のゲームのうち実施したものの正規化スコア
 *     （0〜100、整数四捨五入）の算術平均
 *   - 各ゲームの閾値は paramRange の「易しい端 = 0、難しい端 = 100」に
 *     線形マッピング
 *   - 実施していないゲームは平均から除外（実施 0 なら null）
 *   - 同日複数セッション：その日の最良スコア（max）を採用
 *
 * gameRegistry の paramRange 定義に従う：
 *   - min = 難しい端、max = 易しい端（staircaseV11.ts の規約と整合）
 *   - 例：G-04 min=0.05（難）/ max=0.30（易） → 0.05 が 100 点、0.30 が 0 点
 *
 * 本モジュールは UI 非依存・AsyncStorage 非依存。
 */

import {
  GAME_REGISTRY,
  GameDefinition,
  getGameDefinition,
} from '../../state/gameRegistry';
import { GameIdV11 } from '../../state/gameIds-v11';

/**
 * 1 ゲームの閾値を 0〜100 に正規化する。
 *
 * 規約：min（難しい端）= 100、max（易しい端）= 0。
 * クランプ：threshold が範囲外でも 0〜100 に丸める。
 *
 * @returns 0〜100 の整数（四捨五入）。range.min == range.max なら 0
 */
export function normalizeThreshold(
  gameId: GameIdV11,
  threshold: number,
): number {
  const def = getGameDefinition(gameId);
  if (!def) return 0;
  const { min, max } = def.paramRange;
  if (min === max) return 0;
  // min（難）= 100、max（易）= 0
  const ratio = (max - threshold) / (max - min);
  const clamped = Math.max(0, Math.min(1, ratio));
  return Math.round(clamped * 100);
}

/**
 * 複数ゲームの閾値マップから 1 セッション分のワイドスコアを算出する。
 *
 * - releaseEnabled=true のゲームのうち、`thresholds` に含まれるものだけ集計
 * - 算術平均を四捨五入して整数化
 * - 1 ゲームも含まれていなければ null
 *
 * @param thresholds 各ゲームの閾値（実施したゲームのみキーがあればよい）
 */
export function computeWideScore(
  thresholds: Partial<Record<GameIdV11, number>>,
): number | null {
  const enabledGames: ReadonlyArray<GameDefinition> = GAME_REGISTRY.filter(
    (g) => g.releaseEnabled,
  );
  const normalizedScores: number[] = [];
  for (const def of enabledGames) {
    const v = thresholds[def.gameId];
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    normalizedScores.push(normalizeThreshold(def.gameId, v));
  }
  if (normalizedScores.length === 0) return null;
  const avg =
    normalizedScores.reduce((a, b) => a + b, 0) / normalizedScores.length;
  return Math.round(avg);
}

/**
 * 同日複数セッションの結果から、その日のワイドスコアを算出する。
 *
 * @param sessionScores 当日の各セッション分のワイドスコア（null は除外）
 * @returns max スコア。空なら null
 */
export function dailyWideScoreFromSessions(
  sessionScores: ReadonlyArray<number | null>,
): number | null {
  const valid = sessionScores.filter(
    (s): s is number => typeof s === 'number' && Number.isFinite(s),
  );
  if (valid.length === 0) return null;
  return Math.max(...valid);
}

/**
 * 「同日の各ゲームの最良閾値（gameBestThresholds）」から、その日のワイドスコアを
 * 算出するショートカット。
 *
 * - DailyStats.gameBestThresholds は staircase の paramValue 規約に従って
 *   「小さいほど難しい = 良い」（min を採用）。
 * - releaseEnabled=true のゲームのみ対象。
 */
export function wideScoreFromDailyBest(
  bestThresholds: Partial<Record<GameIdV11, number>>,
): number | null {
  return computeWideScore(bestThresholds);
}
