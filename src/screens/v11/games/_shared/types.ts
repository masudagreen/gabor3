/**
 * Sprint 20-B-3：全ゲーム共通の PlayScreen / ResultScreen 連携型。
 *
 * `phase === 'result'` 時に親が PlayScreen に返す補助情報を表す。
 * `previousBest` は単体プレイ時の「初回測定」表示等に使う（components.md §23）、
 * `newlyAwardedBadges` は F-13 バッジ獲得演出に使う。コース時は両方とも null /
 * 空配列でよい（CourseRunner は新規バッジ評価をコース完了時にまとめて行う）。
 */

import { BadgeIdV11 } from '../../../../lib/v11/badgeDefinitions';

export type GamePostCompleteData = {
  previousBest: number | null;
  newlyAwardedBadges: ReadonlyArray<BadgeIdV11>;
};
