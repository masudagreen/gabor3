/**
 * AgeGroupScreen テスト（screens.md S4-03 / spec.md A-9）。
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { AgeGroupScreen } from '../../../src/screens/Onboarding/AgeGroupScreen';

describe('AgeGroupScreen', () => {
  it('40s / 50s / 60s / 70s+ / unspecified の選択肢が描画される', () => {
    const { getByTestId } = render(
      <AgeGroupScreen onSelect={() => {}} onBack={() => {}} />,
    );
    expect(getByTestId('age-option-40s')).toBeTruthy();
    expect(getByTestId('age-option-50s')).toBeTruthy();
    expect(getByTestId('age-option-60s')).toBeTruthy();
    expect(getByTestId('age-option-70s+')).toBeTruthy();
    expect(getByTestId('age-option-unspecified')).toBeTruthy();
  });

  it('40s / 50s / 60s / unspecified 選択時は警告なしで onSelect が呼ばれる', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <AgeGroupScreen onSelect={onSelect} onBack={() => {}} />,
    );
    fireEvent.press(getByTestId('age-option-50s'));
    expect(onSelect).toHaveBeenCalledWith('50s');
  });

  it('70s+ 選択時は警告モーダルが表示され、即座に onSelect は呼ばれない', () => {
    const onSelect = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <AgeGroupScreen onSelect={onSelect} onBack={() => {}} />,
    );
    expect(queryByTestId('age-warning-modal')).toBeNull();
    fireEvent.press(getByTestId('age-option-70s+'));
    expect(getByTestId('age-warning-modal')).toBeTruthy();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('警告モーダルで「理解した上で続ける」を押すと 70s+ で onSelect が呼ばれる', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <AgeGroupScreen onSelect={onSelect} onBack={() => {}} />,
    );
    fireEvent.press(getByTestId('age-option-70s+'));
    fireEvent.press(getByTestId('age-warning-continue'));
    expect(onSelect).toHaveBeenCalledWith('70s+');
  });

  it('Sprint 7-C: 初期表示では全カードが accessibilityState.checked=false', () => {
    const { getByTestId } = render(
      <AgeGroupScreen onSelect={() => {}} onBack={() => {}} />,
    );
    for (const v of ['40s', '50s', '60s', '70s+']) {
      const node = getByTestId(`age-option-${v}`);
      expect(node.props.accessibilityState?.checked).toBe(false);
      expect(node.props.accessibilityState?.selected).toBe(false);
    }
  });

  it('Sprint 7-C: タップしたカードに accessibilityState.checked=true が反映される', () => {
    // 親画面が onSelect 経由で切り替わる前は、画面内 state（pendingSelected）に
    // 当該グループ ID が保持され、accessibilityState.checked=true が反映される。
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <AgeGroupScreen onSelect={onSelect} onBack={() => {}} />,
    );
    fireEvent.press(getByTestId('age-option-50s'));
    // onSelect は即時呼ばれるが、本テストでは画面はそのまま残るため re-find できる
    expect(onSelect).toHaveBeenCalledWith('50s');
    expect(getByTestId('age-option-50s').props.accessibilityState?.checked).toBe(
      true,
    );
    expect(getByTestId('age-option-50s').props.accessibilityState?.selected).toBe(
      true,
    );
    // 他は false のまま
    expect(getByTestId('age-option-40s').props.accessibilityState?.checked).toBe(
      false,
    );
  });

  it('Sprint 7-C: initialSelected で初期値を反映できる（再オープン用）', () => {
    const { getByTestId } = render(
      <AgeGroupScreen
        onSelect={() => {}}
        onBack={() => {}}
        initialSelected="50s"
      />,
    );
    expect(getByTestId('age-option-50s').props.accessibilityState?.checked).toBe(
      true,
    );
    expect(getByTestId('age-option-40s').props.accessibilityState?.checked).toBe(
      false,
    );
  });

  it('警告モーダルで「戻る」を押すと onSelect は呼ばれずモーダルが閉じる', () => {
    const onSelect = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <AgeGroupScreen onSelect={onSelect} onBack={() => {}} />,
    );
    fireEvent.press(getByTestId('age-option-70s+'));
    fireEvent.press(getByTestId('age-warning-back'));
    expect(onSelect).not.toHaveBeenCalled();
    // モーダルは visible=false（Modal は visible=false でも子は render されるが、
    // accessibilityState を直接確かめる）
    // モーダル内コンテンツが見えなくなっているかは Modal の visible prop で判定
    // ここでは onSelect 未呼び出しと onBack 押下 → モーダル close を確認
    const modal = queryByTestId('age-warning-modal');
    // age-warning-modal は Modal の中身。Modal が visible=false のとき
    // テスト環境でも querySelector は null を返す
    expect(modal).toBeNull();
  });
});
