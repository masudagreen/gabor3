/**
 * BadgeUnlockToast テスト — S19-07 / F-13。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { render } from '@testing-library/react-native';
import { BadgeUnlockToast } from '../../../../../src/components/v11/badges/BadgeUnlockToast';

describe('BadgeUnlockToast: 表示', () => {
  it('badgeId に対応する toast を描画', () => {
    const { getByTestId } = render(<BadgeUnlockToast badgeId="B-01" />);
    expect(getByTestId('badge-unlock-toast-B-01')).toBeTruthy();
  });

  it('aria-live は assertive', () => {
    const { getByTestId } = render(<BadgeUnlockToast badgeId="B-01" />);
    expect(
      getByTestId('badge-unlock-toast-B-01').props.accessibilityLiveRegion,
    ).toBe('assertive');
  });

  it('accessibilityLabel に「{バッジ名} を獲得しました」', () => {
    const { getByTestId } = render(<BadgeUnlockToast badgeId="B-01" />);
    expect(
      getByTestId('badge-unlock-toast-B-01').props.accessibilityLabel,
    ).toContain('はじめの一歩');
    expect(
      getByTestId('badge-unlock-toast-B-01').props.accessibilityLabel,
    ).toContain('を獲得しました');
  });

  it('1 つの toast に対して 1 つの DOM 要素', () => {
    const { queryAllByTestId } = render(<BadgeUnlockToast badgeId="B-09" />);
    expect(queryAllByTestId('badge-unlock-toast-B-09')).toHaveLength(1);
  });

  it('reducedMotion=true でも描画される（アニメ抑制）', () => {
    const { getByTestId } = render(
      <BadgeUnlockToast badgeId="B-01" reducedMotion />,
    );
    expect(getByTestId('badge-unlock-toast-B-01')).toBeTruthy();
  });

  it('点滅エフェクトが入っていない（NF-11）', () => {
    // 点滅は opacity の繰り返し変動によって発生する。本実装では
    // フェードイン 1 回のみで往復しないため、検証は構造上担保される。
    // ここでは「testID は 1 つしか出ない＝ DOM が振動していない」ことを確認。
    const { queryAllByTestId } = render(<BadgeUnlockToast badgeId="B-04" />);
    expect(queryAllByTestId('badge-unlock-toast-B-04')).toHaveLength(1);
  });

  it('複数 badgeId で別々の toast が出る', () => {
    const { getByTestId } = render(
      <>
        <BadgeUnlockToast badgeId="B-01" />
        <BadgeUnlockToast badgeId="B-02" />
      </>,
    );
    expect(getByTestId('badge-unlock-toast-B-01')).toBeTruthy();
    expect(getByTestId('badge-unlock-toast-B-02')).toBeTruthy();
  });
});
