/**
 * repository.ts — 各レコード型の型付き load/save（spec §6）。
 *
 * 単一レコード（UserProfile / Settings / Streak / PlayStats）は固定キー、
 * コレクション（SessionRecord / DailyStats / BadgeStatus）はキープレフィックスで管理する。
 * 破損・未保存時は schema.ts の既定値ファクトリにフォールバックする。
 */

import { estimateDeviceType } from '../lib/calibration';
import { Platform } from 'react-native';
import {
  STORAGE_KEYS,
  sessionKey,
  dailyStatsKey,
  badgeKey,
  SESSION_KEY_PREFIX,
  DAILY_STATS_KEY_PREFIX,
  BADGE_KEY_PREFIX,
} from './keys';
import {
  Settings,
  UserProfile,
  Streak,
  PlayStats,
  SessionRecord,
  DailyStats,
  BadgeStatus,
  BadgeId,
  defaultSettings,
  defaultUserProfile,
  defaultStreak,
  defaultPlayStats,
  defaultBadgeStatus,
} from './schema';
import { getAllKeys, readJson, writeJson, removeKey } from './store';

// --- Settings -------------------------------------------------------------

export async function loadSettings(): Promise<Settings> {
  const stored = await readJson<Partial<Settings> | null>(
    STORAGE_KEYS.settings,
    null,
  );
  // 既定とマージ（将来フィールド追加時に欠損を埋める）
  return { ...defaultSettings(), ...(stored ?? {}) };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await writeJson(STORAGE_KEYS.settings, settings);
}

// --- UserProfile ----------------------------------------------------------

export async function loadUserProfile(): Promise<UserProfile> {
  const fallback = defaultUserProfile(
    new Date().toISOString(),
    estimateDeviceType(Platform.OS),
  );
  const stored = await readJson<Partial<UserProfile> | null>(
    STORAGE_KEYS.userProfile,
    null,
  );
  return { ...fallback, ...(stored ?? {}) };
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await writeJson(STORAGE_KEYS.userProfile, profile);
}

// --- Streak ---------------------------------------------------------------

export async function loadStreak(): Promise<Streak> {
  const stored = await readJson<Partial<Streak> | null>(
    STORAGE_KEYS.streak,
    null,
  );
  return { ...defaultStreak(), ...(stored ?? {}) };
}

export async function saveStreak(streak: Streak): Promise<void> {
  await writeJson(STORAGE_KEYS.streak, streak);
}

// --- PlayStats ------------------------------------------------------------

export async function loadPlayStats(): Promise<PlayStats> {
  const stored = await readJson<Partial<PlayStats> | null>(
    STORAGE_KEYS.playStats,
    null,
  );
  return { ...defaultPlayStats(), ...(stored ?? {}) };
}

export async function savePlayStats(stats: PlayStats): Promise<void> {
  await writeJson(STORAGE_KEYS.playStats, stats);
}

// --- SessionRecord（コレクション） ----------------------------------------

export async function saveSession(record: SessionRecord): Promise<void> {
  await writeJson(sessionKey(record.sessionId), record);
}

export async function loadSession(
  sessionId: string,
): Promise<SessionRecord | null> {
  return readJson<SessionRecord | null>(sessionKey(sessionId), null);
}

export async function loadAllSessions(): Promise<SessionRecord[]> {
  const keys = (await getAllKeys()).filter((k) =>
    k.startsWith(SESSION_KEY_PREFIX),
  );
  const records: SessionRecord[] = [];
  for (const k of keys) {
    const rec = await readJson<SessionRecord | null>(k, null);
    if (rec) records.push(rec);
  }
  return records;
}

// --- DailyStats（コレクション） -------------------------------------------

export async function saveDailyStats(stats: DailyStats): Promise<void> {
  await writeJson(dailyStatsKey(stats.date), stats);
}

export async function loadDailyStats(date: string): Promise<DailyStats | null> {
  return readJson<DailyStats | null>(dailyStatsKey(date), null);
}

export async function loadAllDailyStats(): Promise<DailyStats[]> {
  const keys = (await getAllKeys()).filter((k) =>
    k.startsWith(DAILY_STATS_KEY_PREFIX),
  );
  const records: DailyStats[] = [];
  for (const k of keys) {
    const rec = await readJson<DailyStats | null>(k, null);
    if (rec) records.push(rec);
  }
  return records;
}

// --- BadgeStatus（コレクション） ------------------------------------------

export async function saveBadgeStatus(status: BadgeStatus): Promise<void> {
  await writeJson(badgeKey(status.badgeId), status);
}

export async function loadBadgeStatus(
  badgeId: BadgeId,
): Promise<BadgeStatus> {
  const stored = await readJson<BadgeStatus | null>(badgeKey(badgeId), null);
  return stored ?? defaultBadgeStatus(badgeId);
}

export async function loadAllBadgeStatuses(): Promise<BadgeStatus[]> {
  const keys = (await getAllKeys()).filter((k) =>
    k.startsWith(BADGE_KEY_PREFIX),
  );
  const records: BadgeStatus[] = [];
  for (const k of keys) {
    const rec = await readJson<BadgeStatus | null>(k, null);
    if (rec) records.push(rec);
  }
  return records;
}

// --- リセット通知フラグ（F-11） -------------------------------------------

export async function wasResetNoticeShown(): Promise<boolean> {
  return readJson<boolean>(STORAGE_KEYS.resetNoticeShown, false);
}

export async function markResetNoticeShown(): Promise<void> {
  await writeJson(STORAGE_KEYS.resetNoticeShown, true);
}

export async function clearResetNoticeFlag(): Promise<void> {
  await removeKey(STORAGE_KEYS.resetNoticeShown);
}
