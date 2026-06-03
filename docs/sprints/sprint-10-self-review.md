# Sprint 10 自己評価 — 仕上げ（a11y・レスポンシブ・セーフエリア・全体結合）

> 本ファイルは v2.0 リブートの S10 で全面上書き（旧 v1.x の内容は破棄）。
> 対象：spec §7 S10 / NF-7〜15（a11y）・NF-19〜22（レスポンシブ）・NF-29/30（セーフエリア）。横断 F-01〜F-14。
> デザイン：`docs/design/sprints/sprint-10/screens.md`（新規画面なし、全画面横断チェックリスト）。

## 1. やったこと

### 1.1 a11y Minor 4 点の是正（NF-15）

react-native-web 0.21 の `createDOMProps` は `accessibilityState`（checked/expanded/selected）を
DOM の `aria-*` へ自動透過しない（W3C プロパティのみ DOM へ写す）ことを `node_modules` の
forwardedProps / createDOMProps で確認。新ヘルパー `src/theme/ariaWeb.ts` の `webAria(role, state, label)`
で **Web のときだけ** `role` + `aria-*` を明示スプレッドする方式に統一した（Native は空 props ＝
従来の `accessibilityRole`/`State` が担う）。

| # | 対象 | 是正 |
|---|---|---|
| 1 | 採点方式ラジオ（設定タブ）/ SegmentedControl | `role=radio` + `aria-checked`、グループ `radiogroup`。`SettingRow` に `radio`/`checked` プロップ追加 |
| 2 | Toggle（音/振動） | `role=switch` + `aria-checked` |
| 3 | 選択パッチ GaborPatchCell | `role=checkbox` + `aria-checked` + `aria-disabled` |
| 4 | バッジセル BadgeCell | `role=button` + `aria-expanded` |

### 1.2 Skip link（NF-14）

`src/components/v2/SkipLink.tsx` を新設（Web 専用 / Native は `null`）。AppRoot 先頭に置き、
`ge-main-content` のメインコンテンツへフォーカス移動。通常は画面外退避、focus 時のみ左上に出る
（`focusStyle.installFocusVisibleStyle` の大域 CSS に `[data-ge-skip-link]` ルール追加）。

### 1.3 セーフエリア（NF-29/30）・レスポンシブ（NF-21/22）点検

全画面の `edges` を点検し、ゲーム=フルスクリーン許容（GameTopBar が inset 内に X/残り秒）、
他=セーフエリア準拠（タブ画面 `['top','left','right']`、全画面フロー 4 辺）が既に正しいことを確認。
変更は不要だった（S4〜S8 で適切に実装済み）。レスポンシブも `computeGridEdge` 等で担保済みを確認。

### 1.4 version 2.0.0（AS-17 / F-13）

`package.json` / `app.json` を 2.0.0 に統一（`schema.APP_VERSION` は既に 2.0.0）。設定タブの
バージョン + 免責同意日時表示は S2/S6 で実装済み。アプリ名 GaborEye・アイコンは現状維持。

### 1.5 未参照コードの整理

App.tsx 起点の静的到達解析で未到達だった `HistoryPlaceholderScreen.tsx`（S7 で置換済み）と
`src/state/index.ts`（未 import バレル）を削除。`src/theme/index.ts` は `tests/theme.test.ts` が
import するため残置。

### 1.6 テスト追加（+23：439 → 462）

- `tests/a11y/ariaWeb.test.tsx`（6）：`webAria` の Native 空・Web role/aria 出力を直接検証。
- `tests/a11y/webAriaComponents.test.tsx`（4）：Toggle/SegmentedControl/BadgeCell/GaborPatchCell が Web で role を透過し state を反映。
- `tests/a11y/settingRowRadioAndSkipLink.test.tsx`（6）：SettingRow radio・SkipLink Web/Native 分岐。
- `tests/integration/s10FullFlow.test.tsx`（7）：方式②全動線・タブ切替中断制御・設定反映・skip link 結合。

## 2. 確認したこと（自己評価チェックリスト）

- [x] `npx tsc --noEmit` エラー 0
- [x] `npm test` 緑：52 スイート / **462 件 PASS**（S9=439 → +23）
- [x] `npm run build:web` PASS（AppEntry ≈ 673 kB）
- [x] a11y Minor 4 点是正をテストで検証
- [x] Skip link（NF-14）Web のみ描画・Native 非描画をテストで検証
- [x] セーフエリア各画面 edges 点検（変更不要を確認）
- [x] 全体結合（距離→ゲーム→採点②→結果→もう一度／中断→idle／タブ切替／設定反映）を結合テストで通過
- [x] 既存テスト全 PASS（回帰なし）
- [x] CLAUDE.md §5 監査（document/window ガード・Image transform 据置）

## 3. 受け入れ基準マッピング（S10）

| 基準（screens.md S10 / spec §7） | 対応 |
|---|---|
| a11y 全項目（NF-7〜15）を全画面で満たす | webAria 是正（Minor 1〜4）+ SkipLink（NF-14）+ 既存 focus-visible/reduced-motion/点滅なし/色非依存。tests/a11y/* |
| レスポンシブ 360/375/1280 | `computeGridEdge`・最大幅中央寄せ・48pt 維持（既存実装の確認）。実機 Playwright スクショは実機確認項目に明記 |
| セーフエリア（ゲーム=フルスクリーン許容/他=準拠） | 各 `edges` 点検済み（run.md S10.4 表） |
| フル結合フロー | `tests/integration/s10FullFlow.test.tsx`（7 件） |

## 4. 既知の懸念・申し送り

1. **DOM 実値検証はテスト環境の制約あり**：jest-expo は react-native **コア**で描画するため、渡した `aria-checked`
   はコアにより `accessibilityState` へ正規化される（テストでは `role` 透過 + `accessibilityState` で検証）。
   実 DOM の `aria-checked`/`aria-expanded` 出力は `webAria` 単体テスト + RNW forwardedProps の確認で担保。
   **Playwright で実 DOM の aria 属性を最終確認することを推奨**（Evaluator design-qa / 実機）。
2. **レスポンシブ・セーフエリアの実画面確認**：寸法ロジックは確認済みだが、360/375/1280 の実スクショと
   ノッチ端末のセーフエリアは実機/Playwright での目視が望ましい（run.md S10.9 に列挙）。
3. **reduced-motion**：装飾アニメ静的化は実装済み。OS 設定 ON での体感は実機確認推奨。ゲーム刺激の回転/周波数変化は
   仕様どおり抑制しない。
4. **prime のタイミング**（S9 申し送り）：Web 自動再生制限は起動フロー上タップを経るため実用問題なし（変更せず）。
