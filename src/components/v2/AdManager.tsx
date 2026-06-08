import React, { useEffect, useRef, useState } from 'react';
import { AppState, Platform, View, ActivityIndicator, StyleSheet } from 'react-native';
import mobileAds, { TestIds, useInterstitialAd } from 'react-native-google-mobile-ads';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { getAccumulatedAdTime, addAdUsageTime, resetAdUsageTime } from '../../state/adTracker';

// 15分 (ミリ秒)
const TARGET_USAGE_MS = 15 * 60 * 1000;

// 全画面広告（インタースティシャル広告）のテストIDを常に使用します
// ※本番リリース時にご自身の広告ユニットIDに差し替えてください。
const adUnitId = TestIds.INTERSTITIAL;

export const AdManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Web環境の場合は広告処理を全てスキップしてそのまま子要素を返す
  if (Platform.OS === 'web') {
    return <>{children}</>;
  }

  const [shouldShowAd, setShouldShowAd] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const isShowingAd = useRef(false);
  const appState = useRef(AppState.currentState);
  const sessionStartTime = useRef<number>(Date.now());

  // 公式のHookを使用して全画面広告（インタースティシャル）を管理
  const { isLoaded, isClosed, load, show, error } = useInterstitialAd(adUnitId, {
    requestNonPersonalizedAdsOnly: false,
  });

  // 1. 初回起動時のATT要求と、使用時間のチェック
  useEffect(() => {
    let isMounted = true;
    
    const initAdManager = async () => {
      if (Platform.OS === 'ios') {
        await requestTrackingPermissionsAsync();
      }

      // AdMob SDKの初期化 (クラッシュ防止に必須)
      await mobileAds().initialize();

      const accumulatedMs = await getAccumulatedAdTime();
      if (accumulatedMs >= TARGET_USAGE_MS) {
        if (isMounted) setShouldShowAd(true);
      }
      if (isMounted) setIsChecking(false);
    };

    initAdManager();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. 広告のロード
  useEffect(() => {
    // 広告を表示すべきで、まだロードされておらず、エラーも起きていない場合にロードを開始
    if (shouldShowAd && !isLoaded && !error && !isShowingAd.current) {
      load();
    }
  }, [shouldShowAd, isLoaded, load, error]);

  // 3. 広告の表示
  useEffect(() => {
    // ロードが完了したら即座に表示
    if (shouldShowAd && isLoaded && !isShowingAd.current) {
      isShowingAd.current = true;
      show();
    }
  }, [shouldShowAd, isLoaded, show]);

  // 4. 広告のエラー処理
  useEffect(() => {
    if (error && shouldShowAd) {
      console.error('AdMob Hook Error:', error);
      // エラーが起きた場合は広告を諦めてアプリを続行
      setShouldShowAd(false);
      isShowingAd.current = false;
    }
  }, [error, shouldShowAd]);

  // 5. 広告を閉じ終わった時の処理
  useEffect(() => {
    if (isClosed && shouldShowAd) {
      isShowingAd.current = false;
      setShouldShowAd(false);
      resetAdUsageTime(); // タイマーをリセット
    }
  }, [isClosed, shouldShowAd]);

  // 3. アプリのバックグラウンド移行検知と使用時間の加算
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // バックグラウンドから復帰した時 -> セッション開始時間を記録
        sessionStartTime.current = Date.now();
      } else if (
        appState.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        // アクティブからバックグラウンドへ移行時 -> 使用時間を加算
        // 広告表示中の時間はカウントしない
        if (!isShowingAd.current) {
          const usageMs = Date.now() - sessionStartTime.current;
          addAdUsageTime(usageMs);
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // 広告表示の準備中・表示中は、アプリ本体の描画を停止してクラッシュを防ぎます
  if (isChecking || shouldShowAd) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1A1D24',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
