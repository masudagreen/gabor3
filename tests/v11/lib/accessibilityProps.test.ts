/**
 * accessibilityProps — Sprint 10 修正ラウンド 2 の Critical M-1 真正修正テスト。
 *
 * react-native-web 0.19 系の `createDOMProps` は `accessibilityState.checked` を
 * `aria-checked` 属性に変換しない。`buildChoiceAccessibilityProps` が Web 環境で
 * `aria-checked` を直接 props として組み立てることを純関数レベルで担保する。
 *
 * これは「テストはパスするのに実 DOM では aria-checked が欠落する」という
 * Sprint 9 → Sprint 10 のリグレッションを検出可能にするためのテストである。
 */

import { buildChoiceAccessibilityProps } from '../../../src/lib/v11/accessibilityProps';

describe('buildChoiceAccessibilityProps: Critical M-1 真正修正', () => {
  it('Web プラットフォームで isSelected=true なら aria-checked=true を直接付与する', () => {
    const props = buildChoiceAccessibilityProps({
      role: 'radio',
      label: '左',
      isSelected: true,
      platform: 'web',
    });
    expect(props['aria-checked']).toBe(true);
    // 互換のため accessibilityState も併用する（RN-Web では deprecated だが警告のみ）
    expect(props.accessibilityState.checked).toBe(true);
  });

  it('Web プラットフォームで isSelected=false なら aria-checked=false を直接付与する', () => {
    const props = buildChoiceAccessibilityProps({
      role: 'radio',
      label: '左',
      isSelected: false,
      platform: 'web',
    });
    expect(props['aria-checked']).toBe(false);
    expect(props.accessibilityState.checked).toBe(false);
  });

  it('Web プラットフォームで isSelected を false→true に切り替えると aria-checked が追従する', () => {
    const propsBefore = buildChoiceAccessibilityProps({
      role: 'radio',
      label: '左',
      isSelected: false,
      platform: 'web',
    });
    const propsAfter = buildChoiceAccessibilityProps({
      role: 'radio',
      label: '左',
      isSelected: true,
      platform: 'web',
    });
    expect(propsBefore['aria-checked']).toBe(false);
    expect(propsAfter['aria-checked']).toBe(true);
  });

  it('Native プラットフォームでは aria-checked を付与しない（RN が accessibilityState から伝達）', () => {
    const props = buildChoiceAccessibilityProps({
      role: 'radio',
      label: '左',
      isSelected: true,
      platform: 'native',
    });
    expect(props['aria-checked']).toBeUndefined();
    // ただし accessibilityState.checked は変わらず付与
    expect(props.accessibilityState.checked).toBe(true);
  });

  it('role="checkbox" でも同様に aria-checked が付与される（G-01 / G-07）', () => {
    const props = buildChoiceAccessibilityProps({
      role: 'checkbox',
      label: 'セル(0,0)',
      isSelected: true,
      platform: 'web',
    });
    expect(props.accessibilityRole).toBe('checkbox');
    expect(props['aria-checked']).toBe(true);
  });

  it('role="radio" は accessibilityRole=radio のまま', () => {
    const props = buildChoiceAccessibilityProps({
      role: 'radio',
      label: '左',
      isSelected: false,
      platform: 'web',
    });
    expect(props.accessibilityRole).toBe('radio');
  });

  it('disabled=true は accessibilityState.disabled に反映される', () => {
    const props = buildChoiceAccessibilityProps({
      role: 'radio',
      label: '左',
      isSelected: false,
      disabled: true,
      platform: 'web',
    });
    expect(props.accessibilityState.disabled).toBe(true);
  });

  it('label がそのまま accessibilityLabel に反映される', () => {
    const props = buildChoiceAccessibilityProps({
      role: 'radio',
      label: '左の縞模様（タップで「左が時計回り」と回答）',
      isSelected: false,
      platform: 'web',
    });
    expect(props.accessibilityLabel).toBe(
      '左の縞模様（タップで「左が時計回り」と回答）',
    );
  });
});

describe('buildChoiceAccessibilityProps: リグレッション保証', () => {
  // Sprint 9 の M-1 / Sprint 10 G-2 で起きたリグレッションは
  // 「accessibilityState.checked だけ更新しても aria-checked 属性が DOM に出ない」
  // という現象だった。本テストは「Web では aria-checked が必ず boolean として
  // 付与される」ことで実 DOM への反映を担保する。
  it('Web: isSelected の各値で aria-checked と accessibilityState.checked が同期する', () => {
    for (const isSelected of [true, false]) {
      const props = buildChoiceAccessibilityProps({
        role: 'radio',
        label: 'x',
        isSelected,
        platform: 'web',
      });
      expect(props['aria-checked']).toBe(isSelected);
      expect(props.accessibilityState.checked).toBe(isSelected);
    }
  });
});
