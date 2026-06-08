import AsyncStorage from '@react-native-async-storage/async-storage';

const AD_USAGE_TIME_KEY = 'gabor_ad_usage_time';

/**
 * 広告表示のための累積使用時間をミリ秒単位で取得する
 */
export async function getAccumulatedAdTime(): Promise<number> {
  try {
    const value = await AsyncStorage.getItem(AD_USAGE_TIME_KEY);
    return value ? parseInt(value, 10) : 0;
  } catch (e) {
    console.error('Failed to get ad usage time', e);
    return 0;
  }
}

/**
 * ミリ秒を追加して保存する
 */
export async function addAdUsageTime(ms: number): Promise<void> {
  if (ms <= 0) return;
  try {
    const current = await getAccumulatedAdTime();
    const next = current + ms;
    await AsyncStorage.setItem(AD_USAGE_TIME_KEY, next.toString());
  } catch (e) {
    console.error('Failed to add ad usage time', e);
  }
}

/**
 * 累積使用時間を0にリセットする
 */
export async function resetAdUsageTime(): Promise<void> {
  try {
    await AsyncStorage.setItem(AD_USAGE_TIME_KEY, '0');
  } catch (e) {
    console.error('Failed to reset ad usage time', e);
  }
}
