/**
 * courseSession — F-05 全ゲーム連続コースの進行状態と進行ロジック（純関数）。
 *
 * spec-v11.md §F-05：
 *   - `releaseEnabled=true` のゲームのみが対象、定義順（order 昇順）または
 *     日付シードランダム
 *   - 距離リマインド 3 秒 → ゲーム N 60 秒 → 結果サマリ 10 秒（or 「次へ」即進行）
 *     → … → 最終ゲーム結果 → クールダウン 10 秒 → 完了
 *   - コース中断時は確認ダイアログ
 *
 * 本モジュールは UI 非依存・AsyncStorage 非依存の純関数群。状態遷移の正しさを
 * テストできるように分離する。
 */

import { GameDefinition, getEnabledGames } from '../../state/gameRegistry';
import { GameIdV11 } from '../../state/gameIds-v11';
import { GameSessionResultV11 } from '../../state/storage-v11';

/** 各 phase の論理状態（S18-02 フロー図） */
export type CoursePhase =
  /** S8-03 距離リマインド 3 秒 */
  | { kind: 'distance-reminder' }
  /** ゲーム本体（60 秒）、index は enabledGames の 0-based 位置 */
  | { kind: 'game'; index: number; gameId: GameIdV11 }
  /** ゲーム間結果サマリ（10 秒カウントダウン or「次へ」） */
  | {
      kind: 'interstitial';
      index: number;
      gameId: GameIdV11;
      isFinalGame: boolean;
    }
  /** クールダウン 10 秒 */
  | { kind: 'cooldown' }
  /** コース完了 */
  | { kind: 'complete' };

/** コース順序生成方針 */
export type CourseOrderingMode = 'registry-order' | 'date-seeded-random';

/** コースセッション状態 */
export type CourseSessionState = {
  /** UUID 文字列（呼び出し側で生成） */
  sessionId: string;
  /** ISO 8601 開始日時 */
  startedAt: string;
  /** このコースで実行する全ゲーム（順序確定済み、releaseEnabled=true のみ） */
  games: ReadonlyArray<GameDefinition>;
  /** 各ゲームの結果（実施済みのものだけ追加されていく） */
  results: ReadonlyArray<GameSessionResultV11>;
  /** 現在の phase */
  phase: CoursePhase;
};

/**
 * 日付シード（YYYY-MM-DD）から決定論的な疑似乱数で配列をシャッフルする。
 *
 * 同じ日付シードでは同じ並びを返す（テスト容易性）。
 */
export function shuffleByDateSeed<T>(
  arr: ReadonlyArray<T>,
  dateSeed: string,
): T[] {
  // mulberry32 を date hash で初期化
  let h = 0;
  for (let i = 0; i < dateSeed.length; i++) {
    h = (h << 5) - h + dateSeed.charCodeAt(i);
    h |= 0;
  }
  let s = h >>> 0;
  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * コース対象ゲーム列を構築する（F-05 / F-18）。
 *
 * - `releaseEnabled=true` のみ抽出
 * - `registry-order`：order 昇順
 * - `date-seeded-random`：order 昇順を base に dateSeed で決定論シャッフル
 */
export function buildCourseGames(
  ordering: CourseOrderingMode = 'registry-order',
  dateSeed?: string,
): ReadonlyArray<GameDefinition> {
  const enabled = getEnabledGames();
  if (ordering === 'date-seeded-random' && dateSeed) {
    return shuffleByDateSeed(enabled, dateSeed);
  }
  return enabled;
}

/**
 * 新規コースセッションを作る。最初の phase は距離リマインド。
 *
 * @param sessionId UUID 等
 * @param startedAt ISO 8601 文字列
 * @param ordering コース順序（既定：registry-order）
 * @param dateSeed date-seeded-random 時の日付（YYYY-MM-DD 等）
 */
export function startCourseSession(args: {
  sessionId: string;
  startedAt: string;
  ordering?: CourseOrderingMode;
  dateSeed?: string;
}): CourseSessionState {
  const games = buildCourseGames(args.ordering ?? 'registry-order', args.dateSeed);
  return {
    sessionId: args.sessionId,
    startedAt: args.startedAt,
    games,
    results: [],
    phase: { kind: 'distance-reminder' },
  };
}

/** distance-reminder 完了 → 1 ゲーム目へ */
export function advanceFromDistanceReminder(
  state: CourseSessionState,
): CourseSessionState {
  if (state.phase.kind !== 'distance-reminder') return state;
  if (state.games.length === 0) {
    return { ...state, phase: { kind: 'complete' } };
  }
  return {
    ...state,
    phase: { kind: 'game', index: 0, gameId: state.games[0].gameId },
  };
}

/**
 * ゲーム N 終了 → 結果記録 + interstitial へ。
 *
 * @param state 現在状態（phase が game であること）
 * @param result 当該ゲームの GameSessionResultV11
 */
export function completeGameWithResult(
  state: CourseSessionState,
  result: GameSessionResultV11,
): CourseSessionState {
  if (state.phase.kind !== 'game') return state;
  const idx = state.phase.index;
  const isFinal = idx >= state.games.length - 1;
  return {
    ...state,
    results: [...state.results, result],
    phase: {
      kind: 'interstitial',
      index: idx,
      gameId: state.games[idx].gameId,
      isFinalGame: isFinal,
    },
  };
}

/**
 * interstitial 完了 → 次のゲーム or クールダウンへ。
 *
 * 最終ゲームの interstitial 後はクールダウン。それ以外は次のゲームへ。
 */
export function advanceFromInterstitial(
  state: CourseSessionState,
): CourseSessionState {
  if (state.phase.kind !== 'interstitial') return state;
  const next = state.phase.index + 1;
  if (next >= state.games.length) {
    return { ...state, phase: { kind: 'cooldown' } };
  }
  return {
    ...state,
    phase: { kind: 'game', index: next, gameId: state.games[next].gameId },
  };
}

/** クールダウン完了 / スキップ → 完了画面 */
export function advanceFromCooldown(
  state: CourseSessionState,
): CourseSessionState {
  if (state.phase.kind !== 'cooldown') return state;
  return { ...state, phase: { kind: 'complete' } };
}

/**
 * 現在のゲーム index を返す（game / interstitial 時のみ）。それ以外は null。
 */
export function currentGameIndex(state: CourseSessionState): number | null {
  if (state.phase.kind === 'game' || state.phase.kind === 'interstitial') {
    return state.phase.index;
  }
  return null;
}

/** 「次のゲーム」の表示用ラベルを組み立てる（interstitial「次：G-NN 名称」） */
export function nextGameLabel(state: CourseSessionState): string | null {
  if (state.phase.kind !== 'interstitial') return null;
  if (state.phase.isFinalGame) return null; // 次は cooldown
  const nextIdx = state.phase.index + 1;
  const next = state.games[nextIdx];
  if (!next) return null;
  return `${next.gameId} ${next.nameJa}`;
}

/** カウントダウン秒数の定数（spec §F-05 / §F-15 / §F-16） */
export const COURSE_TIMING = {
  distanceReminderSec: 3,
  perGameSec: 60,
  interstitialSec: 10,
  cooldownSec: 10,
} as const;

/**
 * コース 1 周の概算所要時間（秒）。enabledGames の数に応じて動的に変わる。
 * UI の「約 N 分」表示用：Math.round(estimateCourseDurationSec / 60)
 */
export function estimateCourseDurationSec(gameCount: number): number {
  if (gameCount <= 0) return 0;
  return (
    COURSE_TIMING.distanceReminderSec +
    gameCount * COURSE_TIMING.perGameSec +
    gameCount * COURSE_TIMING.interstitialSec +
    COURSE_TIMING.cooldownSec
  );
}
