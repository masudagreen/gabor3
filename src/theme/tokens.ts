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
    neutral50: '#FAFAFA',
    neutral100: '#F2F3F5',
    neutral200: '#E3E5EA',
    neutral300: '#C9CDD4',
    neutral400: '#9AA0A8',
    neutral500: '#4D525C', // 7.84:1 on white（OPT-5 床）
    neutral600: '#4A4F5A', // 7.87:1 on canvas
    neutral700: '#2F3239',
    neutral800: '#1A1C21',
    neutral900: '#0E0F12', // 18.36:1 on canvas
    brandPrimary: '#13449D', // 8.97:1 (AAA)
    brandPrimaryHover: '#0F3580', // 11.41:1
    brandAccent: '#0A6C53', // 装飾専用
    semanticSuccess: '#0F7A4F', // 装飾専用（5.36:1）
    semanticWarning: '#7A4300', // 7.98:1
    semanticError: '#A11C16', // 7.80:1
    semanticInfo: '#0E5AA6',
    streakFlameFg: '#7A3C00', // 8.49:1
    streakFlameBg: '#FFE9D6',
    disclaimerBg: '#FFF8E1',
    highlightCorrect: '#FFC53D',
  },
  dark: {
    neutral0: '#000000',
    neutral50: '#0B0B0E',
    neutral100: '#15171C',
    neutral200: '#1F2229',
    neutral300: '#2B2F39',
    neutral400: '#5C6270',
    neutral500: '#9CA3AD', // 8.26:1
    neutral600: '#B6BAC2',
    neutral700: '#D4D7DC',
    neutral800: '#E8EAEE',
    neutral900: '#F5F6F8',
    brandPrimary: '#7FB0FF',
    brandPrimaryHover: '#A6CBFF',
    brandAccent: '#4FD9B0',
    semanticSuccess: '#5DD3A0',
    semanticWarning: '#FFB266',
    semanticError: '#FF8A82',
    semanticInfo: '#7FB0FF',
    streakFlameFg: '#FFB266',
    streakFlameBg: '#3E2D0A',
    disclaimerBg: '#3E2D0A',
    highlightCorrect: '#FFD66B',
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
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
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
