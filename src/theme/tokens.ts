/**
 * GaborEye Design Tokens (Designer 確定値、system.md / components.md に基づく)。
 *
 * 凍結対象。変更は Designer amendment フロー経由で行う（CLAUDE.md §3）。
 *
 * 主要原則：
 * - OPT-1：本文 24px (=18pt) 床、ボタン文字 24px 床
 * - OPT-2：タップ領域 48pt 以上、ボタン推奨 56pt
 * - OPT-5 / NF-8：UI テキスト・ボタンのコントラスト比 7:1 以上（実測値は system.md §1.4）
 * - OPT-8：ライト／ダーク両対応
 */

// ---------------------------------------------------------------------------
// 1. プリミティブカラー（system.md §1.2）
// ---------------------------------------------------------------------------

export const palette = {
  light: {
    neutral0: '#FFFFFF',
    neutral50: '#F8F9FB',
    neutral100: '#F0F2F5',
    neutral200: '#E3E5EA',
    neutral300: '#C9CDD4',
    neutral400: '#9AA0A8',
    neutral500: '#4D525C',
    neutral600: '#4A4F5A',
    neutral700: '#2F3239',
    neutral800: '#1A1C21',
    neutral900: '#0E0F12',
    brandPrimary: '#4F46E5', // Vibrant Indigo
    brandPrimaryHover: '#4338CA',
    brandAccent: '#E11D48', // Vibrant Rose
    semanticSuccess: '#10B981', // Emerald
    semanticWarning: '#F59E0B', // Amber
    semanticError: '#EF4444', // Red
    semanticInfo: '#3B82F6', // Blue
    streakFlameFg: '#EA580C', 
    streakFlameBg: '#FFEDD5',
    disclaimerBg: '#FEF3C7',
    highlightCorrect: '#FBBF24',
  },
  dark: {
    neutral0: '#000000',
    neutral50: '#0B0C10', // Deep Cyberpunk Black
    neutral100: '#12131A',
    neutral200: '#1F222E',
    neutral300: '#2B2F3E',
    neutral400: '#5C6270',
    neutral500: '#9CA3AD',
    neutral600: '#B6BAC2',
    neutral700: '#D4D7DC',
    neutral800: '#E8EAEE',
    neutral900: '#F5F6F8',
    brandPrimary: '#00E5FF', // Neon Cyan
    brandPrimaryHover: '#00B8CC',
    brandAccent: '#FF007F', // Neon Pink
    semanticSuccess: '#34D399',
    semanticWarning: '#FBBF24',
    semanticError: '#F87171',
    semanticInfo: '#60A5FA',
    streakFlameFg: '#FBBF24',
    streakFlameBg: '#451A03',
    disclaimerBg: '#451A03',
    highlightCorrect: '#FDE047',
  },
  // ガボール表示領域は OS のダークモード非追従（system.md §1.2 末尾）
  gabor: {
    bg: '#808080',
    fixation: '#000000',
  },
} as const;

// ---------------------------------------------------------------------------
// 2. セマンティックカラー（system.md §1.3）
// ---------------------------------------------------------------------------

export type ThemeMode = 'light' | 'dark';

/**
 * ダークモードのユーザー設定（Settings.darkMode）。
 * v2.0：theme を自己完結させるため、ここを正とする
 * （旧 v1 storage から移設。S2 の v2 Settings 型はこれを再エクスポートする）。
 */
export type DarkModePreference = 'system' | 'light' | 'dark';

export type Colors = {
  bgCanvas: string;
  bgSurface: string;
  bgSurfaceRaised: string;
  bgGabor: string;
  bgDisclaimer: string;
  fgPrimary: string;
  fgSecondary: string;
  fgMuted: string;
  fgOnPrimary: string;
  fgOnAccent: string;
  borderDefault: string;
  borderStrong: string;
  borderInput: string;
  actionPrimary: string;
  actionPrimaryHover: string;
  actionSecondary: string;
  focusRing: string;
  highlightCorrect: string;
  semanticError: string;
  semanticWarning: string;
  semanticSuccess: string;
  // v2.0：ストリーク炎アイコン前景（system.md §1.3、StatTile ST-1）
  streakFlameFg: string;
  streakFlameBg: string;
  // v1.1.1：選択枠を控えめにする（components.md §3 / §4、system.md §1.8）
  selectionSubtle: string;
  selectionSubtleIdle: string;
  // v1.1.1：結果開示の ◯/✕ アイコン色（design-v11/sprints/sprint-20/screens.md §14）
  successFg: string;
  dangerFg: string;
  // v1.1.1：ResultOverlay の MarkBadge 円形背景（半透明）
  overlayResultBg: string;
  // 後方互換用エイリアス（既存コード向け）
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
};

export function getColors(mode: ThemeMode): Colors {
  const p = palette[mode];
  const bgCanvas = mode === 'light' ? p.neutral50 : p.neutral0;
  const bgSurface = mode === 'light' ? p.neutral0 : p.neutral100;
  const bgSurfaceRaised = mode === 'light' ? p.neutral0 : p.neutral200;
  const fgPrimary = p.neutral900;
  const fgSecondary = mode === 'light' ? p.neutral600 : p.neutral500;
  const fgMuted = p.neutral500;
  const fgOnPrimary = p.neutral0;
  const fgOnAccent = mode === 'light' ? p.neutral0 : p.neutral900;

  return {
    bgCanvas,
    bgSurface,
    bgSurfaceRaised,
    bgGabor: palette.gabor.bg,
    bgDisclaimer: p.disclaimerBg,
    fgPrimary,
    fgSecondary,
    fgMuted,
    fgOnPrimary,
    fgOnAccent,
    borderDefault: p.neutral200,
    borderStrong: p.brandPrimary,
    borderInput: mode === 'light' ? p.neutral300 : p.neutral400,
    actionPrimary: p.brandPrimary,
    actionPrimaryHover: p.brandPrimaryHover,
    actionSecondary: mode === 'light' ? p.neutral0 : p.neutral200,
    focusRing: p.brandPrimary,
    highlightCorrect: p.highlightCorrect,
    semanticError: p.semanticError,
    semanticWarning: p.semanticWarning,
    semanticSuccess: p.semanticSuccess,
    streakFlameFg: p.streakFlameFg,
    streakFlameBg: p.streakFlameBg,
    // v1.1.1：中性グレー、選択枠は線幅 2px / 1px で控えめに
    // ライト：rgba(60,64,72,0.55) 選択中 / rgba(60,64,72,0.30) 未選択
    // ダーク：rgba(220,224,232,0.55) 選択中 / rgba(220,224,232,0.30) 未選択
    selectionSubtle:
      mode === 'light' ? 'rgba(60,64,72,0.55)' : 'rgba(220,224,232,0.55)',
    selectionSubtleIdle:
      mode === 'light' ? 'rgba(60,64,72,0.30)' : 'rgba(220,224,232,0.30)',
    // v1.1.1：◯ は緑、✕ は赤（screens.md §14、AAA 準拠）
    successFg: mode === 'light' ? '#1F7A3A' : '#54C77A',
    dangerFg: mode === 'light' ? '#A12727' : '#F4807F',
    // v1.1.1：MarkBadge 円形背景は 82% 不透明（縞を完全には覆わない）
    overlayResultBg:
      mode === 'light' ? 'rgba(255,255,255,0.82)' : 'rgba(20,24,32,0.82)',
    // 旧エイリアス
    background: bgCanvas,
    surface: bgSurface,
    text: fgPrimary,
    textMuted: fgMuted,
    primary: p.brandPrimary,
    primaryText: fgOnPrimary,
    border: p.neutral200,
    success: p.semanticSuccess,
    warning: p.semanticWarning,
    danger: p.semanticError,
  };
}

// ---------------------------------------------------------------------------
// 3. タイポグラフィ（system.md §2.2）
// ---------------------------------------------------------------------------

/**
 * フォントサイズ（px、システムは dp 換算）。
 * OPT-1：本文・ボタン 24px 床、見出し 26px 以上、タイムアウト表示 30px 以上。
 */
export const fontSize = {
  display: 48,
  h1: 36,
  h2: 30,
  h3: 26,
  bodyLg: 26, // 本文強調 / lg ボタン
  body: 24, // 本文・ボタン下限（OPT-1 床）
  bodyBold: 24,
  caption: 20, // 注釈のみ（主要動線禁止）
  label: 24,
  numericXl: 72,
  numericL: 48,
  // 旧エイリアス（後方互換）
  heading: 30,
  title: 36,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '600',
  semibold: '600',
  bold: '700',
} as const;

export const lineHeight = {
  display: 1.25,
  h1: 1.3,
  h2: 1.35,
  h3: 1.4,
  body: 1.6,
  bodyLg: 1.55,
  caption: 1.5,
  numeric: 1.0,
} as const;

// ---------------------------------------------------------------------------
// 4. スペース（system.md §3.1）
// ---------------------------------------------------------------------------

export const spacing = {
  s0: 0,
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 24,
  s6: 32,
  s7: 48,
  s8: 64,
  s9: 96,
  // 旧エイリアス
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// ---------------------------------------------------------------------------
// 5. 角丸・タップ領域・モーション（system.md §4, §5, §3.1）
// ---------------------------------------------------------------------------

export const radius = {
  xs: 6,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

/**
 * タップ領域（OPT-2）：最小 48dp、推奨 56dp。
 * Button.lg = 64、Button.md = 56。
 */
export const tapTarget = {
  min: 48,
  recommended: 56,
  buttonMd: 56,
  buttonLg: 64,
  listItem: 72,
  iconButton: 48,
} as const;

export const motion = {
  durationInstant: 0,
  durationFast: 120,
  durationBase: 200,
  durationSlow: 320,
  durationGameFeedback: 1500,
  durationGameMaskInterval: 200,
} as const;

// ---------------------------------------------------------------------------
// 6.5. v1.2 統一カウントダウン UI トークン（system.md §1.11）
// ---------------------------------------------------------------------------

/**
 * F-07.1 統一カウントダウン UI 色トークン（v1.2 新規、system.md §1.11.1）。
 *
 * F-07 / F-15 / F-16 / F-10 共通：
 *   - normal：通常時（残り 6 秒以上） → 白
 *   - warn：≤5 秒 → 鮮黄
 *   - danger：≤3 秒 → 明赤（design-qa amendment で `#FF8A82` に変更、AAA 7.0:1）
 *
 * 補強表現：色変化に加え weight（Bold 700 → Black 900）と tabular-nums を併用。
 * 点滅エフェクトは禁止（NF-11）。
 */
export const countdownColors = {
  normal: '#FFFFFF',
  warn: '#FFD600',
  danger: '#FF8A82',
  /** ライトテーマで明背景上に置く場合の代替。通常はゲーム画面の dark surface 上 */
  normalOnLight: '#1A1D24',
  dangerOnLight: '#B91C1C',
} as const;

/**
 * F-10 結果オーバーレイの試行全体総合 ✅/❌ 用カラー（v1.2 新規、system.md §1.19）。
 *
 * design-qa amendment：白文字 ✓/✕ とのコントラスト 7:1 以上（AAA）を満たす：
 *   - light success #0A6238 + white = 7.45:1
 *   - light danger  #A82018 + white = 7.28:1
 *   - dark  success #3FCB7E + black = 10.05:1
 *   - dark  danger  #FF6E73 + black = 7.73:1
 */
export const resultBadgeColors = {
  light: {
    successBg: '#0A6238',
    dangerBg: '#A82018',
    fgOnSuccess: '#FFFFFF',
    fgOnDanger: '#FFFFFF',
  },
  dark: {
    successBg: '#3FCB7E',
    dangerBg: '#FF6E73',
    fgOnSuccess: '#000000',
    fgOnDanger: '#000000',
  },
} as const;

// ---------------------------------------------------------------------------
// 6.6. v2.0 ゲーム描画・結果開示トークン（system.md §1.4、S4）
// ---------------------------------------------------------------------------

/**
 * v2.0 カウントダウン色（system.md §1.4、不透明バー背景前提で 7:1 担保）。
 *
 * GameTopBar は不透明背景 `bg`（light #FFFFFF / dark #15171C）の上にカウントダウン
 * を置く。その背景に対する 7:1 検証値（system.md §1.5）：
 *   - dark：white 17.93 / warn #FFD600 12.70 / danger #FF8A82 7.86
 *   - light：normal 黒 18.4 / warn・danger 暗赤 #A11C16 7.80
 * 明背景では黄が 7:1 を割るため warn/danger とも暗赤を使う（色＋太字補強、NF-12）。
 */
export const countdownV2 = {
  light: {
    bg: '#FFFFFF',
    normal: '#0E0F12',
    warn: '#A11C16',
    danger: '#A11C16',
  },
  dark: {
    bg: '#15171C',
    normal: '#FFFFFF',
    warn: '#FFD600',
    danger: '#FF8A82',
  },
} as const;

/**
 * v2.0 結果開示の色（system.md §1.4、OV-1〜3）。
 * - check.tp：✅ 実線・不透明 / check.fn：✅ 透過 50%（取りこぼし） / cross.fp：❌
 * - overlayBg：アイコン下の半透明円（縞を完全には隠さない）
 * - aggregate：刺激領域直下の総合 ✅/❌（白/黒文字 7:1 以上）
 */
export const resultV2 = {
  light: {
    checkTp: '#0A6238',
    checkFn: '#0A6238',
    crossFp: '#A82018',
    overlayBg: 'rgba(255,255,255,0.82)',
    aggregateSuccessBg: '#0A6238',
    aggregateDangerBg: '#A82018',
    aggregateFg: '#FFFFFF',
  },
  dark: {
    checkTp: '#3FCB7E',
    checkFn: '#3FCB7E',
    crossFp: '#FF6E73',
    overlayBg: 'rgba(20,24,32,0.82)',
    aggregateSuccessBg: '#3FCB7E',
    aggregateDangerBg: '#FF6E73',
    aggregateFg: '#000000',
  },
} as const;

/**
 * v2.0 ガボール直接選択枠（system.md §1.4 / GG-2）。
 * 縞の視認を阻害しない控えめさ。選択中 2px、未選択 1px（任意）。
 */
export const selectionV2 = {
  light: {
    subtle: 'rgba(60,64,72,0.85)',
    idle: 'rgba(60,64,72,0.30)',
  },
  dark: {
    subtle: 'rgba(235,238,242,0.90)',
    idle: 'rgba(235,238,242,0.35)',
  },
} as const;

// ---------------------------------------------------------------------------
// 6. ガボール表示領域（system.md §7）
// ---------------------------------------------------------------------------

export const gabor = {
  bgLuminance: '#808080',
  contrastMin: 0.15,
  contrastMax: 0.6,
  sigmaDegMin: 0.3,
  sigmaDegMax: 1.0,
  fixationColor: '#000000',
  fixationSizeDeg: 0.5,
  framePadding: 24,
} as const;
