/**
 * ResultSummary の単体／コース／未挑戦のレイアウト分岐テスト。
 * screens.md S5-01 §3 / §3.1 / §10-11/12/13 に対応。
 */

import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { ResultSummary } from '../../src/components/ResultSummary';

jest.useFakeTimers();

describe('ResultSummary: 単体プレイモード（screens.md §3.1）', () => {
  it('カウントダウン文言が DOM に存在しない（自動進行しない）', () => {
    const onNext = jest.fn();
    const { queryByTestId } = render(
      <ResultSummary
        gameName="Game 2"
        sessionType="single"
        primary={{ label: '今回の閾値', value: '4.2', unit: '度' }}
        onNext={onNext}
        onBack={() => {}}
      />,
    );
    expect(queryByTestId('result-countdown')).toBeNull();
    // 余白プレースホルダは存在（レイアウトシフト防止）
    expect(queryByTestId('result-no-countdown')).not.toBeNull();
  });

  it('「次へ」ボタン押下で onNext が呼ばれる', () => {
    const onNext = jest.fn();
    const { getByTestId } = render(
      <ResultSummary
        gameName="Game 2"
        sessionType="single"
        primary={{ label: '閾値', value: '4.2', unit: '度' }}
        onNext={onNext}
        onBack={() => {}}
      />,
    );
    fireEvent.press(getByTestId('result-next'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('長時間放置しても onNext は呼ばれない（自動進行なし）', () => {
    const onNext = jest.fn();
    render(
      <ResultSummary
        gameName="Game 2"
        sessionType="single"
        primary={{ label: '閾値', value: '4.2', unit: '度' }}
        onNext={onNext}
        onBack={() => {}}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(20000);
    });
    expect(onNext).not.toHaveBeenCalled();
  });
});

describe('ResultSummary: コースモード', () => {
  it('カウントダウン文言を描画し、10 秒で onNext が呼ばれる', () => {
    const onNext = jest.fn();
    const { getByTestId } = render(
      <ResultSummary
        gameName="Game 2"
        sessionType="course"
        countdownSeconds={10}
        primary={{ label: '閾値', value: '4.2', unit: '度' }}
        onNext={onNext}
        onBack={() => {}}
      />,
    );
    const countdown = getByTestId('result-countdown');
    expect(countdown).toBeTruthy();
    // children は配列：["あと ", N, " 秒で次のゲームへ"]
    expect(Array.isArray(countdown.props.children)).toBe(true);
    expect(countdown.props.children[0]).toContain('あと');
    expect(countdown.props.children[2]).toContain('次のゲーム');
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('diff が improved のとき success 色のテキストが描画される', () => {
    const { getByTestId } = render(
      <ResultSummary
        gameName="Game 2"
        sessionType="course"
        primary={{ label: '閾値', value: '4.2', unit: '度' }}
        diff={{ text: '↓ 前回より 0.3 度改善 ✨', direction: 'improved' }}
        onNext={() => {}}
        onBack={() => {}}
      />,
    );
    const diff = getByTestId('result-diff');
    expect(diff.props.children).toBe('↓ 前回より 0.3 度改善 ✨');
    // success 色（明色 #0F7A4F or 暗色 #5DD3A0）。明示的に色値を検証
    const flat = Array.isArray(diff.props.style)
      ? Object.assign({}, ...diff.props.style.flat())
      : diff.props.style;
    expect(['#0F7A4F', '#5DD3A0']).toContain(flat.color);
  });
});

describe('ResultSummary: 未挑戦時（screens.md §3 / spec.md F-11）', () => {
  it('「未挑戦」カードを表示し、primary 数値カード・diff は描画しない', () => {
    const { queryByTestId, getByTestId, getByText } = render(
      <ResultSummary
        gameName="Game 1"
        sessionType="single"
        unattempted
        unattemptedReason="タップせずに時間切れになりました"
        primary={{ label: '閾値', value: '5.0', unit: '度' }}
        diff={{ text: 'should not render', direction: 'improved' }}
        onNext={() => {}}
        onBack={() => {}}
      />,
    );
    expect(getByTestId('result-unattempted-card')).toBeTruthy();
    expect(queryByTestId('result-primary-card')).toBeNull();
    expect(queryByTestId('result-diff')).toBeNull();
    expect(getByText('未挑戦')).toBeTruthy();
    expect(getByText('タップせずに時間切れになりました')).toBeTruthy();
    expect(getByText('この回はスコアに記録されません')).toBeTruthy();
  });
});
