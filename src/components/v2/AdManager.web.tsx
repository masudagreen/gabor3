import React from 'react';

/**
 * AdManager（Web 版スタブ）。
 *
 * react-native-google-mobile-ads は native 専用モジュール
 * （react-native/Libraries/Utilities/codegenNativeComponent）を import するため、
 * Web バンドルに含めると Metro が「Importing native-only module ... on web」で失敗する。
 * Web では広告を一切出さない（AdManager.native.tsx も runtime で web を素通りさせていた）ため、
 * Metro のプラットフォーム別解決（.web.tsx / .native.tsx）で native モジュールごと Web から除外する。
 * App.tsx の import パスは不変。native の AdMob 挙動は AdManager.native.tsx がそのまま担う。
 */
export const AdManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};
