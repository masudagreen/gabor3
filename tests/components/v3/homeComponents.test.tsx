/**
 * homeComponents.test.tsx — S7 ホーム結果コンポーネント（LD-1 / RC-1）。
 *
 * LevelDeltaIndicator：+1/±0/−1 の色+矢印形+テキストの 3 重表示（NF-12）・a11y 文言。
 * HomeResultCard：クリア/失敗・レベル変化・現在のレベル・ストリーク・もう一度（F-08/F-04）。
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { LevelDeltaIndicator } from '../../../src/components/v3/LevelDeltaIndicator';
import { HomeResultCard } from '../../../src/components/v3/HomeResultCard';
import { SessionSummaryCard } from '../../../src/components/v3/SessionSummaryCard';

function dark(ui: React.ReactElement) {
  return render(
    <ThemeProvider preference="dark" systemScheme="dark">
      {ui}
    </ThemeProvider>,
  );
}

describe('LevelDeltaIndicator（LD-1 / F-04）', () => {
  it('+1：▲ + from→to + 「レベルが上がりました（+1）」', () => {
    dark(
      <LevelDeltaIndicator delta={1} fromLevel={7} toLevel={8} result="clear" testId="ld" />,
    );
    expect(screen.getByText('▲ レベル 7 → 8')).toBeTruthy();
    expect(screen.getByText('レベルが上がりました（+1）')).toBeTruthy();
    // a11y 文（aria-label）に上昇が読み上げられる。
    expect(screen.getByLabelText('レベルが上がりました。レベル 7 から 8')).toBeTruthy();
  });

  it('±0（失敗 1 回目）：― + レベル n + 「レベルはそのままです」', () => {
    dark(
      <LevelDeltaIndicator delta={0} fromLevel={7} toLevel={7} result="fail" testId="ld" />,
    );
    expect(screen.getByText('― レベル 7')).toBeTruthy();
    expect(screen.getByText('レベルはそのままです')).toBeTruthy();
  });

  it('±0（クリアで上限クランプ）：― + 「最高レベルです」', () => {
    dark(
      <LevelDeltaIndicator delta={0} fromLevel={720} toLevel={720} result="clear" testId="ld" />,
    );
    expect(screen.getByText('最高レベルです')).toBeTruthy();
  });

  it('−1：▼ + from→to + 「無理なく続けられるよう…」（責めない文言）', () => {
    dark(
      <LevelDeltaIndicator delta={-1} fromLevel={7} toLevel={6} result="fail" testId="ld" />,
    );
    expect(screen.getByText('▼ レベル 7 → 6')).toBeTruthy();
    expect(
      screen.getByText('無理なく続けられるよう、レベルを 1 つ下げました'),
    ).toBeTruthy();
  });
});

describe('HomeResultCard（RC-1 / F-08）', () => {
  it('クリア：総合クリア！・現在のレベル・ストリーク・もう一度を表示', () => {
    const onReplay = jest.fn();
    dark(
      <HomeResultCard
        result="clear"
        fromLevel={7}
        toLevel={8}
        delta={1}
        streak={5}
        onReplay={onReplay}
        testId="rc"
      />,
    );
    expect(screen.getByText('クリア！')).toBeTruthy();
    expect(screen.getByLabelText('現在のレベル 8')).toBeTruthy();
    expect(screen.getByText('🔥 連続 5 日')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('もう一度'));
    expect(onReplay).toHaveBeenCalledTimes(1);
  });

  it('失敗：総合失敗・現在のレベル据え置きを表示', () => {
    dark(
      <HomeResultCard
        result="fail"
        fromLevel={7}
        toLevel={7}
        delta={0}
        streak={0}
        onReplay={jest.fn()}
        testId="rc"
      />,
    );
    expect(screen.getByText('失敗')).toBeTruthy();
    expect(screen.getByLabelText('現在のレベル 7')).toBeTruthy();
    // ストリーク 0 は「今日からスタート」。
    expect(screen.getByText('🔥 今日からスタート')).toBeTruthy();
  });

  it('新規獲得バッジが無いとき獲得トーストを出さない（S9 / §6.4）', () => {
    dark(
      <HomeResultCard
        result="clear"
        fromLevel={7}
        toLevel={8}
        delta={1}
        streak={5}
        newlyEarnedBadges={[]}
        onReplay={jest.fn()}
        testId="rc"
      />,
    );
    expect(screen.queryByTestId('rc-badge-toast')).toBeNull();
  });

  it('新規獲得バッジがあるとき獲得トーストを 1 度表示し onBadgeShown を発火（S9 / §6.4・S10 フック）', () => {
    const onBadgeShown = jest.fn();
    dark(
      <HomeResultCard
        result="clear"
        fromLevel={9}
        toLevel={10}
        delta={1}
        streak={1}
        newlyEarnedBadges={['B-09']}
        onBadgeShown={onBadgeShown}
        onReplay={jest.fn()}
        testId="rc"
      />,
    );
    // BG-2 トーストにバッジ名（二桁の壁）が出る。
    expect(screen.getByTestId('rc-badge-toast')).toBeTruthy();
    expect(screen.getByTestId('rc-badge-toast-name-B-09')).toBeTruthy();
    expect(screen.getByText('二桁の壁')).toBeTruthy();
    // S10 の音/ハプティクス発火点が 1 度だけ呼ばれる。
    expect(onBadgeShown).toHaveBeenCalledTimes(1);
    expect(onBadgeShown).toHaveBeenCalledWith(['B-09']);
  });
});

describe('SessionSummaryCard（RC-1 → セッション要約 / F-08/F-04・v3.1 改訂）', () => {
  it('見出し無し・現在レベル（主役）・セッション時間・✅/❌ 集計・ストリーク・もう一度', () => {
    const onReplay = jest.fn();
    dark(
      <SessionSummaryCard
        clearCount={3}
        failCount={2}
        currentLevel={23}
        sessionPlaySec={272}
        streak={5}
        onReplay={onReplay}
        testId="ss"
      />,
    );
    // 「セッション終了」見出しは廃止。
    expect(screen.queryByText('セッション終了')).toBeNull();
    // 現在レベル（= 次セッション開始レベル、主役）。
    expect(screen.getByLabelText('現在のレベル 23')).toBeTruthy();
    expect(screen.getByTestId('ss-current-number').props.children).toBe('23');
    // セッション時間（パッチを見ている時間 = 4分32秒）。「このセッションの最高」は廃止。
    expect(screen.getByText('セッション時間')).toBeTruthy();
    expect(screen.getByTestId('ss-session-time-value').props.children).toBe('4分32秒');
    expect(screen.queryByText('このセッションの最高')).toBeNull();
    // 集計は ✅ クリア数 / ❌ 失敗数のみ（ラウンド数は出さない）。
    expect(screen.queryByTestId('ss-rounds-value')).toBeNull();
    expect(screen.getByText('✅')).toBeTruthy();
    expect(screen.getByText('❌')).toBeTruthy();
    expect(screen.getByTestId('ss-clears-value').props.children).toBe('3');
    expect(screen.getByTestId('ss-fails-value').props.children).toBe('2');
    // ストリーク。
    expect(screen.getByText('🔥 連続 5 日')).toBeTruthy();
    // もう一度。
    fireEvent.press(screen.getByLabelText('もう一度'));
    expect(onReplay).toHaveBeenCalledTimes(1);
  });

  it('要約全体を role=region で 1 まとめに読み上げる（a11y）', () => {
    dark(
      <SessionSummaryCard
        clearCount={3}
        failCount={2}
        currentLevel={23}
        sessionPlaySec={272}
        streak={5}
        onReplay={jest.fn()}
        testId="ss"
      />,
    );
    expect(
      screen.getByLabelText(
        '現在のレベル 23。セッション時間 4 分 32 秒。クリア 3、失敗 2。連続 5 日',
      ),
    ).toBeTruthy();
  });

  it('1 分未満は「S秒」表記、ストリーク 0 は「今日からスタート」、新規バッジ無しでトーストを出さない', () => {
    dark(
      <SessionSummaryCard
        clearCount={0}
        failCount={1}
        currentLevel={1}
        sessionPlaySec={40}
        streak={0}
        newlyEarnedBadges={[]}
        onReplay={jest.fn()}
        testId="ss"
      />,
    );
    expect(screen.getByTestId('ss-session-time-value').props.children).toBe('40秒');
    expect(screen.getByText('🔥 今日からスタート')).toBeTruthy();
    expect(screen.queryByTestId('ss-badge-toast')).toBeNull();
  });
});
