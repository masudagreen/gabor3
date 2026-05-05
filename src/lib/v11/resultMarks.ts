/**
 * resultMarks — Sprint 20（v1.1.1）の `ResultOverlay` に渡す `ResultMark[]` を
 * 13 ゲームそれぞれの GradingResult から構築するヘルパー集。
 *
 * components.md §25「13 ゲームの ResultOverlay marks 生成ロジック」の規範に
 * 従って実装する。各ヘルパーは純関数で、`ResultMark[]` を返す。
 *
 *   - 単数選択ゲーム（G-02 / G-03 / G-04 / G-05 / G-06 / G-08 / G-09 / G-10 /
 *     G-11 / G-12 / G-13）：正解 target に correctChosen、誤選択 target に
 *     wrongChosen。偶然正解時は ◯ のみ（✕ なし）
 *   - 複数選択ゲーム（G-01 / G-07）：正解 ID 全件に correctChosen or
 *     correctMissed、誤選択 ID 全件に wrongChosen
 *
 * `targetId` は ResultOverlay 内の data-target-id 属性として使われる（Web 実機）。
 * テストではインライン一覧として MarkBadge を `result-overlay-mark-badge-${targetId}`
 * testId で確認できる。
 */

import { ResultMark } from '../../components/v11/ResultOverlay';
import { Game1GradingResult, Game1TrialSpec } from '../game1';
import { G07GradingResult } from './g07Trial';
import { G03ClockPosition } from './g03Trial';
import { G13Digit } from './g13Trial';

/** G-01 変化察知（複数選択）：変化パッチに correctChosen/correctMissed、
 *  ユーザーが選んだが変化していなかったパッチに wrongChosen */
export function buildG01Marks(args: {
  trial: Game1TrialSpec;
  selectedIds: ReadonlyArray<string>;
}): ResultMark[] {
  const { trial, selectedIds } = args;
  const selected = new Set<string>(selectedIds);
  const marks: ResultMark[] = [];
  for (const p of trial.patches) {
    if (p.isChanging) {
      marks.push({
        targetId: `g01-${p.id}`,
        kind: selected.has(p.id) ? 'correctChosen' : 'correctMissed',
      });
    } else if (selected.has(p.id)) {
      marks.push({ targetId: `g01-${p.id}`, kind: 'wrongChosen' });
    }
  }
  return marks;
}

/** G-02 左右並び傾き判別：correctSide に correctChosen、誤選択側に wrongChosen */
export function buildG02Marks(args: {
  correctSide: 'left' | 'right';
  userAnswer: 'left' | 'right' | null;
}): ResultMark[] {
  const { correctSide, userAnswer } = args;
  const marks: ResultMark[] = [];
  // 単数選択：correctChosen 1 個 + wrongChosen 0〜1 個（偶然正解なら ◯ のみ）
  marks.push({
    targetId: `g02-${correctSide}`,
    kind: userAnswer === correctSide ? 'correctChosen' : 'correctMissed',
  });
  if (userAnswer !== null && userAnswer !== correctSide) {
    marks.push({ targetId: `g02-${userAnswer}`, kind: 'wrongChosen' });
  }
  return marks;
}

/** G-03 周辺視野ハント（v1.1.2 Sprint 21 改訂：直接選択化）：
 *  円周 8 ガボールの正解位置に correctChosen、誤選択位置に wrongChosen。
 *  targetId は `g03-pos-{12|1.5|3|4.5|6|7.5|9|10.5}`（screens.md §3.5 / §12.2）。 */
export function buildG03Marks(args: {
  correctClockPosition: G03ClockPosition;
  userAnswer: G03ClockPosition | null;
}): ResultMark[] {
  const { correctClockPosition, userAnswer } = args;
  const marks: ResultMark[] = [];
  marks.push({
    targetId: `g03-pos-${correctClockPosition}`,
    kind:
      userAnswer === correctClockPosition ? 'correctChosen' : 'correctMissed',
  });
  if (userAnswer !== null && userAnswer !== correctClockPosition) {
    marks.push({ targetId: `g03-pos-${userAnswer}`, kind: 'wrongChosen' });
  }
  return marks;
}

/** G-04 / G-05 / G-06 / G-09：左/右 horizontal-2 ボタンの correctSide に
 *  correctChosen、誤選択側に wrongChosen。
 *  注：G-11 は v1.1.2 Sprint 21 で構造変更（reference 上 + 下に左右 2 テストパッチ）
 *  したため `buildG11Marks` を使う（targetId は `g11-test-left/right`）。 */
export function buildHorizontalSideMarks(args: {
  gameId: 'g04' | 'g05' | 'g06' | 'g09' | 'g11';
  correctSide: 'left' | 'right';
  userAnswer: 'left' | 'right' | null;
}): ResultMark[] {
  const { gameId, correctSide, userAnswer } = args;
  const marks: ResultMark[] = [];
  marks.push({
    targetId: `${gameId}-${correctSide}`,
    kind: userAnswer === correctSide ? 'correctChosen' : 'correctMissed',
  });
  if (userAnswer !== null && userAnswer !== correctSide) {
    marks.push({ targetId: `${gameId}-${userAnswer}`, kind: 'wrongChosen' });
  }
  return marks;
}

/** G-11 Vernier 整列（v1.1.2 Sprint 21 直接選択化）：
 *  下部 2 テストパッチの正解側に correctChosen、誤選択側に wrongChosen。
 *  targetId は `g11-test-left` / `g11-test-right`（screens.md §9.7 / §12.2）。
 *  reference（上、`g11-test-reference` 等）には何も置かない（disabled なため）。
 */
export function buildG11Marks(args: {
  correctSide: 'left' | 'right';
  userAnswerSide: 'left' | 'right' | null;
}): ResultMark[] {
  const { correctSide, userAnswerSide } = args;
  const marks: ResultMark[] = [];
  marks.push({
    targetId: `g11-test-${correctSide}`,
    kind: userAnswerSide === correctSide ? 'correctChosen' : 'correctMissed',
  });
  if (userAnswerSide !== null && userAnswerSide !== correctSide) {
    marks.push({
      targetId: `g11-test-${userAnswerSide}`,
      kind: 'wrongChosen',
    });
  }
  return marks;
}

/** G-07 エッジ検出（複数選択）：3 個の正解 ID に correctChosen/correctMissed、
 *  ユーザーが選んだが正解でない ID に wrongChosen */
export function buildG07Marks(args: {
  grading: G07GradingResult;
}): ResultMark[] {
  const { grading } = args;
  const marks: ResultMark[] = [];
  // truePositiveIds  = 正解で選ばれた ID（◯）
  // falseNegativeIds = 正解だが選ばれなかった ID（薄 ◯ = missed）
  // falsePositiveIds = ユーザーが選んだが不正解 ID（✕）
  for (const id of grading.truePositiveIds) {
    marks.push({ targetId: `g07-${id}`, kind: 'correctChosen' });
  }
  for (const id of grading.falseNegativeIds) {
    marks.push({ targetId: `g07-${id}`, kind: 'correctMissed' });
  }
  for (const id of grading.falsePositiveIds) {
    marks.push({ targetId: `g07-${id}`, kind: 'wrongChosen' });
  }
  return marks;
}

/** G-08 残像方位弁別（v1.1.1 直接選択、Sprint 20-C 改訂）：
 *  下部 2 テストパッチの正解側に correctChosen、誤選択側に wrongChosen。
 *  targetId は `g08-test-left` / `g08-test-right`（screens.md §6.2）。
 *  adapter（`g08-adapter`）には何も表示しない（選択対象外のため）。
 *
 *  旧 horizontal-2 方式（cw/ccw 直接）の `correctDirection` / `userAnswer`
 *  引数は後方互換のため optional として残す（grading に correctSide /
 *  userAnswerSide が無い古いデータが渡されたケース対応）。
 */
export function buildG08Marks(args: {
  /** v1.1.1 改訂後の正解側（左 or 右） */
  correctSide?: 'left' | 'right';
  /** v1.1.1 改訂後のユーザー選択側（null = 未回答） */
  userAnswerSide?: 'left' | 'right' | null;
  /** 旧 horizontal-2 互換用 */
  correctDirection?: 'cw' | 'ccw';
  /** 旧 horizontal-2 互換用 */
  userAnswer?: 'cw' | 'ccw' | null;
}): ResultMark[] {
  const { correctSide, userAnswerSide, correctDirection, userAnswer } = args;
  const marks: ResultMark[] = [];

  // 新方式：correctSide が指定されたら下部 2 パッチの target で marks 構築
  if (correctSide !== undefined) {
    const userSide = userAnswerSide ?? null;
    marks.push({
      targetId: `g08-test-${correctSide}`,
      kind: userSide === correctSide ? 'correctChosen' : 'correctMissed',
    });
    if (userSide !== null && userSide !== correctSide) {
      marks.push({ targetId: `g08-test-${userSide}`, kind: 'wrongChosen' });
    }
    return marks;
  }

  // 旧方式（後方互換）：cw/ccw ボタン target
  if (correctDirection !== undefined) {
    marks.push({
      targetId: `g08-${correctDirection}`,
      kind: userAnswer === correctDirection ? 'correctChosen' : 'correctMissed',
    });
    if (userAnswer !== null && userAnswer !== undefined && userAnswer !== correctDirection) {
      marks.push({ targetId: `g08-${userAnswer}`, kind: 'wrongChosen' });
    }
    return marks;
  }

  return marks;
}

/** G-09 側方マスキング：correctOrientation = 'vertical' / 'horizontal' のうち
 *  対応するボタンに correctChosen、誤選択側に wrongChosen
 */
export function buildG09Marks(args: {
  correctOrientation: 'vertical' | 'horizontal';
  userAnswer: 'vertical' | 'horizontal' | null;
}): ResultMark[] {
  const { correctOrientation, userAnswer } = args;
  const marks: ResultMark[] = [];
  marks.push({
    targetId: `g09-${correctOrientation}`,
    kind:
      userAnswer === correctOrientation ? 'correctChosen' : 'correctMissed',
  });
  if (userAnswer !== null && userAnswer !== correctOrientation) {
    marks.push({ targetId: `g09-${userAnswer}`, kind: 'wrongChosen' });
  }
  return marks;
}

/** G-10 テクスチャ分離：4 象限ボタンの correctQuadrant に correctChosen、
 *  誤選択側に wrongChosen */
export function buildG10Marks(args: {
  correctQuadrant: 'tl' | 'tr' | 'bl' | 'br';
  userAnswer: 'tl' | 'tr' | 'bl' | 'br' | null;
}): ResultMark[] {
  const { correctQuadrant, userAnswer } = args;
  const marks: ResultMark[] = [];
  marks.push({
    targetId: `g10-${correctQuadrant}`,
    kind: userAnswer === correctQuadrant ? 'correctChosen' : 'correctMissed',
  });
  if (userAnswer !== null && userAnswer !== correctQuadrant) {
    marks.push({ targetId: `g10-${userAnswer}`, kind: 'wrongChosen' });
  }
  return marks;
}

/** G-12 クラウディング：horizontal-4 アイコンボタンの correctOrientation に
 *  correctChosen、誤選択側に wrongChosen。orientation は 'vertical' /
 *  'horizontal' / 'tilt-right' / 'tilt-left' を想定 */
export function buildG12Marks(args: {
  correctOrientation: string;
  userAnswer: string | null;
}): ResultMark[] {
  const { correctOrientation, userAnswer } = args;
  const marks: ResultMark[] = [];
  marks.push({
    targetId: `g12-${correctOrientation}`,
    kind:
      userAnswer === correctOrientation ? 'correctChosen' : 'correctMissed',
  });
  if (userAnswer !== null && userAnswer !== correctOrientation) {
    marks.push({ targetId: `g12-${userAnswer}`, kind: 'wrongChosen' });
  }
  return marks;
}

/** G-13 数字探し：0〜9 キーパッドのうち正解数字に correctChosen、
 *  誤選択数字に wrongChosen。最大 2 個のマーク（◯ + ✕） */
export function buildG13Marks(args: {
  embeddedDigit: G13Digit;
  userAnswer: G13Digit | null;
}): ResultMark[] {
  const { embeddedDigit, userAnswer } = args;
  const marks: ResultMark[] = [];
  marks.push({
    targetId: `g13-key-${embeddedDigit}`,
    kind: userAnswer === embeddedDigit ? 'correctChosen' : 'correctMissed',
  });
  if (userAnswer !== null && userAnswer !== embeddedDigit) {
    marks.push({
      targetId: `g13-key-${userAnswer}`,
      kind: 'wrongChosen',
    });
  }
  return marks;
}

// ============================================================================
// 一括 dispatch：courseGameAdapter と同様、gameId と result から marks を構築する
// ============================================================================

/**
 * Game1GradingResult から「ユーザーが選んだ ID 配列」を取り出すヘルパー。
 * G-01 の grading は correctIds + incorrectIds の連結 = ユーザー選択全件。
 */
export function selectedIdsFromGame1Grading(
  grading: Game1GradingResult,
): string[] {
  return [...grading.correctIds, ...grading.incorrectIds];
}
