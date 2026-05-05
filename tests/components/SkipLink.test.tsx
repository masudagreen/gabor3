/**
 * SkipLink テスト（Sprint 7-C / screens.md S7-11「Skip Link（Web 全画面共通）」）。
 *
 * jest-expo の Platform.OS は 'ios' のため、SkipLink は null を返す。
 * Web パスは buildFocusStyle 経由で間接的にカバー（focusStyle.test 想定）。
 *
 * - Native（'ios'）では何も描画されない
 * - Web 固有の Tab/Enter フォーカス挙動は Playwright で確認（v2 で導入予定）
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { SkipLink } from '../../src/components/SkipLink';
import { ThemeProvider } from '../../src/theme/ThemeProvider';

describe('SkipLink', () => {
  it('Native 環境（Platform.OS=ios）では何も描画されない', () => {
    expect(Platform.OS).toBe('ios');
    const { queryByTestId } = render(
      <ThemeProvider>
        <SkipLink onActivate={() => {}} />
      </ThemeProvider>,
    );
    expect(queryByTestId('skip-link')).toBeNull();
  });

  it('Native では onActivate が発火しない（描画されないため呼べない）', () => {
    const onActivate = jest.fn();
    render(
      <ThemeProvider>
        <SkipLink onActivate={onActivate} />
      </ThemeProvider>,
    );
    // ボタンが存在しないので呼べない
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('Web 環境のシミュレート：Platform.OS をモックして label が render される', () => {
    // Platform.OS を一時的に 'web' に差し替える
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'web',
    });
    try {
      const { getByTestId, getByText } = render(
        <ThemeProvider>
          <SkipLink onActivate={() => {}} testId="skip-link" />
        </ThemeProvider>,
      );
      expect(getByTestId('skip-link')).toBeTruthy();
      expect(getByText('メインコンテンツへ移動')).toBeTruthy();
    } finally {
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        get: () => original,
      });
    }
  });
});
