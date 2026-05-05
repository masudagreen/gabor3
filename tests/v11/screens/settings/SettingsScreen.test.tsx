/**
 * SettingsScreen テスト — S19-03 / F-14。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SettingsScreen } from '../../../../src/screens/v11/settings/SettingsScreen';
import { SettingsV11, createDefaultSettingsV11 } from '../../../../src/state/storage-v11';

const baseSettings: SettingsV11 = createDefaultSettingsV11();

const baseProps = {
  settings: baseSettings,
  viewingDistanceCm: 40 as const,
  disclaimerAgreedAt: '2026-04-30T10:00:00.000Z',
  appVersion: '1.1.0',
  onBack: jest.fn(),
  onChangeSettings: jest.fn(),
  onChangeViewingDistance: jest.fn(),
  onPressBadgeList: jest.fn(),
  onPressStaircaseReset: jest.fn(),
  onPressDataDelete: jest.fn(),
  onPressDisclaimer: jest.fn(),
};

describe('SettingsScreen: 全項目表示', () => {
  it('画面ルートが描画される', () => {
    const { getByTestId } = render(<SettingsScreen {...baseProps} />);
    expect(getByTestId('settings-screen-v11')).toBeTruthy();
  });

  it('ダークモード行を表示', () => {
    const { getByTestId } = render(<SettingsScreen {...baseProps} />);
    expect(getByTestId('settings-dark-mode')).toBeTruthy();
  });

  it('視聴距離行を表示', () => {
    const { getByTestId } = render(<SettingsScreen {...baseProps} />);
    expect(getByTestId('settings-viewing-distance')).toBeTruthy();
  });

  it('効果音 / 振動 トグル行を表示', () => {
    const { getByTestId } = render(<SettingsScreen {...baseProps} />);
    expect(getByTestId('settings-sound')).toBeTruthy();
    expect(getByTestId('settings-haptics')).toBeTruthy();
  });

  it('片眼ガイダンス行を表示', () => {
    const { getByTestId } = render(<SettingsScreen {...baseProps} />);
    expect(getByTestId('settings-one-eye')).toBeTruthy();
  });

  it('バッジ一覧 / staircase リセット / 全データ削除 / 免責事項を表示', () => {
    const { getByTestId } = render(<SettingsScreen {...baseProps} />);
    expect(getByTestId('settings-badge-list')).toBeTruthy();
    expect(getByTestId('settings-staircase-reset')).toBeTruthy();
    expect(getByTestId('settings-data-delete')).toBeTruthy();
    expect(getByTestId('settings-disclaimer')).toBeTruthy();
  });

  it('バージョン情報に v1.1.x と同意日を表示', () => {
    const { getByText } = render(<SettingsScreen {...baseProps} />);
    expect(getByText('v1.1.0')).toBeTruthy();
    expect(getByText(/同意日 2026-04-30/)).toBeTruthy();
  });

  it('disclaimerAgreedAt=null なら subtitle に「同意日 ―」', () => {
    const { getByText } = render(
      <SettingsScreen {...baseProps} disclaimerAgreedAt={null} />,
    );
    expect(getByText(/同意日 ―/)).toBeTruthy();
  });
});

describe('SettingsScreen: 行の高さ 56pt 以上', () => {
  it('全リンク行が minHeight 56', () => {
    const { getByTestId } = render(<SettingsScreen {...baseProps} />);
    for (const id of [
      'settings-dark-mode',
      'settings-viewing-distance',
      'settings-sound',
      'settings-haptics',
      'settings-one-eye',
      'settings-badge-list',
      'settings-staircase-reset',
      'settings-data-delete',
      'settings-disclaimer',
    ]) {
      const node = getByTestId(id);
      const flatStyle = Array.isArray(node.props.style)
        ? Object.assign({}, ...node.props.style.flat(Infinity))
        : node.props.style;
      expect(flatStyle.minHeight).toBeGreaterThanOrEqual(56);
    }
  });
});

describe('SettingsScreen: トグル動作', () => {
  it('効果音トグル：onChangeSettings({ ...settings, soundEnabled: false })', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <SettingsScreen {...baseProps} onChangeSettings={onChange} />,
    );
    fireEvent.press(getByTestId('settings-sound'));
    expect(onChange).toHaveBeenCalledWith({
      ...baseSettings,
      soundEnabled: !baseSettings.soundEnabled,
    });
  });

  it('振動トグル：onChangeSettings 反転値', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <SettingsScreen {...baseProps} onChangeSettings={onChange} />,
    );
    fireEvent.press(getByTestId('settings-haptics'));
    expect(onChange).toHaveBeenCalledWith({
      ...baseSettings,
      hapticsEnabled: !baseSettings.hapticsEnabled,
    });
  });

  it('トグル accessibilityRole は switch、accessibilityState.checked あり', () => {
    const { getByTestId } = render(<SettingsScreen {...baseProps} />);
    const sound = getByTestId('settings-sound');
    expect(sound.props.accessibilityRole).toBe('switch');
    expect(sound.props.accessibilityState).toEqual(
      expect.objectContaining({ checked: baseSettings.soundEnabled }),
    );
  });
});

describe('SettingsScreen: 値タップで cycle', () => {
  it('ダークモードタップで system → light → dark → system 循環', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <SettingsScreen
        {...baseProps}
        settings={{ ...baseSettings, darkMode: 'system' }}
        onChangeSettings={onChange}
      />,
    );
    fireEvent.press(getByTestId('settings-dark-mode'));
    expect(onChange).toHaveBeenCalledWith({ ...baseSettings, darkMode: 'light' });
  });

  it('視聴距離タップで 40→50→30→40 循環', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <SettingsScreen
        {...baseProps}
        viewingDistanceCm={40}
        onChangeViewingDistance={onChange}
      />,
    );
    fireEvent.press(getByTestId('settings-viewing-distance'));
    expect(onChange).toHaveBeenCalledWith(50);
  });

  it('片眼ガイダンス：off→left→right→alternate→off 循環', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <SettingsScreen
        {...baseProps}
        settings={{ ...baseSettings, oneEyeGuidance: 'off' }}
        onChangeSettings={onChange}
      />,
    );
    fireEvent.press(getByTestId('settings-one-eye'));
    expect(onChange).toHaveBeenCalledWith({
      ...baseSettings,
      oneEyeGuidance: 'left',
    });
  });
});

describe('SettingsScreen: ナビ動線', () => {
  it('「戻る」で onBack', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(
      <SettingsScreen {...baseProps} onBack={onBack} />,
    );
    fireEvent.press(getByTestId('settings-back'));
    expect(onBack).toHaveBeenCalled();
  });

  it('バッジ一覧タップで onPressBadgeList', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <SettingsScreen {...baseProps} onPressBadgeList={onPress} />,
    );
    fireEvent.press(getByTestId('settings-badge-list'));
    expect(onPress).toHaveBeenCalled();
  });

  it('staircase リセットタップで onPressStaircaseReset', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <SettingsScreen {...baseProps} onPressStaircaseReset={onPress} />,
    );
    fireEvent.press(getByTestId('settings-staircase-reset'));
    expect(onPress).toHaveBeenCalled();
  });

  it('全データ削除タップで onPressDataDelete', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <SettingsScreen {...baseProps} onPressDataDelete={onPress} />,
    );
    fireEvent.press(getByTestId('settings-data-delete'));
    expect(onPress).toHaveBeenCalled();
  });

  it('免責事項タップで onPressDisclaimer', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <SettingsScreen {...baseProps} onPressDisclaimer={onPress} />,
    );
    fireEvent.press(getByTestId('settings-disclaimer'));
    expect(onPress).toHaveBeenCalled();
  });
});
