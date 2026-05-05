/**
 * GaborEye v1.1 — エントリ。
 *
 * Sprint 8：v1 の AppRouter から v1.1 の AppRouterV11 へ切り替え。
 * v1 のソース（src/navigation/AppRouter.tsx 等）は Sprint 9 以降での再利用に
 * 備えて残置しているが、ランタイムでは v1.1 ルーターのみが使われる。
 */

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppRouterV11 } from './src/navigation/v11/AppRouterV11';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppRouterV11 />
    </SafeAreaProvider>
  );
}
