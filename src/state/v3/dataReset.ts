/**
 * dataReset.ts — v3.0 F-13「全データ削除」（spec §7.9）。
 *
 * `gaboreye:v3:*` のすべて（GameRecord / DailyStats / BadgeStatus / Streak /
 * PlayStats / Settings / UserProfile / LevelState）を空にし、LevelState を
 * currentLevel=1 / consecutiveFailures=0 / highestLevel=0 に、Settings を
 * デフォルトに再初期化する。2 段階確認（UI 側）を通過した後に呼ばれる。
 *
 * F-11 のリセット通知済みフラグ（resetNoticeShown）は保持する：全削除は「旧データ
 * リセット」ではないため、これを消すと次回起動で旧データ消去通知が誤って再発する。
 */

import { V3_PREFIX } from './schema';
import { getAllKeys, removeKeys } from '../store';
import { STORAGE_KEYS } from './keys';
import { ensureV3Initialized } from './migration';

/**
 * v3 名前空間の全データを削除し、既定値で再初期化する（F-13 / §7.9）。
 * resetNoticeShown フラグは保持する（再通知させない）。
 */
export async function deleteAllData(): Promise<void> {
  const allKeys = await getAllKeys();
  const v3Keys = allKeys.filter(
    (k) => k.startsWith(V3_PREFIX) && k !== STORAGE_KEYS.resetNoticeShown,
  );
  await removeKeys(v3Keys);
  // ensureV3Initialized は未保存キーを既定で初期化する。LevelState は
  // initialLevelState（L1 / 0 / 0）、Settings はデフォルトに戻る。
  await ensureV3Initialized();
}
