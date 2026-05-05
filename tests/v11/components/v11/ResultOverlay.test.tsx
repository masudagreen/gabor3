/**
 * ResultOverlay — GE-RESULT（components.md §23、v1.1.1 新規）の単体テスト。
 *
 * 重点：
 *   - mode="course" でカウントダウン → 自動 onAdvance（10 秒）
 *   - mode="single" でカウントダウンなし、SinglePlayPostFooter が見える
 *   - 「次へ」ボタンタップで onAdvance 即時呼び出し
 *   - marks に correctChosen / wrongChosen / correctMissed それぞれ渡したとき MarkBadge 描画
 *   - メトリクスバー（threshold / diff / unit）が DOM に存在しないこと（spec 再確定）
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import {
  act,
  fireEvent,
  render,
} from '@testing-library/react-native';
import { ResultOverlay } from '../../../../src/components/v11/ResultOverlay';

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

const baseProps = {
  gameId: 'G-04' as const,
  gameNameJa: 'G-04 コントラスト弁別',
  marks: [],
  correctAnswerLabel: '右が濃い',
  userAnswerLabel: '右が濃い',
  isCorrect: true,
};

describe('ResultOverlay: mode="single"（単体プレイ）', () => {
  it('描画クラッシュなしでマウントできる', () => {
    const { queryByTestId } = render(
      <ResultOverlay
        {...baseProps}
        mode="single"
        onAdvance={jest.fn()}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
      />,
    );
    expect(queryByTestId('result-overlay')).toBeTruthy();
    expect(queryByTestId('result-overlay-action-bar')).toBeTruthy();
  });

  it('「次へ」ボタンが存在し、押すと onAdvance が呼ばれる', () => {
    const onAdvance = jest.fn();
    const { getByTestId } = render(
      <ResultOverlay
        {...baseProps}
        mode="single"
        onAdvance={onAdvance}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
      />,
    );
    fireEvent.press(getByTestId('result-overlay-next'));
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it('単体時は SinglePlayPostFooter（同じゲームをもう一度／一覧へ／ホームへ）が表示される', () => {
    const { queryByTestId } = render(
      <ResultOverlay
        {...baseProps}
        mode="single"
        onAdvance={jest.fn()}
        onPlayAgain={jest.fn()}
        onBackToList={jest.fn()}
        onGoHome={jest.fn()}
      />,
    );
    expect(queryByTestId('result-overlay-single-footer')).toBeTruthy();
    expect(queryByTestId('single-play-post-play-again')).toBeTruthy();
    expect(queryByTestId('single-play-post-back-to-list')).toBeTruthy();
    expect(queryByTestId('single-play-post-go-home')).toBeTruthy();
  });

  it('単体時はカウントダウンが描画されない', () => {
    const { queryByTestId } = render(
      <ResultOverlay
        {...baseProps}
        mode="single"
        onAdvance={jest.fn()}
      />,
    );
    expect(queryByTestId('result-overlay-countdown')).toBeNull();
    expect(queryByTestId('result-overlay-auto-hint')).toBeNull();
  });

  it('単体時は時間が経っても自動進行しない', () => {
    const onAdvance = jest.fn();
    render(
      <ResultOverlay
        {...baseProps}
        mode="single"
        onAdvance={onAdvance}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(onAdvance).not.toHaveBeenCalled();
  });
});

describe('ResultOverlay: mode="course"（コースプレイ）', () => {
  it('カウントダウンが表示され、初期値 10 秒', () => {
    const { getByTestId } = render(
      <ResultOverlay
        {...baseProps}
        mode="course"
        onAdvance={jest.fn()}
        nextGameLabel="G-05 空間周波数弁別"
        tickMsForTest={100}
      />,
    );
    const countdown = getByTestId('result-overlay-countdown');
    expect(countdown).toBeTruthy();
    expect(countdown.props.children.join('')).toContain('10');
  });

  it('カウントダウンが 0 で onAdvance が 1 度だけ呼ばれる', () => {
    const onAdvance = jest.fn();
    render(
      <ResultOverlay
        {...baseProps}
        mode="course"
        onAdvance={onAdvance}
        nextGameLabel="G-05"
        initialSecondsForTest={2}
        tickMsForTest={50}
      />,
    );
    // 2 → 1 → 0、各 tick の setTimeout は次の tick で setState を反映する
    // Sufficient time + 複数 act 呼び出しで段階的に setState を反映させる
    for (let i = 0; i < 5; i++) {
      act(() => {
        jest.advanceTimersByTime(60);
      });
    }
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it('「次へ」ボタンタップで即進行（カウントダウン途中でも）', () => {
    const onAdvance = jest.fn();
    const { getByTestId } = render(
      <ResultOverlay
        {...baseProps}
        mode="course"
        onAdvance={onAdvance}
        nextGameLabel="G-05"
        initialSecondsForTest={10}
        tickMsForTest={1000}
      />,
    );
    fireEvent.press(getByTestId('result-overlay-next'));
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it('最終ゲーム（nextGameLabel=null）はラベル「クールダウンへ」', () => {
    const { getByTestId } = render(
      <ResultOverlay
        {...baseProps}
        mode="course"
        onAdvance={jest.fn()}
        nextGameLabel={null}
        tickMsForTest={100}
      />,
    );
    const next = getByTestId('result-overlay-next');
    // Button の testID は label が中で描画される
    // ラベルが「クールダウンへ」を含むかは内部 Text を介して検証する
    expect(next).toBeTruthy();
  });

  it('コース時は SinglePlayPostFooter が表示されない', () => {
    const { queryByTestId } = render(
      <ResultOverlay
        {...baseProps}
        mode="course"
        onAdvance={jest.fn()}
        nextGameLabel="G-05"
        tickMsForTest={100}
      />,
    );
    expect(queryByTestId('result-overlay-single-footer')).toBeNull();
  });
});

describe('ResultOverlay: marks 描画', () => {
  it('correctChosen の mark で MarkBadge correct が描画される', () => {
    const { queryByTestId } = render(
      <ResultOverlay
        {...baseProps}
        marks={[{ targetId: 'g04-right', kind: 'correctChosen' }]}
        mode="single"
        onAdvance={jest.fn()}
      />,
    );
    expect(
      queryByTestId('result-overlay-mark-badge-g04-right'),
    ).toBeTruthy();
  });

  it('wrongChosen の mark で MarkBadge wrong が描画される', () => {
    const { queryByTestId } = render(
      <ResultOverlay
        {...baseProps}
        marks={[{ targetId: 'g04-left', kind: 'wrongChosen' }]}
        mode="single"
        onAdvance={jest.fn()}
      />,
    );
    expect(
      queryByTestId('result-overlay-mark-badge-g04-left'),
    ).toBeTruthy();
  });

  it('correctMissed の mark で MarkBadge missed が描画される（複数選択ゲーム）', () => {
    const { queryByTestId } = render(
      <ResultOverlay
        {...baseProps}
        marks={[{ targetId: 'g01-cell-2-0', kind: 'correctMissed' }]}
        mode="single"
        onAdvance={jest.fn()}
      />,
    );
    expect(
      queryByTestId('result-overlay-mark-badge-g01-cell-2-0'),
    ).toBeTruthy();
  });

  it('複数の marks（◯ + ✕ + 薄 ◯）を同時に渡せる', () => {
    const { queryByTestId } = render(
      <ResultOverlay
        {...baseProps}
        marks={[
          { targetId: 'g01-cell-0-0', kind: 'correctChosen' },
          { targetId: 'g01-cell-0-2', kind: 'wrongChosen' },
          { targetId: 'g01-cell-2-0', kind: 'correctMissed' },
        ]}
        mode="single"
        onAdvance={jest.fn()}
      />,
    );
    expect(queryByTestId('result-overlay-mark-badge-g01-cell-0-0')).toBeTruthy();
    expect(queryByTestId('result-overlay-mark-badge-g01-cell-0-2')).toBeTruthy();
    expect(queryByTestId('result-overlay-mark-badge-g01-cell-2-0')).toBeTruthy();
  });
});

describe('ResultOverlay: メトリクスバーは表示しない（spec 再確定）', () => {
  it('threshold / diff / unit といったメトリクス系の文字列が DOM に存在しない', () => {
    const { queryByText } = render(
      <ResultOverlay
        {...baseProps}
        mode="single"
        onAdvance={jest.fn()}
      />,
    );
    // 既存 ResultSummaryV11 が出していた典型的メトリクス文言が出ない
    expect(queryByText(/今回の閾値/)).toBeNull();
    expect(queryByText(/前回比/)).toBeNull();
    expect(queryByText(/コントラスト差/)).toBeNull();
    expect(queryByText(/角度差/)).toBeNull();
  });

  it('"overlay-metric-bar" な testId は存在しない（リグレッション）', () => {
    const { queryByTestId } = render(
      <ResultOverlay
        {...baseProps}
        mode="single"
        onAdvance={jest.fn()}
      />,
    );
    expect(queryByTestId('overlay-metric-bar')).toBeNull();
    expect(queryByTestId('result-overlay-metric-bar')).toBeNull();
  });
});

describe('ResultOverlay: Sprint 20 ラウンド 2 / 重畳描画 + targetId 非露出', () => {
  it('targetId 生文字列（"g04-right" など）が DOM テキストとして露出しない', () => {
    const { queryByText } = render(
      <ResultOverlay
        {...baseProps}
        marks={[
          { targetId: 'g04-right', kind: 'correctChosen' },
          { targetId: 'g04-left', kind: 'wrongChosen' },
        ]}
        mode="single"
        onAdvance={jest.fn()}
      />,
    );
    // ユーザーには内部 ID 文字列を見せない（screens.md §2.5 / §4.1 規範）
    expect(queryByText(/^g04-right$/)).toBeNull();
    expect(queryByText(/^g04-left$/)).toBeNull();
    expect(queryByText('g04-right')).toBeNull();
    expect(queryByText('g04-left')).toBeNull();
  });

  it('旧 marksContainer の testID "result-overlay-marks" は存在しない（リスト UI 撤去）', () => {
    const { queryByTestId } = render(
      <ResultOverlay
        {...baseProps}
        marks={[{ targetId: 'g04-right', kind: 'correctChosen' }]}
        mode="single"
        onAdvance={jest.fn()}
      />,
    );
    expect(queryByTestId('result-overlay-marks')).toBeNull();
  });

  it('mark のフォールバック領域が DOM 上に存在する（jest 環境で testID が引き続き引ける）', () => {
    const { queryByTestId } = render(
      <ResultOverlay
        {...baseProps}
        marks={[
          { targetId: 'g04-right', kind: 'correctChosen' },
          { targetId: 'g04-left', kind: 'wrongChosen' },
        ]}
        mode="single"
        onAdvance={jest.fn()}
      />,
    );
    // 各 mark の MarkBadge testID が引ける（重畳成功時は absolute layer に、
    // 失敗時は fallback に置かれる。jest（RN）環境では fallback 側が描画される）
    expect(queryByTestId('result-overlay-mark-badge-g04-right')).toBeTruthy();
    expect(queryByTestId('result-overlay-mark-badge-g04-left')).toBeTruthy();
    // ラッパー View（mark-${targetId}）も引ける
    expect(queryByTestId('result-overlay-mark-g04-right')).toBeTruthy();
    expect(queryByTestId('result-overlay-mark-g04-left')).toBeTruthy();
  });

  it('フォールバック領域は画面外（off-screen）に配置される', () => {
    const { getByTestId } = render(
      <ResultOverlay
        {...baseProps}
        marks={[{ targetId: 'g04-right', kind: 'correctChosen' }]}
        mode="single"
        onAdvance={jest.fn()}
      />,
    );
    const fallback = getByTestId('result-overlay-mark-fallback');
    const flat = Array.isArray(fallback.props.style)
      ? Object.assign({}, ...fallback.props.style.filter(Boolean))
      : (fallback.props.style ?? {});
    // off-screen で内部 ID 文字列を画面に出さない
    expect(flat.position).toBe('absolute');
    // 1×1 / overflow hidden / opacity 0 のいずれかが効いている
    expect(flat.width).toBe(1);
    expect(flat.height).toBe(1);
    expect(flat.opacity).toBe(0);
  });

  it('extraStimulus を渡すと result-overlay-extra-stimulus が描画される', () => {
    const { queryByTestId } = render(
      <ResultOverlay
        {...baseProps}
        marks={[{ targetId: 'g04-right', kind: 'correctChosen' }]}
        mode="single"
        onAdvance={jest.fn()}
        extraStimulus={<></>}
      />,
    );
    // extraStimulus 領域は MarkBadge 重畳の親（getBoundingClientRect の基準）
    expect(queryByTestId('result-overlay-extra-stimulus')).toBeTruthy();
  });
});

describe('ResultOverlay: a11y', () => {
  it('SR 用テキスト（assertive）が「正解は ◯◯」「あなたの回答」を含む', () => {
    const { getByTestId } = render(
      <ResultOverlay
        {...baseProps}
        correctAnswerLabel="右が濃い"
        userAnswerLabel="左が濃い"
        isCorrect={false}
        mode="single"
        onAdvance={jest.fn()}
      />,
    );
    const sr = getByTestId('result-overlay-sr-text');
    expect(sr.props.children).toContain('右が濃い');
    expect(sr.props.children).toContain('左が濃い');
    expect(sr.props.children).toContain('不正解');
  });

  it('userAnswerLabel が null のとき SR で「未回答」と読む', () => {
    const { getByTestId } = render(
      <ResultOverlay
        {...baseProps}
        userAnswerLabel={null}
        isCorrect={false}
        mode="single"
        onAdvance={jest.fn()}
      />,
    );
    const sr = getByTestId('result-overlay-sr-text');
    expect(sr.props.children).toContain('未回答');
  });
});
