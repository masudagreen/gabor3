/**
 * repository.ts — v3.0 各レコード型の型付き load/save（spec §7）。
 *
 * 単一レコード（UserProfile / Settings / LevelState / Streak / PlayStats）は固定キー、
 * コレクション（GameRecord / DailyStats / BadgeStatus）はキープレフィックスで管理する。
 * 破損・未保存時は schema.ts / level.ts の既定値にフォールバックする。
 *
 * 低レベルの「キー文字列 ↔ JSON」I/O は既存の state/store.ts を再利用する
 * （store.ts は名前空間非依存の単一責務モジュール）。
 */

import { estimateDeviceType } from '../../lib/calibration';
import { Platform } from 'react-native';
import { initialLevelState, type LevelState } from '../../lib/v3/level';
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
import { sanitizeSettings } from './settings';
import { getAllKeys, readJson, writeJson, removeKey } from '../store';

// --- Settings -------------------------------------------------------------

export async function loadSettings(): Promise<Settings> {
  const stored = await readJson<Partial<Settings> | null>(
    STORAGE_KEYS.settings,
    null,
  );
  // 既定とマージしたうえで、範囲/変化順を妥当化（破損・部分集合の正規化）。
  return sanitizeSettings({ ...defaultSettings(), ...(stored ?? {}) });
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

// --- LevelState（spec §7.3） ----------------------------------------------

export async function loadLevelState(): Promise<LevelState> {
  const stored = await readJson<Partial<LevelState> | null>(
    STORAGE_KEYS.levelState,
    null,
  );
  return { ...initialLevelState(), ...(stored ?? {}) };
}

export async function saveLevelState(levelState: LevelState): Promise<void> {
  await writeJson(STORAGE_KEYS.levelState, levelState);
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
  const stored = await readJson<
    (Partial<PlayStats> & { totalGames?: number }) | null
  >(STORAGE_KEYS.playStats, null);
  const base = defaultPlayStats();
  if (!stored) return base;
  // v3.0 旧 totalGames → v3.1 totalSessions / totalRounds に補完（§7.9 名前空間据え置き）。
  // v3.0 は 1 ゲーム = 1 ラウンド = 1 セッションのため旧件数を両方に写す。
  const legacy = stored.totalGames ?? 0;
  return {
    totalSessions: stored.totalSessions ?? legacy,
    totalRounds: stored.totalRounds ?? legacy,
    // 旧データには累計ゲーム時間が無いため 0 から積み上げ開始（§7.9 名前空間据え置き）。
    totalPlaySec: stored.totalPlaySec ?? 0,
  };
}

export async function savePlayStats(stats: PlayStats): Promise<void> {
  await writeJson(STORAGE_KEYS.playStats, stats);
}

// --- SessionRecord（コレクション、spec §7.4、v3.1） -----------------------

export async function saveSessionRecord(record: SessionRecord): Promise<void> {
  await writeJson(sessionKey(record.sessionId), record);
}

export async function loadSessionRecord(
  sessionId: string,
): Promise<SessionRecord | null> {
  return readJson<SessionRecord | null>(sessionKey(sessionId), null);
}

export async function loadAllSessionRecords(): Promise<SessionRecord[]> {
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

// --- DailyStats（コレクション、spec §7.5） --------------------------------

/**
 * v3.0 旧 DailyStats（`gameCount` を持つ）を v3.1 形（`sessionCount`/`roundCount`）へ
 * 読み込み時に補完する（§7.9 名前空間据え置きのため既存日次レコードを破棄しない）。
 * v3.0 は 1 ゲーム = 1 ラウンド = 1 セッションのため、旧 gameCount を両カウントに写す。
 */
function normalizeDailyStats(
  raw:
    | (Partial<DailyStats> & { date: string; gameCount?: number })
    | null,
): DailyStats | null {
  if (!raw) return null;
  const legacyCount = raw.gameCount ?? 0;
  return {
    date: raw.date,
    highestLevelReached: raw.highestLevelReached ?? 0,
    sessionCount: raw.sessionCount ?? legacyCount,
    roundCount: raw.roundCount ?? legacyCount,
  };
}

export async function saveDailyStats(stats: DailyStats): Promise<void> {
  await writeJson(dailyStatsKey(stats.date), stats);
}

export async function loadDailyStats(date: string): Promise<DailyStats | null> {
  const raw = await readJson<
    (Partial<DailyStats> & { date: string; gameCount?: number }) | null
  >(dailyStatsKey(date), null);
  return normalizeDailyStats(raw);
}

export async function loadAllDailyStats(): Promise<DailyStats[]> {
  const keys = (await getAllKeys()).filter((k) =>
    k.startsWith(DAILY_STATS_KEY_PREFIX),
  );
  const records: DailyStats[] = [];
  for (const k of keys) {
    const raw = await readJson<
      (Partial<DailyStats> & { date: string; gameCount?: number }) | null
    >(k, null);
    const rec = normalizeDailyStats(raw);
    if (rec) records.push(rec);
  }
  return records;
}

// --- BadgeStatus（コレクション、spec §7.8） -------------------------------

export async function saveBadgeStatus(status: BadgeStatus): Promise<void> {
  await writeJson(badgeKey(status.badgeId), status);
}

export async function loadBadgeStatus(badgeId: BadgeId): Promise<BadgeStatus> {
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
