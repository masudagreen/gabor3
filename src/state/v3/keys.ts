/**
 * keys.ts — `gaboreye:v3:*` 永続化キー定義（spec §7.10）。
 */

import { V3_PREFIX } from './schema';

export const STORAGE_KEYS = {
  userProfile: `${V3_PREFIX}userProfile`,
  settings: `${V3_PREFIX}settings`,
  levelState: `${V3_PREFIX}levelState`,
  streak: `${V3_PREFIX}streak`,
  playStats: `${V3_PREFIX}playStats`,
  /** F-11 のリセット通知を 1 度だけ出すためのフラグ。 */
  resetNoticeShown: `${V3_PREFIX}resetNoticeShown`,
} as const;

/** session レコードのキー（`gaboreye:v3:session:<uuid>`、v3.1）。 */
export function sessionKey(sessionId: string): string {
  return `${V3_PREFIX}session:${sessionId}`;
}

/** dailyStats のキー（`gaboreye:v3:dailyStats:YYYY-MM-DD`）。 */
export function dailyStatsKey(date: string): string {
  return `${V3_PREFIX}dailyStats:${date}`;
}

/** badge のキー（`gaboreye:v3:badge:B-01`）。 */
export function badgeKey(badgeId: string): string {
  return `${V3_PREFIX}badge:${badgeId}`;
}

export const SESSION_KEY_PREFIX = `${V3_PREFIX}session:` as const;
export const DAILY_STATS_KEY_PREFIX = `${V3_PREFIX}dailyStats:` as const;
export const BADGE_KEY_PREFIX = `${V3_PREFIX}badge:` as const;

/** v3.0 旧 game レコードのキープレフィックス（v3.1 では参照しない）。 */
export const LEGACY_GAME_KEY_PREFIX = `${V3_PREFIX}game:` as const;
