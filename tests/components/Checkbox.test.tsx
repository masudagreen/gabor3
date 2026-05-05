/**
 * Checkbox 単体テスト（Sprint 4 / components.md §13）。
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Checkbox } from '../../src/components/Checkbox';

describe('Checkbox', () => {
  it('押下で onChange が呼ばれる（toggle 動作）', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <Checkbox
        checked={false}
        label="同意します"
        onChange={onChange}
        testId="cb"
      />,
    );
    fireEvent.press(getByTestId('cb'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('disabled の時は onChange が呼ばれない', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <Checkbox
        checked={false}
        label="同意します"
        onChange={onChange}
        disabled
        testId="cb"
      />,
    );
    fireEvent.press(getByTestId('cb'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('accessibilityState.checked が現在値を反映する', () => {
    const { getByTestId } = render(
      <Checkbox
        checked
        label="同意します"
        onChange={() => {}}
        testId="cb"
      />,
    );
    const node = getByTestId('cb');
    expect(node.props.accessibilityState?.checked).toBe(true);
  });
});
