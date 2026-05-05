/**
 * GamePlaySurface — GS-1（components.md §1、system.md §1.1）。
 *
 * 全ゲーム共通の OPT-12 骨格を強制するレイアウトコンテナ：
 *
 *   ┌─ (SafeArea top inset) ─────┐
 *   ├─ GameStatusBarV11 (64px) ─┤
 *   │ ✕   残り N 秒              │
 *   ├─────────────────────────────┤
 *   │  [ 注視領域（stimulusArea）]  │
 *   ├─────────────────────────────┤
 *   │  [ ガイド文（任意） ]         │
 *   ├─────────────────────────────┤
 *   │  [ 選択肢（answerChoices） ] │
 *   └─────────────────────────────┘
 *
 * v1.1.5：実機で OS のステータスバー（時計・電池表示）と画面が被る不具合を解消。
 *   - root に SafeArea top inset を paddingTop として適用。
 *   - `expandedStimulus` prop（既定 false）で刺激領域の上下マージンを切替：
 *       false → 通常の上部マージン（広すぎないように）
 *       true  → マージン無し（眼筋トレ系・視点追従系で画面いっぱいに使う）
 *
 * 上部 64px / 注視領域パディング 16px / 選択肢領域パディング上 24px / 下 32px
 * （system.md §1.1）。
 */

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fontSize,
  getColors,
  spacing,
} from '../../theme/tokens';
import { GameStatusBarV11 } from './GameStatusBarV11';

export type GamePlaySurfaceProps = {
  gameNameJa: string;
  remainingSeconds: number;
  onAbort: () => void;
  ariaInstruction: string;
  stimulusArea: React.ReactNode;
  /**
   * 回答領域。v1.1.2 Sprint 21 以降、直接選択化されたゲーム（G-03 / G-04 /
   * G-05 / G-06 / G-10 / G-11）では刺激領域内に選択肢が統合されるため null を渡す。
   * null のとき回答領域はゼロ高さで描画されない（answer-area testID は出ない）。
   */
  answerChoices: React.ReactNode | null;
  guidanceText?: string;
  /**
   * v1.1.1 Sprint 20-C：刺激領域が選択肢を兼ねるゲーム（G-01 / G-02 / G-07 / G-08 /
   * G-10 / G-13）では `accessibilityElementsHidden` で SR 隔離してしまうと radio /
   * checkbox の選択状態が SR から読めなくなる。本フラグを true にすると刺激領域は
   * 通常の DOM 配下で render され、SR / 自動テストから到達可能になる。
   * 既定 false（後方互換、刺激と回答が分離されたゲーム）。
   */
  stimulusInteractive?: boolean;
  /**
   * v1.1.1 Sprint 20 ラウンド 2：guidance テキストを `role="status"` /
   * `aria-live="polite"` で読み上げ対象にする（screens.md §3.6 / §5.6 規範、
   * G-02 / G-08 のみ要求）。出題方向が変わるたびに SR が再読み上げ可能に。
   * 既定 false（後方互換）。
   */
  guidanceLiveRegion?: boolean;
  /**
   * v1.1.5：刺激領域を「画面いっぱいに広げる」モード。
   * - false（既定）：刺激領域の上に追加マージン（広すぎを抑制）
   * - true：マージン無し。眼筋トレ系（広範囲を見渡す）や視点追従系（動きを追う）で使用
   */
  expandedStimulus?: boolean;
  testId?: string;
};

export const GamePlaySurface: React.FC<GamePlaySurfaceProps> = ({
  gameNameJa,
  remainingSeconds,
  onAbort,
  ariaInstruction,
  stimulusArea,
  answerChoices,
  guidanceText,
  stimulusInteractive = false,
  guidanceLiveRegion = false,
  expandedStimulus = false,
  testId,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const insets = useSafeAreaInsets();

  const stimulusA11yProps = stimulusInteractive
    ? {}
    : {
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants' as const,
      };

  return (
    <View
      accessibilityLabel={`${gameNameJa} プレイ画面`}
      style={[
        styles.container,
        { backgroundColor: colors.bgCanvas, paddingTop: insets.top },
      ]}
      testID={testId ?? 'game-play-surface'}
    >
      <GameStatusBarV11
        remainingSeconds={remainingSeconds}
        onAbort={onAbort}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        accessibilityRole="none"
      >
        <View
          style={[
            styles.stimulusFrame,
            !expandedStimulus && styles.stimulusFrameCompact,
          ]}
          {...stimulusA11yProps}
          testID="game-play-surface-stimulus"
        >
          {stimulusArea}
        </View>
        {guidanceText ? (
          <Text
            style={[styles.guidance, { color: colors.fgPrimary }]}
            accessibilityRole="text"
            // screens.md §3.6 / §5.6（G-02 / G-08）：guidanceLiveRegion=true で
            // role=status / aria-live=polite を付与し、出題方向の変化を SR が
            // 再読み上げできるようにする。react-native-web は accessibilityLiveRegion
            // を aria-live 属性に、role を role 属性に変換する。
            {...(guidanceLiveRegion
              ? ({
                  role: 'status',
                  accessibilityLiveRegion: 'polite',
                  testID: 'game-play-surface-guidance',
                } as object)
              : {})}
          >
            {guidanceText}
          </Text>
        ) : null}
        {answerChoices != null ? (
          <View
            style={styles.answerArea}
            accessibilityRole="none"
            accessibilityLabel="回答を選んでください"
            testID="game-play-surface-answers"
          >
            {answerChoices}
          </View>
        ) : null}
        {/* SR 用ゲーム説明（aria-describedby 対応用、画面上は非可視） */}
        <Text style={styles.srOnly} nativeID="game-instruction">
          {ariaInstruction}
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: spacing.s7,
  },
  stimulusFrame: {
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s4,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  // v1.1.5：「広い描画」を必要としないゲームでは、刺激領域の上に追加マージンを入れて
  // ステータスバーから離す（実機で広すぎ問題への対処）。
  // 既定 paddingVertical: 16px に加え、上だけ +32px = 計 48px の上余白。
  stimulusFrameCompact: {
    paddingTop: spacing.s6,
  },
  guidance: {
    fontSize: fontSize.body,
    textAlign: 'center',
    marginTop: spacing.s4,
    marginBottom: spacing.s2,
    paddingHorizontal: spacing.s4,
  },
  answerArea: {
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s5,
    paddingBottom: spacing.s6,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
    opacity: 0,
  },
});
