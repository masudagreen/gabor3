/**
 * ClockAnswerButtons テスト（components.md §19 / screens.md S3-01）。
 *
 * 確認項目：
 *   - 8 個のボタンが描画される
 *   - 各ボタンのラベルが 24px（OPT-1 床、components.md §19）
 *   - 各ボタンの aria-label が「時計の N 時の方向」
 *   - 押下で onSelect が時計位置を渡す
 *   - disabled で onSelect が呼ばれない
 *   - highlightCorrect で当該ボタンに枠強調
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ClockAnswerButtons } from '../../src/components/ClockAnswerButtons';
import { CLOCK_POSITIONS } from '../../src/lib/game3';
import { fontSize } from '../../src/theme/tokens';

describe('ClockAnswerButtons', () => {
  it('8 個のボタンが描画され、各位置（12/1:30/3/4:30/6/7:30/9/10:30）の testID を持つ', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <ClockAnswerButtons onSelect={onSelect} testId="clock" />,
    );
    for (const pos of CLOCK_POSITIONS) {
      const btn = getByTestId(`clock-btn-${pos}`);
      expect(btn).toBeTruthy();
    }
  });

  it('各ボタンのラベルフォントサイズが 24px（OPT-1 床）', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <ClockAnswerButtons onSelect={onSelect} testId="clock" />,
    );
    // 「12」ラベルテキストノードを取得し、style の fontSize を確認
    const label = getByText('12');
    const flatStyle = Array.isArray(label.props.style)
      ? Object.assign({}, ...label.props.style.flat(Infinity))
      : label.props.style;
    expect(flatStyle.fontSize).toBe(fontSize.body); // 24
  });

  it('押下で onSelect が時計位置を渡す', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <ClockAnswerButtons onSelect={onSelect} testId="clock" />,
    );
    fireEvent.press(getByTestId('clock-btn-12'));
    expect(onSelect).toHaveBeenCalledWith('12');

    fireEvent.press(getByTestId('clock-btn-3'));
    expect(onSelect).toHaveBeenCalledWith('3');

    fireEvent.press(getByTestId('clock-btn-10:30'));
    expect(onSelect).toHaveBeenCalledWith('10:30');
  });

  it('disabled=true なら押下しても onSelect が呼ばれない', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <ClockAnswerButtons onSelect={onSelect} disabled testId="clock" />,
    );
    fireEvent.press(getByTestId('clock-btn-12'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('aria-label が「時計の N 時の方向」', () => {
    const { getByTestId } = render(
      <ClockAnswerButtons onSelect={jest.fn()} testId="clock" />,
    );
    expect(getByTestId('clock-btn-12').props.accessibilityLabel).toContain(
      '12 時の方向',
    );
    expect(getByTestId('clock-btn-1:30').props.accessibilityLabel).toContain(
      '1 時 30 分の方向',
    );
    expect(getByTestId('clock-btn-7:30').props.accessibilityLabel).toContain(
      '7 時 30 分の方向',
    );
  });

  it('Sprint 7-C: WCAG 1.4.11 を満たすため、未ハイライトの枠線色は fgMuted（高コントラスト）', () => {
    const { getByTestId } = render(
      <ClockAnswerButtons onSelect={jest.fn()} testId="clock" />,
    );
    const btn = getByTestId('clock-btn-12');
    const flatStyle = flatten(btn.props.style);
    // light mode の fgMuted = neutral500 = '#4D525C'（コントラスト 7.84:1）
    expect(flatStyle.borderColor).toBe('#4D525C');
    expect(flatStyle.borderWidth).toBe(2);
  });

  it('highlightCorrect で正解ボタンに highlight スタイルが適用される', () => {
    const { getByTestId, rerender } = render(
      <ClockAnswerButtons onSelect={jest.fn()} testId="clock" />,
    );
    rerender(
      <ClockAnswerButtons
        onSelect={jest.fn()}
        highlightCorrect="3"
        testId="clock"
      />,
    );
    // 正解側ボタンの枠 width が 3、それ以外は 2（Sprint 7-C: WCAG 1.4.11 強化前は 1）
    const correctBtn = getByTestId('clock-btn-3');
    const otherBtn = getByTestId('clock-btn-12');
    const correctStyle = flatten(correctBtn.props.style);
    const otherStyle = flatten(otherBtn.props.style);
    expect(correctStyle.borderWidth).toBe(3);
    expect(otherStyle.borderWidth).toBe(2);
  });
});

// Pressable の style 関数も含めて flatten する
function flatten(style: unknown): Record<string, unknown> {
  if (typeof style === 'function') {
    return flatten((style as (s: { pressed: boolean }) => unknown)({ pressed: false }));
  }
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map((s) => flatten(s)));
  }
  if (style && typeof style === 'object') {
    return style as Record<string, unknown>;
  }
  return {};
}
