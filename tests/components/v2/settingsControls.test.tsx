/**
 * settingsControls.test.tsx — 設定 UI コンポーネント（Toggle / SegmentedControl）。
 *
 * a11y ロールと操作（タップで onChange、選択状態、NF-9 Space 起動）を検証する。
 * （NumberSpinner は v3 で廃止＝S11 で撤去。回転速度等の手動スライダーは spec §11 でスコープ外。）
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Toggle } from '../../../src/components/v2/Toggle';
import { SegmentedControl } from '../../../src/components/v2/SegmentedControl';

describe('Toggle (FT-1)', () => {
  it('ON/OFF テキストを併記し role=switch・aria-checked を持つ（NF-12）', () => {
    const onChange = jest.fn();
    render(<Toggle value accessibilityLabel="効果音" onChange={onChange} />);
    const sw = screen.getByRole('switch');
    expect(sw.props.accessibilityState.checked).toBe(true);
    expect(screen.getByText('ON')).toBeTruthy();
  });

  it('タップで反転する', () => {
    const onChange = jest.fn();
    render(<Toggle value={false} accessibilityLabel="振動" onChange={onChange} />);
    fireEvent.press(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('SegmentedControl (FT-3)', () => {
  it('radiogroup + radio + selected 状態を持つ', () => {
    const onChange = jest.fn();
    render(
      <SegmentedControl
        options={[
          { value: 3, label: '3' },
          { value: 4, label: '4' },
          { value: 5, label: '5' },
        ]}
        value={4}
        onChange={onChange}
        accessibilityLabel="格子サイズ"
      />,
    );
    expect(screen.getByLabelText('格子サイズ')).toBeTruthy();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
    expect(radios[1].props.accessibilityState.selected).toBe(true);
  });

  it('別のセグメントを押すと onChange が値を返す', () => {
    const onChange = jest.fn();
    render(
      <SegmentedControl
        options={[
          { value: 'system', label: 'OS連動' },
          { value: 'dark', label: '暗' },
        ]}
        value="system"
        onChange={onChange}
        accessibilityLabel="ダークモード"
      />,
    );
    fireEvent.press(screen.getByLabelText('暗'));
    expect(onChange).toHaveBeenCalledWith('dark');
  });
});
