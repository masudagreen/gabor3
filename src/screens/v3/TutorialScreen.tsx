/**
 * TutorialScreen.tsx — v3.2 チュートリアルレベル Lv0（spec §4.8 / F-15）。
 *
 * オンボーディング完了後の初回プレイ時のみ通る、固定 3 ラウンドの学習用シーケンス。
 * - R1: 個数1 / R2: 個数2 / R3: 個数3。いずれも 30 秒・一方向・3x3・速度5（AS-31）。
 * - 個数を明示する（GameScreen の showCount=true → CountBanner「◯個探せ」）。本番の
 *   「全て探せ」とは異なり学習目的で個数を見せる。
 * - **正誤に関わらず順に進む**（誤答でもやり直さない）。3 ラウンド完了で onComplete。
 * - レベル昇降・記録・統計には一切影響しない（純粋に説明用、AS-33）。本コンポーネントは
 *   resolveCompletedRound / finalizeSession を呼ばない。
 *
 * GameScreen を 1 ラウンドずつ再利用する（操作系・描画・3 秒開示は本番と共通）。
 * level=0 のため GameTopBar は「レベル 0」を表示する（F-02 受け入れ基準が許容）。
 * セッション（sessionMinutes）の反復対象外のため、上部のセッション残り時間は表示しない。
 */

import React from 'react';
import { GameScreen } from './GameScreen';
import type { GameConfig } from '../../lib/v3/gameMachine';
import type { LevelParams, GameResult } from '../../lib/v3/level';
import type { ViewingDistanceCm } from '../../lib/calibration';
import type { FeedbackEventV3 } from '../../lib/v3/feedback';
import { Rng } from '../../lib/v2/rng';

/** チュートリアル共通の難易度（一方向・3x3・速度5・30秒、AS-31）。repeat は難易度中立のダミー。 */
const TUTORIAL_BASE: Omit<LevelParams, 'repeat'> = {
  seconds: 30,
  direction: 'one-way',
  gridSize: 3,
  rotationSpeed: 5,
};

/** チュートリアル 3 ラウンドの個数（1 → 2 → 3、AS-31）。 */
export const TUTORIAL_COUNTS: readonly number[] = [1, 2, 3];

export type TutorialScreenProps = {
  viewingDistanceCm: ViewingDistanceCm;
  dpi?: number;
  rng?: Rng;
  /** 3 ラウンド完了（または × スキップ）で呼ぶ。呼び出し側で tutorialCompleted 永続＋本番開始。 */
  onComplete: () => void;
  /** 音・ハプティクス発火（任意、本番 GameScreen と同様）。 */
  onFeedback?: (event: FeedbackEventV3) => void;
  testId?: string;
};

export const TutorialScreen: React.FC<TutorialScreenProps> = ({
  viewingDistanceCm,
  dpi,
  rng,
  onComplete,
  onFeedback,
  testId,
}) => {
  // 現在のラウンド（0..2）。
  const [roundIndex, setRoundIndex] = React.useState(0);

  const count = TUTORIAL_COUNTS[roundIndex];
  const config = React.useMemo<GameConfig>(
    () => ({
      level: 0,
      params: { repeat: 1, ...TUTORIAL_BASE },
      fixedCount: count,
      showCount: true,
    }),
    [count],
  );

  // 締切確定後（3 秒開示後）：正誤に関わらず次ラウンドへ。最後なら完了（AS-31）。
  const handleResolved = React.useCallback(
    (_result: GameResult) => {
      setRoundIndex((i) => {
        if (i + 1 >= TUTORIAL_COUNTS.length) {
          onComplete();
          return i;
        }
        return i + 1;
      });
    },
    [onComplete],
  );

  return (
    <GameScreen
      key={`tutorial-${roundIndex}`}
      config={config}
      viewingDistanceCm={viewingDistanceCm}
      dpi={dpi}
      rng={rng}
      onAbort={onComplete}
      onResolved={handleResolved}
      onFeedback={onFeedback}
      testId={testId ?? 'v3-tutorial'}
    />
  );
};
