/**
 * gameComponents.test.tsx — v3 描画コンポーネント（LB-1/CB-1/CD-1/GB-1/GG-1/GG-2/OV-2/OV-3）。
 *
 * レベル/個数表示・カウントダウン段階色・選択トグル・a11y ラベル非漏洩・結果マーク区別・
 * 総合クリア/失敗（テキスト付き）・格子レイアウト算出を検証する（spec F-01/F-02/F-03/F-12）。
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { countdownV2, levelV3, resultV3 } from '../../../src/theme/tokens';
import { LevelBadge } from '../../../src/components/v3/LevelBadge';
import { CountBanner } from '../../../src/components/v3/CountBanner';
import { CountdownTimer } from '../../../src/components/v3/CountdownTimer';
import { ResultMark } from '../../../src/components/v3/ResultMark';
import { AggregateResultBadge } from '../../../src/components/v3/AggregateResultBadge';
import {
  GaborGrid,
  computeGridEdge,
  computeGap,
  computePatchSize,
} from '../../../src/components/v3/GaborGrid';
import { GaborPatchCell } from '../../../src/components/v3/GaborPatchCell';
import { GameTopBar } from '../../../src/components/v3/GameTopBar';
import type { PatchDef } from '../../../src/lib/v3/patch';
import { deriveReveal } from '../../../src/lib/v3/gameMachine';

function dark(ui: React.ReactElement) {
  return render(
    <ThemeProvider preference="dark" systemScheme="dark">
      {ui}
    </ThemeProvider>,
  );
}

function flatStyle(node: { props: { style: unknown } }): Record<string, unknown> {
  const s = node.props.style;
  return Array.isArray(s)
    ? Object.assign({}, ...s.flat(Infinity))
    : (s as Record<string, unknown>);
}

function makePatch(index: number, over: Partial<PatchDef> = {}): PatchDef {
  return {
    index,
    changeKind: null,
    initialOrientationDeg: 30,
    rotationSpeed: 6,
    rotationDir: 'cw',
    direction: 'one-way',
    ...over,
  };
}

describe('LevelBadge (LB-1 / F-02)', () => {
  it('inline はレベル番号を表示し SR ラベルを持つ', () => {
    const { getByTestId } = dark(<LevelBadge level={23} testId="lb" />);
    expect(getByTestId('lb-text').props.children).toBe('レベル 23');
    expect(screen.getByLabelText('レベル 23')).toBeTruthy();
  });

  it('level.fg 色（dark 9.71:1）を使う', () => {
    const { getByTestId } = dark(<LevelBadge level={1} testId="lb" />);
    expect(flatStyle(getByTestId('lb-text')).color).toBe(levelV3.dark.fg);
  });

  it('large は 64px 相当の数値を表示', () => {
    const { getByTestId } = dark(<LevelBadge level={720} variant="large" testId="lb" />);
    expect(getByTestId('lb-number').props.children).toBe('720');
  });
});

describe('CountBanner (CB-1 / F-02)', () => {
  it('「◯個探せ！」を表示し SR ラベルを持つ（18pt 以上 26px）', () => {
    const { getByTestId } = dark(<CountBanner count={3} testId="cb" />);
    expect(getByTestId('cb-text').props.children).toBe('3 個探せ！');
    expect(flatStyle(getByTestId('cb-text')).fontSize).toBeGreaterThanOrEqual(24);
    expect(screen.getByLabelText('3 個の回転を探してください')).toBeTruthy();
  });
});

describe('CountdownTimer (CD-1 / F-12)', () => {
  it('数字のみ表示・残り秒を SR ラベルに持つ', () => {
    const { getByTestId } = dark(<CountdownTimer remainingSec={18} testId="cd" />);
    expect(getByTestId('cd-number').props.children).toBe('18');
    expect(screen.getByLabelText('残り 18 秒')).toBeTruthy();
  });

  it('通常時（>5 秒）は normal 色・Bold(700)', () => {
    const { getByTestId } = dark(<CountdownTimer remainingSec={10} testId="cd" />);
    const s = flatStyle(getByTestId('cd-number'));
    expect(s.color).toBe(countdownV2.dark.normal);
    expect(s.fontWeight).toBe('700');
  });

  it('≤5 秒は warn 色・Bold(700)', () => {
    const { getByTestId } = dark(<CountdownTimer remainingSec={5} testId="cd" />);
    const s = flatStyle(getByTestId('cd-number'));
    expect(s.color).toBe(countdownV2.dark.warn);
    expect(s.fontWeight).toBe('700');
  });

  it('≤3 秒は danger 色・Black(900)', () => {
    const { getByTestId } = dark(<CountdownTimer remainingSec={2} testId="cd" />);
    const s = flatStyle(getByTestId('cd-number'));
    expect(s.color).toBe(countdownV2.dark.danger);
    expect(s.fontWeight).toBe('900');
  });

  it('段階でフォントサイズは変えない（位置ジャンプ回避）', () => {
    const a = dark(<CountdownTimer remainingSec={10} testId="cd" />);
    const sizeNormal = flatStyle(a.getByTestId('cd-number')).fontSize;
    a.unmount();
    const b = dark(<CountdownTimer remainingSec={2} testId="cd" />);
    expect(flatStyle(b.getByTestId('cd-number')).fontSize).toBe(sizeNormal);
  });

  it('disclosure variant：白・Bold・stage より一回り小さい（v3.1 改訂 / F-03）', () => {
    // disclosure は 3 秒固定の開示カウントダウン。文字色は白固定（ユーザー要望）、36px。
    const { getByTestId } = dark(
      <CountdownTimer remainingSec={3} variant="disclosure" testId="disc" />,
    );
    const s = flatStyle(getByTestId('disc-number'));
    expect(s.color).toBe(countdownV2.dark.normal);
    expect(s.fontWeight).toBe('700');
    expect(s.fontSize).toBe(36);
    // 開示用の読み上げ文言（「次のラウンドまで {n} 秒」）。
    expect(screen.getByLabelText('次のラウンドまで 3 秒')).toBeTruthy();
  });
});

describe('GaborGrid レイアウト算出 (GG-1)', () => {
  it('スマホは min(short-32, 360)、PC は 480', () => {
    expect(computeGridEdge(375)).toBe(343);
    expect(computeGridEdge(360)).toBe(328);
    expect(computeGridEdge(1280)).toBe(480);
  });
  it('隙間 n=3 は 8、n=4 は 6、n=5 は 5、n=6 は 4（v3.1 / system §16.6）', () => {
    expect(computeGap(3)).toBe(8);
    expect(computeGap(4)).toBe(6);
    expect(computeGap(5)).toBe(5);
    expect(computeGap(6)).toBe(4);
  });
  it('パッチ辺長 = (全体辺 - 隙間合計)/n（3〜6 ではみ出さない）', () => {
    for (const n of [3, 4, 5, 6]) {
      const size = computePatchSize(360, n);
      expect(size * n + computeGap(n) * (n - 1)).toBeLessThanOrEqual(
        computeGridEdge(360),
      );
    }
  });
  it('5x5/6x6 でもパッチ辺長 ≥ 48px（360px 実効 328px でタップ確保、NF-28d）', () => {
    // 5x5 ≈ 61px、6x6 ≈ 51px（system §16.6 の寸法表）。いずれも 48px 以上。
    expect(computePatchSize(360, 5)).toBeGreaterThanOrEqual(48);
    expect(computePatchSize(360, 6)).toBeGreaterThanOrEqual(48);
  });
});

describe('GameTopBar (GB-1 / v3.1：X + 残り時間 + レベル)', () => {
  it('レベル番号・中断 X・セッション残り時間（mm:ss、「あと」表記なし）を表示する', () => {
    const onAbort = jest.fn();
    const { getByTestId, queryByTestId } = dark(
      <GameTopBar level={23} remainingSessionSec={272} onAbort={onAbort} testId="tb" />,
    );
    // レベル番号（右ピル、F-02）。
    expect(getByTestId('tb-level')).toBeTruthy();
    // セッション残り時間は mm:ss のみ（「あと」表記は付けない）。
    expect(getByTestId('tb-session-remaining').props.children).toBe('4:32');
    // SR ラベルは分秒で読み上げる。
    expect(screen.getByLabelText('セッション残り時間 4 分 32 秒')).toBeTruthy();
    // 制限時間カウントダウンは上部バーには無い（メイン画面へ移設）。
    expect(queryByTestId('tb-countdown')).toBeNull();
    // X 押下で onAbort。
    fireEvent.press(getByTestId('tb-abort'));
    expect(onAbort).toHaveBeenCalledTimes(1);
  });

  it('remainingSessionSec 未指定なら残り時間は表示しない（単発ゲーム用）', () => {
    const { queryByTestId } = dark(
      <GameTopBar level={5} onAbort={() => {}} testId="tb" />,
    );
    expect(queryByTestId('tb-session-remaining')).toBeNull();
  });
});

describe('CountdownTimer stage variant (v3.1：メイン画面上部の制限時間)', () => {
  it('stage は numeric.l 48px・段階色で表示（残り 30 秒は normal）', () => {
    const { getByTestId } = dark(
      <CountdownTimer remainingSec={30} variant="stage" testId="stg" />,
    );
    const s = flatStyle(getByTestId('stg-number'));
    expect(s.fontSize).toBe(48);
    expect(s.color).toBe(countdownV2.dark.normal);
  });

  it('stage も残り 3 秒で danger 赤 + Black(900)（F-12）', () => {
    const { getByTestId } = dark(
      <CountdownTimer remainingSec={3} variant="stage" testId="stg" />,
    );
    const s = flatStyle(getByTestId('stg-number'));
    expect(s.color).toBe(countdownV2.dark.danger);
    expect(s.fontWeight).toBe('900');
  });

  it('stage は残り 5・4 秒でも黄（warn）にせず白のまま（v3.1 改訂）', () => {
    for (const sec of [5, 4]) {
      const r = dark(<CountdownTimer remainingSec={sec} variant="stage" testId="stg" />);
      const s = flatStyle(r.getByTestId('stg-number'));
      expect(s.color).toBe(countdownV2.dark.normal);
      r.unmount();
    }
  });
});

describe('GaborPatchCell (GG-2 / F-01)', () => {
  it('タップで onToggle(index) を呼ぶ', () => {
    const onToggle = jest.fn();
    const { getByTestId } = dark(
      <GaborPatchCell
        patch={makePatch(5)}
        gridSize={3}
        sizePx={100}
        elapsedSec={0}
        selected={false}
        onToggle={onToggle}
        viewingDistanceCm={40}
        testId="cell"
      />,
    );
    fireEvent.press(getByTestId('cell'));
    expect(onToggle).toHaveBeenCalledWith(5);
  });

  it('a11y ラベルは行-列のみ（回転/静止を漏らさない）', () => {
    dark(
      <GaborPatchCell
        patch={makePatch(0, { changeKind: 'rotation' })}
        gridSize={4}
        sizePx={85}
        elapsedSec={1}
        selected
        onToggle={() => {}}
        viewingDistanceCm={40}
        testId="cell"
      />,
    );
    expect(screen.getByLabelText('パッチ 1-1')).toBeTruthy();
  });

  it('開示中（disabled）はタップ無効', () => {
    const onToggle = jest.fn();
    const { getByTestId } = dark(
      <GaborPatchCell
        patch={makePatch(2)}
        gridSize={3}
        sizePx={100}
        elapsedSec={0}
        selected={false}
        onToggle={onToggle}
        viewingDistanceCm={40}
        disabled
        testId="cell"
      />,
    );
    fireEvent.press(getByTestId('cell'));
    expect(onToggle).not.toHaveBeenCalled();
  });
});

describe('GaborGrid 開示重畳 (OV-2 経由)', () => {
  it('reveal を渡すと回転=correct/missed・静止誤選択=wrong のマークが出る', () => {
    const patches = [
      makePatch(0, { changeKind: 'rotation' }), // 選択 → correct
      makePatch(1, { changeKind: 'rotation' }), // 未選択 → missed
      makePatch(2), // 静止・選択 → wrong
      makePatch(3), // 静止・未選択 → none
    ];
    const selected = new Set([0, 2]);
    const reveal = deriveReveal(patches, selected);
    const { getByTestId, queryByTestId } = dark(
      <GaborGrid
        patches={patches}
        gridSize={2}
        shortEdgePx={375}
        elapsedSec={5}
        selected={selected}
        reveal={reveal}
        viewingDistanceCm={40}
        onToggle={() => {}}
        revealed
        testId="grid"
      />,
    );
    expect(getByTestId('grid-cell-0-mark')).toBeTruthy(); // correct
    expect(getByTestId('grid-cell-1-mark')).toBeTruthy(); // missed
    expect(getByTestId('grid-cell-2-mark')).toBeTruthy(); // wrong
    expect(queryByTestId('grid-cell-3-mark')).toBeNull(); // none
  });
});

describe('ResultMark (OV-2 / F-03)', () => {
  it('correct と missed は同じ✓だが透明度で区別（実線 vs 50%）', () => {
    const c = dark(<ResultMark kind="correct" patchSizePx={100} testId="m" />);
    const cOpacity = flatStyle(c.getByTestId('m')).opacity;
    c.unmount();
    const m = dark(<ResultMark kind="missed" patchSizePx={100} testId="m" />);
    const mOpacity = flatStyle(m.getByTestId('m')).opacity;
    expect(cOpacity).toBe(1);
    expect(mOpacity).toBe(0.5);
  });

  it('correct は緑、wrong は赤', () => {
    expect(resultV3.dark.checkCorrect).not.toBe(resultV3.dark.crossWrong);
  });

  it('aria-label が区別される（選択済み/選び逃し/誤選択）', () => {
    dark(<ResultMark kind="correct" patchSizePx={100} testId="m1" />);
    expect(screen.getByLabelText('回転（選択済み）')).toBeTruthy();
    dark(<ResultMark kind="missed" patchSizePx={100} testId="m2" />);
    expect(screen.getByLabelText('回転（選び逃し）')).toBeTruthy();
    dark(<ResultMark kind="wrong" patchSizePx={100} testId="m3" />);
    expect(screen.getByLabelText('誤選択')).toBeTruthy();
  });
});

describe('AggregateResultBadge (OV-3 / F-03)', () => {
  it('クリアは「クリア」テキスト + 緑 + SR ラベル', () => {
    const { getByTestId } = dark(<AggregateResultBadge result="clear" testId="agg" />);
    expect(flatStyle(getByTestId('agg')).backgroundColor).toBe(resultV3.dark.aggregateClearBg);
    expect(screen.getByText('クリア')).toBeTruthy();
    expect(screen.getByLabelText('クリア')).toBeTruthy();
  });

  it('失敗は「失敗」テキスト + 赤 + SR ラベル（色のみ非依存 NF-12）', () => {
    const { getByTestId } = dark(<AggregateResultBadge result="fail" testId="agg" />);
    expect(flatStyle(getByTestId('agg')).backgroundColor).toBe(resultV3.dark.aggregateFailBg);
    expect(screen.getByText('失敗')).toBeTruthy();
    expect(screen.getByLabelText('失敗')).toBeTruthy();
  });

  it('内部数値テキスト（速度・角度等）は表示しない', () => {
    dark(<AggregateResultBadge result="fail" testId="agg" />);
    expect(screen.queryByText(/deg|°|cpd|速度|角度/)).toBeNull();
  });
});
