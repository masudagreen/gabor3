/**
 * migration.ts — F-11 起動時データリセット（spec §6.1 / AS-11）。
 *
 * v2.0 はリブートのため旧データとスキーマ非互換。起動時に v1 / v1.1 / v1.2 由来の
 * 永続化キー（`gaboreye:v1:*` / `gaboreye:v1.1:*` / `gaboreye:v1.2:*`）を全消去し、
 * `gaboreye:v2:*` で初期化する。消去が一度でも行われたら「リセット通知」を 1 度だけ
 * 表示するためのフラグを立てる。
 *
 * 通知の表示タイミングは起動フロー（S6）が決めるため、本モジュールは
 * 「消去したか／通知済みか」の判定材料を返すに留める。
 */

import { LEGACY_PREFIXES, V2_PREFIX } from './schema';
import { getAllKeys, removeKeys } from './store';
import {
  loadSettings,
  saveSettings,
  loadUserProfile,
  saveUserProfile,
  loadStreak,
  saveStreak,
  loadPlayStats,
  savePlayStats,
  wasResetNoticeShown,
  markResetNoticeShown,
} from './repository';
import { STORAGE_KEYS } from './keys';

/**
 * 旧名前空間のキーかどうか（純関数。テスト容易性のため分離）。
 */
export function isLegacyKey(key: string): boolean {
  return LEGACY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

/**
 * v2 名前空間のキーかどうか（純関数）。
 */
export function isV2Key(key: string): boolean {
  return key.startsWith(V2_PREFIX);
}

/**
 * 全キーから消去対象（旧名前空間）を抽出する（純関数）。
 */
export function selectLegacyKeys(allKeys: readonly string[]): string[] {
  return allKeys.filter(isLegacyKey);
}

export type MigrationResult = {
  /** 旧名前空間キーを実際に消去したか */
  didReset: boolean;
  /** 消去したキー数 */
  removedCount: number;
  /** F-11 リセット通知を表示すべきか（消去あり かつ 未通知） */
  shouldShowNotice: boolean;
};

/**
 * v2.0 へのマイグレーションを実行する（F-11）。
 *
 * 1. 旧名前空間キーを検出
 * 2. あれば消去
 * 3. v2 既定（Settings / UserProfile / Streak / PlayStats）を未初期化なら作成
 * 4. 消去があり、かつまだリセット通知を出していなければ shouldShowNotice=true を返す
 *
 * 連続呼び出し（2 回目以降）は冪等：旧キーが残っていなければ消去しない。
 */
export async function runStartupMigration(): Promise<MigrationResult> {
  const allKeys = await getAllKeys();
  const legacyKeys = selectLegacyKeys(allKeys);
  const didReset = legacyKeys.length > 0;

  if (didReset) {
    await removeKeys(legacyKeys);
  }

  // v2 既定の初期化（未保存なら load が既定を返すので、それを save して確定させる）
  await ensureV2Initialized();

  const noticeAlreadyShown = await wasResetNoticeShown();
  const shouldShowNotice = didReset && !noticeAlreadyShown;

  return {
    didReset,
    removedCount: legacyKeys.length,
    shouldShowNotice,
  };
}

/**
 * v2 の中核レコード（Settings / UserProfile / Streak / PlayStats）が未保存なら
 * 既定値で初期化する。既存値は保持する。
 */
export async function ensureV2Initialized(): Promise<void> {
  const allKeys = await getAllKeys();
  const has = (k: string) => allKeys.includes(k);

  if (!has(STORAGE_KEYS.settings)) {
    await saveSettings(await loadSettings());
  }
  if (!has(STORAGE_KEYS.userProfile)) {
    await saveUserProfile(await loadUserProfile());
  }
  if (!has(STORAGE_KEYS.streak)) {
    await saveStreak(await loadStreak());
  }
  if (!has(STORAGE_KEYS.playStats)) {
    await savePlayStats(await loadPlayStats());
  }
}

/**
 * F-11 リセット通知を表示済みとして記録する（OK 押下時に呼ぶ）。
 */
export async function acknowledgeResetNotice(): Promise<void> {
  await markResetNoticeShown();
}
