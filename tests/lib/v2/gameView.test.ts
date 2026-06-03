/**
 * gameView.test.ts — S4 表示ロジック純関数（F-03 / F-12）。
 *
 * カウントダウン色段階・aria-live・結果マーク分類・総合判定・cpd 量子化を検証する。
 */

import {
  aggregateKind,
  classifyMark,
  classifyMarks,
  countdownAriaLive,
  countdownTier,
  quantizeCpd,
  quantizeCpdTime,
} from '../../../src/lib/v2/gameView';
import { PatchDef } from '../../../src/lib/v2/patch';

function changing(index: number): PatchDef {
  return {
    index,
    changeKind: 'rotation',
    initialOrientationDeg: 0,
    initialCpd: 3,
    rotationSpeed: 6,
    rotationDir: 'cw',
    sfChangeSpeed: 0.15,
    sfDir: 'increase',
  };
}

function staticP(index: number): PatchDef {
  return { ...changing(index), changeKind: null };
}

describe('countdownTier（F-12 色段階）', () => {
  it('残り 6 秒以上は normal（白・Bold）', () => {
    expect(countdownTier(20)).toBe('normal');
    expect(countdownTier(6)).toBe('normal');
  });
  it('残り 5 秒以下〜4 秒は warn（黄）', () => {
    expect(countdownTier(5)).toBe('warn');
    expect(countdownTier(4)).toBe('warn');
  });
  it('残り 3 秒以下は danger（赤・Black）', () => {
    expect(countdownTier(3)).toBe('danger');
    expect(countdownTier(1)).toBe('danger');
    expect(countdownTier(0)).toBe('danger');
  });
});

describe('countdownAriaLive', () => {
  it('6 秒以上 polite、5 秒以下 assertive', () => {
    expect(countdownAriaLive(6)).toBe('polite');
    expect(countdownAriaLive(5)).toBe('assertive');
    expect(countdownAriaLive(0)).toBe('assertive');
  });
});

describe('classifyMark（F-03 マーク分類）', () => {
  it('変化パッチを選択 = tp', () => {
    expect(classifyMark(changing(0), true)).toBe('tp');
  });
  it('変化パッチを選び逃し = fn', () => {
    expect(classifyMark(changing(0), false)).toBe('fn');
  });
  it('静止パッチを誤選択 = fp', () => {
    expect(classifyMark(staticP(0), true)).toBe('fp');
  });
  it('静止パッチを選ばない = none（何も出さない）', () => {
    expect(classifyMark(staticP(0), false)).toBe('none');
  });
});

describe('classifyMarks（index 順）', () => {
  it('全パッチを index 順に分類する', () => {
    const patches = [changing(0), staticP(1), changing(2), staticP(3)];
    const selected = new Set([0, 1]); // 0=tp, 1=fp, 2=fn, 3=none
    expect(classifyMarks(patches, selected)).toEqual(['tp', 'fp', 'fn', 'none']);
  });
});

describe('aggregateKind（OV-3 総合判定）', () => {
  it('変化全数を過不足なく選択（FN=0,FP=0）→ success', () => {
    const patches = [changing(0), changing(1), staticP(2)];
    expect(aggregateKind(patches, new Set([0, 1]))).toBe('success');
  });
  it('選び逃し（FN>0）→ danger', () => {
    const patches = [changing(0), changing(1), staticP(2)];
    expect(aggregateKind(patches, new Set([0]))).toBe('danger');
  });
  it('誤選択（FP>0）→ danger', () => {
    const patches = [changing(0), staticP(1)];
    expect(aggregateKind(patches, new Set([0, 1]))).toBe('danger');
  });
  it('未選択 → danger', () => {
    const patches = [changing(0), staticP(1)];
    expect(aggregateKind(patches, new Set())).toBe('danger');
  });
  it('変化パッチが 0 個なら danger（理論上のガード）', () => {
    const patches = [staticP(0), staticP(1)];
    expect(aggregateKind(patches, new Set())).toBe('danger');
  });
});

describe('quantizeCpd（cpd スロットリング）', () => {
  it('既定 step=0.25 で量子化する', () => {
    expect(quantizeCpd(3.0)).toBe(3.0);
    expect(quantizeCpd(3.1)).toBe(3.0);
    expect(quantizeCpd(3.13)).toBe(3.25);
  });
  it('同一刻み内の微小変化は同じ値に丸まり BMP 再生成を抑える', () => {
    expect(quantizeCpd(3.0)).toBe(quantizeCpd(3.12));
  });
  it('step を変えられる', () => {
    expect(quantizeCpd(3.3, 0.5)).toBe(3.5);
  });
});

describe('quantizeCpdTime（cpd の時間ベース・一定レート更新）', () => {
  it('既定 20Hz で経過秒を 1/20 秒グリッドに丸める', () => {
    expect(quantizeCpdTime(0)).toBeCloseTo(0, 6);
    expect(quantizeCpdTime(0.02)).toBeCloseTo(0.0, 6); // 0.02→最近接 0.00
    expect(quantizeCpdTime(0.03)).toBeCloseTo(0.05, 6); // 0.03→0.05
    expect(quantizeCpdTime(1.04)).toBeCloseTo(1.05, 6);
  });
  it('同一 1/20 秒窓内の微小変化は同じ値（=BMP 再生成は最大 20 回/秒に制限）', () => {
    // 20Hz は 0.05 秒刻み。同じ丸めバケットなら等しい。
    expect(quantizeCpdTime(1.0)).toBe(quantizeCpdTime(1.02)); // ともに 1.0
    expect(quantizeCpdTime(1.0)).not.toBe(quantizeCpdTime(1.06)); // 1.0 vs 1.05
  });
  it('hz を変えられる（レート調整可能）', () => {
    expect(quantizeCpdTime(0.3, 10)).toBeCloseTo(0.3, 6);
    expect(quantizeCpdTime(0.34, 10)).toBeCloseTo(0.3, 6);
  });
  it('b に依存せず一定レートで進む（b が小さくても更新が止まらない）', () => {
    // 同じ時間グリッドなら b の大小に関わらず cpd 計算の入力 t は一定間隔で進む
    const t0 = quantizeCpdTime(0.5);
    const t1 = quantizeCpdTime(0.55);
    expect(t1).toBeGreaterThan(t0);
  });
});
