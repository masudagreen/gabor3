# GaborEye V1 — デザインシステム

このドキュメントは GaborEye V1 のデザインシステム全体を定義します。全画面・全コンポーネントが本システムの規範に従います。本書は仕様書 `docs/spec.md` の §1（老眼最適化原則）を**実装上の規範**として組み込み、トークン値・コンポーネント API 仕様を導出します。

---

## 0. デザイン原則（OPT-1〜10 の組み込み）

| ID | 原則 | デザインシステム上の実装 |
|---|---|---|
| **OPT-1** | 大きい文字 | `font.body.min` = **18pt（24px）**、`font.heading.min` = **22pt（29px）**、`font.button` = **18pt（24px）固定** |
| **OPT-2** | 大きいタップ領域 | `tappable.min` = 48pt、`tappable.recommended` = 56pt。Button・ListItem・IconButton の `minHeight` トークンに直結 |
| **OPT-3** | 短い操作シーケンス | レイアウトは「主要 CTA 1 個＋補助 1〜2 個」を基本構成。3 個以上のアクションを 1 画面に並べない |
| **OPT-4** | 読書距離プリセット | `DistanceCalibrator` コンポーネントで 30/40/50cm の 3 ノッチ式を強制 |
| **OPT-5** | 高コントラスト UI | UI テキスト・ボタンは前景／背景コントラスト比 **7:1 以上**（実測ベースで保証）。ガボール刺激領域は別ロジック（中性グレー基準） |
| **OPT-6** | 優しい言い回し | コピーライティング規範を §11 に明示 |
| **OPT-7** | 急かさない | ボタンの自動消失・自動進行はクールダウン／結果サマリ間の自動進行（10 秒以内）以外で禁止。タイムアウト・カウントダウン表示は **22pt（≒30px）以上**（`font.h2` 30px に相当） |
| **OPT-8** | ダークモード必須 | カラートークンを `light` / `dark` の 2 系統で完全並走定義 |
| **OPT-9** | 片眼トレーニング配慮 | アイコンを大型化、点滅アニメ禁止 |
| **OPT-10** | 開始前距離リマインド | `DistanceReminder` 画面コンポーネントを §components.md で定義し、各セッション／ゲーム開始前に必ず挟む |

> **遵守監査ポイント**：本システムを参照する全画面・全コンポーネントは、上記 10 原則の違反が設計上発生し得ない構造（=トークン経由のみ値設定可能）にする。

---

## 1. カラートークン

### 1.1 基本方針

- ダーク／ライト両モード対応。**全 UI テキスト／ボタンのコントラスト比 7:1 以上**を実測ベースで厳守（OPT-5 / NF-8）。
- セマンティックトークン（用途名）→ プリミティブトークン（具体値）の 2 層構造。
- ガボール刺激領域は UI とは別の「中性グレースケールパレット」を使う。
- **本セクションの数値は WebAIM Contrast Checker と同等の WCAG 2.1 算式（相対輝度＋ 0.05 オフセット）で算出した実測値である**。記載値と実装値が一致しない場合は実装側を是正する。

### 1.2 プリミティブトークン

> **Round 3 修正履歴**：以下のトークンは 7:1 厳守のため値を変更しました（before → after）。
> - `palette.brand.primary` light: `#1D5BD8` (5.93:1) → **`#13449D`** (8.97:1)
> - `palette.brand.primaryHover` light: `#1745A6` (8.61:1) → **`#0F3580`** (11.41:1)
> - `palette.brand.accent` light: `#0F8F6E` (4.06:1) → **`#0A6C53`**（surface 上では装飾扱い、テキスト用途では使用禁止）
> - `palette.semantic.error` light: `#B6271F` (6.37:1) → **`#A11C16`** (7.80:1)
> - `palette.semantic.info` light: `#0E5AA6` (7.05:1) → 据え置き
> - `palette.streak.flame` light: `#E07000` (3.24:1) → **`#7A3C00`** (8.49:1 on white / 8.13:1 on canvas) ※ §1.3 の `color.streak.flame` 経由でテキスト/アイコンに使用
> - `palette.neutral.500` dark: `#8A909A` (6.54:1) → **`#9CA3AD`** (8.26:1)
> - `palette.neutral.500` light: `#6E7480` (4.50:1) → **`#4D525C`** (7.84:1 on white / 7.52:1 on canvas)（注釈テキストに使用される `color.fg.muted` の床として 7:1 確保）

| トークン | Light Mode | Dark Mode |
|---|---|---|
| `palette.neutral.0` | `#FFFFFF` | `#000000` |
| `palette.neutral.50` | `#FAFAFA` | `#0B0B0E` |
| `palette.neutral.100` | `#F2F3F5` | `#15171C` |
| `palette.neutral.200` | `#E3E5EA` | `#1F2229` |
| `palette.neutral.300` | `#C9CDD4` | `#2B2F39` |
| `palette.neutral.400` | `#9AA0A8` | `#5C6270` |
| `palette.neutral.500` | `#4D525C` | `#9CA3AD` |
| `palette.neutral.600` | `#4A4F5A` | `#B6BAC2` |
| `palette.neutral.700` | `#2F3239` | `#D4D7DC` |
| `palette.neutral.800` | `#1A1C21` | `#E8EAEE` |
| `palette.neutral.900` | `#0E0F12` | `#F5F6F8` |
| `palette.brand.primary` | `#13449D`（深青） | `#7FB0FF`（明青） |
| `palette.brand.primaryHover` | `#0F3580` | `#A6CBFF` |
| `palette.brand.accent` | `#0A6C53`（落ち着いた緑、装飾専用） | `#4FD9B0` |
| `palette.semantic.success` | `#0F7A4F` | `#5DD3A0` |
| `palette.semantic.warning` | `#7A4300` | `#FFB266` |
| `palette.semantic.error` | `#A11C16` | `#FF8A82` |
| `palette.semantic.info` | `#0E5AA6` | `#7FB0FF` |
| `palette.streak.flame.fg` | `#7A3C00`（テキスト/アイコン用） | `#FFB266` |
| `palette.streak.flame.bg` | `#FFE9D6`（バッジ背景用、装飾） | `#3E2D0A` |
| `palette.gabor.bg` | `#808080` | `#808080` |
| `palette.gabor.fg.high` | `#FFFFFF` | `#FFFFFF` |
| `palette.gabor.fg.low` | `#000000` | `#000000` |
| `palette.gabor.mask` | `#808080`（基準）+ ランダム位相縞 | 同左 |

> **ガボール刺激の中性グレー（#808080）は意図的にライト／ダーク共通**。背景輝度 50% を中心に正弦波で輝度を変調するという仕様（spec.md §6.1）を守る。UI のダーク化はガボール領域外の「枠」「ヘッダー」「ボタン」のみ。

### 1.3 セマンティックトークン

| トークン | 用途 | Light | Dark |
|---|---|---|---|
| `color.bg.canvas` | 画面ベース背景 | `palette.neutral.50` | `palette.neutral.0` |
| `color.bg.surface` | カード／シートの面 | `palette.neutral.0` | `palette.neutral.100` |
| `color.bg.surfaceRaised` | 重ねたサーフェス | `palette.neutral.0` | `palette.neutral.200` |
| `color.bg.gabor` | ガボール表示領域 | `palette.gabor.bg` | `palette.gabor.bg` |
| `color.bg.disclaimer` | 免責文の囲み | `#FFF8E1`（薄黄） | `#3E2D0A` |
| `color.fg.primary` | 主要テキスト | `palette.neutral.900` | `palette.neutral.900` |
| `color.fg.secondary` | 副テキスト | `palette.neutral.600` | `palette.neutral.500` |
| `color.fg.muted` | 注釈・補足（**床 7:1**） | `palette.neutral.500` | `palette.neutral.500` |
| `color.fg.onPrimary` | プライマリボタン上の文字 | `palette.neutral.0` | `palette.neutral.0`（同色） |
| `color.fg.onAccent` | アクセント上の文字 | `palette.neutral.0` | `palette.neutral.900` |
| `color.border.default` | 標準枠線 | `palette.neutral.200` | `palette.neutral.300` |
| `color.border.strong` | 強調枠線・focus | `palette.brand.primary` | `palette.brand.primary` |
| `color.border.input` | 入力欄枠線 | `palette.neutral.300` | `palette.neutral.400` |
| `color.action.primary` | プライマリ CTA 背景 | `palette.brand.primary` | `palette.brand.primary` |
| `color.action.primaryHover` | 同上 hover | `palette.brand.primaryHover` | `palette.brand.primaryHover` |
| `color.action.secondary` | セカンダリ CTA 背景 | `palette.neutral.0` | `palette.neutral.200` |
| `color.action.tertiary` | テキスト型 CTA | 透明 | 透明 |
| `color.focus.ring` | フォーカスリング | `#13449D` 3px outline + 2px offset | `#7FB0FF` 同 |
| `color.streak.flame` | ストリーク炎色（テキスト/アイコン） | `palette.streak.flame.fg` (`#7A3C00`) | `palette.streak.flame.fg` dark (`#FFB266`) |
| `color.streak.flame.bg` | ストリーク背景（装飾） | `palette.streak.flame.bg` (`#FFE9D6`) | `palette.streak.flame.bg` dark (`#3E2D0A`) |
| `color.score.line` | V1 スコア折れ線 | `palette.brand.primary` | `palette.brand.primary` |
| `color.score.point.today` | 当日強調点 | `palette.brand.accent` | `palette.brand.accent` |
| `color.highlight.correct` | 正解ハイライト | `#FFC53D`（黄、装飾枠のみ／テキスト用途禁止） | `#FFD66B`（同） |

### 1.4 コントラスト検証（実測値）

> 算式：WCAG 2.1 相対輝度比 `(L1 + 0.05) / (L2 + 0.05)`。本表の値は WebAIM Contrast Checker と一致する。Round 3 で Designer が Python 検証スクリプトで実測（小数第 2 位丸め）。

| ペア | 実効比 | WCAG | 用途 |
|---|---|---|---|
| `color.fg.primary` (#0E0F12) on `color.bg.canvas` light (#FAFAFA) | **18.36:1** | AAA | 主要テキスト |
| `color.fg.primary` (#F5F6F8) on `color.bg.canvas` dark (#000000) | **19.42:1** | AAA | 主要テキスト |
| `color.fg.onPrimary` (#FFFFFF) on `color.action.primary` light (#13449D) | **8.97:1** | AAA | プライマリボタン文字 |
| `color.fg.onPrimary` on `color.action.primaryHover` light (#0F3580) | **11.41:1** | AAA | ボタン hover |
| `color.fg.onPrimary` (#000000) on `color.action.primary` dark (#7FB0FF) | **9.56:1** | AAA | ダーク時ボタン文字 |
| `color.fg.secondary` (#4A4F5A) on `color.bg.canvas` light | **7.87:1** | AAA | 副テキスト |
| `color.fg.secondary` (#9CA3AD) on `color.bg.canvas` dark | **8.26:1** | AAA | 副テキスト（dark） |
| `color.fg.muted` (#4D525C) on `color.bg.canvas` light | **7.52:1** | AAA | 注釈・補足 |
| `color.fg.muted` (#9CA3AD) on `color.bg.canvas` dark | **8.26:1** | AAA | 注釈・補足（dark） |
| `palette.semantic.error` (#A11C16) on `color.bg.surface` light (#FFFFFF) | **7.80:1** | AAA | エラー文字 |
| `palette.semantic.error` (#FF8A82) on `color.bg.surface` dark (#15171C) | **7.86:1** | AAA | エラー文字（dark） |
| `palette.semantic.warning` (#7A4300) on `color.bg.surface` light | **7.98:1** | AAA | 警告テキスト |
| `palette.streak.flame.fg` (#7A3C00) on `color.bg.surface` light | **8.49:1** | AAA | ストリーク炎色（テキスト/アイコン） |
| `palette.streak.flame.fg` (#FFB266) on `color.bg.surface` dark | **10.09:1** | AAA | ストリーク炎色（dark） |
| `palette.semantic.success` (#0F7A4F) on `color.bg.surface` light | **5.36:1** | AA | success **テキスト用途禁止**※（装飾アイコンのみ可） |
| `palette.brand.accent` (#0A6C53) on `color.bg.surface` light | **6.40:1** | AA | アクセント装飾**テキスト用途禁止**※ |
| `color.fg.onPrimary` (#FFFFFF) on `palette.brand.accent` (#0A6C53) | **6.40:1** | AA | バッジ獲得演出の on-bg 文字（装飾文脈、Bold + 大型化で識別性補強）※ |

※ `semantic.success` (#0F7A4F = 5.36:1) と `brand.accent` (#0A6C53 = 6.40:1) は OPT-5 の 7:1 を満たさない。両色は **装飾用途限定**（バッジ背景・グラフ点・枠線・アイコン塗り）。
- 「成功」をテキストで表現する場合は、本文を `color.fg.primary` の `font.body.bold`、矢印・✨・チェックマークなどの**装飾アイコンのみ** `palette.semantic.success` を使う（Sprint 5 result-summary の「前回より 0.3 度改善」がこのパターン）。
- バッジ獲得演出（`AchievementBadge`、`badge-awarded`）は 1.5 秒の一時表示かつ装飾文脈なので 6.40:1 を許容するが、文字を **Bold + 24px 以上**にして識別性を補強し、同時にバッジアイコン（🏅）を併置することで色のみに依存しない情報伝達を担保する（NF-12）。

> **主要 UI セット（テキスト・ボタン・主要動線）は 7:1 以上を満たす**（OPT-5 / NF-8）。例外（success / accent）は装飾限定で、テキスト用途では使わない運用ルールで担保する。Generator は実装時に「7:1 検証ユニットテスト」を `tests/contrast.spec.ts` に書き、CI で全トークン組み合わせを自動検査することを推奨する。

---

## 2. タイポグラフィ

### 2.1 基本方針（OPT-1）

- システムフォント優先（iOS: SF Pro Text／Android: Roboto／Web: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic UI", sans-serif）
- 日本語の字面は欧文より小さく見える特性があるため、**本文の床は 18pt = 24px（OPT-1）**。ボタン文字も同等以上を強制
- ウェイトは Regular / Medium / Bold の 3 段階のみ（Light や ExtraLight は使わない）
- **重要**：本ドキュメントでは `pt`（DTP ポイント）と `px`（CSS ピクセル）を厳密に区別する。換算は `1pt ≒ 1.333px`（96dpi 前提）。仕様書 spec.md L13 「本文最小 18pt（≒24px）」に整合。

### 2.2 タイプスケール

| トークン | 用途 | font-size (px) | （pt 換算） | line-height | weight | letter-spacing |
|---|---|---|---|---|---|---|
| `font.display` | オンボーディング・成果ハイライト | **48** | 36pt | 1.25 | Bold (700) | -0.5px |
| `font.h1` | 画面タイトル（最大） | **36** | 27pt | 1.3 | Bold (700) | -0.25px |
| `font.h2` | セクション見出し | **30** | 22.5pt | 1.35 | Bold (700) | 0 |
| `font.h3` | サブ見出し | **26** | 19.5pt | 1.4 | Medium (600) | 0 |
| `font.body.lg` | 本文（強調）／ボタン文字 | **26** | 19.5pt | 1.55 | Medium (600) | 0 |
| `font.body` | 本文（標準）／ボタン文字下限 | **24** | 18pt | 1.6 | Regular (400) | 0 |
| `font.body.bold` | 本文（強調） | **24** | 18pt | 1.6 | Bold (700) | 0 |
| `font.caption` | 注釈・タイムスタンプ（**例外、後述**） | **20** | 15pt | 1.5 | Regular (400) | 0 |
| `font.label` | ラベル・タブ | **24** | 18pt | 1.4 | Medium (600) | 0 |
| `font.numeric.xl` | スコア・カウントダウン | **72** | 54pt | 1.0 | Bold (700) tabular-nums | 0 |
| `font.numeric.l` | ストリーク日数 | **48** | 36pt | 1.1 | Bold (700) tabular-nums | 0 |

> Round 3 で `font.body` を 18px → **24px** に是正（OPT-1 / spec.md L13 適合）。同時に見出し系（h1〜h3）と numeric 系も比例して引き上げ、視覚階層を維持。

### 2.3 使用規則

- 本文は最小 **24px（=18pt、OPT-1 強制）**。ボタン文字も最小 24px。
- `font.caption`（20px）は **画面の主要動線から外れた補助情報**（タイムスタンプ、グラフ凡例、フォーム helper text 等）のみで使用可。主要 CTA ラベル・操作テキスト・本文・エラーメッセージには使用禁止。20px = 15pt は OPT-1 の床（18pt）を下回るため、**caption 適用箇所はレビューで根拠を必須**とする。
- 数値（スコア・カウントダウン・閾値）は `tabular-nums` を使い桁ぶれを防ぐ。
- 行間（line-height）は本文 1.6 以上を確保。日本語の漢字濃度を考慮。
- 強調は太字またはサイズアップで行う。色強調はセカンダリ手段（OPT-9 / NF-12）。

---

## 3. スペーシング・グリッド

### 3.1 スペーストークン（4px ベース）

| トークン | 値 | 用途 |
|---|---|---|
| `space.0` | 0 | リセット |
| `space.1` | 4px | 微小ギャップ |
| `space.2` | 8px | アイコン余白 |
| `space.3` | 12px | テキスト行間 |
| `space.4` | 16px | 一般的余白 |
| `space.5` | 24px | カード内パディング標準 |
| `space.6` | 32px | セクション間 |
| `space.7` | 48px | 大きな区切り |
| `space.8` | 64px | 画面区切り |
| `space.9` | 96px | フィーチャー間 |

### 3.2 レイアウトグリッド

#### スマホ縦（375px 基準、最小 360px〜最大 599px）
- 外側余白：`space.4`（16px）
- カード間ギャップ：`space.4`（16px）
- 主要 CTA は画面下部 `space.6`（32px）の余白内に配置
- 推奨コンテンツ最大幅：360px

#### PC 横（1280×800 基準、最小 600px〜最大 1280px）
- 外側余白：`space.7`（48px）
- 主コンテンツ最大幅：720px（中央寄せ）
- 2 カラムレイアウト時：左 320px ナビ／右 720px コンテンツ／余白 24px
- ガボール表示領域は最大 480×480px（表示距離 cpd 計算上の上限）

#### ブレイクポイント
| 名称 | 範囲 | 主用途 |
|---|---|---|
| `bp.sm` | 〜599px | スマホ縦 |
| `bp.md` | 600〜1023px | タブレット縦・小型 PC |
| `bp.lg` | 1024px〜 | PC 横・タブレット横 |

> 仕様 NF-18 に従い 360px〜1280px をサポート。

---

## 4. 角丸・シャドウ・エレベーション

### 4.1 角丸（border-radius）

| トークン | 値 | 用途 |
|---|---|---|
| `radius.xs` | 4px | バッジ・小タグ |
| `radius.sm` | 8px | 入力欄・小ボタン |
| `radius.md` | 12px | カード |
| `radius.lg` | 16px | モーダル・主要ボタン |
| `radius.xl` | 24px | シート上端 |
| `radius.pill` | 999px | ピル型ボタン・トグル |
| `radius.circle` | 50% | 丸ボタン・固視点 |

### 4.2 エレベーション（シャドウ）

ダークモードでは shadow より border の輝度差で深さを表現する（光源前提のシャドウは薄まる）。

| トークン | Light | Dark |
|---|---|---|
| `elevation.0` | none | none |
| `elevation.1` | `0 1px 2px rgba(15,17,21,0.06), 0 1px 1px rgba(15,17,21,0.04)` | `border 1px palette.neutral.300` |
| `elevation.2` | `0 4px 8px rgba(15,17,21,0.08), 0 2px 4px rgba(15,17,21,0.04)` | `border 1px palette.neutral.300` + 微量 shadow |
| `elevation.3` | `0 8px 24px rgba(15,17,21,0.12), 0 4px 8px rgba(15,17,21,0.06)` | `border 1px palette.neutral.400` |
| `elevation.4` | `0 16px 40px rgba(15,17,21,0.18), 0 8px 16px rgba(15,17,21,0.08)` | `border 1px palette.neutral.500` |

---

## 5. モーション・トランジション

### 5.1 基本方針

- **点滅・フラッシュ厳禁**（NF-11 / OPT-9）
- 画面遷移は 200ms 以内（NF-2）
- ガボール描画は 60fps 目標、最低 30fps（NF-1）
- `prefers-reduced-motion: reduce` を尊重し、装飾アニメは即時化

### 5.2 デュレーショントークン

| トークン | 値 | 用途 |
|---|---|---|
| `motion.duration.instant` | 0ms | reduced-motion |
| `motion.duration.fast` | 120ms | hover、押下 |
| `motion.duration.base` | 200ms | 画面遷移、モーダル開閉 |
| `motion.duration.slow` | 320ms | シート展開 |
| `motion.duration.gameFeedback` | 1500ms | 結果ハイライト（拡大） |
| `motion.duration.gameMaskInterval` | 200ms | マスク提示時間（仕様固定） |

### 5.3 イージング

| トークン | 値 | 用途 |
|---|---|---|
| `motion.easing.standard` | `cubic-bezier(0.2, 0.0, 0.0, 1.0)` | 標準遷移 |
| `motion.easing.decelerate` | `cubic-bezier(0.0, 0.0, 0.2, 1.0)` | 入場 |
| `motion.easing.accelerate` | `cubic-bezier(0.4, 0.0, 1.0, 1.0)` | 退場 |
| `motion.easing.linear` | `linear` | ガボールモーフィング |

### 5.4 主要モーション仕様

- **正解ハイライト（F-11）**：1.5 秒間 `transform: scale(1.0 → 1.18 → 1.0)` をイージング `decelerate`、点滅・blink は禁止。代わりに枠色を `color.highlight.correct` に変化させる。
- **バッジ獲得演出（F-14）**：1.5 秒、`scale(0.6 → 1.0)` の弾性を弱め（overshoot 5% 以下）、フラッシュ無し。
- **ストリーク+1 演出**：数値カウントアップを 600ms で実行。サウンドは設定 ON 時のみ。
- **画面遷移**：右進行は左 → 右、戻りはその逆。フェード 200ms。

---

## 6. アイコン・イラスト方針

### 6.1 アイコン
- **サイズ**：16 / 20 / 24 / 32 / 48px の 5 段階
- 操作系アイコン（戻る／設定／閉じる）は最小 24px、タップ領域 48pt 以上を確保
- ストロークは 2px、太め（老眼配慮）
- ピクトグラム化された幾何形を優先。装飾的なフラットイラストは控える
- **必須セット**：home, play, pause, settings, close, back, info, eye, eye-cover-left, eye-cover-right, chart, badge, flame（ストリーク）, check, alert, distance（人と画面の絵）, clock, target, refresh, trash

### 6.2 イラスト
- 線画＋単色塗り。色は brand.primary / accent / neutral の 3 種以内
- 「画面から N cm 離れる」「片眼を覆う」「遠くを見る（クールダウン）」の 3 シチュエーション用イラストを共通アセット化
- 表情のあるキャラクターは入れない（医療っぽさを出さない・ふざけ過ぎない）

### 6.3 動画・GIF
- ローディングスピナー以外、装飾アニメ用 GIF/Lottie は使用しない（OPT-9）

---

## 7. ガボール表示領域パレット（中性グレー）

ガボール刺激は本来「物理輝度を制御する刺激」であり、UI の配色とは独立に管理する。

| トークン | 値 | 用途 |
|---|---|---|
| `gabor.bg.luminance` | 50%（#808080） | 背景輝度（ライト・ダーク共通） |
| `gabor.contrast.range` | 0.15〜0.6 | コントラスト範囲（spec.md §6.1）|
| `gabor.envelope.sigmaRange` | 0.3°〜1.0° | ガウス窓 SD（視野角） |
| `gabor.fixation.color.light` | `#000000` | 固視点（明背景非対象、グレー上は黒） |
| `gabor.fixation.color.dark` | `#000000` | 同上（グレー上では一律黒） |
| `gabor.fixation.size` | 0.5° | 固視点十字サイズ（spec.md §7.3） |
| `gabor.frame.padding` | 24px | ガボール領域の外周マージン |
| `gabor.frame.bg` | グレー領域は UI bg と同じにせず明確に分離 | 領域認知を助ける |

> **重要**：ガボール表示エリアの背景は OS のダークモードに**追従しない**。常に #808080（中性グレー）で固定する。物理コントラスト計算の前提（背景輝度 = 50%）を崩さないため。

---

## 8. インタラクション状態

### 8.1 全インタラクティブ要素の必須状態

| 状態 | 視覚的差異 |
|---|---|
| `default` | トークンに従う初期表示 |
| `hover`（PC のみ） | 背景を 1 段濃く／淡く（`palette.brand.primaryHover` 等） |
| `pressed/active` | 背景を 2 段変化＋ scale(0.98) |
| `disabled` | opacity 0.5、cursor not-allowed、aria-disabled |
| `focus-visible` | 3px outline `color.focus.ring` ＋ 2px offset。**全インタラクティブ要素必須**（NF-9） |
| `loading` | 内容を保持したまま spinner を上重ね、操作禁止 |

### 8.2 タップ・キーボード等価

- 全ボタンは Enter / Space で起動可能
- グリッド型 UI（Game 1）は矢印キーで移動可（Web 版必須）
- フォームのトグルは Space で切替

---

## 9. アクセシビリティ規範（システムレベル）

### 9.1 ARIA・ラベル

- 全インタラクティブ要素に `aria-label` または可視テキスト
- アイコンのみのボタンは `aria-label` 必須
- モーダルは `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- ライブ領域（カウントダウン等）は `aria-live="polite"`、点滅しない更新

### 9.2 フォーカス管理

- モーダル開時：最初のインタラクティブ要素にフォーカス
- モーダル閉時：起動元要素に戻す
- フォーカスは `outline-color` だけで示さない（形・位置でも判別）

### 9.3 スクリーンリーダー専用文言

| 場所 | 読み上げテキスト例 |
|---|---|
| ホーム CTA | 「3 分コースを始める。本日のトレーニングを開始します」 |
| ガボール領域（Game 2） | 「縞模様の 1 枚目が表示されています。続けて 2 枚目が表示されます」 |
| カウントダウン | 「残り 8 秒」（ポーリング 1 秒間隔、polite） |
| 結果サマリ | 「正答率 78 パーセント、今回の閾値は 4.2 度。前回より 0.3 度改善しました」 |

### 9.4 動きへの配慮

- `prefers-reduced-motion: reduce` 環境ではガボールモーフィングは「ステップ提示」に切り替える（30fps 連続変化 → 5 段階階段状）。これは Game 1 ロジックの分岐として Generator が実装する
- 結果ハイライトの拡大は維持（拡大は許容、点滅は不可）

---

## 10. レスポンシブ規範

### 10.1 スマホ縦（360〜599px）
- 1 カラム
- 主要 CTA は画面下部から `space.6` 上に固定
- ナビは下部 tab か上部 header の二択（本プロダクトは「設定アイコンのみ右上」「ホームに戻るは左上戻る矢印」のシンプル方式）

### 10.2 タブレット縦・PC（600〜1280px）
- 中央寄せ最大幅 720px
- ガボール領域はビューポートの短辺の 60% を上限としてスケール
- フォントサイズはスマホとほぼ同等（OPT-1 を理由に PC で大幅増にしない、視聴距離前提のため）

### 10.3 セーフエリア
- iOS のノッチ／ホームバーを回避（top safe area + 16px、bottom safe area + 16px）
- Web 版でも `env(safe-area-inset-*)` を尊重

---

## 11. コピーライティング規範（OPT-6）

### 11.1 推奨表現
- 「鍛える」よりも「ならす／ほぐす」
- 「治す」「改善する」「回復する」は使わない（薬機法配慮）
- 「視力」より「見え方の感じ」
- 数値（V1 スコア）は「医療スコアではありません」と必ず注記

### 11.2 専門用語の扱い
- 「ガボール」「V1」「staircase」「2AFC」「odd one」を画面に出す場合は括弧書きで日常語を併記
  - 例：「ガボール（縞模様）」「V1 スコア（このアプリ独自の点数）」

### 11.3 ボタン文言
- 動詞＋目的の形（「3 分コースを始める」「設定を保存する」「同意する」「もう一度」）
- 英語混在は避ける（「OK」「Cancel」より「はい」「いいえ」）
- 例外：「Game 1 / 2 / 3」は短く伝えるため許容（必ず日本語名を併記する：「Game 1（変化察知）」）

### 11.4 エラー・警告
- 否定文より肯定文：「同意していません」より「同意のチェックを入れてください」
- 解決策を必ず併記

---

## 12. ロケール／日付

- 日本語のみ
- 日付フォーマット：`M月D日（曜）` （例：4月29日（火））、グラフ軸は `M/D`
- 週は ISO 週（月曜開始）
- 時間表示：24 時間制

---

## 13. データ可視化規範

### 13.1 折れ線グラフ（V1 スコア）
- 軸ラベルは `font.label`（24px Medium）
- グリッド線は `palette.neutral.200` の細線、強調は不要
- データ点は半径 6px、当日のみ半径 10px ＋ `color.score.point.today`
- 0〜100 固定スケール、Y 軸目盛は 0/25/50/75/100
- データ欠損日はラインを切る（補間しない）
- 7 日未満時のメッセージは `font.body`（24px）で重畳

### 13.2 数値強調表示
- 大きい数字（スコア・連続日数）は `font.numeric.xl` / `font.numeric.l`
- 数字の左右に単位を必ず併記（「4.2 度」「23 日」「78 点」）

---

## 14. ガボール描画コンポーネント API（システム層の規範）

詳細実装は `components.md` で。ここでは「全画面で守るべき呼び出し API シグネチャ」を提示する。

```ts
type GaborPatchProps = {
  // 物理パラメータ（spec.md §6.1 範囲）
  cpd: 1.5 | 3 | 6 | 9;             // 空間周波数
  contrast: number;                  // 0.15〜0.6
  orientationDeg: number;            // 0〜180（0=水平、90=垂直）
  phaseRad: number;                  // 0〜2π
  sigmaDeg: number;                  // 0.3〜1.0（ガウス窓 SD、視野角）

  // レンダリング制御
  sizePx: number;                    // 描画キャンバス辺長（cpd と sigma から導出）
  pixelDensity: number;              // dpr 補正
  viewingDistanceCm: 30 | 40 | 50;  // キャリブレーション値

  // a11y
  ariaLabel?: string;                // 既定「縞模様の刺激」
  testId?: string;                   // テスト用
};

type GaborRenderEngine = "canvas2d" | "webgl" | "skia";
```

すべての画面でガボールを描画する場合は `<GaborPatch />` コンポーネント経由で呼び出し、生 Canvas を画面に直接描画してはならない（一貫性とテスト容易性）。

---

## 15. アセット命名規約

```
assets/
  icons/                  // SVG、24px 基準で出力
    home.svg
    settings.svg
    eye-cover-left.svg
    flame.svg
    ...
  illustrations/
    distance-30cm.svg
    distance-40cm.svg
    distance-50cm.svg
    eye-cover.svg
    cooldown-far.svg
  badges/
    b-01-first-step.svg
    ...
    b-08-all-improve.svg
```

---

## 16. ダークモード切替

- 設定値：`system` / `light` / `dark`（spec.md §10.1）
- `system` 時は `prefers-color-scheme` を尊重
- 切替時のフラッシュ防止：CSS variables で `data-theme` 属性切替＋ 200ms クロスフェード
- ガボール表示領域は切替対象外（常にグレー）

---

## 17. アンチパターン（やってはいけないこと）

- **OPT-1 未満（24px = 18pt 未満）の本文・ボタンテキスト**（注釈用 `font.caption` 20px は §2.3 の制約下でのみ許容）
- 32pt（≒43px）未満のタップ領域、または 48px 未満の `minHeight`（OPT-2 違反）
- 自動でフェードアウトするボタン（OPT-7 違反）
- 点滅・フラッシュアニメ（NF-11 / OPT-9 違反）
- ガボール背景を OS のダーク化に追従させる（物理計算前提が崩れる）
- 色のみで状態を伝える（NF-12 違反）
- 「視力 0.X」「治る」「効果あり」と断言する文言（A-1 / 11.1 違反）
- 1 画面に主要 CTA を 3 個以上並べる（OPT-3 違反）
- **コントラスト比 7:1 未満のテキストトークン使用**（OPT-5 / NF-8 違反、§1.4 で 7:1 を満たさないトークンは装飾用途に限定する運用）

---

## 18. システムバージョン

- v1.0（凍結対象）
- 後続変更は Designer amendment モードで実施
