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
