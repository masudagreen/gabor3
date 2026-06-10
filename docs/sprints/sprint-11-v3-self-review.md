# Sprint S11（v3.0）セルフレビュー — 仕上げ（a11y・レスポンシブ・セーフエリア・全体結合・最終掃除）

> v3.0 最終スプリント。非機能要件（spec §9）を全画面で満たし、NF-8 コントラスト是正・NF-9 Space キー補完・NF-14 Skip link 結線・残 v2 オーファン撤去・全体結合テストを実施した。
> （ファイル名は v3 系の慣例 `sprint-N-v3-self-review.md` に従う。`sprint-11-self-review.md` は v1.1 era のため温存。）

## 結論

| 項目 | 結果 |
|---|---|
| `npm run typecheck`（tsc strict） | エラー 0（PASS） |
| `npm test`（Jest） | **50 スイート / 487 件 全 PASS（赤 0）** |
| `npm run build:web`（既定 v3） | 成功（Exported: dist、AppEntry ≈ 1.18 MB、serve で HTTP 200） |

テスト件数推移：S10.5 後 55 スイート/601 件 → 残 v2 オーファン 9 スイート（135 件）撤去 + S11 新規 4 スイート（21 件）追加 + settingsControls から NumberSpinner 3 件除去 → **50 スイート / 487 件**。

## 1. NF-8 コントラスト是正（実測）

`src/theme/tokens.ts` を Designer amendment 確定値へ。WCAG 2.1 相対輝度比で実測（`tests/a11y/contrastNF8.test.ts` が assert）：

| ペア | 実測 | 判定 |
|---|---|---|
| 白文字 on light `#13449D`（プライマリボタン・アクティブタブラベル） | **8.97:1** | AAA |
| 白文字 on light `#0F3580`（hover） | 11.41:1 | AAA |
| light `#7A3C00` on 白背景（ストリーク炎テキスト） | **8.49:1** | AAA |
| 黒文字 on dark `#7FB0FF`（プライマリボタン dark） | **9.56:1** | AAA |
| dark `#FFB266` on dark surface `#12131A`（ストリーク） | 10.42:1 | AAA |

- light：`brandPrimary #4F46E5→#13449D` / `brandPrimaryHover #4338CA→#0F3580` / `streakFlameFg #EA580C→#7A3C00`。
- dark：本書確定値へ統一 `brandPrimary #00E5FF→#7FB0FF` / `brandPrimaryHover #00B8CC→#A6CBFF` / `streakFlameFg #FBBF24→#FFB266`（+ semanticWarning `#FFB266` / semanticInfo `#7FB0FF`）。色相維持。上記以外の色・レイアウトは不変。

## 2. NF-9 Space キー補完

RN-Web 0.21 `PressResponder.isValidKeyPress` 実測：Enter は role 問わず発火、Space は role=button のみ。非 button ロールは Space 起動不可だった（S5 申し送り）。

新規 `src/theme/keyActivation.ts` の `webSpaceActivation`（Web のみ `onKeyDown` で Space 起動・preventDefault・Enter は RN-Web 既定に委譲＝二重発火回避、Native は `{}`）を適用：`GaborPatchCell`(checkbox／主対象) / `BottomTabBar`(tab) / `SegmentedControl`(radio) / `Toggle`(switch) / `RangeSelector`(checkbox) / `SettingRow`(radio 行)。role=button 要素は RN-Web 既定で Enter/Space 両対応のため追加不要。検証：`tests/a11y/keyActivation.test.tsx`。

## 3. a11y 全画面点検（§9.3）

- NF-7 aria-label / NF-10 SR 読み上げ（レベル・個数・クリア/失敗）/ NF-9 focus 3px / NF-12 色のみ非依存 / NF-11 点滅なし / NF-15 aria-checked/pressed/selected：既存実装を確認、回帰なし。
- NF-13 reduced-motion：装飾（BadgeAwardToast / ResultOverlayLayer）は `AccessibilityInfo.isReduceMotionEnabled` で抑制。ゲーム刺激の回転は課題上必須のため抑制対象外（仕様通り）。
- NF-14 Skip link：既存 `SkipLink`(v2) を **AppRoot 先頭へ新規結線**（従来は未結線オーファン）。main に Web 限定 `nativeID="ge-main-content"`。検証：`tests/a11y/appRootSkipLink.test.tsx`。

## 4. レスポンシブ（NF-21/22）

build:web 成功・静的 serve で HTTP 200。GameScreen は `useWindowDimensions` で格子可変、他画面は ScrollView + SafeAreaView。本文 18pt（fontSize.body）・タップ 48pt（tapTarget.min）はトークンで担保。実ブラウザ 360/375/1280 目視は Playwright MCP がこの Generator セッションのツールに無いため、静的 serve 確認 + 既存スプリントの Playwright 実績に依拠（懸念 1 参照）。

## 5. セーフエリア（NF-29/30）

- ゲーム刺激中（`GameScreen`）：SafeAreaView 不使用・`flex:1` フルスクリーン（NF-29）。
- それ以外（距離・ホーム結果・履歴・設定・オンボ・タブバー・GameTopBar・各ダイアログ）：`SafeAreaView`/`useSafeAreaInsets` 準拠（NF-30）。変更なし。

## 6. 残 v2 オーファン撤去（grep で参照ゼロ確認後）

- source（14）：`lib/v2/{roundGen,gameMachine,gameView,scoring,feedback,patch}`、`hooks/v2/useFeedback`、`components/v2/{ConfirmDialog,NumberSpinner}`、`state/{schema,repository,migration,keys,dataReset}`
- test（9）：`tests/lib/v2/{roundGen,gameMachine,gameView,scoring,feedback,patch}.test.ts`、`tests/state/{migration,repository,dataReset}.test.ts`
- `tests/components/v2/settingsControls.test.tsx` は Toggle/SegmentedControl を残し NumberSpinner 部のみ除去。

**温存（v3 依存／native 必須）**：`lib/v2/{rng,dateUtil}`、`state/store`（v3 が依存＝共有ヘルパ。S10.5 review の「store もオーファン」は誤り）、`state/adTracker`（AdManager.native 依存）、`components/v2/{SegmentedControl,SettingRow,Toggle,DisclaimerPanel,SkipLink,AdManager.*}`、`hooks/v2/useGameTimer`。AdManager native/web 維持（広告 native 不変）。

## 7. 全体結合テスト

新規 `tests/screens/v3/integration.test.tsx`：実永続化（`homeFlow.resolveCompletedGame` + AsyncStorage モック）で 距離→ゲーム(クリア)→結果(レベル 7→8)→もう一度→距離→ゲーム(時間切れ失敗 ±0)→履歴→設定(範囲 720→540)→ホーム→次ゲーム の通し動線を 1 本検証。レベル増減・記録・クランプ・タブ遷移が一連で破綻しない。

## 受け入れ基準マッピング（spec §9）

| NF | 充足 | 根拠 |
|---|---|---|
| NF-7 | ✓ | aria-label 全付与（既存） |
| NF-8 7:1 | ✓ | トークン是正 + contrastNF8.test 実測（全ペア ≥7:1） |
| NF-9 Enter/Space + focus 3px | ✓ | webSpaceActivation + keyActivation.test、focusStyle :focus-visible 3px |
| NF-10 | ✓ | レベル/個数/クリア失敗の読み上げ（既存） |
| NF-11 | ✓ | 点滅なし |
| NF-12 | ✓ | タブ/カウントダウン/結果/レベル変化に形+テキスト |
| NF-13 | ✓ | 装飾抑制・刺激本体は対象外 |
| NF-14 | ✓ | AppRoot Skip link 結線 + appRootSkipLink.test |
| NF-15 | ✓ | webAria 透過（既存） |
| NF-21/22 | ✓ | build:web 成功・serve 200・可変格子/SafeArea + トークン床 |
| NF-29 | ✓ | GameScreen フルスクリーン |
| NF-30 | ✓ | 他画面セーフエリア |

## 既知の懸念 / 申し送り

1. **Playwright 実ブラウザ目視は静的 serve 確認に代替**：Playwright MCP がこの Generator セッションのツールに無いため、360/375/1280 の新規スクショ・Space キーの実ブラウザ操作・NF-8 の実ブラウザ実測は取得していない。NF-8 コントラスト（WCAG 計算 #13449D=8.97:1・#7A3C00=8.49:1）と NF-9 Space（onKeyDown 配線）は自動テストで実測済み。実ブラウザ最終目視はオーケストレーター/Evaluator が Playwright MCP で実施推奨。
2. **Android 実機確認（CLAUDE.md §5/§6）**：native 懸念は最終監査済み（web 専用 API は全て `Platform.OS==='web'` ガード、Image transform 新規なし、AsyncStorage は共有 `state/store` 温存）。Expo Go（SDK 54）実機目視は未実施。
3. **App.tsx の AdManager 依存**：結合テストは AppRoot レベル（実永続化付き）で実施。App.tsx 全体は AdManager.native の `react-native-google-mobile-ads` 依存で jest 直接マウントしづらく、オンボは OnboardingScreen 単体、それ以降は integration.test で担保。
4. **dark セマンティック色統一**：本書指示どおり dark の brandPrimary 等を本書値へ揃えた（旧 #00E5FF も 7:1 は満たすが一貫性のため統一）。

## 追加/変更/削除ファイル

- 新規：`src/theme/keyActivation.ts`、`tests/a11y/contrastNF8.test.ts`、`tests/a11y/keyActivation.test.tsx`、`tests/a11y/appRootSkipLink.test.tsx`、`tests/screens/v3/integration.test.tsx`、`docs/sprints/sprint-11-v3-self-review.md`
- 変更：`src/theme/tokens.ts`（NF-8）、`src/components/v3/{GaborPatchCell,BottomTabBar,RangeSelector}.tsx`、`src/components/v2/{Toggle,SegmentedControl,SettingRow}.tsx`、`src/screens/v3/AppRoot.tsx`（SkipLink 結線）、`tests/components/v2/settingsControls.test.tsx`（NumberSpinner 除去）、`docs/run.md`（V3-S11 追記）
- 削除：source 14 + test 9（§6 参照）

---

## S11 修正ラウンド（Evaluator(impl) Major 3 点是正）

Evaluator(impl) で局所 a11y の Major 3 件が検出されたため、**指摘箇所のみ**を是正した。

### 修正1：NF-9 オンボ同意チェックボックスが Space で起動しない
- `src/screens/v3/OnboardingScreen.tsx` の免責同意チェックボックス（`role=checkbox` の Pressable）に、他 v3 コンポーネントと同方式の `{...webSpaceActivation(() => setUnderstood((v) => !v))}` を付与。
- Enter は RN-Web 既定に委譲（webSpaceActivation は Space のみ処理）し二重発火しない。Native は `webSpaceActivation` が空オブジェクトを返すため混入なし。

### 修正2：NF-15 同チェックボックスに aria-checked が出ない
- 同 Pressable に `{...webAria('checkbox', { checked: understood }, t('onboardingV3.understand_check'))}` を付与。GaborPatchCell/RangeSelector/Toggle と同じ `Platform.OS==='web'` ガード経由の aria-checked 明示透過方式。`accessibilityState` のみでは RN-Web が透過しない問題を解消。Native は空オブジェクトのため二重指定なし。

### 修正3：NF-8 結果カード「±0」テキストが 6.77:1（<7:1）
- `src/theme/tokens.ts` の `levelDeltaV3.light.sameFg` を **`#525866` → `#4E5460`**（このキーのみ。up/down/streak/dark は据え置き）。
- 実測（WCAG 2.1 相対輝度比、実描画背景 = canvas `bgCanvas` = `neutral50` = `#F8F9FB`）：
  - same `#4E5460` on `#F8F9FB` = **7.22:1**（≥7:1 PASS）
  - 旧 same `#525866` on `#F8F9FB` = 6.77:1（NF-8 未達、Evaluator 指摘と一致）
  - up `#0A6238` on `#F8F9FB` = 7.08:1 / down `#7A4300` on `#F8F9FB` = 7.58:1（いずれも PASS）

### 回帰防止テストの修正
- `tests/a11y/contrastNF8.test.ts` に describe ブロック「NF-8 levelDeltaV3（結果カードの実背景 = canvas #F8F9FB 上）」を追加。
  - 背景前提を **白 #FFFFFF → 実レンダリングの canvas 地 #F8F9FB** に修正（白前提のままだと再発を検知できないため）。
  - `sameFg(#4E5460) on #F8F9FB ≥ 7:1` を assert。さらに旧 `#525866` が同背景で <7:1 であることも assert（再発検知の担保）。
  - up/down も同じ実背景前提で ≥7:1 の回帰ケースを追加。
- テスト件数：contrastNF8.test.ts は 9 → 13 件（+4）。全スイート 491 件 全 PASS（赤 0）。

### 検証結果
- `npm run typecheck`：緑（tsc --noEmit エラー 0）
- `npm test`（jest）：50 suites / **491 tests 全 PASS（赤 0）**
- `npm run build:web`（expo export）：成功（dist 出力）
- 修正1/2 は Web の onKeyDown/aria を `Platform.OS==='web'` ガード経由（native 混入なし）。
