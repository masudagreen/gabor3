# GaborEye v2.0 — コンポーネントカタログ

> 本書は v2.0 全機能を横断して必要な共通コンポーネントを定義します。トークンは `system.md` を参照（色は light/dark 両系統）。各画面（`sprints/sprint-N/screens.md`）は本カタログのコンポーネントを参照して構成します。
> すべてのインタラクティブ要素は OPT-2（48pt 以上 / ボタン・行・タブ 56pt 以上）と NF-9（focus ring 3px）を構造的に満たします。

---

## 0. コンポーネント索引

| ID | 名称 | 役割 | 主使用スプリント |
|---|---|---|---|
| SA-1 | `SafeAreaWrapper` | 非ゲーム画面のセーフエリア準拠ラッパー | 全 |
| NV-1 | `BottomTabBar` | ホーム/履歴/設定の 3 タブ | S5 |
| BT-1 | `Button` | プライマリ/セカンダリ/ターシャリ/デンジャー | 全 |
| BT-2 | `IconButton` | アイコンのみボタン（X/設定歯車等） | S4,S5 |
| GG-1 | `GaborGrid` | n×n ガボール格子コンテナ | S4 |
| GG-2 | `GaborPatchCell` | 個々のガボールパッチ（直接タップ選択） | S4 |
| CD-1 | `CountdownTimer` | 数字のみ・3 段階色・太字補強 | S4,S6 |
| GB-1 | `GameTopBar` | ゲーム上部バー（X + 残り秒数） | S4,S5 |
| OV-1 | `ResultOverlayLayer` | ✅/❌ パッチ重畳 + 総合バッジ | S4 |
| OV-2 | `ResultMark` | 個別パッチ上の ✅(TP/FN)/❌(FP) | S4 |
| OV-3 | `AggregateResultBadge` | 刺激領域直下の総合 ✅/❌ 1 個 | S4 |
| BN-1 | `ConfirmButton` | 採点方式②の確定ボタン | S4 |
| DG-1 | `ConfirmDialog` | 汎用 2 択確認ダイアログ（中断/削除） | S5,S2 |
| RC-1 | `SessionResultCard` | セッション結果（スコア + ストリーク + もう一度） | S6 |
| CH-1 | `LineChart` | 日次スコア折れ線 | S7 |
| ST-1 | `StatTile` | 連続日数/累計回数の数値タイル | S7 |
| BG-1 | `BadgeCell` | バッジ一覧セル（獲得/未獲得 + ヒント） | S8 |
| BG-2 | `BadgeAwardToast` | バッジ獲得演出（短時間・点滅なし） | S8 |
| SR-1 | `SettingRow` | 設定 1 行（ラベル + コントロール） | S2 |
| FT-1 | `Toggle` | ON/OFF トグル（位置+ラベル） | S2 |
| FT-2 | `Slider` | n/m/r/a/b の値スライダー | S2 |
| FT-3 | `SegmentedControl` | 採点方式/視聴距離/ダーク等の択一 | S2 |
| DC-1 | `DisclaimerPanel` | 免責文パネル | S6 |
| ON-1 | `OnboardingStep` | オンボの 1 ステップ枠 | S6 |
| DR-1 | `DistanceReminder` | 距離リマインド画面 | S6 |
| RZ-1 | `DataResetNotice` | 起動時データリセット通知（1 度） | S2/S6 |
| EM-1 | `EmptyState` | データ少時の案内 | S7 |

---

## SA-1 `SafeAreaWrapper`
- 非ゲーム画面のルートラッパー（NF-30）。
- props: `mode: "default" | "game"`。`default` = top/bottom/left/right inset を padding に適用。`game` = top inset を無視（ステータスバー領域使用許容）、bottom/horizontal は適用。
- 背景 `color.bg.canvas`。`game` モードは背景 `color.bg.gabor`（#808080）。
- ボトムタブ表示画面では bottom inset + タブバー高さ分を確保。

---

## NV-1 `BottomTabBar`（F-05）
- 画面最下部に固定。3 タブ：ホーム / 履歴 / 設定。背景 `color.bg.surface` + 上辺 `border.default` 1px（dark）/ `elevation.2` 上向き影（light）。
- 各タブ：縦積み（アイコン 28px + ラベル `font.label` 24px Medium）。**タップ領域 48pt 以上、推奨高 64px** + bottom セーフエリア。
- **アクティブ表示は色のみに依存しない（NF-12）**：
  - 上辺 3px インジケータ（`color.tab.active.indicator`）
  - 前景 `color.tab.active.fg`（非アクティブは `color.tab.inactive.fg`）
  - ラベル太字（アクティブ Bold / 非アクティブ Medium）
  - アイコンは塗り（アクティブ）/ 線（非アクティブ）で形も変える
- a11y: `role="tablist"`、各タブ `role="tab"` + `aria-selected`、対応パネルへ `aria-controls`。Web は Tab/Enter で操作（NF-9）。各タブに aria-label（「ホームタブ」等）。
- **プレイ中（ラウンド進行中）に他タブをタップ → `ConfirmDialog`（中断）を出す（F-07）**。非進行中はダイアログなしで即切替。
- レスポンシブ：スマホは全幅 3 等分。PC（1280）はタブバーを全幅、本 v2.0 は縦積みで統一（最小幅 360 でも 3 タブが 48pt 確保できる）。

---

## BT-1 `Button`
- variant: `primary | secondary | tertiary | danger`。size: `lg(64px) | md(56px)`。最小 56pt（OPT-2）。
- ラベル `font.body.lg` 26px（lg）/ `font.body` 24px（md）、weight Medium〜Bold。
- primary: bg `action.primary` / fg `fg.onPrimary`。secondary: bg `action.secondary` + `border.default` 1px / fg `fg.primary`。tertiary: 透明 + 下線 / fg `tab.active.fg`。danger: bg `action.danger` / fg 白。
- 角丸 `radius.md`。pressed で `*Hover`。disabled 不透明度 0.4。
- a11y: `role="button"`、`aria-label`（アイコンのみ時必須）、focus ring。Enter/Space 起動。
- **「もう一度」「OK」等の主要 CTA は lg（64px ≧ 56pt）**。

---

## BT-2 `IconButton`
- アイコンのみ。タップ領域 48pt 以上（lg=56pt）。
- 用途：ゲーム上部の X（中断、aria-label「ゲームを中断」）、設定歯車。
- 線アイコン、色 `fg.primary`（ゲーム上部 X はバー背景上で 7:1）。focus ring 必須。

---

## GG-1 `GaborGrid`（F-01）
- n×n のガボールパッチ格子コンテナ。`GaborPatchCell` を n² 個配置。
- 全体辺長：スマホ `min(viewport.short_edge - 32, 360)px`、PC 横 480px。
- 格子隙間：`space.2`（8px、n=3）/ 6px（n≥4、視認性確保のため詰める）。クリッピング方式（system §7）により隙間が背景露出の原因にならない。
- パッチ辺長 = (全体辺 - 隙間合計) / n。例：n=4・全体 360・隙間 6×3=18 → パッチ約 85px。
- 結果開示中は格子全体 `pointer-events: none`（採点後の誤操作防止、F-03）。
- a11y: `role="group"` + aria-label「変化しているパッチをすべて選んでください」。各セルは `GaborPatchCell` が `role="checkbox"`。

## GG-2 `GaborPatchCell`（F-01）
- 1 個のガボールパッチ。中性グレー #808080 背景 + 正弦波縞（system §7 クリッピング）。
- **直接タップでトグル選択**。選択中は控えめな枠（`color.selection.subtle` 線幅 2px、`radius.sm`）。未選択は枠なし or `color.selection.subtle.idle` 1px。**ガボール本体の縞の視認を阻害しない**（枠は半透明・細い）。
- 回転（a deg/sec）・周波数変化（b hz/sec）アニメは課題上必須（reduced-motion でも止めない、NF-13）。静止パッチは固定。
- 変化の種類を答える UI は持たない（種類は不可視、AS-2）。「現在の回答」テキストも出さない。
- a11y: `role="checkbox"` + `aria-checked`（NF-15）、`aria-label="パッチ {行}-{列}"`。Web は Tab 到達 + Space トグル。
- 結果開示時は `OV-2 ResultMark` を子レイヤとして重畳（中央配置、`color.result.overlayBg` 円の上にアイコン）。

---

## CD-1 `CountdownTimer`（F-12）
- 数字のみ表示（時計アイコンなし）。`tabular-nums`。
- 色段階：通常（残り 6 秒+）= `color.countdown.normal`、≤5 秒 = `color.countdown.warn`（黄）、≤3 秒 = `color.countdown.danger`（赤）。
- **太字補強**：通常 Bold(700)、≤5 秒 Bold(700)、≤3 秒 Black(900)。色のみで情報を伝えない（NF-12）。
- **点滅禁止**（NF-11）。サイズは段階で変えない（位置ジャンプ回避）。
- バリアント：`inline`（ゲーム上部バー、`font.h2` 30px）/ `large`（距離リマインド中央、`font.numeric.xl` 72px）。
- 音連動（F-14）：≤3 秒で毎秒ティック音（音 OFF 時無音）。色赤転換と同期。
- a11y: `aria-live="polite"`（≥6 秒）→`assertive`（≤5 秒）。≤3 秒は毎秒「3 秒」「2 秒」「1 秒」読み上げ。

---

## GB-1 `GameTopBar`（F-01/F-05/F-07）
- ゲームプレイ画面の上部固定バー。高さ 64px + top セーフエリア分オフセット（フルスクリーン時、NF-29）。
- **カウントダウン領域は不透明保証（v2.0 改訂）**：旧「半透明可」を撤回する。カウントダウン数字・X ボタンの 7:1 コントラスト（OPT-5 / NF-8）は**不透明背景でなければ構造的に保証されない**（半透明バー越しのガボール縞が実効背景になると white 最悪 4.0:1 / warn 黄 6.68:1 / danger 赤 4.14:1 まで低下）。したがって以下のいずれかで不透明背景を担保する：
  - (A) バー全体の背景を不透明 `color.countdown.bg`（light `#FFFFFF` / dark `#15171C`、system §1.4）にする、または
  - (B) バーは透明でもよいが、カウントダウン数字の直下に同色の不透明ピル/プレートを敷く（モックアップは A+B を併用）。
  いずれも縞模様が実効背景に混入しないこと。検証値は system §1.4 / §1.5（white 17.93:1 / warn 12.70:1 / danger 7.86:1、暗背景・不透明前提）。
- 左：`IconButton` X（中断、aria-label「ゲームを中断」、48pt+）。アイコン色は不透明バー背景上で 7:1（dark `#FFFFFF` on `#15171C`=17.93:1）。**プレイ中に押すと `ConfirmDialog`（F-07）**。
- 中央：`CountdownTimer inline`（残り m 秒、`font.h2` 30px、段階色 + 太字補強、点滅なし、数字のみ＝F-12 維持）。
- 右：何も置かない（試行数表記なし）。
- 内容はセーフエリア内（フルスクリーン背景でも文字は inset 内）。

---

## OV-1 `ResultOverlayLayer`（F-03）
- 採点後、画面遷移せずガボール格子の上に重畳するレイヤ。`motion.duration.result` 200ms フェードイン（reduced-motion 時 0ms）。
- 構成：各パッチ上に `OV-2 ResultMark` + 刺激領域直下に `OV-3 AggregateResultBadge` 1 個。
- 数値テキストは一切出さない（閾値/速度/前回比なし、F-03）。
- 表示中は格子タップ無効（GG-1 が pointer-events none）。
- 方式①②：表示後、短いインターバル（**Designer 提案 1.5 秒**、reduced-motion でも同じ）で次ラウンドへ。方式③で全問正解即遷移時は短い正解フィードバック（総合 ✅ を 0.6 秒）のみで次へ。
- a11y: 出現時 `aria-live="assertive"` で「正解」/「不正解」+ TP/FP/FN 要約を 1 度読み上げ。

## OV-2 `ResultMark`（F-03）
- パッチ中央に `color.result.overlayBg` 半透明円（縞を完全には隠さない直径 = パッチ辺の約 55%）+ アイコン。
- 種別：
  - **TP（正しく選んだ変化パッチ）**：✅ 実線・不透明、`color.result.check.tp`。
  - **FN（選び逃した変化パッチ）**：✅ 薄め（透過 50%）、`color.result.check.fn`。形は同じチェックだが透明度で「取りこぼし」を区別（色＋透明度、aria で補完）。
  - **FP（誤って選んだ静止パッチ）**：❌、`color.result.cross.fp`。
  - 正解で選ばなかった静止パッチ：何も表示しない。
- a11y: aria-label「正解（選択済み）」/「正解（選び逃し）」/「不正解（誤選択）」（result.check.* キー）。

## OV-3 `AggregateResultBadge`（F-03）
- 刺激領域の直下に **1 個だけ**表示する総合マーク。
- 判定（Designer 定義）：そのラウンドで TP=変化パッチ全数 かつ FP=0 のとき **✅**（成功）。いずれか欠けると **❌**。
- 成功：`color.result.aggregate.success`（緑背景 + 白/黒チェック）。不正解：`color.result.aggregate.danger`（赤背景 + ❌）。
- サイズ：直径 56px 相当のピル、中にアイコンのみ（テキスト・数値なし）。
- a11y: aria-label「正解」/「不正解」（result.aggregate.* キー）。

---

## BN-1 `ConfirmButton`（F-02 方式②）
- 採点方式②でのみ表示。ガボール格子の直下（`AggregateResultBadge` の位置と排他）に `Button primary lg`（64px）「確定」。
- 押すと m 秒を待たず即採点。方式①③では存在しない（DOM に出さない）。
- a11y: aria-label「回答を確定する」、focus ring。

---

## DG-1 `ConfirmDialog`（F-07 中断 / F-13 全データ削除）
- 中央モーダル。背後 `color.bg.scrim`。カード `color.bg.surface`、`radius.lg`、`elevation.2`、最大幅 360px、セーフエリア内（NF-30）。
- 構成：タイトル `font.h2` 30px / 本文 `font.body` 24px / ボタン 2 個（縦積み、各 56pt 以上）。
- 用途別:
  - **中断（F-07）**：タイトル「プレイを中断しますか？」本文「中断するとこのセッションは記録されません。」ボタン「中断する」（primary）/「続ける」（secondary）。OK=中断（記録しない・X 起点はゲーム終了/タブ起点は当該タブへ）、キャンセル=継続（残り時間・選択保持）。
  - **全データ削除（F-13、2 段階目）**：タイトル「全データを削除しますか？」本文「すべての記録・設定・バッジが消えます。元に戻せません。」ボタン「削除する」（danger）/「キャンセル」。
- a11y: `role="dialog"` `aria-modal="true"` `aria-labelledby`。開いたら安全側ボタン（「続ける/キャンセル」）にフォーカス。Esc = キャンセル。フォーカストラップ。背後の操作不可。

---

## RC-1 `SessionResultCard`（F-08/F-04）
- セッション完了後、ホームタブに表示（セーフエリア準拠、NF-30）。
- 構成（縦）：
  1. 「今回のスコア」`font.label` 24px
  2. スコア数値 `font.numeric.xl` 72px Bold tabular-nums（0〜100）+ 「／100」`font.h3`
  3. 「連続 {n} 日」`font.body` 24px（ストリーク、🔥 アイコン + `color.streak.flame`、形+テキストで色非依存）
  4. （任意）バッジ獲得時は `BG-2 BadgeAwardToast` をここで 1 度演出
  5. `Button primary lg`「もう一度」（**64px ≧ 56pt**、F-08）。回数制限なし。押すと距離リマインド経由で新セッション。
- 結果表示中はゲーム非進行扱い → タブ移動自由（F-05/F-07）。
- a11y: `role="region"` aria-label「セッション結果。スコア {n} 点（100 点満点）。連続 {n} 日」。

---

## CH-1 `LineChart`（F-09）
- 日次スコア（0〜100）折れ線。X 軸=日付（ISO 週、月曜開始）、Y 軸=0〜100。
- 軸ラベル `font.label` 18pt 以上。線 `color.score.line`。
- **当日点を強調（色 + 形）**：`color.score.point.today`（赤系）+ ◆形（他日は ●）で色のみ非依存（NF-12）。
- 同日複数セッションは max（`DailyStats.bestSessionScore`）をプロット。
- 点滅なし（NF-11）。reduced-motion 時は描画アニメなし。
- データ 7 日未満：`EM-1 EmptyState`「もう少しデータが集まると傾向が見えます」を重ねる。
- a11y: グラフに aria-label でサマリ（「過去 N 日の日次スコア。最新 {date} は {n} 点」）。

## ST-1 `StatTile`（F-09）
- 数値タイル。`font.numeric.l` 48px + ラベル `font.label` 24px。
- 用途：連続日数（🔥 + 「連続日数」）、累計プレイ回数（「累計プレイ回数」）。
- カード `color.bg.surface` `radius.md`。

---

## BG-1 `BadgeCell`（§5/F-09）
- バッジ 1 種のセル。アイコン（獲得=フルカラー/未獲得=グレースケール+鍵 🔒 で形も区別、NF-12）+ 名称 `font.body.bold` 24px + 状態テキスト。
- 獲得：名称 + 獲得日 `font.caption` 20px。未獲得：獲得条件ヒント `font.body` 24px。
- タップで詳細（条件全文）を展開/モーダル。
- 点滅なし（NF-11）。
- a11y: `aria-label`「{名称}、{獲得済み / 未獲得：条件}」。

## BG-2 `BadgeAwardToast`（§5.4）
- バッジ獲得演出。セッション結果カード上層に 1 度だけ。`motion.duration.badge` 1500ms（拡大+フェードのみ、点滅なし、reduced-motion 時静的表示）。
- バッジアイコン 🏅 + 名称 `font.h2` 30px。音+ハプティクス（F-14、設定 OFF 可）。
- 「もう一度」操作と干渉しない位置（中央上）。

---

## SR-1 `SettingRow`（F-13）
- 設定 1 行。**高さ 56pt 以上**（OPT-2）。左にラベル `font.body` 24px、右にコントロール（`Toggle`/`Slider`/`SegmentedControl`/`>` ナビ）。
- 区切り `border.default` 1px。グループ見出しは `font.h3` 26px。
- a11y: ラベルとコントロールを `aria-labelledby` で関連付け。Web は Tab で各コントロール到達。

## FT-1 `Toggle`（F-13）
- ON/OFF トグル。`radius.pill`、ON トラック `color.toggle.on` / OFF `color.toggle.off`、ノブ白。
- **ON/OFF が一目で判別（NF-12）**：ノブ位置（右=ON/左=OFF）+ 右側にテキスト「ON」/「OFF」併記（色のみ非依存）。
- タップ領域 48pt 以上。a11y: `role="switch"` + `aria-checked`、aria-label（「効果音 ON」等）。

## FT-2 `Slider`（F-13、n/m/r/a/b）
- 値スライダー。トラック `border.input`、塗り `color.toggle.on`、つまみ 32px（タップ領域 48pt）。
- ラベル：上に「{項目名} {現在値}{単位}」`font.body` 24px。a/b は左端「難しい（小）」右端「易しい（大）」を 18pt 併記（system §9.1）。
- 範囲外不可（min/max でクランプ）。step は system §9.1。目盛（tick）を主要点に表示。
- a11y: `role="slider"` + `aria-valuemin/max/now/text`（「回転速度 6 度毎秒」）。Web は ←/→ キーで step 単位変更。
- ※ n は離散 3 値のため `FT-3 SegmentedControl` を使う（スライダーではない）。スライダー対象は m/r/a/b。

## FT-3 `SegmentedControl`（F-13）
- 択一。用途：n（3/4/5）、視聴距離（30/40/50cm）、ダークモード（OS連動/明/暗）、片眼（off/左/右/交互）。
- 各セグメント 48pt 以上、選択中は bg `action.primary` + fg 白 + 太字（色+太字+塗りで非依存）。
- a11y: `role="radiogroup"` + 各 `role="radio"` + `aria-checked`。
- **採点方式（①②③）は説明が長いため縦リスト 3 行のラジオ**（各 56pt、ラベル + 短い説明 `font.caption`）を使う（SegmentedControl ではない）。

---

## DC-1 `DisclaimerPanel`（F-10）
- 免責文パネル。背景 `color.bg.disclaimer`、`radius.md`、本文 `font.body` 24px 以上。
- 医療機器でない旨・対象外ユーザー（子ども/70 代以上/重度視覚障害/強度近視/違和感あるユーザー）を明示。
- オンボ時：下に同意チェック + 「同意する」`Button primary`（チェック未了で disabled）。同意日時を `UserProfile.disclaimerAgreedAt` に保存。
- 設定からの再閲覧時：同意ボタンなし（閲覧のみ、閉じる）。
- a11y: スクロール可能、同意ボタンへ Tab 到達。

## ON-1 `OnboardingStep`（F-06）
- オンボ 1 ステップの枠。進捗ドット（4 ステップ：免責→年齢→距離→概要）。各ステップ 1 アクション。
- 合計タップ 6 以下（免責同意 1 + 年齢選択 1 + 距離選択 1 + 概要「はじめる」1 = 4 タップ目安、F-06）。
- a11y: 進捗を aria で（「ステップ 1/4」）。

## DR-1 `DistanceReminder`（F-06）
- 距離リマインド画面（セーフエリア準拠）。
- 構成：「画面から {n}cm 離れてください」`font.h1` 36px / （片眼 ON 時）「片目を覆ってください（任意）」`font.h3` / 中央〜下に `CountdownTimer large` 72px（短い秒数、Designer 提案 3 秒）/「{n} 秒後に自動で始まります」`font.body`。
- カウントダウン 0 で自動的にゲーム開始（ユーザー操作なし、OPT-10/F-06）。緊急脱出 X のみ。
- クールダウン画面は存在しない（廃止）。
- a11y: カウントダウン aria-live、距離数値読み上げ。

## RZ-1 `DataResetNotice`（F-11）
- 起動時データリセット通知。中央モーダル（セーフエリア）。
- 本文「最新版へのアップデートのため、過去データをリセットしました」`font.body` 24px + `Button primary lg`「OK」（64px ≧ 56pt）。
- **1 度だけ**（旧名前空間消去後の初回のみ）。2 回目以降出さない。
- a11y: `role="dialog"`、OK にフォーカス。

## EM-1 `EmptyState`（F-09 等）
- データ少時/空時の案内。アイコン + 文言 `font.body` 24px。
- 履歴 7 日未満「もう少しデータが集まると傾向が見えます」、バッジ未取得時の説明等。

---

## 共通レスポンシブ規範
- 検証幅 360 / 375 / 1280px。ゲーム格子は `min(short_edge-32, 360)`（スマホ）/ 480px（PC）。
- PC ではタブ画面コンテンツを最大幅 720px 中央寄せ、タブバーは全幅。
- ダイアログ/カードは最大幅 360px（スマホ）/ 480px（PC）。
- 最小幅 360 で 3 タブ各 48pt・主要 CTA 56pt・本文 24px が崩れないこと。
