/**
 * releaseFilter — F-18「面白いゲーム選定」運用フラグの一元化（spec-v11.md §F-18）。
 *
 * `releaseEnabled=true` のゲーム集合を返す純関数。`gameRegistry.getEnabledGames()`
 * の薄いラッパだが、呼び出し側のロジックを `getEnabledGames()` 直叩きから
 * `getReleaseEnabledGames()` 経由に揃えるための名前空間として用意する。
 *
 * F-18 受け入れ基準：
 *   - [ ] disabled ゲームはホーム一覧から消える
 *   - [ ] disabled は連続コース対象外
 *   - [ ] disabled はワイドスコア集計から除外
 *   - [ ] disabled の進捗グラフタブ非表示
 *   - [ ] disabled に依存するバッジは除外集合で再評価
 *   - [ ] 一般ユーザー向け UI なし（コードレベル切替）
 *
 * 本モジュールの方針：
 *   - 上記すべての画面・ロジックは `getReleaseEnabledGames()` /
 *     `getReleaseEnabledGameIdSet()` を経由してフィルタ適用する
 *   - 直接 `GAME_REGISTRY.filter(g => g.releaseEnabled)` を書かない（散在防止）
 *   - 一般ユーザー UI からは触れず、リリースビルド前に `gameRegistry.ts` の
 *     `releaseEnabled` を編集する（spec §15.1 運用フロー）
 */

import {
  GameDefinition,
  getEnabledGames,
} from '../../state/gameRegistry';
import { GameIdV11 } from '../../state/gameIds-v11';

/**
 * `releaseEnabled=true` のゲーム定義一覧を `order` 昇順で返す。
 *
 * `gameRegistry.getEnabledGames()` の薄いラッパ。F-18 ロジックの集約点。
 */
export function getReleaseEnabledGames(): ReadonlyArray<GameDefinition> {
  return getEnabledGames();
}

/** `releaseEnabled=true` のゲーム ID を Set で返す（高速判定用）。 */
export function getReleaseEnabledGameIdSet(): ReadonlySet<GameIdV11> {
  return new Set(getEnabledGames().map((g) => g.gameId));
}

/** `releaseEnabled=true` のゲーム ID を `order` 昇順配列で返す。 */
export function getReleaseEnabledGameIds(): ReadonlyArray<GameIdV11> {
  return getEnabledGames().map((g) => g.gameId);
}

/** ゲーム ID が `releaseEnabled=true` か判定する。 */
export function isGameReleaseEnabled(gameId: GameIdV11): boolean {
  return getReleaseEnabledGameIdSet().has(gameId);
}

/** `releaseEnabled=true` のゲーム数。F-18 のホーム CTA「約 N 分」算出用。 */
export function getReleaseEnabledGameCount(): number {
  return getEnabledGames().length;
}
