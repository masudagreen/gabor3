/**
 * Jest 共通セットアップ。
 *
 * react-native-safe-area-context は `useSafeAreaInsets` を SafeAreaProvider 配下で
 * 呼ぶ前提だが、テストでは provider を毎回ラップするのが煩雑。公式が提供する
 * `react-native-safe-area-context/jest/mock` をグローバルに適用する。
 */

jest.mock('react-native-safe-area-context', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('react-native-safe-area-context/jest/mock').default,
);

// AsyncStorage は公式のインメモリモックを使う（S2 データ層テスト用）。
jest.mock(
  '@react-native-async-storage/async-storage',
  () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Expo Vector Icons のモック（テスト中の非同期フォントロードによる警告を防止）
jest.mock('@expo/vector-icons', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name, size, color, testID }: any) =>
      React.createElement(Text, { testID, style: { fontSize: size, color } }, name),
  };
});

