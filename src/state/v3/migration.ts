/**
 * migration.ts — F-11 起動時 v3 データ初期化（spec §7.9 / AS-13）。
 *
 * v3.0 はリブートのため旧データ（v1〜v2）とスキーマ非互換。起動時に旧名前空間
 * （`gaboreye:v1:*` / `gaboreye:v1.1:*` / `gaboreye:v1.2:*` / `gaboreye:v2:*`）の
 * 永続化キーを全消去し、`gaboreye:v3:*` で初期化する：
 *   - LevelState = currentLevel:1 / consecutiveFailures:0 / highestLevel:0
 *   - デフォルト Settings / UserProfile / Streak / PlayStats
 *
 * 消去が一度でも行われたら「リセットしました」通知を 1 度だけ出すためのフラグを立てる。
 * 通知の表示タイミングは起動フロー（S7）が決めるため、本モジュールは「消去したか／
 * 通知すべきか」の判定材料を返すに留める（UI は描かない）。
 */

import { LEGACY_PREFIXES, V3_PREFIX, SCHEMA_VERSION as V3_SCHEMA_VERSION } from './schema';
import { getAllKeys, removeKeys } from '../store';
import {
  loadSettings,
  saveSettings,
  loadUserProfile,
  saveUserProfile,
  loadLevelState,
  saveLevelState,
  loadStreak,
  saveStreak,
  loadPlayStats,
  savePlayStats,
  wasResetNoticeShown,
  markResetNoticeShown,
} from './repository';
import { STORAGE_KEYS } from './keys';

/** 旧名前空間（v1〜v2）のキーかどうか（純関数）。 */
export function isLegacyKey(key: string): boolean {
  return LEGACY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

/** v3 名前空間のキーかどうか（純関数）。 */
export function isV3Key(key: string): boolean {
  return key.startsWith(V3_PREFIX);
}

/** 全キーから消去対象（旧名前空間 v1〜v2）を抽出する（純関数）。 */
export function selectLegacyKeys(allKeys: readonly string[]): string[] {
  return allKeys.filter(isLegacyKey);
}

export type MigrationResult = {
  /** 旧名前空間（v1〜v2）キーを実際に消去したか。 */
  didReset: boolean;
  /** 消去したキー数。 */
  removedCount: number;
  /** F-11 リセット通知を表示すべきか（消去あり かつ 未通知）。 */
  shouldShowNotice: boolean;
};

/**
 * v3.0 起動時の初期化を実行する（F-11）。
 *
 * 1. 旧名前空間（v1〜v2）キーを検出
 * 2. あれば消去
 * 3. v3 既定（Settings / UserProfile / LevelState / Streak / PlayStats）を未初期化なら作成
 *    （LevelState は currentLevel:1 / consecutiveFailures:0 / highestLevel:0）
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

  await ensureV3Initialized();

  const noticeAlreadyShown = await wasResetNoticeShown();
  const shouldShowNotice = didReset && !noticeAlreadyShown;

  return {
    didReset,
    removedCount: legacyKeys.length,
    shouldShowNotice,
  };
}

/**
 * v3 の中核レコード（Settings / UserProfile / LevelState / Streak / PlayStats）が
 * 未保存なら既定値で初期化する。既存値は保持する。
 *
 * v3.0 → v3.1 の非リセット補完（§7.9）：名前空間 `gaboreye:v3:*` は据え置きのため既存
 * v3.0 データは保持する。新フィールド（Settings.sessionMinutes 既定 5・PlayStats.totalSessions・
 * DailyStats.sessionCount/roundCount 等）は各 load 関数が読み込み時に既定値／旧フィールドからの
 * 写像で補完する（repository.ts）。本関数は既存値があれば v3.1 形へ正規化して書き戻す
 * （sessionMinutes 補完・totalGames→totalSessions 補完・schemaVersion 更新を永続化）。
 *
 * 旧 `gaboreye:v3:game:<uuid>` レコード（v3.0 GameRecord）は v3.1 では**無視**する
 * （SessionRecord へ移行しない、AS-29 / §7.9）。破棄は行わず放置してよい（履歴集計には
 * SessionRecord のみを使うため影響しない）。
 */
export async function ensureV3Initialized(): Promise<void> {
  const allKeys = await getAllKeys();
  const has = (k: string) => allKeys.includes(k);

  // Settings：未保存なら既定、保存済みなら v3.1 形へ正規化して書き戻す（sessionMinutes 補完）。
  await saveSettings(await loadSettings());

  if (!has(STORAGE_KEYS.userProfile)) {
    await saveUserProfile(await loadUserProfile());
  } else {
    // schemaVersion を v3.1 へ更新して永続化（既存プロフィールは保持）。
    const profile = await loadUserProfile();
    if (profile.schemaVersion !== V3_SCHEMA_VERSION) {
      await saveUserProfile({ ...profile, schemaVersion: V3_SCHEMA_VERSION });
    }
  }
  if (!has(STORAGE_KEYS.levelState)) {
    // load は未保存時 initialLevelState（L1 / 連続失敗 0 / highest 0）を返す。
    await saveLevelState(await loadLevelState());
  }
  if (!has(STORAGE_KEYS.streak)) {
    await saveStreak(await loadStreak());
  }
  // PlayStats：未保存なら既定、保存済みなら totalGames→totalSessions 補完して書き戻す。
  await savePlayStats(await loadPlayStats());
}

/** F-11 リセット通知を表示済みとして記録する（OK 押下時に呼ぶ）。 */
export async function acknowledgeResetNotice(): Promise<void> {
  await markResetNoticeShown();
}
