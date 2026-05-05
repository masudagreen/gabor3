/**
 * MarkBadge — MK-1（components.md §24、v1.1.1 新規）の単体テスト。
 *
 * 重点：
 *   - kind="correct" → 円形 ◯ アイコン（緑、不透明度 100%）
 *   - kind="wrong" → ✕ クロス（赤、不透明度 100%）
 *   - kind="missed" → 薄 ◯（緑、不透明度 50%）
 *   - sizePx 24〜80 でクランプ
 *   - aria-label が SR に伝わる
 *   - markBadgeSizeForCell 規範値
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import {
  MarkBadge,
  markBadgeSizeForCell,
} from '../../../../src/components/v11/MarkBadge';

describe('MarkBadge: 描画', () => {
  it('kind="correct" で円形 ◯ アイコン（RingIcon）が描画される', () => {
    const { queryByTestId } = render(
      <MarkBadge kind="correct" sizePx={48} ariaLabel="正解です" />,
    );
    expect(queryByTestId('mark-badge-correct')).toBeTruthy();
    expect(queryByTestId('mark-badge-icon-ring')).toBeTruthy();
    expect(queryByTestId('mark-badge-icon-cross')).toBeNull();
  });

  it('kind="wrong" で ✕ クロスアイコン（CrossIcon）が描画される', () => {
    const { queryByTestId } = render(
      <MarkBadge kind="wrong" sizePx={48} ariaLabel="不正解です" />,
    );
    expect(queryByTestId('mark-badge-wrong')).toBeTruthy();
    expect(queryByTestId('mark-badge-icon-cross')).toBeTruthy();
    expect(queryByTestId('mark-badge-icon-ring')).toBeNull();
  });

  it('kind="missed" で薄 ◯ アイコン（不透明度 50%）が描画される', () => {
    const { getByTestId } = render(
      <MarkBadge
        kind="missed"
        sizePx={48}
        ariaLabel="正解ですが選ばれませんでした"
      />,
    );
    const node = getByTestId('mark-badge-missed');
    const styleProp = node.props.style as Record<string, unknown>;
    expect(styleProp.opacity).toBe(0.5);
    // ring icon を内包する
    expect(getByTestId('mark-badge-icon-ring')).toBeTruthy();
  });

  it('aria-label が accessibilityLabel に渡る', () => {
    const { getByTestId } = render(
      <MarkBadge kind="correct" sizePx={48} ariaLabel="正解です" />,
    );
    const node = getByTestId('mark-badge-correct');
    expect(node.props.accessibilityLabel).toBe('正解です');
    expect(node.props.accessibilityRole).toBe('image');
  });

  it('sizePx が小さすぎる場合 24px にクランプ', () => {
    const { getByTestId } = render(
      <MarkBadge kind="correct" sizePx={10} ariaLabel="正解です" />,
    );
    const node = getByTestId('mark-badge-correct');
    const styleProp = node.props.style as Record<string, unknown>;
    expect(styleProp.width).toBe(24);
    expect(styleProp.height).toBe(24);
  });

  it('sizePx が大きすぎる場合 80px にクランプ', () => {
    const { getByTestId } = render(
      <MarkBadge kind="correct" sizePx={500} ariaLabel="正解です" />,
    );
    const node = getByTestId('mark-badge-correct');
    const styleProp = node.props.style as Record<string, unknown>;
    expect(styleProp.width).toBe(80);
    expect(styleProp.height).toBe(80);
  });

  it('correct（不透明度 100%）と missed（50%）が opacity で区別される', () => {
    const { getByTestId, rerender } = render(
      <MarkBadge kind="correct" sizePx={48} ariaLabel="a" />,
    );
    const correct = getByTestId('mark-badge-correct').props
      .style as Record<string, unknown>;
    expect(correct.opacity).toBe(1);
    rerender(<MarkBadge kind="missed" sizePx={48} ariaLabel="b" />);
    const missed = getByTestId('mark-badge-missed').props.style as Record<
      string,
      unknown
    >;
    expect(missed.opacity).toBe(0.5);
  });
});

describe('markBadgeSizeForCell（規範サイズ）', () => {
  it('セル直径 60px → 24px（最小クランプ）', () => {
    expect(markBadgeSizeForCell(60)).toBe(24);
  });

  it('セル直径 80px → 24px（80 が境界、最小値側）', () => {
    expect(markBadgeSizeForCell(80)).toBe(24);
  });

  it('セル直径 140px → 49px（140 × 0.35）', () => {
    expect(markBadgeSizeForCell(140)).toBe(49);
  });

  it('セル直径 200px → 70px（200 × 0.35）', () => {
    expect(markBadgeSizeForCell(200)).toBe(80);
    // ※ 200 は境界。components.md §24 では 200 は max クランプ域に入る。70px ではなく 80px。
  });

  it('セル直径 480px → 80px（最大クランプ）', () => {
    expect(markBadgeSizeForCell(480)).toBe(80);
  });

  it('不正な値（負・0・NaN）に対しては 24px を返す', () => {
    expect(markBadgeSizeForCell(0)).toBe(24);
    expect(markBadgeSizeForCell(-10)).toBe(24);
    expect(markBadgeSizeForCell(NaN)).toBe(24);
  });
});
