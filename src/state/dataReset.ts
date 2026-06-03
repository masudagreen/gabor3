/**
 * dataReset.ts — F-13「全データ削除」（spec §6.9）。
 *
 * `gaboreye:v2:*` のすべてを消去し、既定で再初期化する。2 段階確認（UI 側）を
 * 通過した後に呼ばれる。リセット通知フラグも消すと初回起動扱いになり旧データ消去
 * 通知が再発するため、ここでは「v2 名前空間のデータ」のみを対象にし、F-11 のリセット
 * 通知済みフラグは保持する（再通知させない）。
 */

import { V2_PREFIX } from './schema';
import { getAllKeys, removeKeys } from './store';
import { STORAGE_KEYS } from './keys';
import { ensureV2Initialized } from './migration';

/**
 * v2 名前空間の全データを削除し、既定値で再初期化する。
 * resetNoticeShown フラグは保持（全削除は「旧データリセット」ではないため再通知しない）。
 */
export async function deleteAllData(): Promise<void> {
  const allKeys = await getAllKeys();
  const v2Keys = allKeys.filter(
    (k) => k.startsWith(V2_PREFIX) && k !== STORAGE_KEYS.resetNoticeShown,
  );
  await removeKeys(v2Keys);
  await ensureV2Initialized();
}
