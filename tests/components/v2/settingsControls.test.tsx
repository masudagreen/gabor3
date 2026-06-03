/**
 * settingsControls.test.tsx — S2 UI コンポーネント（Toggle / SegmentedControl / NumberSpinner）。
 *
 * a11y ロールと操作（タップで onChange、範囲端でクランプ、テキスト直接入力）を検証する。
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Toggle } from '../../../src/components/v2/Toggle';
import { SegmentedControl } from '../../../src/components/v2/SegmentedControl';
import { NumberSpinner } from '../../../src/components/v2/NumberSpinner';

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

describe('NumberSpinner (テキスト入力 + スピンボタン、FT-2 代替)', () => {
  const baseProps = {
    label: '回転速度',
    min: 2,
    max: 12,
    step: 0.1,
    decimals: 1,
    unit: '°/秒',
    valueText: (v: number) => `回転速度 ${v.toFixed(1)} 度毎秒`,
    testId: 'spin',
  };

  it('aria-value を持ち、現在値をテキスト欄に表示する', () => {
    render(
      <NumberSpinner {...baseProps} value={6} onChange={jest.fn()} showDifficultyHint />,
    );
    const wrap = screen.getByLabelText('回転速度');
    expect(wrap.props.accessibilityValue).toEqual({
      min: 2,
      max: 12,
      now: 6,
      text: '回転速度 6.0 度毎秒',
    });
    // テキスト欄に現在値（小数 1 桁）
    expect(screen.getByTestId('spin-input').props.value).toBe('6.0');
    // 単位と難→易ヒント
    expect(screen.getByText('°/秒')).toBeTruthy();
    expect(screen.getByText('難しい（小）')).toBeTruthy();
  });

  it('＋ / − ボタンで step（0.1）単位に増減する', () => {
    const onChange = jest.fn();
    render(<NumberSpinner {...baseProps} value={6} onChange={onChange} />);
    fireEvent.press(screen.getByLabelText('回転速度を上げる'));
    expect(onChange).toHaveBeenCalledWith(6.1);
    onChange.mockClear();
    fireEvent.press(screen.getByLabelText('回転速度を下げる'));
    expect(onChange).toHaveBeenCalledWith(5.9);
  });

  it('最大値では＋を押しても max を超えない（クランプ）', () => {
    const onChange = jest.fn();
    render(<NumberSpinner {...baseProps} value={12} onChange={onChange} />);
    fireEvent.press(screen.getByLabelText('回転速度を上げる'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('テキスト直接入力 → 確定(blur)で step スナップ + クランプする', () => {
    const onChange = jest.fn();
    render(
      <NumberSpinner
        {...baseProps}
        label="周波数変化速度"
        min={0.05}
        max={0.4}
        step={0.005}
        decimals={3}
        unit="hz/秒"
        valueText={(v) => `${v.toFixed(3)} ヘルツ毎秒`}
        value={0.15}
        onChange={onChange}
      />,
    );
    const input = screen.getByTestId('spin-input');
    fireEvent.changeText(input, '0.153'); // 0.005 格子へ → 0.155
    fireEvent(input, 'blur');
    expect(onChange).toHaveBeenCalledWith(0.155);
  });

  it('小数 step（0.005）で誤差なく増減する', () => {
    const onChange = jest.fn();
    render(
      <NumberSpinner
        {...baseProps}
        label="周波数変化速度"
        min={0.05}
        max={0.4}
        step={0.005}
        decimals={3}
        unit="hz/秒"
        valueText={(v) => `${v.toFixed(3)} ヘルツ毎秒`}
        value={0.15}
        onChange={onChange}
      />,
    );
    fireEvent.press(screen.getByLabelText('周波数変化速度を上げる'));
    expect(onChange).toHaveBeenCalledWith(0.155);
  });
});
