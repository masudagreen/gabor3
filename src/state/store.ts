/**
 * store.ts — AsyncStorage の低レベル読み書きヘルパ（JSON シリアライズ）。
 *
 * 各レコード型に対する load/save は state/repository.ts が型付きで提供する。
 * 本ファイルは「キー文字列 ↔ JSON 値」の単一責務に絞る。
 *
 * 読み込み失敗（破損 JSON 等）は fallback を返してアプリを止めない（境界での防御）。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // 破損データや getItem 失敗時は既定にフォールバック（クラッシュさせない）
    return fallback;
  }
}

export async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function readRaw(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function removeKey(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export async function removeKeys(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await AsyncStorage.multiRemove(keys);
}

export async function getAllKeys(): Promise<string[]> {
  const keys = await AsyncStorage.getAllKeys();
  return Array.from(keys);
}

export async function hasKey(key: string): Promise<boolean> {
  const raw = await readRaw(key);
  return raw != null;
}
