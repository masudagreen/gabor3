/**
 * ThemeProvider テスト（Sprint 7-A）。
 *
 * - resolveThemeMode 純関数の挙動
 * - useTheme フックが Provider なしでもデフォルト値を返す
 * - Provider 経由で preference / mode / colors を配信する
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import {
  ThemeProvider,
  resolveThemeMode,
  useTheme,
} from '../../src/theme/ThemeProvider';

describe('resolveThemeMode 純関数', () => {
  it('preference="light" は systemScheme に関わらず light', () => {
    expect(resolveThemeMode('light', 'dark')).toBe('light');
    expect(resolveThemeMode('light', 'light')).toBe('light');
    expect(resolveThemeMode('light', null)).toBe('light');
  });

  it('preference="dark" は systemScheme に関わらず dark', () => {
    expect(resolveThemeMode('dark', 'light')).toBe('dark');
    expect(resolveThemeMode('dark', 'dark')).toBe('dark');
    expect(resolveThemeMode('dark', null)).toBe('dark');
  });

  it('preference="system" は systemScheme に追従、未指定なら light', () => {
    expect(resolveThemeMode('system', 'dark')).toBe('dark');
    expect(resolveThemeMode('system', 'light')).toBe('light');
    expect(resolveThemeMode('system', null)).toBe('light');
    expect(resolveThemeMode('system', undefined)).toBe('light');
  });
});

describe('useTheme フック', () => {
  const Probe: React.FC = () => {
    const { mode, preference, colors } = useTheme();
    return (
      <Text testID="probe">
        {`${preference}|${mode}|${colors.bgCanvas}`}
      </Text>
    );
  };

  it('Provider なしでもデフォルト（system / light）を返す', () => {
    const { getByTestId } = render(<Probe />);
    const text = getByTestId('probe');
    expect(text.props.children).toContain('system|light|');
  });

  it('Provider preference="dark" で mode=dark になり colors が dark トークンになる', () => {
    const { getByTestId } = render(
      <ThemeProvider preference="dark" systemScheme="light">
        <Probe />
      </ThemeProvider>,
    );
    const text = getByTestId('probe');
    expect(text.props.children).toContain('dark|dark|');
    // dark の bgCanvas は light と異なる（Sprint 1 トークン定義より）
    expect(text.props.children).not.toContain('|FAFAFA');
  });

  it('Provider preference="system" + systemScheme=dark で実効 dark', () => {
    const { getByTestId } = render(
      <ThemeProvider preference="system" systemScheme="dark">
        <Probe />
      </ThemeProvider>,
    );
    const text = getByTestId('probe');
    expect(text.props.children).toContain('system|dark|');
  });

  it('Provider preference="light" で実効 light（systemScheme=dark でも上書き）', () => {
    const { getByTestId } = render(
      <ThemeProvider preference="light" systemScheme="dark">
        <Probe />
      </ThemeProvider>,
    );
    const text = getByTestId('probe');
    expect(text.props.children).toContain('light|light|');
  });
});
