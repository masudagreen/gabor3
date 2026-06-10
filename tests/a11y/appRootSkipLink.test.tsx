/**
 * appRootSkipLink.test.tsx — NF-14（Web の Skip link が実アプリに結線されている）。
 *
 * S11：SkipLink コンポーネントは存在したが App に未結線だった。AppRoot 先頭へ結線し、
 * main コンテンツに nativeID=ge-main-content を付与した。
 *   - Web：SkipLink（role=button「メインコンテンツへスキップ」）が描画される。
 *   - Native：描画しない（VoiceOver/TalkBack の見出し送りで代替）。
 */

import React from 'react';
import { Platform } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../src/theme/ThemeProvider';
import { AppRoot } from '../../src/screens/v3/AppRoot';
import { mulberry32 } from '../../src/lib/v2/rng';

function asWeb<T>(fn: () => T): T {
  const original = Platform.OS;
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'web' });
  try {
    return fn();
  } finally {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => original,
    });
  }
}

function renderApp() {
  return render(
    <ThemeProvider preference="light" systemScheme="light">
      <AppRoot
        viewingDistanceCm={40}
        testId="app"
        rng={mulberry32(1)}
        initialLevel={{ currentLevel: 1, consecutiveFailures: 0, highestLevel: 0 }}
      />
    </ThemeProvider>,
  );
}

describe('AppRoot Skip link（NF-14）', () => {
  it('Web では Skip link を描画する', () => {
    asWeb(() => {
      renderApp();
      expect(screen.getByTestId('app-skip')).toBeTruthy();
      expect(screen.getByLabelText('メインコンテンツへスキップ')).toBeTruthy();
    });
  });

  it('Native では Skip link を描画しない', () => {
    renderApp();
    expect(screen.queryByTestId('app-skip')).toBeNull();
  });
});
