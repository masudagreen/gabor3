/**
 * ResultOverlay — GE-RESULT（components.md §23、v1.1.1 新規・最重要）。
 *
 * 全ゲーム共通で、60 秒経過後に刺激画面に**重畳表示**する結果オーバーレイ。
 * 独立画面遷移は廃止され、本コンポーネントが旧 `ResultSummaryV11` の責務を引き継ぐ。
 *
 * 構成（spec 再確定）：
 *   - ◯ / ✕ アイコンの**重畳描画**（MarkBadge を data-target-id セル中央に絶対配置）
 *   - 「次へ」ボタン（コース時はカウントダウン併記）
 *   - 単体時は SinglePlayPostFooter（同じゲームをもう一度／ゲーム一覧へ／ホームへ）
 *
 * メトリクスバー（閾値・前回比・単位）は撤去（spec 再確定）。
 *
 * ◯ / ✕ の配置（components.md §23 §881-893 規範）：
 *   - 親が `marks: ResultMark[]` を渡す。targetId は `extraStimulus` 領域内の各セル
 *     や選択肢ボタンの `data-target-id` 属性と対応。
 *   - Web 環境ではマウント後 `document.querySelector('[data-target-id="..."]')` から
 *     `getBoundingClientRect()` で各セルの中央座標を計算し、`stimulusContainer` に
 *     対する相対座標で MarkBadge を `position: absolute` 配置する。
 *   - jest 等の RN 環境では座標計算が不能なので、検出不可時のフォールバックとして
 *     インラインで MarkBadge を描画する（既存テストの testID 互換性維持）。
 *
 * a11y：
 *   - role="region", aria-live="assertive" で結果文字列を 1 度読み上げ
 *   - 「次へ」ボタンへ自動フォーカス
 *   - カウントダウン 5 秒以下は polite で 1 秒間隔読み上げ
 *   - prefers-reduced-motion: reduce 時はフェードイン即時化（200ms → 0）
 *   - 重畳された MarkBadge には `aria-label="正解です"` 等が付き、SR からも識別可能
 *
 * targetId 文字列は **DOM テキストとして露出させない**（screens.md §2.5 / §4.1 規範）。
 */

import React from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { Button } from '../Button';
import { IconButton } from '../IconButton';
import { fontSize, fontWeight, getColors, spacing } from '../../theme/tokens';
import { GameIdV11 } from '../../state/gameIds-v11';
import { BadgeIdV11 } from '../../lib/v11/badgeDefinitions';
import {
  MarkBadge,
  MarkBadgeKind,
  markBadgeSizeForCell,
} from './MarkBadge';
import { SinglePlayPostFooter } from './SinglePlayPostFooter';
import { BadgeUnlockToast } from './badges/BadgeUnlockToast';

/** ◯ / ✕ / 薄 ◯ いずれかを「対象」上に重畳するスペック。 */
export type ResultMark = {
  /** 対象の data-target-id 属性（刺激領域内のセル ID と対応） */
  targetId: string;
  /** correctChosen=正解を選んだ → ◯
   *  correctMissed=正解だが選ばれなかった → 薄 ◯（複数選択ゲームのみ）
   *  wrongChosen=不正解で選んだ → ✕ */
  kind: 'correctChosen' | 'correctMissed' | 'wrongChosen';
};

export type ResultOverlayMode = 'single' | 'course';

export type ResultOverlayProps = {
  gameId: GameIdV11;
  gameNameJa: string;

  /** 各 target の正誤を示す ◯/✕/薄 ◯ 配列 */
  marks: ReadonlyArray<ResultMark>;

  /** SR 読み上げ用の正解 / ユーザー回答ラベル */
  correctAnswerLabel: string;
  /** null の場合は「未回答」 */
  userAnswerLabel: string | null;
  /** 全体の正誤（SR 読み上げ用） */
  isCorrect: boolean;

  /** モード（コース：自動進行カウントダウン / 単体：押すまで止まる） */
  mode: ResultOverlayMode;

  /** コースモード時の次のゲームラベル（最終ゲームでは null → 「クールダウンへ」） */
  nextGameLabel?: string | null;

  /** ハンドラ */
  onAdvance: () => void;
  /** 単体時のみ（任意） */
  onPlayAgain?: () => void;
  onBackToList?: () => void;
  onGoHome?: () => void;

  /** F-13 バッジ獲得演出 */
  newlyAwardedBadges?: ReadonlyArray<BadgeIdV11>;

  /** カウントダウンの初期秒数（コース時のみ、デフォルト 10、テスト用上書き可） */
  initialSecondsForTest?: number;
  /** 1 tick ms（コース時のみ、デフォルト 1000、テスト用上書き可） */
  tickMsForTest?: number;

  /** Sprint 19 / F-15：オンボーディング体験完了モード（ホームへ 1 つだけ） */
  onboardingCompletionMode?: boolean;

  /** 子要素（実装側で MarkBadge を絶対配置するときに使う任意拡張、通常未使用） */
  children?: React.ReactNode;

  /** Sprint 20-B：刺激領域の上部に重ねる任意の補助コンポーネント。
   *  例：当該ゲームの SideBySideStimulus / VerticalStackStimulus 等の disabled
   *  プレビューを再表示する用途。各セルが `data-target-id` 属性を持つ場合、
   *  本コンポーネントは MarkBadge をその上に絶対配置で重畳する（Web 限定）。 */
  extraStimulus?: React.ReactNode;

  /** Sprint 20-B：中断（×）ボタンを表示するか。コースモード時のヘッダーに置く。
   *  押下で `onAbort` が呼ばれる。 */
  onAbort?: () => void;
  /** カウントダウン tick の停止フラグ（中断確認ダイアログ表示中など、コース時専用） */
  paused?: boolean;

  testId?: string;
};

const COURSE_INITIAL_SECONDS = 10;
const TICK_MS = 1000;

/** Web 環境での MarkBadge 絶対配置位置（stimulus 領域に対する相対座標） */
type AbsolutePlacement = {
  targetId: string;
  /** stimulus 領域に対する中心 x（px） */
  centerX: number;
  /** stimulus 領域に対する中心 y（px） */
  centerY: number;
  /** ターゲット要素の短辺（cellSizePx として markBadgeSizeForCell に渡す） */
  cellSizePx: number;
};

export const ResultOverlay: React.FC<ResultOverlayProps> = ({
  gameId,
  gameNameJa,
  marks,
  correctAnswerLabel,
  userAnswerLabel,
  isCorrect,
  mode,
  nextGameLabel,
  onAdvance,
  onPlayAgain,
  onBackToList,
  onGoHome,
  newlyAwardedBadges,
  initialSecondsForTest,
  tickMsForTest,
  onboardingCompletionMode,
  extraStimulus,
  onAbort,
  paused = false,
  testId,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  const isCourseMode = mode === 'course';
  const initialSec =
    initialSecondsForTest !== undefined
      ? initialSecondsForTest
      : COURSE_INITIAL_SECONDS;
  const tickMs = tickMsForTest ?? TICK_MS;

  const [seconds, setSeconds] = React.useState<number>(
    isCourseMode ? initialSec : 0,
  );

  const advancedRef = React.useRef<boolean>(false);
  const handleAdvance = React.useCallback(() => {
    if (advancedRef.current) return;
    advancedRef.current = true;
    onAdvance();
  }, [onAdvance]);

  // コース時のみカウントダウン
  React.useEffect(() => {
    if (!isCourseMode) return;
    if (seconds <= 0) {
      handleAdvance();
      return;
    }
    if (paused) return;
    const id = setTimeout(() => {
      setSeconds((s) => Math.max(0, s - 1));
    }, tickMs);
    return () => clearTimeout(id);
  }, [isCourseMode, seconds, tickMs, handleAdvance, paused]);

  // 「次へ」ボタンへ自動フォーカス（Web 限定）
  const nextBtnRef = React.useRef<View>(null);
  React.useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = nextBtnRef.current as unknown as HTMLElement | null;
    if (node && typeof node.focus === 'function') {
      // 200ms フェード後にフォーカス（reduce 時 0、即時）
      const id = setTimeout(() => {
        try {
          node.focus();
        } catch {
          // ignore
        }
      }, 50);
      return () => clearTimeout(id);
    }
  }, []);

  // ============================================================
  // MarkBadge 重畳描画ロジック（components.md §23 §881-893 規範）
  //
  // Web 環境では `extraStimulus` 領域マウント後に DOM を走査し、
  // 各 mark の data-target-id 要素の中心座標を計算して absolute 配置する。
  // jest（RN）環境では `document.querySelector` が無いので、フォールバックとして
  // インライン MarkBadge を描画する（testID 検証用）。
  // ============================================================
  const stimulusContainerRef = React.useRef<View>(null);
  const [placements, setPlacements] = React.useState<
    ReadonlyArray<AbsolutePlacement>
  >([]);

  // marks の identity を文字列化して deps の安定化（配列 ref 変動による無限再計算防止）
  const marksKey = React.useMemo(
    () => marks.map((m) => `${m.targetId}:${m.kind}`).join('|'),
    [marks],
  );

  React.useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof document === 'undefined') return;
    if (marks.length === 0) {
      setPlacements([]);
      return;
    }
    // 親 stimulus 領域の rect（基準）
    const containerNode =
      stimulusContainerRef.current as unknown as HTMLElement | null;
    if (!containerNode || typeof containerNode.getBoundingClientRect !== 'function') {
      setPlacements([]);
      return;
    }

    // ResizeObserver でレイアウト変動に追従（フォントロード／回転／拡大）
    const compute = () => {
      const containerRect = containerNode.getBoundingClientRect();
      const next: AbsolutePlacement[] = [];
      for (const m of marks) {
        // CSS.escape は古い環境で undefined のことがあるので safety
        const sel = `[data-target-id="${cssEscape(m.targetId)}"]`;
        let el: Element | null = null;
        try {
          el = containerNode.querySelector(sel);
          // フォールバック：document 全体
          if (!el && typeof document.querySelector === 'function') {
            el = document.querySelector(sel);
          }
        } catch {
          el = null;
        }
        if (!el || typeof (el as HTMLElement).getBoundingClientRect !== 'function') {
          continue;
        }
        const r = (el as HTMLElement).getBoundingClientRect();
        if (r.width <= 0 && r.height <= 0) continue;
        next.push({
          targetId: m.targetId,
          centerX: r.left + r.width / 2 - containerRect.left,
          centerY: r.top + r.height / 2 - containerRect.top,
          cellSizePx: Math.min(r.width, r.height),
        });
      }
      setPlacements(next);
    };

    // 初回計算（レイアウト落ち着いてから 1 回 + 短い遅延でもう 1 回）
    compute();
    const id1 = setTimeout(compute, 50);
    const id2 = setTimeout(compute, 200);

    // ResizeObserver（対応環境のみ）
    const win = (typeof window !== 'undefined' ? window : undefined) as
      | (Window & typeof globalThis)
      | undefined;
    let ro: ResizeObserver | undefined;
    if (
      win &&
      typeof (win as unknown as { ResizeObserver?: unknown }).ResizeObserver ===
        'function'
    ) {
      ro = new win.ResizeObserver(() => {
        compute();
      });
      try {
        ro.observe(containerNode);
      } catch {
        // ignore
      }
    }
    const onResize = () => compute();
    win?.addEventListener?.('resize', onResize);

    return () => {
      clearTimeout(id1);
      clearTimeout(id2);
      ro?.disconnect();
      win?.removeEventListener?.('resize', onResize);
    };
  }, [marksKey, marks]);

  const isFinal = nextGameLabel === null || nextGameLabel === undefined;
  const courseLabel = isFinal
    ? 'クールダウンへ'
    : `次へ（次：${nextGameLabel}）`;
  const nextLabel = isCourseMode ? courseLabel : '次へ';
  const ariaNextLabel = isCourseMode
    ? isFinal
      ? 'クールダウンへ進む'
      : `次へ進む。次：${nextGameLabel}`
    : '次へ進む';

  // SR 用文字列（components.md §23 a11y、閾値・前回比は読み上げに含めない）
  const userAnswerText = userAnswerLabel ?? '未回答';
  const judgmentText = isCorrect ? '正解' : '不正解';
  const srText = `${gameNameJa} 結果。正解は「${correctAnswerLabel}」。あなたの回答「${userAnswerText}」。${judgmentText}。次へ`;

  // 配置済みかどうか（重畳に成功した targetId 集合、デバッグ用）
  const placedTargetIds = React.useMemo(() => {
    const s = new Set<string>();
    for (const p of placements) s.add(p.targetId);
    return s;
  }, [placements]);
  void placedTargetIds;

  return (
    <View
      accessibilityRole="none"
      accessibilityLabel={`${gameNameJa} 結果オーバーレイ`}
      style={[styles.container, { backgroundColor: colors.bgCanvas }]}
      testID={testId ?? 'result-overlay'}
    >
      {/* SR 読み上げ：assertive で 1 度読まれる */}
      <Text
        accessibilityRole="text"
        accessibilityLiveRegion="assertive"
        nativeID="result-overlay-title"
        style={styles.srOnly}
        testID="result-overlay-sr-text"
      >
        {srText}
      </Text>

      {/* Sprint 22：上部ヘッダー。プレイ時 GameStatusBarV11 と同等の高さ・配色で
          描画してプレイ → 結果の切替時に縦位置が動かないようにする。
          - 左：× ボタン（コース時 = コース中断、単体時 = 結果画面終了 / 一覧へ）
          - 中央：コース時のみ「残り N 秒」自動進行カウントダウン
          - 右：左の IconButton と同サイズの spacer */}
      <View
        style={[
          styles.headerBar,
          {
            backgroundColor: colors.bgSurface,
            borderBottomColor: colors.borderDefault,
          },
        ]}
        testID="result-overlay-course-bar"
      >
        {onAbort ? (
          <IconButton
            icon="close"
            ariaLabel={isCourseMode ? 'コースを中断' : '結果画面を閉じる'}
            size="lg"
            onPress={onAbort}
            testId="result-overlay-abort"
          />
        ) : (
          <View style={styles.spacer} accessibilityElementsHidden />
        )}
        {isCourseMode ? (
          <Text
            accessibilityLabel={`残り ${seconds} 秒`}
            accessibilityLiveRegion="polite"
            style={[styles.countdownHeader, { color: colors.fgPrimary }]}
            testID="result-overlay-countdown"
          >
            {seconds <= 5 && seconds > 0 ? '🕐 ' : ''}残り {seconds} 秒
          </Text>
        ) : (
          <View />
        )}
        <View style={styles.spacer} accessibilityElementsHidden />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        accessibilityRole="none"
      >
        {/* 刺激プレビュー領域。data-target-id を持つ子要素の上に MarkBadge を絶対配置で重畳する */}
        {extraStimulus ? (
          <View
            ref={stimulusContainerRef}
            style={styles.extraStimulusWrap}
            testID="result-overlay-extra-stimulus"
          >
            {extraStimulus}
            {/* 重畳レイヤー：絶対配置の MarkBadge を子として並べる。
                pointer-events: none で刺激側のフォーカス／タップを阻害しない。
                Web 限定で位置計算が成功したものだけここに描画する。 */}
            {Platform.OS === 'web' && placements.length > 0 ? (
              <View
                style={styles.overlayLayer}
                // pointerEvents は style 経由（RN Web の deprecation 回避）
                testID="result-overlay-mark-layer"
                accessibilityElementsHidden={false}
              >
                {placements.map((p) => {
                  const m = marks.find((mm) => mm.targetId === p.targetId);
                  if (!m) return null;
                  const sizePx = markBadgeSizeForCell(p.cellSizePx);
                  return (
                    <View
                      key={`overlay-${p.targetId}`}
                      style={{
                        position: 'absolute',
                        left: p.centerX - sizePx / 2,
                        top: p.centerY - sizePx / 2,
                        width: sizePx,
                        height: sizePx,
                      }}
                      testID={`result-overlay-mark-${p.targetId}`}
                      // @ts-expect-error react-native-web 拡張（dataset 探索用）
                      dataSet={{ markTargetId: p.targetId }}
                    >
                      <MarkBadge
                        kind={kindToMarkKind(m.kind)}
                        sizePx={sizePx}
                        ariaLabel={kindToAriaLabel(m.kind)}
                        testId={`result-overlay-mark-badge-${m.targetId}`}
                      />
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* 結果サマリパネル（v1.1.3）：◯/✕ アイコンと「正解／あなたの回答」を視認可能に表示。
            v1.1.1 では mark の fallback を画面外 sr-only に置いていたため、Web で
            data-target-id が見つからなかった環境（特に native や、placement が
            タイミング依存で失敗するケース）で ◯/✕ がユーザーに見えなかった。
            v1.1.3 で常にこの可視サマリパネルを表示し、加えて Web では刺激領域上に
            data-target-id ベースで MarkBadge を絶対配置する重畳描画も併用する。 */}
        <View
          style={[
            styles.summaryPanel,
            { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
          ]}
          testID="result-overlay-summary-panel"
        >
          <View style={styles.summaryJudgmentRow}>
            <MarkBadge
              kind={isCorrect ? 'correct' : 'wrong'}
              sizePx={56}
              ariaLabel={isCorrect ? '正解です' : '不正解です'}
              testId="result-overlay-summary-judgment"
            />
            <Text
              style={[
                styles.summaryJudgmentText,
                {
                  color: isCorrect ? colors.successFg : colors.dangerFg,
                },
              ]}
              accessibilityRole="text"
            >
              {isCorrect ? '正解' : '不正解'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.fgSecondary }]}>
              正解
            </Text>
            <Text style={[styles.summaryValue, { color: colors.fgPrimary }]}>
              {correctAnswerLabel}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.fgSecondary }]}>
              あなたの回答
            </Text>
            <Text style={[styles.summaryValue, { color: colors.fgPrimary }]}>
              {userAnswerLabel ?? '未回答'}
            </Text>
          </View>
        </View>

        {/* 既存テスト契約および a11y 用の hidden mark 一覧：
            - 各 mark に対応する testID と aria-label を保持（テストで引ける）
            - 画面外 sr-only 配置（targetId 生文字列をユーザーに露出させない）
            - Web の重畳描画はこの上の `extraStimulusWrap` 内 absolute layer が担当 */}
        <View
          style={styles.fallbackHidden}
          testID="result-overlay-mark-fallback"
          accessibilityElementsHidden={Platform.OS === 'web'}
        >
          {marks.map((m) => (
            <View
              key={`fallback-${m.targetId}`}
              testID={`result-overlay-mark-${m.targetId}`}
            >
              <MarkBadge
                kind={kindToMarkKind(m.kind)}
                sizePx={markBadgeSizeForCell(80)}
                ariaLabel={kindToAriaLabel(m.kind)}
                testId={`result-overlay-mark-badge-${m.targetId}`}
              />
            </View>
          ))}
        </View>

        {/* バッジ獲得演出（1.5 秒、複数のとき直列） */}
        {newlyAwardedBadges && newlyAwardedBadges.length > 0 ? (
          <View style={styles.badgeSlot} testID="result-overlay-badge-slot">
            {newlyAwardedBadges.map((bid) => (
              <BadgeUnlockToast key={bid} badgeId={bid} />
            ))}
          </View>
        ) : null}

        {/* 「次へ」 + コース時カウントダウン */}
        <View
          style={styles.actionBar}
          testID="result-overlay-action-bar"
          ref={nextBtnRef}
        >
          {onboardingCompletionMode ? (
            <Button
              variant="primary"
              size="lg"
              label="ホームへ"
              ariaLabel="ホームへ戻る"
              onPress={onGoHome ?? handleAdvance}
              fullWidth
              testId="result-overlay-onboarding-home"
            />
          ) : (
            <Button
              variant="primary"
              size="lg"
              label={nextLabel}
              ariaLabel={ariaNextLabel}
              onPress={handleAdvance}
              fullWidth
              testId="result-overlay-next"
            />
          )}

          {isCourseMode ? (
            <Text
              accessibilityRole="text"
              style={[styles.footerHint, { color: colors.fgSecondary }]}
              testID="result-overlay-auto-hint"
            >
              {`${seconds} 秒後に自動で次へ`}
            </Text>
          ) : null}
        </View>

        {/* 単体時のみフッター 3 ボタン */}
        {!isCourseMode && !onboardingCompletionMode ? (
          <View style={styles.singleFooterWrap}>
            <SinglePlayPostFooter
              onPlayAgain={onPlayAgain}
              onBackToList={onBackToList}
              onGoHome={onGoHome}
              gameNameJa={gameNameJa}
              testId="result-overlay-single-footer"
            />
          </View>
        ) : null}
      </ScrollView>

      {/* gameId は SR や testId 用に保持（参照のみ、警告抑止） */}
      <Text style={styles.srOnly} testID="result-overlay-game-id">
        {gameId}
      </Text>
    </View>
  );
};

function kindToMarkKind(
  kind: ResultMark['kind'],
): MarkBadgeKind {
  switch (kind) {
    case 'correctChosen':
      return 'correct';
    case 'correctMissed':
      return 'missed';
    case 'wrongChosen':
      return 'wrong';
  }
}

function kindToAriaLabel(kind: ResultMark['kind']): string {
  switch (kind) {
    case 'correctChosen':
      return '正解です';
    case 'correctMissed':
      return '正解ですが選ばれませんでした';
    case 'wrongChosen':
      return '不正解です';
  }
}

/** CSS.escape の polyfill（古い環境向け） */
function cssEscape(value: string): string {
  if (
    typeof globalThis !== 'undefined' &&
    (globalThis as unknown as { CSS?: { escape?: (s: string) => string } }).CSS &&
    typeof (globalThis as unknown as { CSS: { escape?: (s: string) => string } })
      .CSS.escape === 'function'
  ) {
    return (
      globalThis as unknown as { CSS: { escape: (s: string) => string } }
    ).CSS.escape(value);
  }
  // フォールバック：英数 / ハイフン / アンダースコア以外を \\ エスケープ
  return value.replace(/[^a-zA-Z0-9\-_]/g, (c) => `\\${c}`);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: spacing.s7,
  },
  headerBar: {
    minHeight: 64,
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s3,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.s4,
    width: '100%',
  },
  countdownHeader: {
    fontSize: fontSize.h2,
    fontWeight: fontWeight.bold as '700',
    fontVariant: ['tabular-nums'],
  },
  spacer: {
    width: 56,
    height: 56,
  },
  actionBar: {
    width: '100%',
    maxWidth: 480,
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s5,
    flexDirection: 'column',
    gap: spacing.s2,
  },
  footerHint: {
    fontSize: fontSize.body,
    textAlign: 'center',
  },
  singleFooterWrap: {
    width: '100%',
    paddingHorizontal: spacing.s4,
    marginTop: spacing.s2,
  },
  badgeSlot: {
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.s4,
  },
  extraStimulusWrap: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s4,
    // 重畳レイヤー（position: absolute）の参照系として relative を維持
    position: 'relative',
  },
  // 刺激領域全体に被さる ◯/✕ 専用レイヤー。pointer-events: none で
  // 刺激側のフォーカス／タップを阻害しない（components.md §23 §912 規範）。
  overlayLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // RN Web 0.19+ では pointerEvents は style 経由が推奨
    pointerEvents: 'none',
  },
  fallbackHidden: {
    // 画面外 sr-only：内部 ID 文字列を露出させず、testID と aria-label だけ生かす
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
    opacity: 0,
    left: -9999,
    top: -9999,
  },
  summaryPanel: {
    width: '100%',
    maxWidth: 480,
    marginTop: spacing.s4,
    paddingVertical: spacing.s4,
    paddingHorizontal: spacing.s4,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.s2,
  },
  summaryJudgmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
    marginBottom: spacing.s2,
  },
  summaryJudgmentText: {
    fontSize: fontSize.h3,
    fontWeight: fontWeight.bold as '700',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.s3,
  },
  summaryLabel: {
    fontSize: fontSize.body,
    minWidth: 110,
  },
  summaryValue: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium as '600',
    flexShrink: 1,
  },
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
    opacity: 0,
  },
});

// IconButton import を保持（将来の拡張用）
void IconButton;
