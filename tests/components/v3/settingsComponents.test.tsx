/**
 * settingsComponents.test.tsx — RG-1 RangeSelector / OR-1 VariableOrderList（S10.5、F-13）。
 *
 * components.md RG-1/OR-1 の単体挙動・a11y（role/aria-checked/最低 1 値・上下移動・端の disabled）。
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { RangeSelector } from '../../../src/components/v3/RangeSelector';
import { VariableOrderList } from '../../../src/components/v3/VariableOrderList';

function wrap(node: React.ReactElement) {
  return render(
    <ThemeProvider preference="light" systemScheme="light">
      {node}
    </ThemeProvider>,
  );
}

describe('RangeSelector（RG-1）', () => {
  const chips = [
    { value: 1, label: '1' },
    { value: 2, label: '2' },
    { value: 3, label: '3' },
  ];

  it('非選択チップを押すと易→難順を保った部分集合が返る', () => {
    const onChange = jest.fn();
    wrap(
      <RangeSelector
        groupLabel="個数の範囲"
        chips={chips}
        selected={[1]}
        onChange={onChange}
        testId="rg"
      />,
    );
    fireEvent.press(screen.getByTestId('rg-chip-3'));
    expect(onChange).toHaveBeenCalledWith([1, 3]);
  });

  it('選択チップを外すと当該値が落ちる', () => {
    const onChange = jest.fn();
    wrap(
      <RangeSelector
        groupLabel="個数の範囲"
        chips={chips}
        selected={[1, 2, 3]}
        onChange={onChange}
        testId="rg"
      />,
    );
    fireEvent.press(screen.getByTestId('rg-chip-2'));
    expect(onChange).toHaveBeenCalledWith([1, 3]);
  });

  it('最後の 1 値は外せず onMinViolation を呼ぶ（最低 1 値必須）', () => {
    const onChange = jest.fn();
    const onMin = jest.fn();
    wrap(
      <RangeSelector
        groupLabel="個数の範囲"
        chips={chips}
        selected={[2]}
        onChange={onChange}
        onMinViolation={onMin}
        testId="rg"
      />,
    );
    fireEvent.press(screen.getByTestId('rg-chip-2'));
    expect(onChange).not.toHaveBeenCalled();
    expect(onMin).toHaveBeenCalled();
  });

  it('各チップが role=checkbox + aria-checked（aria-label「{変数名} {値}」）', () => {
    wrap(
      <RangeSelector
        groupLabel="個数の範囲"
        chips={chips}
        selected={[1]}
        onChange={jest.fn()}
        testId="rg"
      />,
    );
    const chip1 = screen.getByLabelText('個数の範囲 1');
    expect(chip1.props.accessibilityState.checked).toBe(true);
    const chip2 = screen.getByLabelText('個数の範囲 2');
    expect(chip2.props.accessibilityState.checked).toBe(false);
  });
});

describe('VariableOrderList（OR-1・v3.2：外側 4 変数のみ並べ替え。repeat は含めない）', () => {
  const items = [
    { key: 'seconds', label: '時間' },
    { key: 'direction', label: '回転方向' },
    { key: 'gridSize', label: 'サイズ' },
  ] as const;

  it('行を下へ動かすと順序が入れ替わる', () => {
    const onReorder = jest.fn();
    wrap(
      <VariableOrderList items={[...items]} onReorder={onReorder} testId="or" />,
    );
    fireEvent.press(screen.getByTestId('or-down-seconds'));
    expect(onReorder).toHaveBeenCalledWith(['direction', 'seconds', 'gridSize']);
  });

  it('行を上へ動かすと順序が入れ替わる', () => {
    const onReorder = jest.fn();
    wrap(
      <VariableOrderList items={[...items]} onReorder={onReorder} testId="or" />,
    );
    fireEvent.press(screen.getByTestId('or-up-gridSize'));
    expect(onReorder).toHaveBeenCalledWith(['seconds', 'gridSize', 'direction']);
  });

  it('先頭の上ボタン・末尾の下ボタンは disabled', () => {
    wrap(
      <VariableOrderList items={[...items]} onReorder={jest.fn()} testId="or" />,
    );
    expect(screen.getByTestId('or-up-seconds').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('or-down-gridSize').props.accessibilityState.disabled).toBe(true);
  });

  it('上下ボタンに aria-label「{変数名}を 1 つ上へ/下へ」が付く', () => {
    wrap(
      <VariableOrderList items={[...items]} onReorder={jest.fn()} testId="or" />,
    );
    expect(screen.getByLabelText('時間を 1 つ上へ')).toBeTruthy();
    expect(screen.getByLabelText('時間を 1 つ下へ')).toBeTruthy();
  });

  it('移動時に onMoved(label, position) を呼ぶ', () => {
    const onMoved = jest.fn();
    wrap(
      <VariableOrderList
        items={[...items]}
        onReorder={jest.fn()}
        onMoved={onMoved}
        testId="or"
      />,
    );
    fireEvent.press(screen.getByTestId('or-down-seconds'));
    expect(onMoved).toHaveBeenCalledWith('時間', 2);
  });
});
