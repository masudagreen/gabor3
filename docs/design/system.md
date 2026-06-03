# GaborEye v2.0 — デザインシステム

> **位置づけ**：本書は v2.0（大規模リブート）のデザインシステムの **新しいソース・オブ・トゥルース** です。仕様書 `docs/spec.md`（v2.0）に 1 対 1 で対応します。
> v1.2 のデザイン（`docs/design-v11/`）は参考にしてよいが踏襲義務はありません。v2.0 は **下タブ 3 構成（ホーム / 履歴 / 設定）+ 単一の変化検出ゲーム** へ全面再設計です。
> 本書は自己完結しています（旧 system.md を読まなくても本書だけで実装トークンが揃う）。トークン値の一部は v1 / v1.2 で 7:1 検証済みのものを継承しています。

---

## 0. デザイン原則（老眼配慮 OPT-1〜12 の組み込み）

v2.0 は老眼層（40 代以上）を主対象とする。下表の原則は全画面・全コンポーネントが構造的に満たす（トークン経由のみ値設定可能とし、違反が起こり得ない構造にする）。

| ID | 原則 | v2.0 デザイン上の実装 |
|---|---|---|
| **OPT-1** | 大きい文字 | 本文最小 `18pt`（= 24px）。`font.body.min = 24px`、ボタン文字も 24px 以上。グラフ軸ラベル 18pt 以上 |
| **OPT-2** | 大きいタップ領域 | `tappable.min = 48pt`、`tappable.recommended = 56pt`。CTA・設定行・ダイアログボタンは 56pt 以上 |
| **OPT-3** | 短い操作シーケンス | 1 画面の主要 CTA は 1 個。オンボーディングは 6 タップ以下（F-06） |
| **OPT-4** | 読書距離プリセット | 視聴距離 30/40/50cm の 3 択（設定／オンボ） |
| **OPT-5** | 高コントラスト UI | UI テキスト・ボタンの前景/背景コントラスト比 **7:1 以上**（実測ベース、NF-8）。ガボール刺激領域は中性グレー基準で別ロジック |
| **OPT-6** | 優しい言い回し | コピーライティング規範（§13） |
| **OPT-7** | 急かさない | ボタン自動消失なし。自動進行は距離リマインドのカウントダウンと採点後の短インターバルのみ |
| **OPT-8** | ダークモード必須 | 全カラートークンを light / dark 2 系統で並走定義（OS 連動/明/暗の 3 択、F-13） |
| **OPT-9** | 片眼トレーニング配慮 | 片眼ガイダンス（off/左/右/交互）。点滅アニメ全面禁止（NF-11） |
| **OPT-10** | 開始前距離リマインド | 距離リマインド画面を起動フローに必ず挟む（F-06）。カウントダウン自動進行 |
| **OPT-11（v2 改訂）** | 急かさないが好みで早期締切可 | 旧「60 秒固定・早期終了不可」を廃止。**m 秒可変 + 3 採点方式（F-02）** に置換。方式②の確定・方式③の全問正解で早期締切可 |
| **OPT-12（v2 改訂）** | 共通注視フォーマット | 新ゲーム 1 種に合わせ改訂。共通項は「m 秒のラウンド・パッチ直接タップ選択・試行中は正誤フィードバックなし・採点後 ✅/❌ 開示」 |

---

## 1. カラートークン

### 1.1 基本方針
- light / dark 両モード完全並走。全 UI テキスト/ボタンのコントラスト比 **7:1 以上**を実測ベースで厳守（OPT-5 / NF-8）。
- セマンティックトークン（用途名）→ プリミティブトークン（具体値）の 2 層構造。
- ガボール刺激領域は UI とは別の「中性グレースケールパレット」（背景 #808080 固定）。
- 値は WCAG 2.1 相対輝度比 `(L1 + 0.05) / (L2 + 0.05)`（WebAIM 一致）で算出した実測値。記載値と実装値が食い違う場合は実装側を是正する。Generator は `tests/contrast.spec.ts` で全組み合わせを自動検査することを推奨。

### 1.2 プリミティブトークン

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

> **ガボール刺激の中性グレー（#808080）は light / dark 共通**。背景輝度 50% を中心に正弦波で輝度変調する仕様を守る。UI のダーク化はガボール領域外（枠・ヘッダー・ボタン・タブ）のみ。

### 1.3 セマンティックトークン

| トークン | 用途 | Light | Dark |
|---|---|---|---|
| `color.bg.canvas` | 画面ベース背景 | `palette.neutral.50` | `palette.neutral.0` |
| `color.bg.surface` | カード/シート/タブバーの面 | `palette.neutral.0` | `palette.neutral.100` |
| `color.bg.surfaceRaised` | 重ねたサーフェス | `palette.neutral.0` | `palette.neutral.200` |
| `color.bg.gabor` | ガボール表示領域 | `palette.gabor.bg` | `palette.gabor.bg` |
| `color.bg.disclaimer` | 免責文の囲み | `#FFF8E1`（薄黄） | `#3E2D0A` |
| `color.bg.scrim` | ダイアログ背後の暗幕 | `rgba(0,0,0,0.55)` | `rgba(0,0,0,0.70)` |
| `color.fg.primary` | 主要テキスト | `palette.neutral.900` | `palette.neutral.900` |
| `color.fg.secondary` | 副テキスト | `palette.neutral.600` | `palette.neutral.500` |
| `color.fg.muted` | 注釈・補足（**床 7:1**） | `palette.neutral.500` | `palette.neutral.500` |
| `color.fg.onPrimary` | プライマリボタン上の文字 | `palette.neutral.0`（白） | `palette.neutral.0`（黒） |
| `color.fg.onAccent` | アクセント上の文字 | `palette.neutral.0` | `palette.neutral.900` |
| `color.border.default` | 標準枠線 | `palette.neutral.200` | `palette.neutral.300` |
| `color.border.strong` | 強調枠線 | `palette.brand.primary` | `palette.brand.primary` |
| `color.border.input` | 入力欄/スライダートラック枠 | `palette.neutral.300` | `palette.neutral.400` |
| `color.action.primary` | プライマリ CTA 背景 | `palette.brand.primary` | `palette.brand.primary` |
| `color.action.primaryHover` | 同 hover/pressed | `palette.brand.primaryHover` | `palette.brand.primaryHover` |
| `color.action.secondary` | セカンダリ CTA 背景 | `palette.neutral.0` + border | `palette.neutral.200` |
| `color.action.tertiary` | テキスト型 CTA | 透明 | 透明 |
| `color.action.danger` | 破壊的操作（全データ削除）背景 | `palette.semantic.error` | `#7A1410`（暗赤、白文字 7:1+） |
| `color.focus.ring` | フォーカスリング | `#13449D` 3px outline + 2px offset | `#7FB0FF` 同 |
| `color.tab.active.fg` | アクティブタブの前景 | `palette.brand.primary` | `palette.brand.primary` |
| `color.tab.inactive.fg` | 非アクティブタブの前景 | `palette.neutral.600`（7.87:1） | `palette.neutral.500`（8.26:1） |
| `color.tab.active.indicator` | アクティブタブ上辺インジケータ | `palette.brand.primary` | `palette.brand.primary` |
| `color.streak.flame` | ストリーク炎色（テキスト/アイコン） | `#7A3C00` | `#FFB266` |
| `color.streak.flame.bg` | ストリーク背景（装飾） | `#FFE9D6` | `#3E2D0A` |
| `color.score.line` | 日次スコア折れ線 | `palette.brand.primary` | `palette.brand.primary` |
| `color.score.point.today` | 当日強調点 | `palette.semantic.error`（赤、形でも区別） | `#FF8A82` |
| `color.toggle.on` | トグル ON 時トラック | `palette.brand.primary` | `palette.brand.primary` |
| `color.toggle.off` | トグル OFF 時トラック | `palette.neutral.400` | `palette.neutral.400` |

### 1.4 v2.0 専用トークン（カウントダウン・結果開示・選択枠）

> **カウントダウン色の 7:1 は「不透明バー背景」を前提に保証される（v2.0 改訂）**。カウントダウン文字は **必ず不透明サーフェス上**に置く（半透明バー越しのガボール縞が実効背景になることを禁止する。下記の `color.countdown.bg.*` を実効背景の下限とする）。半透明背景越しでは実効色がガボール縞の輝度に依存し、white が最悪 4.0:1、warn 黄が 6.68:1、danger 赤が 4.14:1 まで低下し 7:1 を割るため。GB-1 `GameTopBar` はカウントダウン領域を不透明とする（components.md GB-1 参照）。

| トークン | Light | Dark | 用途 / コントラスト |
|---|---|---|---|
| `color.countdown.bg` | `palette.neutral.0`（#FFFFFF） | `palette.neutral.100`（#15171C） | **カウントダウン文字の実効背景（不透明）**。バー全体をこの不透明色にする、またはカウントダウン直下に同色の不透明ピル/プレートを敷く。下記 normal/warn/danger の 7:1 検証はこの背景に対して行う |
| `color.countdown.normal` | `#0E0F12`（明背景時の黒）/ `#FFFFFF`（暗背景時の白） | `#FFFFFF` | カウントダウン通常時。`color.countdown.bg` 上で white(dark)=17.93:1 / 黒(light)=18.4:1 |
| `color.countdown.warn` | `#A11C16`（明背景=#FFFFFF 上で 7.80:1、暗赤）/ `#FFD600`（暗背景=#15171C 上で 12.70:1、鮮黄） | `#FFD600` | 残り 5 秒以下（黄=暗背景時）。明背景では黄が 7:1 を割るため暗赤 `#A11C16` を使う（色＋太字補強で情報伝達、NF-12） |
| `color.countdown.danger` | `#A11C16`（明背景=#FFFFFF 上で 7.80:1）/ `#FF8A82`（暗背景=#15171C 上で 7.86:1） | `#FF8A82` | 残り 3 秒以下（赤）。**不透明 `color.countdown.bg` 上**でのみ 7:1 を保証（`#FF8A82` on `#15171C`=7.86:1、on `#1A1D24`=7.40:1。半透明越し不可） |
| `color.selection.subtle` | `rgba(60,64,72,0.85)`（暗灰、選択中・線幅 2px） | `rgba(235,238,242,0.90)`（明灰、選択中） | ガボール直接選択時の選択枠。背景 #808080 上で 3:1 以上を確保し、かつ縞模様の視認を阻害しない控えめさ |
| `color.selection.subtle.idle` | `rgba(60,64,72,0.30)`（線幅 1px） | `rgba(235,238,242,0.35)` | 未選択時の薄い枠（セル境界を示す程度。任意） |
| `color.result.check.tp` | `#0A6238`（暗緑） | `#3FCB7E`（明緑） | ✅（TP、実線・不透明）アイコン本体色 |
| `color.result.check.fn` | `#0A6238` @ 透過 50% | `#3FCB7E` @ 透過 50% | ✅（FN、薄め・取りこぼし）アイコン本体色 |
| `color.result.cross.fp` | `#A82018`（暗赤） | `#FF6E73`（明赤） | ❌（FP、誤選択）アイコン本体色 |
| `color.result.overlayBg` | `rgba(255,255,255,0.82)` | `rgba(20,24,32,0.82)` | ✅/❌ アイコン下に敷く半透明背景円（縞模様を完全には隠さない） |
| `color.result.aggregate.success` | bg `#0A6238` / fg `#FFFFFF` | bg `#3FCB7E` / fg `#000000` | 刺激領域直下の総合 ✅（成功）バッジ |
| `color.result.aggregate.danger` | bg `#A82018` / fg `#FFFFFF` | bg `#FF6E73` / fg `#000000` | 刺激領域直下の総合 ❌（不正解）バッジ |

### 1.5 コントラスト検証（実測値・主要ペア）

> 算式：WCAG 2.1 相対輝度比。AAA = 7:1 以上、AA = 4.5:1 以上。

| ペア | 実効比 | 等級 | 用途 |
|---|---|---|---|
| `fg.primary` (#0E0F12) on `bg.canvas` light (#FAFAFA) | 18.36:1 | AAA | 主要テキスト |
| `fg.primary` (#F5F6F8) on `bg.canvas` dark (#000000) | 19.42:1 | AAA | 主要テキスト（dark） |
| `fg.onPrimary` (#FFFFFF) on `action.primary` light (#13449D) | 8.97:1 | AAA | プライマリボタン文字 |
| `fg.onPrimary` (#000000) on `action.primary` dark (#7FB0FF) | 9.56:1 | AAA | プライマリボタン文字（dark） |
| `fg.secondary` (#4A4F5A) on `bg.canvas` light | 7.87:1 | AAA | 副テキスト / 非アクティブタブ |
| `fg.muted` (#4D525C) on `bg.canvas` light | 7.52:1 | AAA | 注釈・補足 |
| `tab.active.fg` (#13449D) on `bg.surface` light (#FFFFFF) | 8.97:1 | AAA | アクティブタブ文字 |
| `semantic.error` (#A11C16) on `bg.surface` light | 7.80:1 | AAA | エラー文字 |
| `streak.flame` (#7A3C00) on `bg.surface` light | 8.49:1 | AAA | ストリーク数値/炎 |
| `countdown.normal` (#FFFFFF) on opaque dark `countdown.bg` (#15171C) | 17.93:1 | AAA | カウントダウン白（暗背景・不透明バー上） |
| `countdown.warn` (#FFD600) on opaque dark `countdown.bg` (#15171C) | 12.70:1 | AAA | カウントダウン黄（暗背景・不透明バー上） |
| `countdown.danger` (#FF8A82) on opaque dark `countdown.bg` (#15171C) | 7.86:1 | AAA | カウントダウン赤（暗背景・不透明バー上。`#1A1D24` 上でも 7.40:1） |
| `countdown.warn/danger` (#A11C16) on opaque light `countdown.bg` (#FFFFFF) | 7.80:1 | AAA | カウントダウン黄/赤（明背景・不透明バー上、暗赤） |
| `result.aggregate.success` 白文字 on (#0A6238) | 7.45:1 | AAA | 総合 ✅ バッジ |
| `result.aggregate.danger` 白文字 on (#A82018) | 7.28:1 | AAA | 総合 ❌ バッジ |
| `action.danger` 白文字 on (#A11C16) | 7.80:1 | AAA | 全データ削除ボタン |

> **装飾限定の例外**：`palette.semantic.success` (#0F7A4F = 5.36:1) と `palette.brand.accent` (#0A6C53 = 6.40:1) は 7:1 未達のためテキスト用途禁止。バッジ獲得演出の背景・グラフ点・装飾アイコン塗りのみ可。成功をテキスト表現する場合は本文を `fg.primary` Bold + 装飾アイコンのみ success 色を使う。
> **ガボール背景 #808080 上の ✅/❌**：背景輝度がまちまちな縞模様の上に置くため、必ず `color.result.overlayBg`（半透明背景円）を敷いてから 7:1 を確保する。
> **カウントダウンの 7:1 は半透明バーでは保証されない（v2.0 改訂・必読）**：ゲーム上部バーを半透明にすると実効背景がガボール縞に依存し、white 最悪 4.0:1 / warn 黄 6.68:1 / danger 赤 4.14:1 まで低下する。したがって**カウントダウン領域は不透明 `color.countdown.bg` を必ず実効背景に持つ**こと（バー全体を不透明にする、またはカウントダウン直下に同色の不透明ピルを敷く）。上表の検証値はすべてこの不透明背景前提。色変化は太字補強と併用し色のみで伝えない（NF-12）、点滅なし（NF-11）、数字のみ（時計アイコンなし、F-12）の原則は維持。

---

## 2. タイポグラフィ

### 2.1 基本方針（OPT-1）
- システムフォント優先（iOS: SF Pro Text / Android: Roboto / Web: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic UI", sans-serif）。
- 日本語の字面は欧文より小さく見えるため本文の床は **18pt = 24px**。ボタン文字も同等以上。
- ウェイトは Regular(400) / Medium(600) / Bold(700) / Black(900) のみ（Black はカウントダウン danger 強調専用）。
- `1pt ≒ 1.333px`（96dpi 前提）。spec「本文最小 18pt」に整合。

### 2.2 タイプスケール

| トークン | 用途 | size(px) | (pt) | line-height | weight | 備考 |
|---|---|---|---|---|---|---|
| `font.display` | スコア/成果ハイライト | 48 | 36pt | 1.25 | Bold | スコア数値は numeric を使う |
| `font.h1` | 画面タイトル（最大） | 36 | 27pt | 1.3 | Bold | |
| `font.h2` | セクション見出し / 上部バー残り秒 | 30 | 22.5pt | 1.35 | Bold | カウントダウンは段階色 |
| `font.h3` | サブ見出し | 26 | 19.5pt | 1.4 | Medium | |
| `font.body.lg` | 本文強調 / 主要ボタン文字 | 26 | 19.5pt | 1.55 | Medium | |
| `font.body` | 本文標準 / ボタン文字下限 | 24 | 18pt | 1.6 | Regular | OPT-1 の床 |
| `font.body.bold` | 本文強調 | 24 | 18pt | 1.6 | Bold | |
| `font.label` | ラベル・タブ・グラフ軸 | 24 | 18pt | 1.4 | Medium | グラフ軸ラベルもこれ以上 |
| `font.caption` | タイムスタンプ・バッジ獲得日付（補助のみ） | 20 | 15pt | 1.5 | Regular | 主要動線では使用禁止 |
| `font.numeric.xl` | 大カウントダウン/スコア | 72 | 54pt | 1.0 | Bold tabular-nums | danger 時 Black(900) |
| `font.numeric.l` | ストリーク日数/累計回数 | 48 | 36pt | 1.1 | Bold tabular-nums | |

### 2.3 使用規則
- 本文/ボタン文字は最小 24px。グラフ軸ラベルは 18pt（24px）以上。
- 数値（スコア・カウントダウン・回数）は `tabular-nums` で桁ぶれ防止。
- 行間 1.6 以上（日本語の漢字濃度を考慮）。
- 強調は太字/サイズアップで行い、色強調はセカンダリ手段（NF-12）。
- `font.caption`（20px）は主要動線外の補助情報のみ（タイムスタンプ等）。CTA・操作テキスト・エラー文には使わない。

---

## 3. スペーシング・グリッド

### 3.1 スペーストークン（4px ベース）

| トークン | 値 | 用途 |
|---|---|---|
| `space.0` | 0 | リセット |
| `space.1` | 4px | 微小ギャップ |
| `space.2` | 8px | アイコン余白 / グリッド隙間 |
| `space.3` | 12px | テキスト行間 |
| `space.4` | 16px | 一般的余白 / 画面外側余白（スマホ） |
| `space.5` | 24px | カード内パディング標準 |
| `space.6` | 32px | セクション間 |
| `space.7` | 48px | 大きな区切り / 画面外側余白（PC） |
| `space.8` | 64px | 画面区切り |
| `space.9` | 96px | フィーチャー間 |

### 3.2 レイアウトグリッド・ブレイクポイント

| ブレイクポイント | 範囲 | 外側余白 | コンテンツ最大幅 |
|---|---|---|---|
| スマホ縦 S | 360–374px | space.4（16px） | 100%（最小幅で崩れない） |
| スマホ縦 M | 375–599px | space.4（16px） | 360px 推奨 |
| タブレット/小型 PC | 600–1023px | space.6（32px） | 600px 中央寄せ |
| PC 横 | 1024–1280px | space.7（48px） | 720px 中央寄せ |

- **必須検証幅：360 / 375 / 1280px**（NF-21）。タブレットは横レイアウトで PC と同等（NF-22）。
- スマホは縦持ち固定、PC は横画面。ボトムタブバーは全幅、コンテンツのみ中央寄せ最大幅を適用。

### 3.3 角丸・エレベーション

| トークン | 値 |
|---|---|
| `radius.sm` | 8px（チップ・小ボタン） |
| `radius.md` | 12px（カード・入力欄） |
| `radius.lg` | 16px（大カード・ダイアログ） |
| `radius.pill` | 9999px（トグル・チップ） |
| `elevation.0` | none（フラット面） |
| `elevation.1` | y2 blur8 rgba(0,0,0,0.08)（カード） |
| `elevation.2` | y4 blur16 rgba(0,0,0,0.12)（ダイアログ・タブバー上辺影） |

ダークモードでは影の代わりに `border.default` 1px + `bg.surfaceRaised` で階層を表現する（影は暗背景で見えにくいため）。

---

## 4. モーション

| トークン | 値 | 用途 |
|---|---|---|
| `motion.duration.fast` | 120ms | トグル・チェック |
| `motion.duration.base` | 200ms | 画面遷移・フェード（NF-2：遷移 200ms 以内） |
| `motion.duration.result` | 200ms | ✅/❌ オーバーレイのフェードイン |
| `motion.duration.badge` | 1500ms | バッジ獲得演出（1 度のみ・点滅なし） |
| `motion.easing.standard` | cubic-bezier(0.2,0,0,1) | 標準 |

- **点滅エフェクト全面禁止**（NF-11、てんかん配慮）。カウントダウンの色変化補強は太字化のみ。
- **prefers-reduced-motion: reduce 時**：UI 装飾アニメーション（フェード・スライド・バッジ演出の動き）を 0ms 化または静的表示に。**ただし変化検出ゲーム本体の刺激アニメ（回転・周波数変化）は課題上必須のため抑制対象外**（NF-13）。
- バッジ獲得演出は拡大/フェードのみ（点滅・回転なし）。reduced-motion 時は静的にバッジ + テキストを 1500ms 表示。

---

## 5. インタラクション原則

- **ホバー（Web/PC）**：背景を `primaryHover` 等に。ガボールパッチはホバーで枠を `selection.subtle.idle` 程度に薄く示してよい。
- **focus（NF-9）**：`color.focus.ring` で 3px outline + 2px offset。全インタラクティブ要素が Tab で到達、Enter/Space で起動。
- **pressed/active**：背景を 1 段濃く、トランジション `motion.duration.fast`。
- **disabled**：不透明度 0.4 + ポインタ無効。結果開示中はガボール格子全体を pointer-events: none に。
- **トランジション**：`motion.duration.base` を標準。タブ切替は即時（ステート保持）。

---

## 6. アクセシビリティ規範（NF-7〜15）

- 全インタラクティブ要素 48pt 以上、ボタン/設定行/タブ 56pt 以上（OPT-2）。
- focus-visible 3px outline + 2px offset（NF-9）。
- 色のみで状態を伝えない（NF-12）：タブ選択は色＋上辺インジケータ＋太字ラベル、カウントダウン色変化は太字化補強、トグル ON/OFF は位置＋ラベル「ON/OFF」併記、グラフ当日点は色＋形（◆）で区別。
- 点滅禁止（NF-11）。prefers-reduced-motion 尊重（NF-13、ゲーム刺激は例外）。
- aria-checked / aria-pressed で選択状態を明示（NF-15）。ガボール選択セルは `role="checkbox"` + `aria-checked`。
- スクリーンリーダー（NF-10）：主要要素に aria-label。結果開示で「正解」「不正解」を読み上げ（`aria-live="assertive"` で 1 度）。
- Skip link（Web、NF-14）：各タブ画面上部に「メインコンテンツへスキップ」。
- カウントダウン：`aria-live="polite"`（残り 6 秒以上）→ `assertive`（残り 5 秒以下）。残り 3/2/1 秒で毎秒読み上げ。

---

## 7. ガボール描画品質規範（NF-26〜28b）

### 7.1 クリッピング方式（Designer 規範）
「**実サイズの N 倍で生成 → 矩形枠でクリッピング**」方式を採用。
- **N = 1.5（Designer 提案値）**：表示見かけサイズ（例 100px 角）に対し内部生成は 1.5 倍（150px 角）で行う。ガウス窓の裾野が表示矩形の外まで連続的に伸びた状態で、表示時に見かけサイズの矩形枠でクリップする。
- 効果：角度を最小単位ずつ変えても、また回転中も、パッチ枠と縞模様の間に背景色（グレー）が見える隙間が出ない（NF-27 / NF-28）。
- 矩形マスクを採用する根拠：複数パッチを格子配置するとき矩形のほうがレイアウトが安定し隙間トラッキングが容易。
- Generator が 1.4（√2）で十分と判断すれば妥協可だが、本書は 1.5 を提案値とする（最小角度変化でも四隅露出を完全回避するマージン）。

### 7.2 変化/静止の弁別性（NF-28b、§9 と連動）
- 静止パッチの初期角度ばらつき・初期空間周波数ばらつきと、変化パッチの単位時間あたり変化量を、ユーザーが「変化中／静止」を区別できるよう調整する。具体提案値は §9。
- 静止パッチ同士の初期角度差は、変化パッチの最大変化量より十分大きく取る（後述：静止同士は 12° 以上離す）。

### 7.3 角度刻み・最小可視差（NF-26、Designer 提案値）
最小可視差（向きの違いを弁別できる最小角度差）。表示サイズ大・cpd 高ほど小さい差を弁別可能。

| パッチ辺長（格子内 1 個） | 1.5 cpd | 3 cpd | 6 cpd |
|---|---|---|---|
| 70px（5×5 格子相当） | 5° | 3° | 2° |
| 90px（4×4 格子相当） | 4° | 2.5° | 1.5° |
| 110px（3×3 格子相当） | 3° | 2° | 1° |
| 140px（PC 横・3×3） | 2° | 1° | 0.5° |

ガボール刺激の基準 cpd は **3 cpd**（@ 40cm 視聴）を v2.0 既定とする（縞 3〜4 本が見える明瞭さ。Generator 調整可）。

---

## 8. ステータスバー回避規範（NF-29 / NF-30）

| 画面 | 扱い |
|---|---|
| **ゲームプレイ中（ガボール格子提示）** | フルスクリーン許容（NF-29）。ガボール背景 #808080 がステータスバー領域まで広がってよい。ただし上部バーの文字・X ボタン・残り秒数は必ずセーフエリア内に収める（top inset 分オフセット） |
| **それ以外**（距離リマインド / ホーム結果 / 履歴 / 設定 / オンボ / 全ダイアログ / データリセット通知） | セーフエリア準拠（NF-30）。iOS=SafeAreaInset、Android=StatusBar.currentHeight、Web=`env(safe-area-inset-*)` + viewport-fit=cover |

- ボトムタブバーは常に bottom セーフエリア（iOS Home Indicator / Android nav bar）の内側に置き、タブバー下端にセーフエリア分のパディングを足す。
- `SafeAreaWrapper` コンポーネント（components.md §SA-1）を全非ゲーム画面で必須使用。`mode="game"` は top inset を無視、`mode="default"` は全 inset 適用。

---

## 9. パラメータ可動範囲・初期値（AS-23、Designer 仮置き）

> spec は n/m/r/a/b の具体値を断定しない。本節で Designer が表示サイズ・cpd・体感から妥当な範囲・初期値・刻みを提案する。ユーザーが実機で確定する運用。Generator は本表を初期実装値として採用してよい。

### 9.1 提案値テーブル

| パラメータ | 記号 | 範囲（min–max） | 初期値 | 刻み(step) | UI | 根拠 |
|---|---|---|---|---|---|---|
| 格子サイズ | **n** | 3–5（n×n） | **4** | 1 | セグメント（3/4/5）+ プレビュー | 3×3=9 は易、5×5=25 は探索負荷大。4×4=16 が中庸。パッチ辺長が視認下限を割らない上限が 5 |
| 1 ラウンド秒数 | **m** | 10–60 秒 | **20** | 5 秒 | スライダー（目盛付） | 短すぎると探索不能、長すぎると注視疲労。20 秒で n=4 を一巡できる |
| ラウンド数 | **r** | 3–10 | **5** | 1 | スライダー（目盛付） | 1 セッション = m×r。初期 20×5 = 約 100 秒 + 結果開示で 2〜3 分の気軽さ |
| 回転速度 | **a** | 2–12 °/sec | **6** | 1 °/sec | スライダー（目盛付） | 2°/s=ぎりぎり動いて見える（最難）、12°/s=明確（最易）。初期 6°/s は m=20 秒で 120° 回る |
| 周波数変化速度 | **b** | 0.05–0.40 hz/sec | **0.15** | 0.05 | スライダー（目盛付） | 基準 3 cpd を中心に増減。0.05=微差（最難）、0.40=明確（最易）。20 秒で 3.0 hz の振れ幅 |

> **スライダーの「難→易」方向の明示**：a/b は「小さいほど難しい」。スライダー左端ラベル「難しい（小）」、右端「易しい（大）」を 18pt で併記し、数値も表示（例「回転速度 6 °/秒」）。n/m/r は数値＋単位を表示。

### 9.2 高難度バッジ判定の閾値（§5 / B-06〜B-08、Designer 提案値）
- **a が「遅い」域**：a ≤ 3 °/sec（範囲下位 1/4 = 2,3）
- **b が「小さい」域**：b ≤ 0.10 hz/sec（範囲下位 1/4 = 0.05,0.10）
- **「最も難しい域」（B-08 達人の眼）**：a ≤ 3 かつ b ≤ 0.10（両方が最難域）
- **「クリア＝高スコア」**：そのセッションが誤選択なし（FP=0）かつ全変化パッチ正答（FN=0）＝実質スコア 100。B-06/07/08 はこの条件 + 該当難度設定で達成。

### 9.3 変化パッチ個数分布（NF-28b、Designer 提案値）
- 各ラウンドの変化パッチ個数は格子総数に対しランダム。**1 個〜floor(n²/3) 個**の範囲で抽選（n=4 なら 1〜5 個、n=3 なら 1〜3 個、n=5 なら 1〜8 個）。
- 確率は少なめ寄り（探索の手応えを保つ）：個数 k の確率は k が小さいほど高い緩い減衰分布。**0 個は出さない**（必ず 1 個以上が変化）。
- 変化の内訳（回転のみ/周波数のみ/両方）は各変化パッチごとに独立ランダム（回転 40% / 周波数 40% / 両方 20% を提案）。画面に個数・内訳は一切表示しない。

### 9.4 静止パッチの弁別マージン（NF-28b、Designer 提案値）
- 静止パッチの初期角度は互いに **12° 以上**離れたランダム値（a の最大 12°/s × 1 秒分より大きく、「静止」と「1 秒見たときの回転」を区別可能なマージン）。
- 静止パッチの初期空間周波数は基準 3 cpd ± ランダム（2.0–4.0 cpd）。変化パッチの b による変化と静止のばらつきが混同しないよう、静止のばらつきは固定（時間変化しない）ことが弁別の鍵。

---

## 10. 音・ハプティクストークン（F-14）

### 10.1 イベント別発火パターン

| イベント | 音種 | 継続 | 音量 | ハプティクス | 設定 OFF 時 |
|---|---|---|---|---|---|
| ラウンド正解（総合 ✅） | correct（明るい上行 2 音） | 200ms | 60% | light 1 回 | 音OFF=無音 / 振動OFF=無振動 |
| ラウンド不正解（総合 ❌） | wrong（やや低音 1 音） | 200ms | 60% | medium 1 回 | 同上 |
| カウントダウン残り 3/2/1 秒 | tick（短い tic） | 80ms | 40/50/60% | なし | 音OFF=無音 |
| セッション完了 | end（柔らかい完了音） | 400ms | 50% | なし | 音OFF=無音 |
| バッジ獲得 | badge（達成感 3 音） | 600ms | 70% | heavy + medium 2 連 | 同上 |

### 10.2 規範
- アセット：`assets/sounds/correct.mp3` / `wrong.mp3` / `tick.mp3` / `end.mp3` / `badge.mp3`。
- サイレントモード（OS）尊重（NF-33）：音は鳴らさずハプティクスは発火（振動 OFF でない限り）。
- アプリ内「音 ON/OFF」「振動 ON/OFF」は OS 設定よりさらに細かい個別制御。
- **試行中（採点前の注視中）は採点フィードバック以外の音/振動を発火しない**（F-14 受け入れ基準）。ティック音は採点直前の予告として残り 3/2/1 秒のみ。
- 音再生レイテンシ 100ms 以内（NF-31）。ハプティクス強度は端末標準（iOS medium / Android strong）（NF-32）。
- 実装抽象は `../rapidreading2/src/platform/audio.ts` の `playSound(key, opts)` / `triggerHaptics(pattern)` 流用想定（技術詳細は Generator 領分）。

---

## 11. アプリアイコン（スコープ外・現状維持）
- v2.0 ではアプリアイコン差し替えはスコープ外（AS-17）。現状の `app.json` のアイコン設定を維持する。Designer は新規アイコン仕様を出さない。

---

## 12. 永続化スキーマとの一貫性（データモデル §6 横断確認）

UI が要求する状態が spec §6 のスキーマに乗ることを確認する（バッチ設計の利点）。

| UI が要求する状態 | スキーマ上の格納先 | 確認 |
|---|---|---|
| オンボ済み判定（初回のみオンボ） | `UserProfile.onboardingCompleted` | OK |
| 免責同意日時（設定のバージョン情報表示） | `UserProfile.disclaimerAgreedAt` | OK |
| 70 代以上警告（オンボ年齢層） | `UserProfile.ageGroup` | OK |
| 距離リマインドの cm | `UserProfile.viewingDistanceCm` | OK |
| 設定タブの n/m/r/a/b/採点方式 | `Settings.*` | OK |
| ダーク/音/振動/片眼 | `Settings.darkMode/soundEnabled/hapticsEnabled/oneEyeGuidance` | OK |
| セッション結果 0〜100 スコア | `SessionRecord.sessionScore` | OK |
| ラウンドの ✅/❌ オーバーレイ（TP/FP/FN） | `RoundRecord.tp/fp/fnCount` + ラウンド実行時の patch 状態（実行時メモリ、永続化は集計のみ） | OK（開示は実行時 state、記録は集計） |
| 高難度バッジ判定の paramsSnapshot | `SessionRecord.paramsSnapshot` | OK |
| 履歴の日次スコア折れ線（同日 max） | `DailyStats.bestSessionScore` | OK |
| 連続日数ストリーク | `Streak.currentStreak` | OK |
| 累計プレイ回数 | `PlayStats.totalSessions` | OK |
| バッジ獲得/未獲得 | `BadgeStatus.earned/earnedAt` | OK |
| 中断は記録しない | `SessionRecord.completedAt = null` を記録対象外とする（または保存しない） | OK |
| データリセット通知 1 度だけ | 旧名前空間消去フラグ（実装判断、`gaboreye:v2:*` 初期化の有無で判定） | OK |

> **設計判断**：✅/❌ オーバーレイの「どのパッチが TP/FP/FN だったか」はラウンド実行中のメモリ state で保持し、永続化は `RoundRecord` の集計カウント（tp/fp/fnCount）のみ。開示は採点直後のその場の state を使うため、過去ラウンドの座標を永続化する必要はない（スキーマと矛盾しない）。

---

## 13. コピーライティング規範（OPT-6 / 薬機法配慮）

- 医療効果を断定しない（AS-18）。「視力が回復」「治る」は禁止。「自助セルフケア」「目を集中させる」「見つける練習」等の表現を使う。
- 数値スコアは「0〜100 のスコア」と呼び、「視力 0.X」のような医療数値は使わない（F-04）。
- 優しい言い回し（急かさない、責めない）。未選択でラウンドが終わっても「残念」等の否定語を避け、結果は ✅/❌ の事実提示にとどめる。
- 主要文言の i18n キー命名規約は §14。

---

## 14. i18n キー命名規約（日本語ロケールのみ、NF-25）

```
# タブ
tab.home = "ホーム"
tab.history = "履歴"
tab.settings = "設定"

# ゲーム（F-01/F-12）
game.countdown.remaining = "残り {n} 秒"
game.abort.iconLabel = "ゲームを中断"

# 採点・結果（F-02/F-03/F-04）
result.aggregate.correct = "正解"
result.aggregate.wrong = "不正解"
result.check.tp.label = "正解（選択済み）"
result.check.fn.label = "正解（選び逃し）"
result.cross.fp.label = "不正解（誤選択）"

# セッション結果（F-08）
session.score.label = "今回のスコア"
session.score.outOf = "／100"
session.streak = "連続 {n} 日"
session.replay = "もう一度"

# 中断ダイアログ（F-07）
abort.dialog.title = "プレイを中断しますか？"
abort.dialog.body = "中断するとこのセッションは記録されません。"
abort.dialog.ok = "中断する"
abort.dialog.cancel = "続ける"

# 起動フロー（F-06）
onboarding.disclaimer.agree = "同意する"
onboarding.age.title = "年齢層を選んでください（任意）"
onboarding.distance.title = "視聴距離を選んでください"
onboarding.howto.title = "ゆっくり変化するパッチを見つけてタップ"
distanceReminder.headline = "画面から {n}cm 離れてください"
distanceReminder.autoStart = "{n} 秒後に自動で始まります"
distanceReminder.oneEye = "片目を覆ってください（任意）"

# データリセット（F-11）
dataReset.title = "最新版へのアップデート"
dataReset.body = "最新版へのアップデートのため、過去データをリセットしました"
dataReset.cta = "OK"

# 履歴（F-09）
history.dailyScore.title = "日次スコアの推移"
history.streak.title = "連続日数"
history.totalPlays.title = "累計プレイ回数"
history.empty.lessThan7Days = "もう少しデータが集まると傾向が見えます"
history.badges.title = "バッジ"

# バッジ（§5）
badge.B-01.name = "はじめの一歩"
badge.B-01.hint.locked = "初めてのセッションを完了すると獲得"
# ... B-02〜B-11 は components.md / sprint-8 screens.md 参照

# 設定（F-13）
settings.param.gridSize = "格子サイズ（n×n）"
settings.param.roundSeconds = "1 ラウンドの秒数"
settings.param.roundCount = "ラウンド数"
settings.param.rotationSpeed = "回転速度"
settings.param.sfChangeSpeed = "周波数変化速度"
settings.scoringMode.title = "採点方式"
settings.scoringMode.autoNoConfirm = "自動採点（確定なし）"
settings.scoringMode.autoConfirm = "自動採点（確定ボタンあり）"
settings.scoringMode.allCorrectAdvance = "全問正解で次へ"
settings.viewingDistance = "視聴距離"
settings.darkMode = "ダークモード"
settings.sound = "効果音"
settings.haptics = "振動"
settings.oneEye = "片眼ガイダンス"
settings.disclaimer.read = "免責事項を読む"
settings.dataDelete = "全データ削除"
settings.version = "バージョン"
```

---

## 15. システムバージョン
- v2.0（本書が最新規範）。
- 後続変更は Designer amendment モードで実施（オーケストレーター/ユーザー承認必須）。
