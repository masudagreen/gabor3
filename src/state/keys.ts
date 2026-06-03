/**
 * keys.ts — `gaboreye:v2:*` 永続化キー定義（spec §6.10）。
 */

import { V2_PREFIX } from './schema';

export const STORAGE_KEYS = {
  userProfile: `${V2_PREFIX}userProfile`,
  settings: `${V2_PREFIX}settings`,
  streak: `${V2_PREFIX}streak`,
  playStats: `${V2_PREFIX}playStats`,
  /** F-11 のリセット通知を 1 度だけ出すためのフラグ */
  resetNoticeShown: `${V2_PREFIX}resetNoticeShown`,
} as const;

/** session レコードのキー（`gaboreye:v2:session:<uuid>`） */
export function sessionKey(sessionId: string): string {
  return `${V2_PREFIX}session:${sessionId}`;
}

/** dailyStats のキー（`gaboreye:v2:dailyStats:YYYY-MM-DD`） */
export function dailyStatsKey(date: string): string {
  return `${V2_PREFIX}dailyStats:${date}`;
}

/** badge のキー（`gaboreye:v2:badge:B-01`） */
export function badgeKey(badgeId: string): string {
  return `${V2_PREFIX}badge:${badgeId}`;
}

export const SESSION_KEY_PREFIX = `${V2_PREFIX}session:` as const;
export const DAILY_STATS_KEY_PREFIX = `${V2_PREFIX}dailyStats:` as const;
export const BADGE_KEY_PREFIX = `${V2_PREFIX}badge:` as const;
