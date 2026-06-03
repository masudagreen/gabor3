/**
 * GaborPatch — v1.2 クリッピング品質基準テスト（NF-27 / NF-28）。
 *
 * spec-v11.md v1.2 §6.4 / system.md §1.12。
 *
 * 焦点：
 *   - 表示サイズ N=1.5 倍で BMP 生成、外側で矩形クリッピング
 *   - 角度を最小単位（NF-26 / system.md §1.13）ずつ変えても四隅で背景色が
 *     露出しない（=内側 wrapper が外側より大きい）
 *   - overflow: hidden で BMP がクリップされる
 */

import React from 'react';
import { act, render } from '@testing-library/react-native';
import {
  GaborPatch,
  GABOR_CLIP_RATIO,
} from '../../src/components/GaborPatch';

describe('GaborPatch v1.2 矩形クリッピング（NF-27 / NF-28）', () => {
  const baseProps = {
    cpd: 3,
    contrast: 0.5,
    orientationDeg: 0,
    phaseRad: 0,
    sigmaDeg: 0.6,
    sizePx: 120,
    viewingDistanceCm: 40 as 30 | 40 | 50,
    testId: 'gp',
  };

  it('GABOR_CLIP_RATIO は 1.5（system.md §1.12.2 推奨値）', () => {
    expect(GABOR_CLIP_RATIO).toBeCloseTo(1.5, 5);
  });

  it('外側コンテナは sizePx ぴったり、overflow:hidden でクリップ', () => {
    const { getByTestId } = render(<GaborPatch {...baseProps} />);
    const node = getByTestId('gp');
    const styles = Array.isArray(node.props.style)
      ? Object.assign({}, ...node.props.style)
      : node.props.style;
    expect(styles.width).toBe(120);
    expect(styles.height).toBe(120);
    expect(styles.overflow).toBe('hidden');
  });

  it('内側 wrapper は sizePx × N（180px）で枠より大きく生成 → 矩形クリップで隙間ゼロ', () => {
    // 描画ツリー検証：外側 testId="gp" の中に Image 要素があり、Image の
    // 幅/高さは 120 * 1.5 = 180 でなくてはならない（NF-28 隙間禁止）
    const { getByTestId, UNSAFE_root } = render(<GaborPatch {...baseProps} />);
    const outer = getByTestId('gp');
    expect(outer).toBeTruthy();
    // 配下の Image 要素を探索
    const images = UNSAFE_root.findAllByType(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('react-native').Image,
    );
    expect(images.length).toBeGreaterThan(0);
    const imgStyle = Array.isArray(images[0].props.style)
      ? Object.assign({}, ...images[0].props.style)
      : images[0].props.style;
    // sizePx 120 × CLIP_RATIO 1.5 = 180
    expect(imgStyle.width).toBe(180);
    expect(imgStyle.height).toBe(180);
  });

  it('orientationDeg を 0° → 0.25° → 0.5° と最小単位で動かしても、外側 wrapper のサイズは固定（隙間が出ない）', () => {
    // 角度を変えて再レンダーしても、外側 wrapper（sizePx × sizePx + overflow:hidden）
    // の寸法は不変。内側のみが回転する。
    for (const deg of [0, 0.25, 0.5, 1, 5, 45, 89.75, 90, 180, 359.75]) {
      const { getByTestId, unmount } = render(
        <GaborPatch {...baseProps} orientationDeg={deg} />,
      );
      const node = getByTestId('gp');
      const styles = Array.isArray(node.props.style)
        ? Object.assign({}, ...node.props.style)
        : node.props.style;
      expect(styles.width).toBe(120);
      expect(styles.height).toBe(120);
      expect(styles.overflow).toBe('hidden');
      unmount();
    }
  });

  it('内側 wrapper の transform で角度を回転（BMP は 1 回生成、ちらつき回避）', () => {
    const { UNSAFE_root } = render(
      <GaborPatch {...baseProps} orientationDeg={45} testId="gp" />,
    );
    // 内側 wrapper（Image を包む View）に rotate transform が当たっている
    // RN の View は core 型なので、子の構造を辿って transform を持つものを探す
    const views = UNSAFE_root.findAllByType(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('react-native').View,
    );
    const rotated = views.find((v: { props: { style: unknown } }) => {
      const s = v.props.style;
      const flat = Array.isArray(s) ? Object.assign({}, ...s) : (s as Record<string, unknown> | null | undefined);
      return Array.isArray((flat as { transform?: unknown })?.transform);
    });
    expect(rotated).toBeTruthy();
  });

  it('ariaLabel が外側 wrapper に伝搬', () => {
    const { getByTestId } = render(
      <GaborPatch {...baseProps} ariaLabel="刺激パッチ" />,
    );
    expect(getByTestId('gp').props.accessibilityLabel).toBe('刺激パッチ');
  });
});

describe('GaborPatch 周波数変化のちらつき対策（F-01 / NF-1）', () => {
  const baseProps = {
    cpd: 3,
    contrast: 0.5,
    orientationDeg: 0,
    phaseRad: 0,
    sigmaDeg: 0.6,
    sizePx: 120,
    viewingDistanceCm: 40 as 30 | 40 | 50,
    testId: 'gp',
  };

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RNImage = require('react-native').Image;
  const images = (root: { findAllByType: (t: unknown) => unknown[] }) =>
    root.findAllByType(RNImage) as Array<{ props: Record<string, unknown> }>;

  it('Image 1 枚・フェードイン無効（fadeDuration=0）で描画される', () => {
    const { UNSAFE_root } = render(<GaborPatch {...baseProps} />);
    const imgs = images(UNSAFE_root);
    expect(imgs.length).toBe(1);
    expect(imgs[0].props.fadeDuration).toBe(0);
  });

  it('cpd 固定（回転のみ）：cpd を変えなければ BMP（source）は不変＝差し替えによる点滅が起きない', () => {
    // v2.0 仕様変更で cpd は時間変化しない（回転は transform）。同 cpd の再レンダーで
    // source（BMP）が変わらないことを確認（描画差し替え＝点滅の原因が構造的に無い）。
    const { UNSAFE_root, rerender } = render(<GaborPatch {...baseProps} cpd={3} />);
    const uri0 = (images(UNSAFE_root)[0].props.source as { uri: string }).uri;
    rerender(<GaborPatch {...baseProps} cpd={3} orientationDeg={45} />);
    const imgs = images(UNSAFE_root);
    expect(imgs.length).toBe(1);
    // 回転（orientationDeg）が変わっても BMP は不変
    expect((imgs[0].props.source as { uri: string }).uri).toBe(uri0);
  });
});
