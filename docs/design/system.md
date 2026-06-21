# GaborEye v3.2 — デザインシステム（レベル管理・セッション制・チュートリアル）

> **位置づけ**：本書は v3.0（スコア管理 → レベル管理リブート）→ v3.1（セッション制）→ **v3.2（チュートリアル Lv0・繰り返し軸・個数ランダム化）** のデザインシステムの **ソース・オブ・トゥルース** です。仕様書 `docs/spec.md`（v3.2、2026-06-21 凍結）に 1 対 1 で対応します。
> **v3.2 差分は §17 に集約**（本番教示「全て探せ」・チュートリアル Lv0・設定 2 行 `repeatCount`/`countRange`・個数の難易度軸除去）。§1〜§16 の確定トークン・指針は不変です。
> v2.0 のデザイン（旧 system.md）の土台（カラー/タイポ/スペース/セーフエリア/ガボール描画品質）は流用しつつ、**進捗の管理単位を「スコア」から「レベル」へ全面差し替え**（v3.0）、さらに **ゲームの 1 単位を「1 ラウンド」から「指定時間まで反復するセッション」へ拡張**（v3.1）しました。
> 本書は自己完結しています（本書だけで実装トークンが揃う）。
>
> **v3.0 → v3.1 の本質的変更（デザイン観点。差分は §16 に集約）**
> - **ラウンド開示の 3 秒カウントダウン**：締切後 ✅/❌ 開示中に CD-1（F-12 準拠：数字のみ・白→黄→赤・太字・点滅なし）の **3 秒固定カウントダウン**を刺激領域直下（総合クリア/失敗の近傍）に表示し、0 で自動的に次ラウンドへ。「全問正解で即時終了」表示は廃止。開示中はタップ無効。
> - **セッション制ゲーム画面**：ゲームはセッション中、ラウンド → 開示(3s) → 次ラウンドを連続反復。ゲーム上部バーに**セッション残り時間**（分:秒、控えめ）を追加（制限時間カウントダウン F-12 と混同しない位置・スタイル）。レベルはラウンドごとに上下し、次ラウンドの GB-1 レベルピルで変化が視認できる。
> - **セッション要約カード**：セッション終了後ホームに RC-1 を**セッション要約**として表示（ラウンド数 / クリア・失敗数 / 現在レベル＝次セッション開始レベル（大きく）/ 今セッション最高到達レベル / 今日のストリーク / 「もう一度」56pt+）。ラウンドごとの LD-1 はゲーム画面内に移り、カードでは「セッションの到達レベル」を主役に。
> - **`sessionMinutes` 設定行**：設定タブに「1 回のプレイ時間」（1〜15 分・1 分刻み・既定 5 分、56pt 行）を SR-1 で新設。
> - **拡張レンジチップ**：RG-1 の 5 変数チップに §4.1 追加値が並ぶ（追加値は既定 OFF＝未選択スタイル）。チップ数増でも 360px で折返し破綻しない指針を §16 に追加。
> - **5x5 / 6x6 格子**：GG-1/2 が 3x3/4x4 に加え 5x5(25)/6x6(36) に対応。セルサイズ・間隔・タップ領域・老眼配慮の視認性指針を §16 に追加。
> - **不変**：カラートークン（§1）/ タイポ（§2）/ スペース（§3）/ a11y 規範（§6）/ ガボール描画品質（§7、サイズ拡張のみ §16 で追補）/ 音・ハプティクス（§10）は v3.0 のまま。NF-8 確定値（#13449D / #7A3C00 / sameFg #4E5460）を継続使用。
>
> **v2.0 → v3.0 の本質的変更（デザイン観点）**
> - 進捗指標：0〜100 スコア → **レベル（整数）**。スコア表示・スコア折れ線・スコアバッジを全廃。
> - ゲーム結果：部分点 → **クリア / 失敗の 2 値**。✅/❌ 開示は「TP/FP/FN」から「回転していた／誤選択した」へ読み替え。
> - 難易度の表現：n/m/r/a/b 手動スライダー → **レベルが 5 変数を自動決定**。ゲーム画面に**レベル番号と探す個数を明示**。
> - 変化軸：回転 + 空間周波数 → **回転のみ**（一方向 / 振動＝往復回転）。空間周波数（b）廃止。
> - 設定：5 変数手動 + 採点方式 → **各変数の振れ幅（範囲）設定 + 変化順の組み替え**（テスト用）。
> - 履歴：日次スコア折れ線 → **日次到達レベル / 最高到達レベルの推移**。
> - バッジ：高スコア軸 → **高レベル到達軸**（3 軸 11 種）。
> - レベル昇降の観察可能な提示（+1 / ±0 / −1）を新設。

---

## 0. デザイン原則（老眼配慮 OPT-1〜12 / レベル制への組み込み）

v3.0 は老眼層（40 代以上）を主対象とする。下表の原則は全画面・全コンポーネントが構造的に満たす（トークン経由のみ値設定可能とし、違反が起こり得ない構造にする）。

| ID | 原則 | v3.0 デザイン上の実装 |
|---|---|---|
| **OPT-1** | 大きい文字 | 本文最小 `18pt`（= 24px）。`font.body.min = 24px`、ボタン文字も 24px 以上。グラフ軸ラベル 18pt 以上。**レベル番号・個数案内は 18pt 以上**（F-02） |
| **OPT-2** | 大きいタップ領域 | `tappable.min = 48pt`、`tappable.recommended = 56pt`。CTA（もう一度・OK）・設定行・ダイアログボタンは 56pt 以上 |
| **OPT-3** | 短い操作シーケンス | 1 画面の主要 CTA は 1 個。オンボーディングは 6 タップ以下（F-06）。**1 ゲーム = 1 レベル挑戦**で構造が単純化（roundCount 廃止） |
| **OPT-4** | 読書距離プリセット | 視聴距離 30/40/50cm の 3 択（設定／オンボ） |
| **OPT-5** | 高コントラスト UI | UI テキスト・ボタンの前景/背景コントラスト比 **7:1 以上**（実測ベース、NF-8）。ガボール刺激領域は中性グレー基準で別ロジック |
| **OPT-6** | 優しい言い回し | コピーライティング規範（§13）。「失敗」は否定語を避けつつ事実提示にとどめる |
| **OPT-7** | 急かさない | ボタン自動消失なし（NF-18）。自動進行は距離リマインドのカウントダウンと結果開示後の短インターバルのみ |
| **OPT-8** | ダークモード必須 | 全カラートークンを light / dark 2 系統で並走定義（OS 連動/明/暗の 3 択、F-13） |
| **OPT-9** | 片眼トレーニング配慮 | 片眼ガイダンス（off/左/右/交互）。点滅アニメ全面禁止（NF-11） |
| **OPT-10** | 開始前距離リマインド | 距離リマインド画面を起動フローに必ず挟む（F-06）。カウントダウン自動進行 |
| **OPT-11（v3 改訂）** | 締め方は 1 本に統一 | v2.0 の「3 採点方式（①②③）」を廃止。**「全問正解で即時締め切り or 時間切れ」の 1 本のみ**。確定ボタン・部分点なし（AS-5） |
| **OPT-12（v3 改訂）** | 共通注視フォーマット | レベル制ゲーム 1 種に合わせ改訂。共通項は「制限時間のラウンド・パッチ直接タップ選択・試行中は正誤フィードバックなし・締め切り後 ✅/❌ 開示・**レベル番号と個数の明示**」 |

---

## 1. カラートークン

### 1.1 基本方針
- light / dark 両モード完全並走。全 UI テキスト/ボタンのコントラスト比 **7:1 以上**を実測ベースで厳守（OPT-5 / NF-8）。

> **NF-8 是正記録（2026-06-10 amendment / S11 適用待ち）**：実装 `src/theme/tokens.ts` に旧来の非準拠値（light: `brandPrimary #4F46E5` ≒ 白上 6.29:1、`streakFlameFg #EA580C` ≒ 白背景 3.56:1）が残存していたため、本デザインシステムの確定値に揃える。**確定値はいずれも light モードで既に本書に記載済みの値**であり、デザイン変更ではなく実装の本書準拠是正である。
> | トークン | 旧（tokens.ts 実装値・非準拠） | 新（本書確定値・NF-8 準拠） | 新コントラスト実測 |
> |---|---|---|---|
> | `palette.brand.primary`（light） | `#4F46E5`（白文字 on 塗り 6.29:1 ＝ NF-8 未達） | `#13449D` | 白文字 on 塗り **8.97:1** / この色を文字として白(#FFFFFF)上に置く（アクティブタブラベル）**8.97:1**、canvas(#FAFAFA)上 8.59:1 |
> | `palette.streak.flame.fg`（light） | `#EA580C`（白背景 3.56:1 ＝ NF-8 未達） | `#7A3C00` | 白背景(#FFFFFF)上 **8.49:1**（数値単体でも 7:1 達成） |
> - **色相維持**：indigo は indigo のまま濃く（藍 `#13449D`）、橙は橙のまま濃く（暗橙 `#7A3C00`）。視覚的意味（主要色＝藍 / ストリーク＝暖色）を保つ。
> - **トークン分割は不要**：`#13449D` は「白文字 on 塗り（主要ボタン・選択チップ・タブインジケータ）」と「白背景上の文字（アクティブタブラベル）」の**両用途で 7:1 を満たす**ため、用途別 2 トークンへ分けず単一トークンを継続使用する。
> - **ダークモード（別系統）は是正対象外**：dark の `brandPrimary`・`streakFlameFg` は本書値（`#7FB0FF` 黒文字 on 塗り 9.56:1 / 文字 on surface 8.16:1、`#FFB266` on surface 10.09:1）で既に 7:1 を満たし破綻しない。tokens.ts dark の現行値（`#00E5FF` 等）も 7:1 は満たすが、本書 dark 値（`#7FB0FF` 系）への統一が正。本 amendment の必須範囲は light の上記 2 値だが、Generator は dark も本書値へ揃えてよい。
> - 上記 2 トークン（と派生 hover）以外の色・レイアウトは変更しない。
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
| `palette.level.fg` | `#0E3A86`（レベル数値の濃青テキスト） | `#A6CBFF` |
| `palette.level.bg` | `#E3ECFB`（レベルピル背景、装飾） | `#1B2740` |
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
| `color.border.input` | 入力欄/コントロールトラック枠 | `palette.neutral.300` | `palette.neutral.400` |
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
| `color.level.fg` | **レベル数値テキスト**（ゲーム/ホーム/履歴） | `#0E3A86`（8.6:1 on surface light） | `#A6CBFF` |
| `color.level.bg` | レベルピル/タイル背景（装飾） | `#E3ECFB` | `#1B2740` |
| `color.level.line` | **日次到達レベル折れ線** | `palette.brand.primary` | `palette.brand.primary` |
| `color.level.line.highest` | **最高到達レベルの基準線**（破線） | `palette.semantic.warning`（#7A4300） | `#FFB266` |
| `color.level.point.today` | 当日到達レベルの強調点 | `palette.semantic.error`（赤、形◆でも区別） | `#FF8A82` |
| `color.toggle.on` | トグル ON 時トラック | `palette.brand.primary` | `palette.brand.primary` |
| `color.toggle.off` | トグル OFF 時トラック | `palette.neutral.400` | `palette.neutral.400` |

### 1.4 v3.0 専用トークン（カウントダウン・結果開示・選択枠・レベル変化）

> **カウントダウン色の 7:1 は「不透明バー背景」を前提に保証される（v2.0 から継承）**。カウントダウン文字は **必ず不透明サーフェス上**に置く（半透明バー越しのガボール縞が実効背景になることを禁止する）。GB-1 `GameTopBar` はカウントダウン領域を不透明とする（components.md GB-1 参照）。

| トークン | Light | Dark | 用途 / コントラスト |
|---|---|---|---|
| `color.countdown.bg` | `palette.neutral.0`（#FFFFFF） | `palette.neutral.100`（#15171C） | **カウントダウン文字の実効背景（不透明）**。下記 normal/warn/danger の 7:1 検証はこの背景に対して行う |
| `color.countdown.normal` | `#0E0F12`（明背景時の黒） | `#FFFFFF` | カウントダウン通常時。white(dark)=17.93:1 / 黒(light)=18.4:1 |
| `color.countdown.warn` | `#A11C16`（明背景=#FFFFFF 上で 7.80:1、暗赤）/ `#FFD600`（暗背景=#15171C 上で 12.70:1、鮮黄） | `#FFD600` | 残り 5 秒以下（黄=暗背景時 / 暗赤=明背景時）。色＋太字補強（NF-12） |
| `color.countdown.danger` | `#A11C16`（明背景=#FFFFFF 上で 7.80:1）/ `#FF8A82`（暗背景=#15171C 上で 7.86:1） | `#FF8A82` | 残り 3 秒以下（赤）。**不透明 `color.countdown.bg` 上**でのみ 7:1 を保証（半透明越し不可） |
| `color.selection.subtle` | `rgba(60,64,72,0.85)`（暗灰、選択中・線幅 2px） | `rgba(235,238,242,0.90)`（明灰、選択中） | ガボール直接選択時の選択枠。背景 #808080 上で 3:1 以上を確保し、縞模様の視認を阻害しない控えめさ |
| `color.selection.subtle.idle` | `rgba(60,64,72,0.30)`（線幅 1px） | `rgba(235,238,242,0.35)` | 未選択時の薄い枠（セル境界を示す程度。任意） |
| `color.result.check.correct` | `#0A6238`（暗緑） | `#3FCB7E`（明緑） | ✅（正しく選んだ回転パッチ、実線・不透明）アイコン本体色 |
| `color.result.check.missed` | `#0A6238` @ 透過 50% | `#3FCB7E` @ 透過 50% | ✅（選び逃した回転パッチ、薄め）アイコン本体色 |
| `color.result.cross.wrong` | `#A82018`（暗赤） | `#FF6E73`（明赤） | ❌（誤って選んだ静止パッチ）アイコン本体色 |
| `color.result.overlayBg` | `rgba(255,255,255,0.82)` | `rgba(20,24,32,0.82)` | ✅/❌ アイコン下に敷く半透明背景円（縞模様を完全には隠さない） |
| `color.result.aggregate.clear` | bg `#0A6238` / fg `#FFFFFF` | bg `#3FCB7E` / fg `#000000` | 刺激領域直下の総合 **クリア**バッジ（✅ + 「クリア」テキスト） |
| `color.result.aggregate.fail` | bg `#A82018` / fg `#FFFFFF` | bg `#FF6E73` / fg `#000000` | 刺激領域直下の総合 **失敗**バッジ（— + 「失敗」テキスト） |
| `color.levelDelta.up.fg` | `#0A6238`（緑、+1） | `#3FCB7E` | レベル +1 告知のテキスト/矢印（▲ 形 + テキストで色非依存） |
| `color.levelDelta.same.fg` | `#4E5460`（中立灰、±0。NF-8 是正後値。旧 `#525866` は実背景 `#F8F9FB` 上で 6.77:1 と未達のため改定） | `palette.neutral.500` | レベル変化なし（― 形 + テキスト）。**実描画背景は白カード地ではなく canvas 地 `#F8F9FB`**（HomeResultCard）。±0 は「責めない・中立」の意味のため、緑(up)/暗橙(down) と混同しない中立グレーを維持しつつ 7:1 を満たす |
| `color.levelDelta.down.fg` | `#7A4300`（暗橙、−1。「責めない」色） | `#FFB266` | レベル −1 告知のテキスト/矢印（▼ 形 + テキスト）。赤エラー色は使わない（OPT-6 優しい言い回し） |

> **レベル −1 の色は「エラー赤」を使わない**：レベルダウンは「無理なく続けるための自動調整」であり失敗の烙印ではない（OPT-6 / spec US-4）。暗橙 `#7A4300`（warning 系、on surface light で 8.49:1）+ 下向き三角 ▼ + 「レベルが下がりました」の事実提示にとどめる。総合「失敗」バッジ（赤）とは別物として扱う。

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
| `level.fg` (#0E3A86) on `bg.surface` light (#FFFFFF) | 8.62:1 | AAA | **レベル数値テキスト** |
| `level.fg` (#A6CBFF) on `bg.surface` dark (#15171C) | 9.71:1 | AAA | レベル数値テキスト（dark） |
| `tab.active.fg` / `action.primary`-as-text (#13449D) on `bg.surface` light (#FFFFFF) | 8.97:1 | AAA | アクティブタブ文字（白背景上の藍文字。NF-8 是正後値） |
| `tab.active.fg` (#13449D) on `bg.canvas` light (#FAFAFA) | 8.59:1 | AAA | アクティブタブ文字（canvas 上でも 7:1+） |
| `semantic.error` (#A11C16) on `bg.surface` light | 7.80:1 | AAA | エラー文字（総合「失敗」テキスト） |
| `levelDelta.down.fg` (#7A4300) on `bg.surface` light | 8.49:1 | AAA | レベル −1 告知（橙、責めない） |
| `levelDelta.up.fg` 想定 (#0A6238) on `bg.surface` light | 7.45:1 | AAA | レベル +1 告知（緑） |
| `levelDelta.same.fg` (#4E5460) on **canvas `#F8F9FB`** (実背景, HomeResultCard) | 7.22:1 | AAA | レベル ±0 告知（中立灰）。**NF-8 是正後値**。旧 `#525866` は同背景上 6.77:1 と未達（白 #FFFFFF 上のみ 7.13:1）のため改定。色相維持（HSL 220°/10%、blue-gray）し約 2% 暗化のみ |
| `levelDelta.same.fg` (#4E5460) on `#FFFFFF`（参考・白カード地） | 7.61:1 | AAA | 同上トークンを白地に置いた場合の参考値（実背景は #F8F9FB） |
| `streak.flame` (#7A3C00) on `bg.surface` light (#FFFFFF) | 8.49:1 | AAA | ストリーク数値/炎（白背景上、数値単体でも 7:1+。NF-8 是正後値） |
| `countdown.normal` (#FFFFFF) on opaque dark `countdown.bg` (#15171C) | 17.93:1 | AAA | カウントダウン白（暗背景・不透明バー上） |
| `countdown.warn` (#FFD600) on opaque dark `countdown.bg` (#15171C) | 12.70:1 | AAA | カウントダウン黄（暗背景・不透明バー上） |
| `countdown.danger` (#FF8A82) on opaque dark `countdown.bg` (#15171C) | 7.86:1 | AAA | カウントダウン赤（暗背景・不透明バー上） |
| `countdown.warn/danger` (#A11C16) on opaque light `countdown.bg` (#FFFFFF) | 7.80:1 | AAA | カウントダウン黄/赤（明背景・不透明バー上、暗赤） |
| `result.aggregate.clear` 白文字 on (#0A6238) | 7.45:1 | AAA | 総合「クリア」バッジ |
| `result.aggregate.fail` 白文字 on (#A82018) | 7.28:1 | AAA | 総合「失敗」バッジ |
| `action.danger` 白文字 on (#A11C16) | 7.80:1 | AAA | 全データ削除ボタン |

> **装飾限定の例外**：`palette.semantic.success` (#0F7A4F = 5.36:1) と `palette.brand.accent` (#0A6C53 = 6.40:1) は 7:1 未達のためテキスト用途禁止。バッジ獲得演出の背景・グラフ点・装飾アイコン塗りのみ可。
> **ガボール背景 #808080 上の ✅/❌**：必ず `color.result.overlayBg`（半透明背景円）を敷いてから 7:1 を確保する。
> **カウントダウンの 7:1 は半透明バーでは保証されない（必読）**：カウントダウン領域は不透明 `color.countdown.bg` を必ず実効背景に持つこと。色変化は太字補強（NF-12）、点滅なし（NF-11）、数字のみ（F-12）。

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
| `font.display` | レベル数値ハイライト（ホーム結果の現在レベル） | 64 | 48pt | 1.1 | Bold tabular-nums | レベル数値は numeric を使う |
| `font.h1` | 画面タイトル（最大） | 36 | 27pt | 1.3 | Bold | |
| `font.h2` | セクション見出し / 上部バー残り秒 | 30 | 22.5pt | 1.35 | Bold | カウントダウンは段階色（22pt 以上＝F-01 受け入れ基準を満たす） |
| `font.h3` | サブ見出し | 26 | 19.5pt | 1.4 | Medium | |
| `font.body.lg` | 本文強調 / 主要ボタン文字 / **個数案内「◯個探せ！」** | 26 | 19.5pt | 1.55 | Medium〜Bold | F-02：個数は 18pt 以上 |
| `font.body` | 本文標準 / ボタン文字下限 | 24 | 18pt | 1.6 | Regular | OPT-1 の床 |
| `font.body.bold` | 本文強調 | 24 | 18pt | 1.6 | Bold | |
| `font.label` | ラベル・タブ・グラフ軸・**ゲーム中のレベル番号** | 24 | 18pt | 1.4 | Medium〜Bold | グラフ軸ラベルもこれ以上。F-02：レベル番号 18pt 以上 |
| `font.caption` | タイムスタンプ・バッジ獲得日付（補助のみ） | 20 | 15pt | 1.5 | Regular | 主要動線では使用禁止 |
| `font.numeric.xl` | 大カウントダウン（距離リマインド） | 72 | 54pt | 1.0 | Bold tabular-nums | danger 時 Black(900) |
| `font.numeric.l` | ストリーク日数/累計回数/最高到達レベル | 48 | 36pt | 1.1 | Bold tabular-nums | |

> **v2.0 からの変更**：`font.display`(48px) の用途を「スコア数値」から「**ホーム結果カードの現在レベル数値（64px に拡大）**」へ。`font.numeric.l` の用途に「最高到達レベル」を追加。スコア専用の数値スタイルは廃止。

### 2.3 使用規則
- 本文/ボタン文字は最小 24px。グラフ軸ラベルは 18pt（24px）以上。
- 数値（レベル・カウントダウン・回数）は `tabular-nums` で桁ぶれ防止。**レベル番号は最大 3 桁（720 まで）を想定し桁ぶれしない幅を確保**。
- 行間 1.6 以上（日本語の漢字濃度を考慮）。
- 強調は太字/サイズアップで行い、色強調はセカンダリ手段（NF-12）。
- `font.caption`（20px）は主要動線外の補助情報のみ。CTA・操作テキスト・エラー文には使わない。
- **個数案内（「3 個探せ！」）は `font.body.lg` 26px Bold 以上**（F-02：18pt 以上、認知負荷を下げるため大きめ推奨）。

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
| `radius.sm` | 8px（チップ・小ボタン・レベルピル） |
| `radius.md` | 12px（カード・入力欄） |
| `radius.lg` | 16px（大カード・ダイアログ） |
| `radius.pill` | 9999px（トグル・チップ・総合結果バッジ） |
| `elevation.0` | none（フラット面） |
| `elevation.1` | y2 blur8 rgba(0,0,0,0.08)（カード） |
| `elevation.2` | y4 blur16 rgba(0,0,0,0.12)（ダイアログ・タブバー上辺影） |

ダークモードでは影の代わりに `border.default` 1px + `bg.surfaceRaised` で階層を表現する。

---

## 4. モーション

| トークン | 値 | 用途 |
|---|---|---|
| `motion.duration.fast` | 120ms | トグル・チェック |
| `motion.duration.base` | 200ms | 画面遷移・フェード（NF-2：遷移 200ms 以内） |
| `motion.duration.result` | 200ms | ✅/❌ オーバーレイのフェードイン |
| `motion.duration.levelDelta` | 400ms | **レベル変化告知（+1/±0/−1）のフェード/スライド演出**（点滅なし） |
| `motion.duration.badge` | 1500ms | バッジ獲得演出（1 度のみ・点滅なし） |
| `motion.easing.standard` | cubic-bezier(0.2,0,0,1) | 標準 |

- **点滅エフェクト全面禁止**（NF-11、てんかん配慮）。カウントダウンの色変化補強は太字化のみ。
- **prefers-reduced-motion: reduce 時**：UI 装飾アニメーション（フェード・スライド・レベル変化演出・バッジ演出の動き）を 0ms 化または静的表示に。**ただし変化検出ゲーム本体の刺激アニメ（回転＝一方向/振動）は課題上必須のため抑制対象外**（NF-13）。
- レベル変化告知・バッジ獲得演出は拡大/フェードのみ（点滅・回転なし）。reduced-motion 時は静的に表示。

### 4.1 振動（往復回転）のモーション方針（NF-28c、Designer 体感狙い）
> 具体振幅・周期は実装余地（AS-11/AS-21）。本書は**狙い**を記述する。Generator が実機で確定する。

- **一方向回転**：パッチが現在レベルの `rotationSpeed`（deg/sec）で**一定方向に連続回転**する。角度は単調増加（または単調減少）。
- **振動（往復回転）**：パッチが**ある中心角を基準に、時計回り↔反時計回りを往復**する。同じ `rotationSpeed`（角速度の大きさ）を保ちつつ、一定振幅で折り返す。
  - **狙い 1（一方向との弁別）**：往復の「折り返し」が一定周期で観察できること。Designer 狙い値＝振幅 ±20°〜±40°、折り返し周期はその振幅と角速度から決まる（例：振幅 ±30°・速度 6deg/sec なら片道 5°…ではなく、片道 60°/振幅換算で約 10 秒で 1 往復に近い緩やかさ。実装で体感調整）。一方向は「ずっと同じ向きに回り続ける」、振動は「行って戻る」が明確に違って見えること。
  - **狙い 2（静止との弁別）**：振幅の最小値でも、`rotationSpeed` が最遅（2deg/sec）でも、「動いている」ことが静止パッチと区別できる最小可知差を上回ること（NF-28b と連動）。振動は折り返しの瞬間に一瞬止まって見えるため、静止との弁別が一方向より難しい → これが「振動＝難」の難易度根拠（spec AS-11）。
  - **狙い 3（角速度の保存）**：振動も一方向も、同じ `rotationSpeed` 値なら**瞬間角速度の大きさは同等**（折り返し点近傍を除く）。これにより「方向だけが難易度軸」として独立する。
- **回転速度（rotationSpeed）の意味（AS-12）**：値が小さい（遅い）ほど単位時間あたりの角度変化が小さく、「回転中か静止か」の弁別が難しい → 速度 6=最易、速度 2=最難。
- reduced-motion でもゲーム刺激（一方向/振動の回転）は止めない（NF-13、課題上必須）。

---

## 5. インタラクション原則

- **ホバー（Web/PC）**：背景を `primaryHover` 等に。ガボールパッチはホバーで枠を `selection.subtle.idle` 程度に薄く示してよい。
- **focus（NF-9）**：`color.focus.ring` で 3px outline + 2px offset。全インタラクティブ要素が Tab で到達、Enter/Space で起動。
- **pressed/active**：背景を 1 段濃く、トランジション `motion.duration.fast`。
- **disabled**：不透明度 0.4 + ポインタ無効。結果開示中はガボール格子全体を pointer-events: none に（F-03）。
- **トランジション**：`motion.duration.base` を標準。タブ切替は即時（ステート保持）。

---

## 6. アクセシビリティ規範（NF-7〜15）

- 全インタラクティブ要素 48pt 以上、ボタン/設定行/タブ 56pt 以上（OPT-2）。
- focus-visible 3px outline + 2px offset（NF-9）。
- 色のみで状態を伝えない（NF-12）：タブ選択は色＋上辺インジケータ＋太字ラベル、カウントダウン色変化は太字化補強、トグル ON/OFF は位置＋ラベル「ON/OFF」併記、グラフ当日点は色＋形（◆）、**レベル変化は色＋矢印形（▲/―/▼）＋テキスト**、**総合クリア/失敗は色＋アイコン＋「クリア」/「失敗」テキスト**で区別。
- 点滅禁止（NF-11）。prefers-reduced-motion 尊重（NF-13、ゲーム刺激は例外）。
- aria-checked / aria-pressed で選択状態を明示（NF-15）。ガボール選択セルは `role="checkbox"` + `aria-checked`。
- スクリーンリーダー（NF-10）：主要要素に aria-label。**レベル番号・個数・クリア/失敗を読み上げる**（spec a11y 要件、F-02/F-03）。結果開示で「クリア」「失敗」を `aria-live="assertive"` で 1 度。ゲーム開始時に「レベル {n}。{count} 個の回転を探してください」を読み上げ。
- Skip link（Web、NF-14）：各タブ画面上部に「メインコンテンツへスキップ」。
- カウントダウン：`aria-live="polite"`（残り 6 秒以上）→ `assertive`（残り 5 秒以下）。残り 3/2/1 秒で毎秒読み上げ。

---

## 7. ガボール描画品質規範（NF-26〜28c）

### 7.1 クリッピング方式（Designer 規範、v2.0 継承）
「**実サイズの N 倍で生成 → 矩形枠でクリッピング**」方式を採用。
- **N = 1.5（Designer 提案値）**：表示見かけサイズに対し内部生成は 1.5 倍で行う。ガウス窓の裾野が表示矩形の外まで連続的に伸びた状態で、表示時に見かけサイズの矩形枠でクリップする。
- 効果：角度を最小単位ずつ変えても、また回転中も、パッチ枠と縞模様の間に背景色（グレー）が見える隙間が出ない（NF-27 / NF-28）。
- 矩形マスクを採用する根拠：格子配置で矩形のほうがレイアウトが安定し隙間トラッキングが容易。
- Generator が 1.4（√2）で十分と判断すれば妥協可だが、本書は 1.5 を提案値とする。

### 7.2 回転/静止の弁別性（NF-28b）
- 静止パッチの初期角度ばらつきと、回転パッチの単位時間あたり角度変化量を、ユーザーが「回転中／静止」を区別できるよう調整する。各回転速度値（6〜2 deg/sec）でこの弁別が成立すること。
- **静止パッチの初期角度ばらつき（Designer 狙い）**：静止パッチ同士の初期角度は互いに **12° 以上**離れたランダム値。これは最易速度（6deg/sec×1〜2 秒分の回転量）より十分大きく、「静止の角度差」と「回転の動き」が混同しないマージン。静止は時間変化しないことが弁別の鍵。
- 最小可知差（向きの違いを弁別できる最小角度差）の具体値は §7.4 参照。

### 7.3 振動の視認性（NF-28c）
- 振動（往復回転）が**一方向回転と区別して観察でき**、かつ**静止とも区別できる**こと。
- §4.1 の振動モーション方針（折り返しが一定周期で観察できる、最遅速度でも静止と区別できる）を満たす。具体振幅・周期は Designer/Generator が体感調整（AS-11/AS-21）。

### 7.4 角度刻み・最小可視差（NF-26、Designer 提案値・v2.0 継承）
最小可視差。表示サイズ大・cpd 高ほど小さい差を弁別可能。

| パッチ辺長（格子内 1 個） | 1.5 cpd | 3 cpd | 6 cpd |
|---|---|---|---|
| 90px（4×4 格子相当） | 4° | 2.5° | 1.5° |
| 110px（3×3 格子相当） | 3° | 2° | 1° |
| 140px（PC 横・3×3） | 2° | 1° | 0.5° |

ガボール刺激の基準 cpd は **3 cpd**（@ 40cm 視聴）を既定とする（Generator 調整可）。サイズは現在レベルの `gridSize` が決める（既定 3x3 / 4x4。**v3.1 で 5x5 / 6x6 を追加**＝設定で ON にすると有効。5x5/6x6 のパッチ辺長・最小可視差の追補は §16.6 を参照）。

---

## 8. ステータスバー回避規範（NF-29 / NF-30）

| 画面 | 扱い |
|---|---|
| **ゲームプレイ中（ガボール格子提示）** | フルスクリーン許容（NF-29）。ガボール背景 #808080 がステータスバー領域まで広がってよい。ただし上部バーの文字・X ボタン・残り秒数・**レベル番号・個数案内**は必ずセーフエリア内に収める |
| **それ以外**（距離リマインド / ホーム結果 / 履歴 / 設定 / オンボ / 全ダイアログ / データリセット通知） | セーフエリア準拠（NF-30）。iOS=SafeAreaInset、Android=StatusBar.currentHeight、Web=`env(safe-area-inset-*)` + viewport-fit=cover |

- ボトムタブバーは常に bottom セーフエリアの内側に置き、タブバー下端にセーフエリア分のパディングを足す。
- `SafeAreaWrapper` コンポーネント（components.md SA-1）を全非ゲーム画面で必須使用。`mode="game"` は top inset を無視、`mode="default"` は全 inset 適用。

---

## 9. レベルシステムのデザイン定数（spec §4 由来・Designer 仮置き）

> spec §4.1 で 5 変数の値集合は確定済み（本書はそれを再掲し、UI 表現と体感に関わる仮置きを足す）。各変数の範囲設定の初期値（フル範囲か絞るか）と、体感に関わる具体値は Designer/Generator 仮置き → ユーザー実機確定（AS-21）。

### 9.1 5 変数の値集合（spec §4.1 確定・易 → 難）

| 変数 | キー | 値集合（易 → 難） | 段数 | UI 表現 |
|---|---|---|---|---|
| 個数 | count | 1, 2, 3, 4 | 4 | 「◯個探せ！」（ゲーム）/ 範囲チップ（設定） |
| 時間 | seconds | 40, 35, 30, 25, 20 | 5 | カウントダウン秒（ゲーム）/ 範囲チップ（設定） |
| 回転方向 | direction | 一方向, 振動 | 2 | 不可視（ゲームでは値を文字表示しない）/ 範囲トグル（設定） |
| サイズ | gridSize | 3x3, 4x4 | 2 | 格子の見た目（ゲーム）/ 範囲チップ（設定） |
| 回転速度 | rotationSpeed | 6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2 | 9 | 不可視（ゲームでは数値表示しない、F-03）/ 範囲レンジ（設定） |

- **デフォルト変化順（最内側 → 最外側）**：個数 → 時間 → 回転方向 → サイズ → 回転速度（spec §4.2、AS-3）。
- **デフォルト総レベル数**：4×5×2×2×9 = **720**。L1=全最易、L720=全最難。
- **ゲーム画面に表示するのはレベル番号と個数のみ**（F-03 受け入れ基準：速度・角度などの内部数値テキストは表示しない）。サイズは格子の見た目で自然に伝わる。方向・速度は数値表示しない。

### 9.2 範囲設定（振れ幅）の初期値（Designer 仮置き、F-13）
- **初期値はフル範囲**（全変数のすべての値が有効 = デフォルト 720 レベル）。テスト用に絞るのはユーザー操作。
- 各変数は**少なくとも 1 値を有効**にする必要がある（全無効不可、F-13 受け入れ基準）。UI は最後の 1 値を無効化しようとした操作をブロックする。
- 範囲・変化順を変えると総レベル数・各レベルの中身が変わり、現在レベルは新範囲にクランプ、連続失敗カウントは 0 リセット（spec §4.5、F-13）。

### 9.3 高難度・高レベルバッジ判定の閾値（§6 / B-06〜B-11、Designer 提案値・Generator 仮置き可）
> spec §6 は具体閾値を Generator 仮置きとする。デフォルト 720 レベル前提の提案値。範囲設定で総レベル数が変わる場合は**割合ベース**で判定（Generator 判断）。

- **B-06 振動を見抜く目**：回転方向が「振動」のレベルをクリア。
- **B-07 スロー回転ハンター**：回転速度が「遅い」域（`rotationSpeed ≤ 3`、下位 1/3 ＝ 3, 2.5, 2）のレベルをクリア。
- **B-08 達人の眼**：最難域のレベルをクリア。提案＝全変数が各自の最難寄り（個数4 かつ サイズ4x4 かつ 振動 かつ rotationSpeed≤2.5）のレベルをクリア。デフォルト 720 なら概ね最上位域。
- **B-09 二桁の壁**：最高到達レベル ≥ 10。
- **B-10 熟達者**：最高到達レベルが「中盤以上」。提案＝総レベル数の 50%（デフォルト 720 なら ≥ 360）。
- **B-11 頂を目指して**：最高到達レベルが「終盤」。提案＝総レベル数の 85%（デフォルト 720 なら ≥ 612）。

### 9.4 結果開示・インターバルの体感値（Designer 仮置き、F-03/AS-14）
- 結果開示（✅/❌ オーバーレイ + 総合クリア/失敗）の表示後、次の状態（ホーム結果表示 or 次ゲーム）へ進むまでの**短いインターバル＝ Designer 提案 1.5 秒**（reduced-motion でも同じ）。
- **全問正解で即時クリア**した場合：短い正解フィードバック（総合「クリア」を 0.6 秒）でも足りる（F-03、Designer 判断）。ただし v3.0 では「どのパッチが回転だったか」をユーザーが確認したい需要があるため、**即時クリア時も ✅ オーバーレイを 1.5 秒見せてからホーム結果へ**進める方針を推奨（即時クリアでも開示する）。Generator が体感で短縮可。
- 時間切れ・誤り含みの失敗時：✅（回転していた）/❌（誤選択）オーバーレイ + 総合「失敗」を 1.5 秒表示 → ホーム結果へ。
- v3.0 は **1 ゲーム = 1 レベル挑戦**のため、結果開示後は必ずホーム結果表示（S7）へ進む（v2 の「次ラウンドへ」は存在しない）。

---

## 10. 音・ハプティクストークン（F-14、クリア/失敗・レベルアップに適合）

### 10.1 イベント別発火パターン

| イベント | 音種 | 継続 | 音量 | ハプティクス | 設定 OFF 時 |
|---|---|---|---|---|---|
| クリア（総合クリア確定） | clear（明るい上行 2 音） | 200ms | 60% | light 1 回 | 音OFF=無音 / 振動OFF=無振動 |
| 失敗（総合失敗確定） | fail（やや低音 1 音、責めない柔らかさ） | 200ms | 50% | medium 1 回 | 同上 |
| カウントダウン残り 3/2/1 秒 | tick（短い tic） | 80ms | 40/50/60% | なし | 音OFF=無音 |
| **レベルアップ（+1）** | levelup（達成感のある上行 3 音） | 400ms | 65% | medium 1 回 | 同上 |
| バッジ獲得 | badge（達成感 3 音） | 600ms | 70% | heavy + medium 2 連 | 同上 |

> **v2.0 からの変更**：「セッション完了音(end)」を廃止（1 ゲーム=1 レベル挑戦で「セッション」概念がない）。代わりに「レベルアップ音(levelup)」を新設（F-14 受け入れ基準：レベルアップ時に専用音）。「正解/不正解音」を「クリア/失敗音」に読み替え。レベルダウン（−1）には専用音を必須化しない（spec F-14 は「レベルアップ時」のみ音を規定。失敗音で十分。Generator 判断で穏やかな別音可だが必須ではない）。

### 10.2 規範
- アセット：`assets/sounds/clear.mp3` / `fail.mp3` / `tick.mp3` / `levelup.mp3` / `badge.mp3`。
- サイレントモード（OS）尊重（NF-33）：音は鳴らさずハプティクスは発火（振動 OFF でない限り）。
- アプリ内「音 ON/OFF」「振動 ON/OFF」は OS 設定よりさらに細かい個別制御。
- **試行中（締め切り前の注視中）は結果フィードバック以外の音/振動を発火しない**（F-14 受け入れ基準）。ティック音は残り 3/2/1 秒のみ。
- 音再生レイテンシ 100ms 以内（NF-31）。ハプティクス強度は端末標準（NF-32）。
- レベルアップ音・バッジ獲得音は**ホーム結果表示（F-08）/ 結果開示後**に発火（クリア音 → レベルアップ音 → バッジ音の順序が重なる場合は短い間隔で連続、Generator 判断で重複回避）。

---

## 11. アプリアイコン（スコープ外・現状維持）
- v3.0 でもアプリアイコン差し替えはスコープ外（spec §11）。現状の `app.json` のアイコン設定を維持する。Designer は新規アイコン仕様を出さない。

---

## 12. 永続化スキーマとの一貫性（データモデル §7 横断確認）

UI が要求する状態が spec §7 のスキーマ（`gaboreye:v3:*`）に乗ることを確認する（バッチ設計の利点）。

| UI が要求する状態 | スキーマ上の格納先（spec §7） | 確認 |
|---|---|---|
| オンボ済み判定（初回のみオンボ） | `UserProfile.onboardingCompleted` | OK |
| 免責同意日時（設定のバージョン情報表示） | `UserProfile.disclaimerAgreedAt` | OK |
| 70 代以上警告（オンボ年齢層） | `UserProfile.ageGroup` | OK |
| 距離リマインドの cm | `UserProfile.viewingDistanceCm` | OK |
| 設定：各変数の振れ幅（範囲） | `Settings.variableRanges` | OK |
| 設定：変化順 | `Settings.variableOrder` | OK |
| ダーク/音/振動/片眼 | `Settings.darkMode/soundEnabled/hapticsEnabled/oneEyeGuidance` | OK |
| ゲーム画面の現在レベル番号 | `LevelState.currentLevel`（→ 変化順・範囲から 5 変数を導出） | OK |
| 個数案内「◯個探せ！」 | `currentLevel` → `levelParams.count`（導出、`GameRecord.levelParams` に記録） | OK |
| 連続失敗カウント（永続、レベルダウン判定） | `LevelState.consecutiveFailures` | OK |
| ホーム結果：クリア/失敗・レベル変化（+1/±0/−1） | `GameRecord.result` / `GameRecord.levelDelta` | OK |
| ホーム結果：現在レベル | `LevelState.currentLevel`（増減反映後） | OK |
| ホーム結果：今日のストリーク | `Streak.currentStreak` | OK |
| ✅/❌ オーバーレイ（回転だった/誤選択） | ゲーム実行時メモリ state（どのパッチが回転/静止か、ユーザー選択）。永続化は `GameRecord.result/levelParams` のみ | OK（開示は実行時 state、記録は結果） |
| 履歴：日次到達レベル折れ線（同日 max） | `DailyStats.highestLevelReached`（同日 max） | OK |
| 履歴：最高到達レベル | `LevelState.highestLevel` | OK |
| 履歴：連続日数ストリーク | `Streak.currentStreak` | OK |
| 履歴：累計プレイ回数 | `PlayStats.totalGames` | OK |
| バッジ判定（高難度/高レベル） | `GameRecord.levelParams`（高難度判定）/ `LevelState.highestLevel`（高レベル判定）/ `Streak.currentStreak`（継続） | OK |
| バッジ獲得/未獲得 | `BadgeStatus.earned/earnedAt` | OK |
| 中断は記録しない | `GameRecord.completedAt = null` を記録対象外（または保存しない） | OK |
| データリセット通知 1 度だけ | 旧名前空間（v1〜v2）消去フラグ（実装判断、`gaboreye:v3:*` 初期化の有無で判定） | OK |

> **設計判断（v3.0）**：✅/❌ オーバーレイの「どのパッチが回転/静止で、ユーザーがどう選んだか」はゲーム実行中のメモリ state で保持し、永続化は `GameRecord`（result / levelParams / levelDelta）のみ。1 ゲーム = 1 レコードのため、過去ゲームのパッチ座標を永続化する必要はない（スキーマと矛盾しない）。`DailyStats.highestLevelReached` はクリア基準の代表値 max（spec §7.5）。

---

## 13. コピーライティング規範（OPT-6 / 薬機法配慮）

- 医療効果を断定しない（AS-17）。「視力が回復」「治る」は禁止。「自助セルフケア」「目を集中させる」「見つける練習」等の表現を使う。
- **進捗は「レベル」と呼ぶ**。「視力 0.X」のような医療数値は使わない。「レベル {n}」「最高到達レベル {n}」「レベルが上がりました」。
- 優しい言い回し（急かさない、責めない）。**失敗・レベルダウンは否定語を避ける**：「失敗」は事実提示にとどめ、レベルダウンは「無理なく続けられるよう、レベルを 1 つ下げました」等の前向きな言い回し。「残念」「ダメ」等は使わない（OPT-6 / US-4）。
- クリアは「クリア！」「レベルが上がりました」と素直に称揚。
- 主要文言の i18n キー命名規約は §14。

---

## 14. i18n キー命名規約（日本語ロケールのみ、NF-25）

```
# タブ
tab.home = "ホーム"
tab.history = "履歴"
tab.settings = "設定"

# ゲーム（F-01/F-02/F-12。v3.2：本番は「全て探せ」、個数を伏せる）
game.level = "レベル {n}"
game.find.all = "全て探せ"                          # v3.2 新規：本番教示（CB-1 all）
game.count.findN = "{n} 個探せ！"                    # チュートリアル教示（CB-1 count）のみ
game.practice = "練習"                               # v3.2 新規：TB-1 PracticeBadge
game.countdown.remaining = "残り {n} 秒"
game.session.remaining = "あと {mm}:{ss}"            # v3.1：セッション残り時間
game.abort.iconLabel = "ゲームを中断"
game.a11y.start.all = "回転しているものを全て探してください"        # v3.2：本番開始 SR（個数読み上げなし）
game.a11y.start.tutorial = "練習。{n} 個の回転を探してください"     # v3.2：チュートリアル開始 SR

# チュートリアル（F-15・§4.8、v3.2 新規）
tutorial.progress = "練習 {current}/3"               # TB-2 TutorialProgress
tutorial.toMainStart = "練習はここまで。本番（レベル 1）を始めます"  # R3 → L1 橋渡し

# 結果開示（F-03）
result.aggregate.clear = "クリア"
result.aggregate.fail = "失敗"
result.check.correct.label = "回転（選択済み）"
result.check.missed.label = "回転（選び逃し）"
result.cross.wrong.label = "誤選択"

# ホーム結果（F-08/F-04）
home.result.clear = "クリア！"
home.result.fail = "失敗"
home.result.currentLevel = "現在のレベル"
home.result.levelUp = "レベルが上がりました（+1）"
home.result.levelSame = "レベルはそのままです"
home.result.levelDown = "無理なく続けられるよう、レベルを 1 つ下げました"
home.streak = "連続 {n} 日"
home.replay = "もう一度"

# レベル変化告知（F-04）
levelDelta.up = "レベル {from} → {to}"
levelDelta.same = "レベル {n}"
levelDelta.down = "レベル {from} → {to}"

# 中断ダイアログ（F-07）
abort.dialog.title = "プレイを中断しますか？"
abort.dialog.body = "中断するとこのゲームは記録されず、レベルも変わりません。"
abort.dialog.ok = "中断する"
abort.dialog.cancel = "続ける"

# 起動フロー（F-06）
onboarding.disclaimer.agree = "同意する"
onboarding.age.title = "年齢層を選んでください（任意）"
onboarding.distance.title = "視聴距離を選んでください"
onboarding.howto.title = "ゆっくり回転するパッチを見つけてタップ"
distanceReminder.headline = "画面から {n}cm 離れてください"
distanceReminder.autoStart = "{n} 秒後に自動で始まります"
distanceReminder.oneEye = "片目を覆ってください（任意）"

# データリセット（F-11）
dataReset.title = "最新版へのアップデート"
dataReset.body = "最新版へのアップデートのため、過去データをリセットしました"
dataReset.cta = "OK"

# 履歴（F-09）
history.dailyLevel.title = "到達レベルの推移"
history.highestLevel.title = "最高到達レベル"
history.streak.title = "連続日数"
history.totalPlays.title = "累計プレイ回数"
history.empty.lessThan7Days = "もう少しデータが集まると傾向が見えます"
history.badges.title = "バッジ"

# バッジ（§6、3 軸 11 種）
badge.B-01.name = "はじめの一歩"
badge.B-06.name = "振動を見抜く目"
badge.B-07.name = "スロー回転ハンター"
badge.B-08.name = "達人の眼"
badge.B-09.name = "二桁の壁"
# ... B-02〜B-05 / B-10〜B-11 は components.md / sprint-9 screens.md 参照

# 設定（F-13。v3.2：repeatCount / countRange 追加、range.count 廃止）
settings.sessionMinutes = "1 回のプレイ時間"
settings.repeatCount = "繰り返し回数"                                       # v3.2 新規（SR-1b）
settings.repeatCount.value = "{n}回"
settings.repeatCount.hint = "同じ難易度を何回くり返してから次に進むかです。総レベル数（{n}×180）が変わります"
settings.countRange = "個数の範囲"                                          # v3.2 新規（SR-1c、プリセット選択）
settings.countRange.cells_minus_1 = "セル数いっぱい"
settings.countRange.half = "ひかえめ（半分まで）"
settings.countRange.fixed_1_4 = "1〜4 固定"
settings.countRange.hint = "1 ラウンドで回転する数の範囲です。難易度（レベル）には影響しません"
settings.range.title = "各変数の範囲（テスト用）"
# settings.range.count = "個数の範囲"  ← v3.2 廃止（個数は難易度変数から除外、§17.4）
settings.range.seconds = "時間の範囲"
settings.range.direction = "回転方向の範囲"
settings.range.gridSize = "サイズの範囲"
settings.range.rotationSpeed = "回転速度の範囲"
settings.order.title = "変化順（テスト用）"
settings.order.hint = "上ほど先に（頻繁に）変化します"
settings.viewingDistance = "視聴距離"
settings.darkMode = "ダークモード"
settings.sound = "効果音"
settings.haptics = "振動"
settings.oneEye = "片眼ガイダンス"
settings.disclaimer.read = "免責事項を読む"
settings.dataDelete = "全データ削除"
settings.version = "バージョン"
```

> **v2.0 から削除した i18n キー**：`session.score.*`（スコア）、`result.check.tp/fn.label`・`result.cross.fp.label`（→ correct/missed/wrong に置換）、`history.dailyScore.title`（→ dailyLevel）、`settings.param.gridSize/roundSeconds/roundCount/rotationSpeed/sfChangeSpeed`（手動スライダー廃止）、`settings.scoringMode.*`（採点方式廃止）。

---

## 15. システムバージョン
- **v3.2（本書が最新規範、§17 が v3.2 差分）**。`v3.2.x` を設定バージョン情報に表示（F-13）。v3.0/v3.1 は本書の土台として継承。
- 後続変更は Designer amendment モードで実施（オーケストレーター/ユーザー承認必須）。

---

## 16. v3.1 差分（セッション制）— トークン・定数・指針

> 本章は v3.1 で追加・変更する**デザイン差分のみ**を集約する。§1〜§14 の確定トークン（色・タイポ・スペース・a11y）は不変で、ここでは流用・追補にとどめる。spec §4.3/§4.6/§4.7・F-01/F-03/F-08/F-13 に対応。

### 16.1 ラウンド開示の 3 秒カウントダウン（spec §4.6 B2 / F-03 改訂 / AS-25）
- **正体**：締切後の ✅/❌ 開示中に表示する **3 秒固定**のカウントダウン。**CD-1 `CountdownTimer` を流用**し、F-12 の色段階・太字補強・点滅なしを満たす。3 秒は確定値（Designer/Generator が変更しない、spec §4.6）。
- **配置**：刺激領域直下、**OV-3 総合クリア/失敗バッジの近傍**（バッジの右隣 or 直下）。制限時間タイマー（GB-1 上部バー中央）と物理的に離し、混同を避ける。
- **色段階の適用**：開示カウントダウンは 3→0 の 3 秒間のみなので、F-12 の「残り 3 秒以下＝赤(danger)・Black 太字」が**全区間に適用**される。すなわち開始から赤＋Black 太字（距離リマインドの 3 秒カウントダウンと同じ運用、DR-1 と整合）。`color.countdown.danger` を**不透明背景上**で使う（半透明ガボール越し禁止、§1.4）。開示カウントダウンの直下/背後に不透明プレート（`color.countdown.bg`）を敷く。
- **意味付けトークン（新規・別名のみ。値は既存流用）**：

| トークン | 値 | 用途 |
|---|---|---|
| `disclosure.countdown.seconds` | `3`（固定・spec 確定値） | ラウンド開示 → 次ラウンド自動遷移までの秒数 |
| `disclosure.countdown.color` | `color.countdown.danger`（赤）+ Black(900) | 開示カウントダウンの文字色・太字（全区間 danger 扱い） |
| `disclosure.countdown.bg` | `color.countdown.bg`（不透明 #FFFFFF / #15171C） | 開示カウントダウンの実効背景（7:1 保証） |
| `motion.duration.disclosure.tick` | 1000ms（毎秒更新、点滅なし） | 3→2→1 の数字差し替え。≤3 秒なので毎秒ティック音（§10、F-14） |

- **挙動**：開示中（3 秒間）は**ガボール格子・カウントダウンともにタップ無効**（GG-1 `pointer-events: none`、F-03）。0 で自動的に次ラウンド（または累積時間到達でセッション要約）へ遷移。ユーザー操作不要。
- **a11y**：開示出現時に総合「クリア」/「失敗」を `aria-live="assertive"` で 1 度（OV-3 既存）。続けて開示カウントダウンは `aria-live="assertive"`、3/2/1 を毎秒読み上げ（CD-1 既存規範）。「全問正解で即時終了」の告知文言は廃止（spec §11）。

### 16.2 セッション残り時間の表示（spec F-01/F-08 / AS-22）
- **目的**：セッション（指定時間まで反復）の残り時間をユーザーが控えめに把握できるようにする。**制限時間カウントダウン（F-12、ラウンド単位）とは別物**。混同を避けるため、以下で明確に差別化する。

| 項目 | ラウンド制限時間（CD-1） | セッション残り時間（新規） |
|---|---|---|
| 位置 | GB-1 上部バー**中央**（最も目立つ） | GB-1 上部バー**左寄り**（X ボタンの隣）または個数バナー（CB-1）の同列の小さな副情報 |
| サイズ | `font.h2` 30px（22pt+） | `font.label` 24px（18pt 床。**主役より小さく控えめ**） |
| 色段階 | 白→黄→赤の 3 段階（F-12） | **段階色なし**。常時 `color.fg.secondary`（副テキスト、不透明バー上 7:1） |
| 太字 | 段階で Bold/Black | Medium（強調しない） |
| 表記 | 「{n}」秒のみ（数字） | **分:秒**（例「あと 4:32」）。tabular-nums で桁ぶれなし |
| 更新 | 毎秒 | 毎秒（残り時間が 0 に近づいても色変化・点滅なし） |

- **トークン（意味付け・値は流用）**：

| トークン | 値 | 用途 |
|---|---|---|
| `session.remaining.font` | `font.label` 24px Medium tabular-nums | セッション残り「あと M:SS」 |
| `session.remaining.fg` | `color.fg.secondary`（light #4A4F5A 7.87:1 / dark #9CA3AD） | 残り時間の文字色（不透明バー上） |

- **最小限の原則**：セッション残り時間は**控えめ**に出す（老眼配慮で「急かさない」OPT-7）。色段階・点滅で煽らない。残り時間が 0 に近くても見た目を変えない（最後のラウンドは完走するため、ここで赤くする意味がない、spec §4.6）。
- **i18n キー（追加）**：`game.session.remaining = "あと {mm}:{ss}"`。
- **a11y**：`aria-label="セッション残り {mm} 分 {ss} 秒"`、`aria-live="off"`（控えめ＝頻繁読み上げしない。ラウンド制限時間タイマーのみ aria-live で読み上げる）。

### 16.3 ラウンドごとのレベル変化の視認（spec F-04 / AS-26）
- レベルはラウンドごとに上下する。**次ラウンドの GB-1 レベルピル（LB-1 inline）が変化後の値に切り替わる**ことで、レベル変化が観察できる（F-04 受け入れ基準「次ラウンドのレベル表示変化」）。
- 加えて、**開示中（3 秒）にゲーム画面内で LD-1 `LevelDeltaIndicator` をコンパクトに併置**してよい（OV-3 総合バッジの近傍、開示カウントダウンと同領域）。+1=▲緑 /±0=―灰 /−1=▼暗橙（責めない、§1.4）。これは v3.0 でホーム結果カードにあった LD-1 を**ラウンドごとの開示へ移設**したもの。色＋矢印形＋テキストの 3 重（NF-12）は不変。
- 演出 `motion.duration.levelDelta` 400ms フェードのみ（点滅なし、reduced-motion 時静的）。3 秒開示内で読み切れる短文に（「レベル {from} → {to}」）。
- セッション要約カード（RC-1）は**ラウンド単位の LD-1 を主役にしない**。代わりに「今セッションの到達レベル」を主役とする（§16.4）。

### 16.4 セッション要約カードのレイアウト指針（spec F-08 / RC-1 改訂 / AS-29）
- セッション末にホームへ表示する RC-1 の構成（縦、上から）：
  1. **見出し**：「セッション終了」`font.h2` 30px（または控えめに「おつかれさまでした」OPT-6）。
  2. **現在のレベル（主役）**：`LB-1 LevelBadge large`「現在のレベル」`font.label` + 数値 `font.display` 64px。**= 次セッション開始レベル**。`color.level.fg` 強調。カード内で最大要素。
  3. **今セッションの最高到達レベル**：`font.numeric.l` 48px + ラベル `font.label`「このセッションの最高」。主役（現在レベル）より一回り小さく。`color.level.fg`。
  4. **ラウンド集計**：横並び 3 値タイル（`ST-1` 流用）「ラウンド {n}」「クリア {c}」「失敗 {f}」。`font.numeric.l` 48px は過大なので各 `font.body.lg` 26px 数値 + `font.label` ラベルで密度を上げる（360px で 3 列、または 2+1 折返し）。クリアは `color.result.aggregate.clear` 系の緑アクセント、失敗は中立（責めない＝赤を主張しない、OPT-6）。
  5. **今日のストリーク**：「連続 {n} 日」`font.body` 24px（🔥 + `color.streak.flame`、形＋テキストで色非依存）。
  6. （任意）バッジ獲得時 `BG-2 BadgeAwardToast` を 1 度。
  7. `Button primary lg`「もう一度」**64px（≥56pt）**。押すと距離リマインド経由で新セッション（増減後の現在レベルから、累計プレイ回数 +1）。
- **トークン（意味付け）**：

| トークン | 値 | 用途 |
|---|---|---|
| `session.summary.level.primary` | `font.display` 64px Bold `color.level.fg` | 現在レベル（次セッション開始、主役） |
| `session.summary.level.highest` | `font.numeric.l` 48px Bold `color.level.fg` | 今セッション最高到達レベル |
| `session.summary.stat.value` | `font.body.lg` 26px Bold tabular-nums | ラウンド/クリア/失敗数 |
| `session.summary.stat.clear.fg` | `color.result.aggregate.clear` bg 系 緑（テキストは `#0A6238` 7.45:1） | クリア数の緑アクセント |
- **i18n キー（追加）**：
```
session.summary.title = "セッション終了"
session.summary.currentLevel = "現在のレベル"
session.summary.highestInSession = "このセッションの最高"
session.summary.rounds = "ラウンド {n}"
session.summary.clears = "クリア {n}"
session.summary.fails = "失敗 {n}"
```
- 既存 `home.streak` / `home.replay` は流用。`home.result.clear/fail`（1 ラウンド結果）はゲーム画面内開示（§16.1）へ移り、**セッション要約カードには出さない**（セッション全体の集計を出す）。
- **a11y**：`role="region"` aria-label「セッション終了。現在のレベル {n}。このセッションの最高 {h}。ラウンド {r}、クリア {c}、失敗 {f}。連続 {d} 日」。「もう一度」focus ring・56pt+。

### 16.5 拡張レンジチップの折返し指針（spec §4.1 / F-13 / RG-1 拡張 / AS-27）
- v3.1 で RG-1 のチップが増える（個数 6・時間 11・サイズ 4・速度 13）。**追加値は既定 OFF**＝既存の**未選択チップスタイル**（`border.input` 枠 + `fg.primary`、塗りなし・✓なし）で描く。新スタイルは作らない。
- **折返しレイアウト規範（360px 破綻回避）**：
  - チップは **flex-wrap で自動折返し**（横スクロールに依存しない）。各チップ最小タップ 48pt 高、横は内容（最大「5x5」「6.5」等の短文）＋左右 `space.3`。
  - 1 チップ最小幅の目安：48〜64px。360px（外側余白 16×2 = 32 を引いた 328px）に **4〜5 個/行**収まる。時間 11 値・速度 13 値は **3 行程度**に自然折返し。
  - チップ間ギャップ `space.2`（8px）、行間 `space.2`。チップ群は左揃え。横スクロールは使わない（老眼配慮で全選択肢が一覧できるほうが良い）。
  - 既定 ON 値と追加 OFF 値は**同じ行に易→難順で連続**して並べる（spec §4.1 の順序）。OFF 値だけ末尾に隔離しない（易→難の連続性を保つ、spec §4.1）。視覚差は「塗り（ON）vs 枠のみ（OFF）」で十分に付く。
- **総レベル数プレビュー**：既存どおり RG-1/OR-1 共有で 1 箇所表示（既定 720、追加 ON で増加）。spec §4.1 の全 ON 理論上限 6864 を表示できるよう桁ぶれ対応（tabular-nums、4 桁想定）。
- a11y は RG-1 既存（各チップ `role="checkbox"` + `aria-checked`、追加 OFF 値は `aria-checked="false"` で初期描画）。

### 16.6 5x5 / 6x6 格子の描画指針（spec §4.1/§4.7 / F-01 / GG-1/2 拡張 / NF-28d）
- **対応サイズ**：3x3(9) / 4x4(16) に加え **5x5(25) / 6x6(36)**。サイズは設定で ON にしたときのみ出現（既定 OFF）。
- **全体辺長**：v3.0 と同じ `min(viewport.short_edge − 32, 360)px`（スマホ）/ 480px（PC）を維持（格子全体のフットプリントはサイズに依らず一定。セル数だけ増える）。
- **セル辺長・間隔・タップ領域**（全体辺 328px @360 を例に、隙間込み）：

| gridSize | セル数 | 推奨隙間 | パッチ辺長（@328px スマホ） | パッチ辺長（@480px PC） | タップ最小 |
|---|---|---|---|---|---|
| 3x3 | 9 | `space.2`(8px) | ≈ (328−16)/3 ≈ **104px** | ≈ 154px | 48pt 余裕 |
| 4x4 | 16 | 6px | ≈ (328−18)/4 ≈ **77px** | ≈ 116px | 48pt 余裕 |
| **5x5** | 25 | 5px | ≈ (328−20)/5 ≈ **61px** | ≈ 91px | **48pt 確保**（タップ領域はセル全体＝最小辺 61px ≧ 48pt 相当 ≒ 64px 物理。OK） |
| **6x6** | 36 | 4px | ≈ (328−20)/6 ≈ **51px** | ≈ 78px | **48pt 下限ぎりぎり**。隙間を 4px に詰め、タップ領域はパッチ + 隙間半分まで広げて 48pt を死守 |

- **タップ領域確保（6x6、360px の要）**：6x6 のパッチ描画辺は約 51px。**タップ判定領域は描画辺＋周囲の隙間（パッチ間 4px の半分ずつ）を含め ≈ 55px** とし、48pt（≒ 64px @物理 1pt=1.333px → CSS 48px）の下限を満たす。隙間をこれ以上広げない（パッチ自体が小さくなりすぎ視認性が落ちるため）。Generator は実機で 6x6 のタップ命中率を検証する。
- **老眼配慮下の視認性（NF-28d）**：6x6 のパッチ辺 ≈ 51px は 3x3 の半分以下。縞（cpd）は**パッチ辺長に対し相対的に縞本数を保つ**（基準 3 cpd を視角ベースで維持。小さいパッチでは縞が密になりすぎないよう、Generator が cpd を実機調整、§7.4 の最小可視差表を 51〜61px 帯に外挿）。**回転/静止の弁別**（§7.2、初期角 12°+ 分散）が小サイズでも成立すること。破綻する場合は cpd を下げて縞を太くする（Generator 余地、AS-21）。
- **過密回避（§4.7 / AS-28）**：有効個数は格子セル数未満（個数 < gridSize²、静止が必ず 1 つ以上）。生成時クランプ（`min(count, gridSize² − 1)` 目安）。例：個数 6 × 3x3(9 セル) は許容（6<9）だが過密 → サイズ次第でクランプ。**6x6(36 セル) なら個数 6 でも余裕**（6 ≪ 36）。クランプはラウンド生成時のみ適用、梯子の総レベル数は変えない（spec §4.7）。
- **選択枠・✅/❌ オーバーレイ**：小パッチでも `color.selection.subtle` 2px 枠・`color.result.overlayBg` 円（直径 ≒ パッチ辺 55%）は**比例縮小**。6x6（辺 51px）では円 ≈ 28px、✅/❌ アイコン ≈ 20px。**縞を完全には覆い隠さない**透過度を維持（F-03）。アイコンが小さくなりすぎる場合は overlayBg 円を辺 60% まで拡大可（Generator 判断、ただし縞を完全には隠さない）。
- a11y：各セル `role="checkbox"` + `aria-checked` + `aria-label="パッチ {行}-{列}"`（GG-2 既存、行列が増えるだけ）。Web は Tab で 36 セル全到達 + Space トグル。

---

## 17. v3.2 差分（チュートリアル・繰り返し軸・個数ランダム化）— トークン・定数・指針

> 本章は v3.2 で追加・変更する**デザイン差分のみ**を集約する。§1〜§14 の確定トークン（色・タイポ・スペース・a11y・モーション・ガボール描画品質・音）は**不変**で、ここでは流用・追補にとどめる。**新色・新フォントサイズは作らない**（既存トークンのみ使用）。spec §0.0/§4.8/§4.9・F-02/F-06/F-13/F-15 に対応。
>
> **v3.1 → v3.2 の本質的変更（デザイン観点。差分は本章に集約）**
> - **本番教示「全て探せ」化**：CB-1 教示バナーを `all` バリアント（「全て探せ」固定文言・個数非表示）に。チュートリアルのみ `count` バリアント（「◯個探せ！」）を残す（F-02/AS-36）。
> - **チュートリアル Lv0 画面**：S5 ゲーム画面のレイアウトを流用し、「練習」コンテキスト（TB-1）・3 ラウンド進行（TB-2）・個数明示（CB-1 `count`）を差分として足す（F-15/§4.8）。レベルピルは「練習」表示に差し替え。
> - **設定 2 行追加**：`repeatCount`（繰り返し回数 n、ステッパー SR-1b）・`countRange`（個数範囲プリセット、セグメント SR-1c）（F-13/§7.2）。
> - **個数を難易度から除去**：RG-1 から個数チップ群を除去、OR-1 から個数行を除去（外側 4 変数のみ）。繰り返し軸は最内側固定で組み替え対象外（§4.2）。
> - **不変**：全カラートークン・タイポ・スペース・カウントダウン仕様（F-12/§16.1）・セッション残り時間（§16.2）・レベル昇降告知（§16.3/LD-1）・セッション要約カード（§16.4）・拡張レンジチップの折返し（§16.5）・5x5/6x6 格子（§16.6）。

### 17.1 本番教示「全て探せ」と教示バナーのバリアント（spec §4.9 / F-02 / AS-36）
- **本番（L1 以上）**：CB-1 教示バナー `all` バリアント。文言「**全て探せ**」固定。**個数を一切表示しない**（F-02 受け入れ基準「回転パッチの個数は表示しない」）。各ラウンドの実個数は `countRange` 範囲でランダムだが、画面には出さない（内部値）。
- **チュートリアル（Lv0）**：CB-1 `count` バリアント。「{n} 個探せ！」（R1=1 / R2=2 / R3=3、§4.8）。
- **配置・スタイルは v3.1 の CB-1 と同一**（ゲーム上部バー直下・格子の上・不透明ピル・`font.body.lg` 26px Bold・`color.fg.primary` on `color.bg.surface` 7:1）。文言が変わるだけで、新トークン・新サイズは不要。
- **i18n キー（追加・改訂）**：

| キー | 値 | 用途 |
|---|---|---|
| `game.find.all` | 「全て探せ」 | 本番教示（CB-1 `all`、v3.2 新規） |
| `game.count.findN` | 「{n} 個探せ！」 | チュートリアル教示（CB-1 `count`、v3.0 既存を流用） |
| `game.a11y.start.all` | 「回転しているものを全て探してください」 | 本番ゲーム開始時 SR 読み上げ（旧 `game.a11y.start` を本番用に改訂） |
| `game.a11y.start.tutorial` | 「練習。{n} 個の回転を探してください」 | チュートリアル各ラウンド開始時 SR 読み上げ |
| `game.practice` | 「練習」 | TB-1 PracticeBadge／チュートリアル文脈 |
| `tutorial.progress` | 「練習 {current}/3」 | TB-2 TutorialProgress |
| `tutorial.toMainStart` | 「練習はここまで。本番（レベル 1）を始めます」 | R3 完了 → L1 橋渡し表示（§17.2） |

> **旧 `game.a11y.start`（「レベル {level}。{count} 個の回転を探してください」）は本番では `game.a11y.start.all` に置換**（個数を読み上げない）。チュートリアルは `game.a11y.start.tutorial`（練習＋個数を読み上げる）。

### 17.2 チュートリアル Lv0 のデザイン定数・橋渡し（spec §4.8 / F-15 / AS-31〜34）
- **レイアウト流用**：チュートリアルは **S5 ゲーム画面（GB-1 / CB-1 / GG-1 / GG-2 / OV-1〜3）をそのまま流用**し、以下の差分のみ足す（新規大規模画面を作らない）：
  - GB-1 右ピル：レベル番号 →「練習」（TB-1）。
  - CB-1：`all` →「{n} 個探せ！」（`count`、R1=1/R2=2/R3=3）。
  - 教示バナー直下に TB-2（3 ラウンド進行ドット）。
  - 固定パラメータ：全ラウンド 時間 30 秒・一方向・3x3・速度 5（§4.8 表）。
- **進行（AS-31）**：各ラウンドは**正誤に関わらず必ず次へ進む**。締切（30 秒）またはクリアの扱いは Generator 余地だが、**誤答でもやり直さない**。R1 → R2 → R3 と順送り。TB-2 ドットが進む。
- **開示の簡素化（§4.8 末尾）**：本番のラウンド開示（F-03、✅/❌ + 総合クリア/失敗 + 3 秒カウントダウン）に**準じてよいが、学習導線として簡素化可**（Designer 判断）。推奨：✅（回転だった）/❌（誤選択）の開示は**残す**（「どれが回転だったか」を学ぶのが目的）。総合「クリア/失敗」バッジは出してよいが、**チュートリアルでは「失敗」を強調せず**「次へ」の橋渡しを主にする（OPT-6 優しい言い回し）。3 秒カウントダウンは本番同様に使ってよい（テンポを学ぶ）。チュートリアルはセッション（`sessionMinutes`）反復の対象外（§4.8）。
- **R3 → 本番 L1 の橋渡し（AS-31）**：R3 開示後、本番 L1 開始の橋渡し表示を 1 枚挟む（または開示内に告知）。文言 `tutorial.toMainStart`「練習はここまで。本番（レベル 1）を始めます」。Designer 判断で短い専用画面 or トーストで橋渡し → 距離リマインド省略で直接 L1（オンボ直後の距離リマインドは既に通過済みのため、Generator 判断で再リマインドは省略可）。
- **進捗非干渉の視覚原則（AS-33）**：チュートリアル中はレベル数値・連続失敗・ストリーク・統計に一切影響しないため、**セッション要約カード（RC-1）は出さない**。チュートリアルは「練習」コンテキストで完結し、完了後に初めて本番 L1（GB-1 にレベル数値）が現れる。
- **意味付けトークン（新規・別名のみ。値・スタイルは既存流用）**：

| トークン | 値 | 用途 |
|---|---|---|
| `tutorial.rounds` | `3`（固定・spec 確定値） | チュートリアル固定ラウンド数（R1/R2/R3） |
| `tutorial.round.counts` | `[1, 2, 3]`（固定） | 各ラウンドの明示個数（CB-1 `count`） |
| `tutorial.practiceBadge.style` | `LB-1 inline` のピルスタイル流用（`color.level.bg`/`color.level.fg`） | TB-1「練習」ピル（新色なし） |
| `tutorial.progress.dot.active` | `color.action.primary` 塗り | TB-2 現在ラウンドドット |
| `tutorial.progress.dot.idle` | `color.border.input` 枠のみ | TB-2 未到達ドット |

### 17.3 設定 2 行（`repeatCount` / `countRange`）の表示指針（spec §4.9 / F-13 / §7.2 / AS-37）
- **`repeatCount`（SR-1b）**：ステッパー（SR-1a `sessionMinutes` と同型）。1〜6・既定 4。中央値「{n}回」`font.body.lg` 26px Bold tabular-nums。**梯子に影響する**（総レベル数 n×180）ため、変更時は §4.5 波及（クランプ + 連続失敗 0 リセット）。`sessionMinutes`（梯子非干渉）との違いを caption で明示。
- **`countRange`（SR-1c）**：`FT-3 SegmentedControl`（3 択）。既定 `half`「ひかえめ（半分まで）」（Designer 仮置き、AS-21）。**梯子に影響しない**（個数は難易度軸ではない、§4.9）ため、`sessionMinutes` と同様クランプなし。
- **配置**：両行とも設定タブ「プレイ」グループ内（`sessionMinutes` の下）。「各変数の範囲（テスト用）」グループ（RG-1/OR-1）より**前**（プレイ全般に効く主要設定が上位の関心事、SR-1a と整合）。
- **総レベル数プレビューの更新**：`repeatCount` 変更で総レベル数プレビュー（「現在の設定：{N} レベル」、RG-1/OR-1 と共有・設定画面 1 箇所）が即更新（既定 n=4 で 720、n=6＋外側全 ON で理論上限 6864）。`countRange` は総レベル数を変えないためプレビュー不変。
- **レスポンシブ**：ステッパー [−][+] は 56pt 角（SR-1a と同一）。`countRange` セグメントは 360px でラベルが長く詰まる場合、**縦積みラジオリスト（各行 56pt）にフォールバック**。各プリセットの caption 説明（対応値）を 1 行で。
- 既定値・i18n キーは components.md SR-1b/SR-1c 参照。

### 17.4 個数除去の波及（RG-1 / OR-1、spec §4.1/§4.2 / F-13 / AS-36）
- **RG-1（範囲設定）**：個数（count）チップ群を**除去**。対象は外側 4 変数（時間 11 / 回転方向 2 / サイズ 4 / 回転速度 13 チップ）のみ。折返し指針（§16.5）は不変。
- **OR-1（変化順）**：個数行を**除去**。外側 4 変数（時間 / 回転方向 / サイズ / 回転速度）のみ並べ替え。繰り返し軸は最内側固定で組み替え対象に出てこない（固定行で提示可、components.md OR-1）。
- **デフォルト変化順**：繰り返し（最内側・固定）→ 時間 → 回転方向 → サイズ → 回転速度（§4.2）。OR-1 が組み替えるのは「時間 → 回転方向 → サイズ → 回転速度」の 4 変数の順序のみ。
- **i18n キー（除去）**：`settings.range.count`（個数の範囲チップ群）は RG-1 用途では**廃止**。ただし「個数の範囲」という語は `settings.countRange`（SR-1c）で**別の意味で再利用**（プリセット選択。チップ集合ではない）ため、キー名は `settings.countRange` を新設し、旧 `settings.range.count`（RG-1 個数チップ用）は削除する（混同回避）。`settings.order` の個数項目ラベルも削除。

### 17.5 バージョン
- v3.2（本章が最新規範）。`v3.2.x` を設定バージョン情報に表示（F-13、設定画面の表示を v3.1.x → v3.2.x に更新）。v3.0/v3.1 は本書の土台として継承。
