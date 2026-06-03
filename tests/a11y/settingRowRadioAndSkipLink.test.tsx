/**
 * settingRowRadioAndSkipLink.test.tsx
 *
 * - SettingRow radio（採点方式行）: role=radio + aria-checked（NF-15 / Minor 1 関連）。
 * - SkipLink（NF-14）: Native では描画しない、Web では role=link を出す。
 */

import React from 'react';
import { Platform } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../src/theme/ThemeProvider';
import { SettingRow } from '../../src/components/v2/SettingRow';
import { SkipLink } from '../../src/components/v2/SkipLink';

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

function wrap(node: React.ReactElement) {
  return <ThemeProvider preference="light">{node}</ThemeProvider>;
}

describe('SettingRow radio（採点方式）', () => {
  it('radio 指定で accessibilityRole=radio・選択中は accessibilityState.checked=true', () => {
    render(
      wrap(
        <SettingRow
          onPress={jest.fn()}
          accessibilityLabel="自動採点・確定なし"
          radio
          checked
        />,
      ),
    );
    const row = screen.getByLabelText('自動採点・確定なし');
    expect(row.props.accessibilityRole).toBe('radio');
    expect(row.props.accessibilityState.checked).toBe(true);
  });

  it('Web では role=radio + aria-checked を DOM へ透過する', () => {
    asWeb(() => {
      render(
        wrap(
          <SettingRow
            onPress={jest.fn()}
            accessibilityLabel="全問正解で即次へ"
            radio
            checked={false}
          />,
        ),
      );
      const row = screen.getByLabelText('全問正解で即次へ');
      expect(row.props.role).toBe('radio');
      expect(row.props.accessibilityState.checked).toBe(false);
    });
  });

  it('radio 未指定（通常ナビ行）は role=button のまま', () => {
    render(
      wrap(<SettingRow onPress={jest.fn()} accessibilityLabel="免責事項を読む" />),
    );
    const row = screen.getByLabelText('免責事項を読む');
    expect(row.props.accessibilityRole).toBe('button');
  });
});

describe('SkipLink（NF-14）', () => {
  it('Native（ios）では何も描画しない', () => {
    expect(Platform.OS).toBe('ios');
    render(wrap(<SkipLink targetId="ge-main-content" testId="skip" />));
    expect(screen.queryByTestId('skip')).toBeNull();
  });

  it('Web では role=button でスキップリンクを描画する（Enter/Space 起動のため、NF-9）', () => {
    asWeb(() => {
      render(wrap(<SkipLink targetId="ge-main-content" testId="skip" />));
      const link = screen.getByTestId('skip');
      // RNW は role=link に Enter/Space 活性化を合成しないため role=button 化（S10 評価 Major 修正）
      expect(link.props.role).toBe('button');
      expect(link.props.accessibilityLabel).toBe('メインコンテンツへスキップ');
      // Web の onKeyDown ハンドラを備える（Enter/Space で起動）
      expect(typeof link.props.onKeyDown).toBe('function');
    });
  });
});
