/**
 * AnswerChoiceGroup — AC-1（components.md §3）。
 *
 * 13 ゲーム共通の選択肢ボタン群。タップで選択／再タップで解除／別を押すと切替。
 * 確定ボタンなし（OPT-12 / Q5 確定）。選択中はボタン枠の黄色 4px 枠で表示し、
 * 「現在の回答：◯◯」のテキスト表示は行わない。
 *
 * Sprint 9 では layout=horizontal-2 / vertical-list / grid-4 を実装。
 * Sprint 11 で `clock-8` レイアウト（AC-3 ClockChoiceLayout 相当）を追加：
 *   - 8 ボタンを時計の 12 / 1.5 / 3 / 4.5 / 6 / 7.5 / 9 / 10.5 時方向に絶対配置
 *   - 各 72×72px+、ラベル 24pt+、aria-label「12 時の方向」「1 時 30 分の方向」等
 *   - スマホ 220px 円直径、PC 280px（呼び出し側が `clockDiameterPx` で指定）
 *   - キーボード 1〜8 キーで対応する時計方向選択（v1 useGame3Keyboard 互換）
 *
 * keypad-10 は別コンポーネント（AC-4）として後続スプリントで追加予定。
 *
 * G-01 はパッチ自体が選択肢になるため `ImageChoiceCell` を直接使う（本コンポーネント
 * を経由しない）。本コンポーネントは G-02 以降のテキスト系選択肢で使用される。
 */

import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  ViewStyle,
} from 'react-native';
import {
  fontSize,
  fontWeight,
  getColors,
  radius,
  spacing,
  tapTarget,
} from '../../theme/tokens';
import { buildChoiceAccessibilityProps } from '../../lib/v11/accessibilityProps';

export type AnswerChoiceVariant = 'text' | 'image' | 'icon' | 'numeric';

export type AnswerChoiceLayout =
  | 'horizontal-2'
  | 'horizontal-4'
  | 'vertical-list'
  | 'grid-2'
  | 'grid-3'
  | 'grid-4'
  | 'clock-8'
  | 'keypad-10';

export type AnswerChoiceItem = {
  id: string;
  label: string;
  /** クロック配置・aria 用に、ラベルとは別の読み上げ文を指定したい場合（例：「12 時の方向」） */
  ariaLabel?: string;
};

export type AnswerChoiceGroupProps = {
  choices: ReadonlyArray<AnswerChoiceItem>;
  variant: AnswerChoiceVariant;
  selectedId: string | null;
  /** null は「解除」を意味する（再タップで解除） */
  onSelect: (id: string | null) => void;
  layout: AnswerChoiceLayout;
  ariaLabelGroup: string;
  disabled?: boolean;
  /**
   * v1.1.1：各 choice ボタンに data-target-id（Web）を付ける（ResultOverlay 配置探索用）。
   * choice.id をキーに `${prefix}-${id}` を生成する。省略時は付与しない。
   */
  dataTargetIdPrefix?: string;
  /**
   * v1.1.1（Sprint 20 ラウンド 3）：choice.id ごとに任意の data-target-id を割り当てる
   * マップ。`dataTargetIdPrefix` より優先される。choice.id が `top-left` で
   * `resultMarks.ts` 側が `g10-tl` を生成するような「id ⇔ targetId が直接一致しない」
   * ゲーム（G-10 など）で使う。未指定 / 該当 id 未登録の場合は `dataTargetIdPrefix`
   * のフォールバック（`${prefix}-${id}`）が使われる。
   */
  dataTargetIdMap?: Readonly<Record<string, string>>;
  /**
   * `layout="clock-8"` のとき、文字盤の直径（px）を指定する。
   * screens.md S11-02：スマホ 220 / PC 280。
   * 8 ボタンが順序通り（choices[0]=12時、時計回り）配置される。
   * choices.length は 8 でなければ無効（例外なしで先頭 8 件を採用）。
   */
  clockDiameterPx?: number;
  /** clock-8 のボタンサイズ（px、デフォルト 72） */
  clockButtonSizePx?: number;
  /**
   * Web のキーボード数字キー 1〜8（clock-8）または 0〜9（keypad-10）で
   * choices を選択するハンドラを有効化する。デフォルト false（OPT 上書き防止）。
   *
   * - layout="clock-8"：1〜8 → choices[0..7]
   * - layout="keypad-10"：0〜9 → choices の id が一致するもの（id を数字で検索）
   */
  enableNumericKeyboard?: boolean;
  /** keypad-10 のボタンサイズ（px、デフォルト 64） */
  keypadButtonSizePx?: number;
  testId?: string;
};

export const AnswerChoiceGroup: React.FC<AnswerChoiceGroupProps> = ({
  choices,
  selectedId,
  onSelect,
  layout,
  ariaLabelGroup,
  disabled,
  clockDiameterPx,
  clockButtonSizePx,
  enableNumericKeyboard,
  keypadButtonSizePx,
  dataTargetIdPrefix,
  dataTargetIdMap,
  testId,
}) => {
  const resolveDataTargetId = React.useCallback(
    (choiceId: string): string | undefined => {
      if (dataTargetIdMap && dataTargetIdMap[choiceId]) {
        return dataTargetIdMap[choiceId];
      }
      if (dataTargetIdPrefix) {
        return `${dataTargetIdPrefix}-${choiceId}`;
      }
      return undefined;
    },
    [dataTargetIdMap, dataTargetIdPrefix],
  );
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  // Web 限定：数字キーで選択肢を選ぶ（OPT-12 トグル規約に合わせて
  // 「同じものを再度選ぶと解除」する動作）。
  //   - clock-8：1〜8 → choices[0..7]（v1 useGame3Keyboard 互換）
  //   - keypad-10：0〜9 → choices の id が "0".."9" のもの
  React.useEffect(() => {
    if (!enableNumericKeyboard) return;
    if (Platform.OS !== 'web') return;
    if (typeof window === 'undefined') return;
    const handler = (e: KeyboardEvent) => {
      if (disabled) return;
      const k = e.key;
      if (k.length !== 1) return;
      const n = Number(k);
      if (!Number.isInteger(n)) return;
      let target: AnswerChoiceItem | undefined;
      if (layout === 'keypad-10') {
        if (n < 0 || n > 9) return;
        target = choices.find((c) => c.id === String(n));
      } else {
        if (n < 1 || n > 8) return;
        target = choices[n - 1];
      }
      if (!target) return;
      e.preventDefault();
      onSelect(selectedId === target.id ? null : target.id);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [choices, selectedId, onSelect, disabled, enableNumericKeyboard, layout]);

  if (layout === 'clock-8') {
    return (
      <ClockEightLayout
        choices={choices}
        selectedId={selectedId}
        onSelect={onSelect}
        ariaLabelGroup={ariaLabelGroup}
        disabled={disabled}
        diameterPx={clockDiameterPx ?? 220}
        buttonSizePx={clockButtonSizePx ?? 72}
        colors={colors}
        resolveDataTargetId={resolveDataTargetId}
        testId={testId ?? 'answer-choice-group'}
      />
    );
  }

  if (layout === 'keypad-10') {
    return (
      <KeypadTenLayout
        choices={choices}
        selectedId={selectedId}
        onSelect={onSelect}
        ariaLabelGroup={ariaLabelGroup}
        disabled={disabled}
        buttonSizePx={keypadButtonSizePx ?? 64}
        colors={colors}
        resolveDataTargetId={resolveDataTargetId}
        testId={testId ?? 'answer-choice-group'}
      />
    );
  }

  const containerStyle = layoutToStyle(layout);

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={ariaLabelGroup}
      style={containerStyle}
      testID={testId ?? 'answer-choice-group'}
    >
      {choices.map((c) => {
        const isSelected = c.id === selectedId;
        return (
          <ChoiceButton
            key={c.id}
            id={c.id}
            label={c.label}
            ariaLabelOverride={c.ariaLabel}
            isSelected={isSelected}
            disabled={disabled}
            onPress={() => onSelect(isSelected ? null : c.id)}
            colors={colors}
            layout={layout}
            dataTargetId={resolveDataTargetId(c.id)}
          />
        );
      })}
    </View>
  );
};

type ChoiceButtonProps = {
  id: string;
  label: string;
  /** ariaLabel を上書きしたい場合（例：clock-8 で「12 時の方向」を読ませる） */
  ariaLabelOverride?: string;
  isSelected: boolean;
  disabled?: boolean;
  onPress: () => void;
  colors: ReturnType<typeof getColors>;
  layout: AnswerChoiceLayout;
  dataTargetId?: string;
};

const ChoiceButton: React.FC<ChoiceButtonProps> = ({
  id,
  label,
  ariaLabelOverride,
  isSelected,
  disabled,
  onPress,
  colors,
  layout,
  dataTargetId,
}) => {
  const [focused, setFocused] = React.useState(false);
  // grid 系は flex-basis で 2 列 / 3 列 / 4 列を表現
  const flexBasis = gridFlexBasis(layout);

  // Sprint 10 修正ラウンド 2 / M-1 真正修正：
  //   role="radio" の Pressable に `accessibilityState.selected` だけ渡しても、
  //   react-native-web 0.19 系の `createDOMProps` は `aria-checked` を DOM に反映しない。
  //   `aria-checked` を直接 Web 環境で付与する。
  const a11yProps = buildChoiceAccessibilityProps({
    role: 'radio',
    label: ariaLabelOverride ?? label,
    isSelected,
    disabled,
    platform: Platform.OS === 'web' ? 'web' : 'native',
  });

  // Web 用キーボードハンドラ：role=radio は react-native-web で Space を onPress に
  // 変換しないため、明示的に Enter / Space → onPress を橋渡しする。
  const handleKeyDown = React.useCallback(
    (e: { key?: string; preventDefault?: () => void }) => {
      if (disabled) return;
      const key = e.key;
      if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
        e.preventDefault?.();
        onPress();
      }
    },
    [disabled, onPress],
  );

  const webExtraProps =
    Platform.OS === 'web'
      ? {
          onKeyDown: handleKeyDown,
          tabIndex: (disabled ? -1 : 0) as -1 | 0,
        }
      : {};
  // v1.1.1（Sprint 20 ラウンド 3）：Platform.OS ガードを外し、jest 環境（Native）でも
  // props として保持される（テストで `btn.props['data-target-id']` を検証可能）。
  const dataTargetProps = dataTargetId
    ? {
        'data-target-id': dataTargetId,
        dataSet: { targetId: dataTargetId },
      }
    : {};

  // v1.1.1（Sprint 20）：選択中枠を黄 4px → 中性グレー 2px に。
  // 文字も Bold で識別軸を補強（components.md §3）。
  const borderWidth = isSelected ? 2 : 1;
  const borderColor = isSelected
    ? colors.selectionSubtle
    : colors.selectionSubtleIdle;

  return (
    <Pressable
      {...a11yProps}
      {...webExtraProps}
      {...dataTargetProps}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      testID={`answer-choice-${id}`}
      style={({ pressed }) => {
        const base: ViewStyle = {
          minHeight: tapTarget.buttonLg, // 64px
          paddingHorizontal: spacing.s4,
          paddingVertical: spacing.s2,
          backgroundColor: colors.actionSecondary,
          borderRadius: radius.lg,
          borderWidth,
          borderColor,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          flexBasis: flexBasis as ViewStyle['flexBasis'],
          flexGrow: 1,
          flexShrink: 1,
          minWidth: 96,
          ...(Platform.OS === 'web' && focused
            ? ({
                outlineColor: colors.focusRing,
                outlineWidth: 3,
                outlineStyle: 'solid',
                outlineOffset: 2,
              } as object)
            : {}),
        };
        return base;
      }}
    >
      <Text
        style={{
          color: colors.fgPrimary,
          fontSize: fontSize.bodyLg, // 26px（OPT-1 床 +2px、components.md §3）
          // 選択中は Bold で識別軸を補強（v1.1.1 改訂）
          fontWeight: (isSelected
            ? fontWeight.bold
            : fontWeight.medium) as '600' | '700',
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
};

function layoutToStyle(layout: AnswerChoiceLayout): ViewStyle {
  switch (layout) {
    case 'horizontal-2':
    case 'horizontal-4':
      return {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.s3,
        width: '100%',
      };
    case 'grid-2':
    case 'grid-3':
    case 'grid-4':
      return {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.s3,
        width: '100%',
      };
    case 'vertical-list':
      return {
        flexDirection: 'column',
        gap: spacing.s3,
        width: '100%',
      };
    case 'clock-8':
    case 'keypad-10':
      // 専用レイアウトが独自に配置するためここでは到達しない
      return { width: '100%' };
  }
}

function gridFlexBasis(layout: AnswerChoiceLayout): string | number {
  switch (layout) {
    case 'horizontal-2':
    case 'grid-2':
      return '45%';
    case 'horizontal-4':
      // 横 4 列。スマホでは 2×2 折り返しで自動対応（gap 込みで 45% に）
      return '45%';
    case 'grid-3':
      return '30%';
    case 'grid-4':
      return '45%'; // 2×2 グリッド（4 象限）
    case 'vertical-list':
      return 'auto';
    case 'clock-8':
    case 'keypad-10':
      return 'auto';
  }
}

// ---------------------------------------------------------------------------
// AC-3 ClockEightLayout（Sprint 11、components.md §5）
// ---------------------------------------------------------------------------

type ClockEightLayoutProps = {
  choices: ReadonlyArray<AnswerChoiceItem>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  ariaLabelGroup: string;
  disabled?: boolean;
  diameterPx: number;
  buttonSizePx: number;
  colors: ReturnType<typeof getColors>;
  resolveDataTargetId: (choiceId: string) => string | undefined;
  testId: string;
};

/**
 * 8 ボタンを時計の文字盤に絶対配置するレイアウト（components.md §5、screens.md S11-02）。
 *
 * - 12 時 = -π/2（画面座標系で「上」）、時計回りに +45° ずつ
 * - 各ボタン 72×72px、円形（radius 999）、ラベル 24pt tabular-nums
 * - 選択中：黄色 4px 枠（OPT-3 / system.md）
 * - choices.length は 8 を期待（先頭 8 件のみ採用）
 */
const ClockEightLayout: React.FC<ClockEightLayoutProps> = ({
  choices,
  selectedId,
  onSelect,
  ariaLabelGroup,
  disabled,
  diameterPx,
  buttonSizePx,
  colors,
  resolveDataTargetId,
  testId,
}) => {
  const items = choices.slice(0, 8);
  const margin = 8;
  const radius = diameterPx / 2 - buttonSizePx / 2 - margin;
  const cx = diameterPx / 2;
  const cy = diameterPx / 2;

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={ariaLabelGroup}
      style={[
        clockStyles.frame,
        { width: diameterPx, height: diameterPx },
      ]}
      testID={testId}
    >
      {items.map((c, idx) => {
        const angle = -Math.PI / 2 + (idx * Math.PI) / 4;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        const left = x - buttonSizePx / 2;
        const top = y - buttonSizePx / 2;
        const isSelected = c.id === selectedId;
        return (
          <ClockChoiceButton
            key={c.id}
            id={c.id}
            label={c.label}
            ariaLabel={c.ariaLabel ?? c.label}
            isSelected={isSelected}
            disabled={disabled}
            onPress={() => onSelect(isSelected ? null : c.id)}
            sizePx={buttonSizePx}
            left={left}
            top={top}
            colors={colors}
            dataTargetId={resolveDataTargetId(c.id)}
          />
        );
      })}
    </View>
  );
};

type ClockChoiceButtonProps = {
  id: string;
  label: string;
  ariaLabel: string;
  isSelected: boolean;
  disabled?: boolean;
  onPress: () => void;
  sizePx: number;
  left: number;
  top: number;
  colors: ReturnType<typeof getColors>;
  dataTargetId?: string;
};

const ClockChoiceButton: React.FC<ClockChoiceButtonProps> = ({
  id,
  label,
  ariaLabel,
  isSelected,
  disabled,
  onPress,
  sizePx,
  left,
  top,
  colors,
  dataTargetId,
}) => {
  const [focused, setFocused] = React.useState(false);
  const a11yProps = buildChoiceAccessibilityProps({
    role: 'radio',
    label: ariaLabel,
    isSelected,
    disabled,
    platform: Platform.OS === 'web' ? 'web' : 'native',
  });

  const handleKeyDown = React.useCallback(
    (e: { key?: string; preventDefault?: () => void }) => {
      if (disabled) return;
      const key = e.key;
      if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
        e.preventDefault?.();
        onPress();
      }
    },
    [disabled, onPress],
  );

  const webExtraProps =
    Platform.OS === 'web'
      ? {
          onKeyDown: handleKeyDown,
          tabIndex: (disabled ? -1 : 0) as -1 | 0,
        }
      : {};
  // v1.1.1（Sprint 20 ラウンド 3）：Platform.OS ガードを外し、jest 環境（Native）でも
  // props として保持される（テストで `btn.props['data-target-id']` を検証可能）。
  const dataTargetProps = dataTargetId
    ? {
        'data-target-id': dataTargetId,
        dataSet: { targetId: dataTargetId },
      }
    : {};

  // v1.1.1（Sprint 20）：選択中枠を黄 4px → 中性グレー 2px に切替。
  // 未選択は 1px の薄い中性グレー（旧 fgMuted から trade-off）。
  const borderWidth = isSelected ? 2 : 1;
  const borderColor = isSelected
    ? colors.selectionSubtle
    : colors.selectionSubtleIdle;

  return (
    <Pressable
      {...a11yProps}
      {...webExtraProps}
      {...dataTargetProps}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      testID={`answer-choice-${id}`}
      style={({ pressed }) => {
        const base: ViewStyle = {
          position: 'absolute',
          left,
          top,
          width: sizePx,
          height: sizePx,
          minWidth: tapTarget.min,
          minHeight: tapTarget.min,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.actionSecondary,
          borderWidth,
          borderColor,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          ...(Platform.OS === 'web' && focused
            ? ({
                outlineColor: colors.focusRing,
                outlineWidth: 3,
                outlineStyle: 'solid',
                outlineOffset: 2,
              } as object)
            : {}),
        };
        return base;
      }}
    >
      <Text
        style={{
          color: colors.fgPrimary,
          fontSize: fontSize.body, // 24pt（OPT-1 床）
          fontWeight: (isSelected
            ? fontWeight.bold
            : fontWeight.medium) as '600' | '700',
          fontVariant: ['tabular-nums'],
          textAlign: 'center',
          lineHeight: fontSize.body,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const clockStyles = StyleSheet.create({
  frame: {
    position: 'relative',
    alignSelf: 'center',
  },
});

// ---------------------------------------------------------------------------
// AC-4 KeypadTenLayout（Sprint 17、components.md §6 NumericKeypadChoice）
// ---------------------------------------------------------------------------

type KeypadTenLayoutProps = {
  choices: ReadonlyArray<AnswerChoiceItem>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  ariaLabelGroup: string;
  disabled?: boolean;
  buttonSizePx: number;
  colors: ReturnType<typeof getColors>;
  resolveDataTargetId: (choiceId: string) => string | undefined;
  testId: string;
};

/**
 * 0〜9 の 10 ボタンを 5×2 グリッドに配置するレイアウト
 * （components.md §6 NumericKeypadChoice）。
 *
 * - 1 行目：1 2 3 4 5
 * - 2 行目：6 7 8 9 0
 * - 各ボタン 64×64px（lg）、ラベル 26px Bold tabular-nums
 * - 選択中：黄色 4px 枠
 * - choices.length は 10 を期待。choices の id は文字列だが、ラベルが数字相当の
 *   表示文字列となる（"0", "1", … "9"）
 */
const KeypadTenLayout: React.FC<KeypadTenLayoutProps> = ({
  choices,
  selectedId,
  onSelect,
  ariaLabelGroup,
  disabled,
  buttonSizePx,
  colors,
  resolveDataTargetId,
  testId,
}) => {
  // 上段: 1 2 3 4 5 / 下段: 6 7 8 9 0
  // choices 配列の id でルックアップ
  const findById = React.useCallback(
    (id: string) => choices.find((c) => c.id === id),
    [choices],
  );
  const topRowIds = ['1', '2', '3', '4', '5'];
  const bottomRowIds = ['6', '7', '8', '9', '0'];

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={ariaLabelGroup}
      style={keypadStyles.frame}
      testID={testId}
    >
      {[topRowIds, bottomRowIds].map((rowIds, rowIdx) => (
        <View key={`row-${rowIdx}`} style={keypadStyles.row}>
          {rowIds.map((id) => {
            const c = findById(id);
            if (!c) return null;
            const isSelected = c.id === selectedId;
            return (
              <KeypadButton
                key={id}
                id={c.id}
                label={c.label}
                ariaLabel={c.ariaLabel ?? `数字 ${c.label}`}
                isSelected={isSelected}
                disabled={disabled}
                onPress={() => onSelect(isSelected ? null : c.id)}
                sizePx={buttonSizePx}
                colors={colors}
                dataTargetId={resolveDataTargetId(c.id)}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
};

type KeypadButtonProps = {
  id: string;
  label: string;
  ariaLabel: string;
  isSelected: boolean;
  disabled?: boolean;
  onPress: () => void;
  sizePx: number;
  colors: ReturnType<typeof getColors>;
  dataTargetId?: string;
};

const KeypadButton: React.FC<KeypadButtonProps> = ({
  id,
  label,
  ariaLabel,
  isSelected,
  disabled,
  onPress,
  sizePx,
  colors,
  dataTargetId,
}) => {
  const [focused, setFocused] = React.useState(false);
  const a11yProps = buildChoiceAccessibilityProps({
    role: 'radio',
    label: ariaLabel,
    isSelected,
    disabled,
    platform: Platform.OS === 'web' ? 'web' : 'native',
  });

  const handleKeyDown = React.useCallback(
    (e: { key?: string; preventDefault?: () => void }) => {
      if (disabled) return;
      const key = e.key;
      if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
        e.preventDefault?.();
        onPress();
      }
    },
    [disabled, onPress],
  );

  const webExtraProps =
    Platform.OS === 'web'
      ? {
          onKeyDown: handleKeyDown,
          tabIndex: (disabled ? -1 : 0) as -1 | 0,
        }
      : {};
  // v1.1.1（Sprint 20 ラウンド 3）：Platform.OS ガードを外し、jest 環境（Native）でも
  // props として保持される（テストで `btn.props['data-target-id']` を検証可能）。
  const dataTargetProps = dataTargetId
    ? {
        'data-target-id': dataTargetId,
        dataSet: { targetId: dataTargetId },
      }
    : {};

  // v1.1.1（Sprint 20）：選択中枠を黄 4px → 中性グレー 2px に切替
  const borderWidth = isSelected ? 2 : 1;
  const borderColor = isSelected
    ? colors.selectionSubtle
    : colors.selectionSubtleIdle;

  return (
    <Pressable
      {...a11yProps}
      {...webExtraProps}
      {...dataTargetProps}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      testID={`answer-choice-${id}`}
      style={({ pressed }) => {
        const base: ViewStyle = {
          width: sizePx,
          height: sizePx,
          minWidth: tapTarget.min,
          minHeight: tapTarget.min,
          borderRadius: radius.lg,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.actionSecondary,
          borderWidth,
          borderColor,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          ...(Platform.OS === 'web' && focused
            ? ({
                outlineColor: colors.focusRing,
                outlineWidth: 3,
                outlineStyle: 'solid',
                outlineOffset: 2,
              } as object)
            : {}),
        };
        return base;
      }}
    >
      <Text
        style={{
          color: colors.fgPrimary,
          fontSize: fontSize.bodyLg, // 26px Bold（components.md §6）
          fontWeight: fontWeight.bold as '700',
          fontVariant: ['tabular-nums'],
          textAlign: 'center',
          lineHeight: fontSize.bodyLg,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const keypadStyles = StyleSheet.create({
  frame: {
    flexDirection: 'column',
    alignSelf: 'center',
    gap: spacing.s2,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.s2,
    justifyContent: 'center',
  },
});
