/**
 * AnswerChoiceGroup — AC-1 受け入れテスト（components.md §3）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { AnswerChoiceGroup } from '../../../src/components/v11/AnswerChoiceGroup';

const TWO_CHOICES = [
  { id: 'left', label: '左' },
  { id: 'right', label: '右' },
];

describe('AnswerChoiceGroup: AC-1', () => {
  it('horizontal-2 で 2 択を表示', () => {
    const { getByText } = render(
      <AnswerChoiceGroup
        choices={TWO_CHOICES}
        variant="text"
        selectedId={null}
        onSelect={jest.fn()}
        layout="horizontal-2"
        ariaLabelGroup="左右どちらが時計回りか"
      />,
    );
    expect(getByText('左')).toBeTruthy();
    expect(getByText('右')).toBeTruthy();
  });

  it('押下で onSelect が呼ばれる（id 指定）', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <AnswerChoiceGroup
        choices={TWO_CHOICES}
        variant="text"
        selectedId={null}
        onSelect={onSelect}
        layout="horizontal-2"
        ariaLabelGroup="グループ"
      />,
    );
    fireEvent.press(getByTestId('answer-choice-left'));
    expect(onSelect).toHaveBeenCalledWith('left');
  });

  it('再タップで null（解除）が onSelect に渡る', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <AnswerChoiceGroup
        choices={TWO_CHOICES}
        variant="text"
        selectedId="left"
        onSelect={onSelect}
        layout="horizontal-2"
        ariaLabelGroup="グループ"
      />,
    );
    fireEvent.press(getByTestId('answer-choice-left'));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('選択中ボタンは accessibilityState.selected=true', () => {
    const { getByTestId } = render(
      <AnswerChoiceGroup
        choices={TWO_CHOICES}
        variant="text"
        selectedId="right"
        onSelect={jest.fn()}
        layout="horizontal-2"
        ariaLabelGroup="グループ"
      />,
    );
    const right = getByTestId('answer-choice-right');
    expect(right.props.accessibilityState).toMatchObject({ selected: true });
    const left = getByTestId('answer-choice-left');
    expect(left.props.accessibilityState).toMatchObject({ selected: false });
  });

  it('「現在の回答：◯◯」のテキスト表示は存在しない（Q5 確定）', () => {
    const { queryByText } = render(
      <AnswerChoiceGroup
        choices={TWO_CHOICES}
        variant="text"
        selectedId="left"
        onSelect={jest.fn()}
        layout="horizontal-2"
        ariaLabelGroup="グループ"
      />,
    );
    expect(queryByText(/現在の回答/)).toBeNull();
  });

  it('disabled=true ですべてのボタンが押せない', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <AnswerChoiceGroup
        choices={TWO_CHOICES}
        variant="text"
        selectedId={null}
        onSelect={onSelect}
        layout="horizontal-2"
        ariaLabelGroup="グループ"
        disabled
      />,
    );
    fireEvent.press(getByTestId('answer-choice-left'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('grid-4（4 象限）で 4 ボタンが表示される', () => {
    const choices = [
      { id: 'tl', label: '左上' },
      { id: 'tr', label: '右上' },
      { id: 'bl', label: '左下' },
      { id: 'br', label: '右下' },
    ];
    const { getByText } = render(
      <AnswerChoiceGroup
        choices={choices}
        variant="text"
        selectedId={null}
        onSelect={jest.fn()}
        layout="grid-4"
        ariaLabelGroup="どの象限か"
      />,
    );
    expect(getByText('左上')).toBeTruthy();
    expect(getByText('右上')).toBeTruthy();
    expect(getByText('左下')).toBeTruthy();
    expect(getByText('右下')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// AC-3 clock-8 layout（Sprint 11）
// ---------------------------------------------------------------------------

const CLOCK_CHOICES = [
  { id: '12', label: '12', ariaLabel: '時計の 12 時の方向' },
  { id: '1.5', label: '1:30', ariaLabel: '時計の 1 時 30 分の方向' },
  { id: '3', label: '3', ariaLabel: '時計の 3 時の方向' },
  { id: '4.5', label: '4:30', ariaLabel: '時計の 4 時 30 分の方向' },
  { id: '6', label: '6', ariaLabel: '時計の 6 時の方向' },
  { id: '7.5', label: '7:30', ariaLabel: '時計の 7 時 30 分の方向' },
  { id: '9', label: '9', ariaLabel: '時計の 9 時の方向' },
  { id: '10.5', label: '10:30', ariaLabel: '時計の 10 時 30 分の方向' },
];

describe('AnswerChoiceGroup: AC-3 clock-8 layout', () => {
  it('8 ボタンすべてを表示する', () => {
    const { getByText } = render(
      <AnswerChoiceGroup
        choices={CLOCK_CHOICES}
        variant="text"
        selectedId={null}
        onSelect={jest.fn()}
        layout="clock-8"
        ariaLabelGroup="違う向きはどの時計方向か"
      />,
    );
    for (const c of CLOCK_CHOICES) {
      expect(getByText(c.label)).toBeTruthy();
    }
  });

  it('各ボタンに ariaLabel（「時計の N 時の方向」）が反映される', () => {
    const { getByTestId } = render(
      <AnswerChoiceGroup
        choices={CLOCK_CHOICES}
        variant="text"
        selectedId={null}
        onSelect={jest.fn()}
        layout="clock-8"
        ariaLabelGroup="違う向きはどの時計方向か"
      />,
    );
    expect(getByTestId('answer-choice-12').props.accessibilityLabel).toBe(
      '時計の 12 時の方向',
    );
    expect(getByTestId('answer-choice-1.5').props.accessibilityLabel).toBe(
      '時計の 1 時 30 分の方向',
    );
    expect(getByTestId('answer-choice-10.5').props.accessibilityLabel).toBe(
      '時計の 10 時 30 分の方向',
    );
  });

  it('未選択時：accessibilityState.selected=false（全ボタン）', () => {
    const { getByTestId } = render(
      <AnswerChoiceGroup
        choices={CLOCK_CHOICES}
        variant="text"
        selectedId={null}
        onSelect={jest.fn()}
        layout="clock-8"
        ariaLabelGroup="違う向きはどの時計方向か"
      />,
    );
    for (const c of CLOCK_CHOICES) {
      const btn = getByTestId(`answer-choice-${c.id}`);
      expect(btn.props.accessibilityState).toMatchObject({ selected: false });
    }
  });

  it('選択中ボタン：accessibilityState.selected=true、他は false', () => {
    const { getByTestId } = render(
      <AnswerChoiceGroup
        choices={CLOCK_CHOICES}
        variant="text"
        selectedId="3"
        onSelect={jest.fn()}
        layout="clock-8"
        ariaLabelGroup="違う向きはどの時計方向か"
      />,
    );
    expect(
      getByTestId('answer-choice-3').props.accessibilityState,
    ).toMatchObject({ selected: true });
    expect(
      getByTestId('answer-choice-12').props.accessibilityState,
    ).toMatchObject({ selected: false });
  });

  it('押下で onSelect が呼ばれる（時計方向 id）', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <AnswerChoiceGroup
        choices={CLOCK_CHOICES}
        variant="text"
        selectedId={null}
        onSelect={onSelect}
        layout="clock-8"
        ariaLabelGroup="違う向きはどの時計方向か"
      />,
    );
    fireEvent.press(getByTestId('answer-choice-3'));
    expect(onSelect).toHaveBeenCalledWith('3');
  });

  it('再タップで null（解除）が渡る', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <AnswerChoiceGroup
        choices={CLOCK_CHOICES}
        variant="text"
        selectedId="3"
        onSelect={onSelect}
        layout="clock-8"
        ariaLabelGroup="違う向きはどの時計方向か"
      />,
    );
    fireEvent.press(getByTestId('answer-choice-3'));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('別ボタンを押すと切替（旧選択は自動解除、呼び出し側で id を反映）', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <AnswerChoiceGroup
        choices={CLOCK_CHOICES}
        variant="text"
        selectedId="3"
        onSelect={onSelect}
        layout="clock-8"
        ariaLabelGroup="違う向きはどの時計方向か"
      />,
    );
    fireEvent.press(getByTestId('answer-choice-6'));
    expect(onSelect).toHaveBeenCalledWith('6');
  });

  it('disabled=true で押せない', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <AnswerChoiceGroup
        choices={CLOCK_CHOICES}
        variant="text"
        selectedId={null}
        onSelect={onSelect}
        layout="clock-8"
        ariaLabelGroup="違う向きはどの時計方向か"
        disabled
      />,
    );
    fireEvent.press(getByTestId('answer-choice-3'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('clockDiameterPx=280 を渡すと枠の width/height が 280 になる', () => {
    const { getByTestId } = render(
      <AnswerChoiceGroup
        choices={CLOCK_CHOICES}
        variant="text"
        selectedId={null}
        onSelect={jest.fn()}
        layout="clock-8"
        ariaLabelGroup="違う向きはどの時計方向か"
        clockDiameterPx={280}
        testId="clock-group"
      />,
    );
    const frame = getByTestId('clock-group');
    // style は配列で渡されるため flatten
    const flat = Array.isArray(frame.props.style)
      ? Object.assign({}, ...frame.props.style.flat(Infinity))
      : frame.props.style;
    expect(flat.width).toBe(280);
    expect(flat.height).toBe(280);
  });

  it('clockButtonSizePx=80 を渡すと各ボタンが 80×80 になる', () => {
    const { getByTestId } = render(
      <AnswerChoiceGroup
        choices={CLOCK_CHOICES}
        variant="text"
        selectedId={null}
        onSelect={jest.fn()}
        layout="clock-8"
        ariaLabelGroup="違う向きはどの時計方向か"
        clockDiameterPx={320}
        clockButtonSizePx={80}
      />,
    );
    const btn = getByTestId('answer-choice-12');
    const styleFn = btn.props.style;
    const style =
      typeof styleFn === 'function' ? styleFn({ pressed: false }) : styleFn;
    const flat = Array.isArray(style)
      ? Object.assign({}, ...style.flat(Infinity))
      : style;
    expect(flat.width).toBe(80);
    expect(flat.height).toBe(80);
  });

  it('8 ボタンが時計回りに 12, 1.5, 3, 4.5, 6, 7.5, 9, 10.5 の順番で並ぶ（id 順序保持）', () => {
    const { getByTestId } = render(
      <AnswerChoiceGroup
        choices={CLOCK_CHOICES}
        variant="text"
        selectedId={null}
        onSelect={jest.fn()}
        layout="clock-8"
        ariaLabelGroup="違う向きはどの時計方向か"
        clockDiameterPx={220}
        clockButtonSizePx={72}
      />,
    );
    // idx=0 (12時) は中心 cy より上、idx=4 (6時) は中心より下
    const top12 = getByTestId('answer-choice-12');
    const top6 = getByTestId('answer-choice-6');
    const styleOf = (n: { props: { style: unknown } }) => {
      const styleFn = n.props.style;
      const style =
        typeof styleFn === 'function' ? styleFn({ pressed: false }) : styleFn;
      return Array.isArray(style)
        ? Object.assign({}, ...style.flat(Infinity))
        : (style as { top?: number; left?: number });
    };
    const s12 = styleOf(top12) as { top: number; left: number };
    const s6 = styleOf(top6) as { top: number; left: number };
    expect(s12.top).toBeLessThan(s6.top); // 12 時の方が上
  });
});

// ---------------------------------------------------------------------------
// AC-4 keypad-10 layout（Sprint 17、components.md §6 NumericKeypadChoice）
// ---------------------------------------------------------------------------

const KEYPAD_CHOICES = [
  { id: '0', label: '0' },
  { id: '1', label: '1' },
  { id: '2', label: '2' },
  { id: '3', label: '3' },
  { id: '4', label: '4' },
  { id: '5', label: '5' },
  { id: '6', label: '6' },
  { id: '7', label: '7' },
  { id: '8', label: '8' },
  { id: '9', label: '9' },
];

describe('AnswerChoiceGroup: AC-4 keypad-10 layout', () => {
  it('10 ボタンすべてを表示する', () => {
    const { getByText } = render(
      <AnswerChoiceGroup
        choices={KEYPAD_CHOICES}
        variant="numeric"
        selectedId={null}
        onSelect={jest.fn()}
        layout="keypad-10"
        ariaLabelGroup="埋め込まれた数字"
      />,
    );
    for (const c of KEYPAD_CHOICES) {
      expect(getByText(c.label)).toBeTruthy();
    }
  });

  it('各ボタンに ariaLabel「数字 N」（既定）が付与される', () => {
    const { getByTestId } = render(
      <AnswerChoiceGroup
        choices={KEYPAD_CHOICES}
        variant="numeric"
        selectedId={null}
        onSelect={jest.fn()}
        layout="keypad-10"
        ariaLabelGroup="埋め込まれた数字"
      />,
    );
    expect(getByTestId('answer-choice-0').props.accessibilityLabel).toBe(
      '数字 0',
    );
    expect(getByTestId('answer-choice-3').props.accessibilityLabel).toBe(
      '数字 3',
    );
    expect(getByTestId('answer-choice-9').props.accessibilityLabel).toBe(
      '数字 9',
    );
  });

  it('未選択時：accessibilityState.selected=false（全ボタン）', () => {
    const { getByTestId } = render(
      <AnswerChoiceGroup
        choices={KEYPAD_CHOICES}
        variant="numeric"
        selectedId={null}
        onSelect={jest.fn()}
        layout="keypad-10"
        ariaLabelGroup="埋め込まれた数字"
      />,
    );
    for (const c of KEYPAD_CHOICES) {
      const btn = getByTestId(`answer-choice-${c.id}`);
      expect(btn.props.accessibilityState).toMatchObject({ selected: false });
    }
  });

  it('選択中ボタン：accessibilityState.selected=true、他は false', () => {
    const { getByTestId } = render(
      <AnswerChoiceGroup
        choices={KEYPAD_CHOICES}
        variant="numeric"
        selectedId="3"
        onSelect={jest.fn()}
        layout="keypad-10"
        ariaLabelGroup="埋め込まれた数字"
      />,
    );
    expect(
      getByTestId('answer-choice-3').props.accessibilityState,
    ).toMatchObject({ selected: true });
    expect(
      getByTestId('answer-choice-0').props.accessibilityState,
    ).toMatchObject({ selected: false });
  });

  it('押下で onSelect が呼ばれる（id="N"）', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <AnswerChoiceGroup
        choices={KEYPAD_CHOICES}
        variant="numeric"
        selectedId={null}
        onSelect={onSelect}
        layout="keypad-10"
        ariaLabelGroup="埋め込まれた数字"
      />,
    );
    fireEvent.press(getByTestId('answer-choice-3'));
    expect(onSelect).toHaveBeenCalledWith('3');
  });

  it('再タップで null（解除）が渡る', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <AnswerChoiceGroup
        choices={KEYPAD_CHOICES}
        variant="numeric"
        selectedId="3"
        onSelect={onSelect}
        layout="keypad-10"
        ariaLabelGroup="埋め込まれた数字"
      />,
    );
    fireEvent.press(getByTestId('answer-choice-3'));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('別ボタンを押すと切替（旧選択は自動解除）', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <AnswerChoiceGroup
        choices={KEYPAD_CHOICES}
        variant="numeric"
        selectedId="3"
        onSelect={onSelect}
        layout="keypad-10"
        ariaLabelGroup="埋め込まれた数字"
      />,
    );
    fireEvent.press(getByTestId('answer-choice-7'));
    expect(onSelect).toHaveBeenCalledWith('7');
  });

  it('disabled=true で押せない', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <AnswerChoiceGroup
        choices={KEYPAD_CHOICES}
        variant="numeric"
        selectedId={null}
        onSelect={onSelect}
        layout="keypad-10"
        ariaLabelGroup="埋め込まれた数字"
        disabled
      />,
    );
    fireEvent.press(getByTestId('answer-choice-3'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('keypadButtonSizePx=72 を渡すと各ボタンが 72×72 になる', () => {
    const { getByTestId } = render(
      <AnswerChoiceGroup
        choices={KEYPAD_CHOICES}
        variant="numeric"
        selectedId={null}
        onSelect={jest.fn()}
        layout="keypad-10"
        ariaLabelGroup="埋め込まれた数字"
        keypadButtonSizePx={72}
      />,
    );
    const btn = getByTestId('answer-choice-5');
    const styleFn = btn.props.style;
    const style =
      typeof styleFn === 'function' ? styleFn({ pressed: false }) : styleFn;
    const flat = Array.isArray(style)
      ? Object.assign({}, ...style.flat(Infinity))
      : style;
    expect(flat.width).toBe(72);
    expect(flat.height).toBe(72);
  });

  it('既定で 64px ボタン', () => {
    const { getByTestId } = render(
      <AnswerChoiceGroup
        choices={KEYPAD_CHOICES}
        variant="numeric"
        selectedId={null}
        onSelect={jest.fn()}
        layout="keypad-10"
        ariaLabelGroup="埋め込まれた数字"
      />,
    );
    const btn = getByTestId('answer-choice-5');
    const styleFn = btn.props.style;
    const style =
      typeof styleFn === 'function' ? styleFn({ pressed: false }) : styleFn;
    const flat = Array.isArray(style)
      ? Object.assign({}, ...style.flat(Infinity))
      : style;
    expect(flat.width).toBe(64);
  });

  it('ariaLabel カスタム指定があれば「数字 N」を上書き', () => {
    const customChoices = KEYPAD_CHOICES.map((c) => ({
      ...c,
      ariaLabel: `カスタム ${c.label}`,
    }));
    const { getByTestId } = render(
      <AnswerChoiceGroup
        choices={customChoices}
        variant="numeric"
        selectedId={null}
        onSelect={jest.fn()}
        layout="keypad-10"
        ariaLabelGroup="埋め込まれた数字"
      />,
    );
    expect(getByTestId('answer-choice-3').props.accessibilityLabel).toBe(
      'カスタム 3',
    );
  });
});
