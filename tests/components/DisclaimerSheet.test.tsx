/**
 * DisclaimerSheet 動作テスト（screens.md S4-02 / spec.md F-02 / §10.3）。
 *
 * 受け入れ基準：
 *   - 免責文言が 18pt 以上で表示（components.md §13）
 *   - 同意するまで先に進めない（disabled 状態）
 *   - 設定からも再閲覧可能（mode='review' で onClose のみ）
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  DisclaimerSheet,
  DISCLAIMER_BODY_INTRO,
  DISCLAIMER_WARN_LINES,
} from '../../src/components/DisclaimerSheet';

describe('DisclaimerSheet（onboarding mode）', () => {
  it('spec.md §10.3 の文言（医療機器でない / 推奨しない方）が表示される', () => {
    const { getByText } = render(
      <DisclaimerSheet
        mode="onboarding"
        onAgree={() => {}}
        __bypassScrollGateForTest
      />,
    );
    expect(getByText(DISCLAIMER_BODY_INTRO)).toBeTruthy();
    DISCLAIMER_WARN_LINES.forEach((line) => {
      expect(getByText(line)).toBeTruthy();
    });
  });

  it('初期状態では「同意する」ボタンが disabled（チェック未投入）', () => {
    const onAgree = jest.fn();
    const { getByTestId } = render(
      <DisclaimerSheet
        mode="onboarding"
        onAgree={onAgree}
        __bypassScrollGateForTest
      />,
    );
    const btn = getByTestId('disclaimer-agree-button');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(btn);
    expect(onAgree).not.toHaveBeenCalled();
  });

  it('チェックボックス ON で「同意する」が enabled になり、押下で onAgree が呼ばれる', () => {
    const onAgree = jest.fn();
    const { getByTestId } = render(
      <DisclaimerSheet
        mode="onboarding"
        onAgree={onAgree}
        __bypassScrollGateForTest
      />,
    );
    fireEvent.press(getByTestId('disclaimer-agree-checkbox'));
    const btn = getByTestId('disclaimer-agree-button');
    expect(btn.props.accessibilityState?.disabled).toBe(false);
    fireEvent.press(btn);
    expect(onAgree).toHaveBeenCalledTimes(1);
  });

  it('スクロール未完了状態ではチェックが disabled', () => {
    const { getByTestId } = render(
      <DisclaimerSheet
        mode="onboarding"
        onAgree={() => {}}
        // __bypassScrollGateForTest を渡さない
      />,
    );
    // 初期は scrolledToEnd=false（onContentSizeChange でレイアウト確定までは false 仮定）
    // なお、テスト環境では layout イベントが発火しないため、disabled で初期表示される
    const cb = getByTestId('disclaimer-agree-checkbox');
    // accessibilityState.disabled は true
    expect(cb.props.accessibilityState?.disabled).toBe(true);
  });

  it('スクロールが下端まで届くとチェックが enabled になる', () => {
    const { getByTestId } = render(
      <DisclaimerSheet mode="onboarding" onAgree={() => {}} />,
    );
    const scroll = getByTestId('disclaimer-scroll');
    // scroll イベントを発火
    fireEvent.scroll(scroll, {
      nativeEvent: {
        contentOffset: { x: 0, y: 600 },
        contentSize: { width: 300, height: 800 },
        layoutMeasurement: { width: 300, height: 220 },
      },
    });
    const cb = getByTestId('disclaimer-agree-checkbox');
    expect(cb.props.accessibilityState?.disabled).toBe(false);
  });
});

describe('DisclaimerSheet（review mode）', () => {
  it('mode=review では「閉じる」ボタンのみで、チェックボックスは無い', () => {
    const onClose = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <DisclaimerSheet mode="review" onClose={onClose} />,
    );
    expect(queryByTestId('disclaimer-agree-checkbox')).toBeNull();
    expect(queryByTestId('disclaimer-agree-button')).toBeNull();
    const closeBtn = getByTestId('disclaimer-close-button');
    fireEvent.press(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
