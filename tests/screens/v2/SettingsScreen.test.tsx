/**
 * SettingsScreen.test.tsx — F-13 設定タブ統合（screens.md S2-1）。
 */

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  render,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { SettingsScreen } from '../../../src/screens/v2/SettingsScreen';
import { loadSettings, loadUserProfile } from '../../../src/state/repository';
import { ensureV2Initialized } from '../../../src/state/migration';

beforeEach(async () => {
  await AsyncStorage.clear();
  await ensureV2Initialized();
});

describe('SettingsScreen', () => {
  it('既定値で全グループを描画する', async () => {
    render(<SettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('格子サイズ（n×n）')).toBeTruthy();
    });
    expect(screen.getByText('採点方式')).toBeTruthy();
    expect(screen.getByText('効果音')).toBeTruthy();
    expect(screen.getByText('全データ削除')).toBeTruthy();
    // バージョン表示
    expect(screen.getByText(/v2\.0\.0/)).toBeTruthy();
  });

  it('格子サイズを変更すると Settings に即保存される', async () => {
    render(<SettingsScreen />);
    await waitFor(() => screen.getByText('格子サイズ（n×n）'));
    fireEvent.press(screen.getByLabelText('5'));
    await waitFor(async () => {
      expect((await loadSettings()).gridSize).toBe(5);
    });
  });

  it('採点方式①③を選べる（既定②）', async () => {
    render(<SettingsScreen />);
    await waitFor(() => screen.getByText('全問正解で次へ'));
    expect((await loadSettings()).scoringMode).toBe('auto-confirm');
    fireEvent.press(screen.getByText('全問正解で次へ'));
    await waitFor(async () => {
      expect((await loadSettings()).scoringMode).toBe('all-correct-advance');
    });
  });

  it('視聴距離は UserProfile に保存される', async () => {
    render(<SettingsScreen />);
    await waitFor(() => screen.getByText('視聴距離'));
    fireEvent.press(screen.getByLabelText('30'));
    await waitFor(async () => {
      expect((await loadUserProfile()).viewingDistanceCm).toBe(30);
    });
  });

  it('効果音トグルが反映される', async () => {
    render(<SettingsScreen />);
    await waitFor(() => screen.getByText('効果音'));
    // 効果音 ON が既定 → タップで OFF
    const soundSwitch = screen.getByLabelText('効果音 ON');
    fireEvent.press(soundSwitch);
    await waitFor(async () => {
      expect((await loadSettings()).soundEnabled).toBe(false);
    });
  });

  it('全データ削除は 2 段階確認（ダイアログ → 削除）で実行される', async () => {
    // 事前に非既定値を保存
    render(<SettingsScreen />);
    await waitFor(() => screen.getByText('格子サイズ（n×n）'));
    fireEvent.press(screen.getByLabelText('5'));
    await waitFor(async () => {
      expect((await loadSettings()).gridSize).toBe(5);
    });

    // 1 段階目：行をタップ → 確認ダイアログ表示
    fireEvent.press(screen.getByLabelText('全データ削除'));
    await waitFor(() => screen.getByText('全データを削除しますか？'));

    // 2 段階目：削除する
    fireEvent.press(screen.getByLabelText('削除する'));
    await waitFor(async () => {
      // 既定に戻る
      expect((await loadSettings()).gridSize).toBe(4);
    });
  });

  it('onSettingsChange でダークモード変更を親へ通知する', async () => {
    const onChange = jest.fn();
    render(<SettingsScreen onSettingsChange={onChange} />);
    await waitFor(() => screen.getByText('ダークモード'));
    fireEvent.press(screen.getByLabelText('暗'));
    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
      const last = onChange.mock.calls.at(-1)?.[0];
      expect(last.darkMode).toBe('dark');
    });
  });
});
