# Sprint S10.5 自己評価 — 設定タブ UI（F-13）

> 凍結仕様 `docs/spec.md` v3.0 の F-13（設定タブ）UI を実装し、AppRoot の設定タブ
> プレースホルダを v3 設定画面へ差し替え。S3 で永続化済みの範囲/変化順/§4.5 クランプ
> ロジックの上に UI を被せた。あわせて v2 SettingsScreen と孤立 v2 設定/統計ロジックを撤去。
> **データモデル（spec §7）変更なし**（S3 凍結スキーマをそのまま利用）。

## 1. やったこと（成果物）

### 新規ファイル
- `src/components/v3/RangeSelector.tsx`（RG-1）：5 変数の振れ幅をチップ複数選択。選択=塗り+✓+太字、非選択=枠（色+形で非依存、NF-12）。最低 1 値ガード内蔵。role=checkbox/aria-checked。
- `src/components/v3/VariableOrderList.tsx`（OR-1）：5 変数の変化順を上下ボタンで組み替え。各行 56pt、ボタン 48pt、先頭の上/末尾の下を disabled。role=list、aria-label「{変数}を 1 つ上へ/下へ」。
- `src/components/v3/DisclaimerModal.tsx`：免責の再閲覧（DisclaimerPanel を閲覧のみモードで内包、同意ボタンなし、F-10）。role=dialog、閉じる 56pt。
- `src/components/v3/Toast.tsx`：クランプ/最低 1 値違反のインライン通知（aria-live=polite、点滅なし NF-11）。
- `src/screens/v3/SettingsScreen.tsx`：v3 設定タブ本体。範囲/変化順/継承項目/免責再閲覧/全データ削除を集約。
- `tests/screens/v3/SettingsScreen.test.tsx`（15 件）
- `tests/components/v3/settingsComponents.test.tsx`（9 ケース：RG-1 4 + OR-1 5）

### 変更ファイル
- `src/screens/v3/AppRoot.tsx`：設定タブのプレースホルダ → `SettingsScreen` に差し替え。`onSettingsChange` prop 追加、設定変更時に `loadLevelState` で梯子クランプ後の現在レベルを再読込。全データ削除後はホーム（距離リマインド）へ戻す。
- `App.tsx`：`handleSettingsChange` を AppRoot に配線（darkMode 即反映 + ranges/order を AppRoot へ反映）。
- `src/i18n/ja.ts`：`settingsV3.*` 名前空間を追加（v2 settings.* は流用せず v3 専用キーを新設）。
- `tests/screens/v3/AppRoot.test.tsx`：設定タブ到達アサーションをプレースホルダ文言 → `getByTestId('app-settings')` に更新。

### 撤去ファイル（v2 一括撤去）
- `src/screens/v2/SettingsScreen.tsx` + `tests/screens/v2/SettingsScreen.test.tsx`
- `src/state/settings.ts`（v2）+ `tests/state/settings.test.ts`
- `src/state/statsRecorder.ts` + `tests/state/statsRecorder.test.ts`
- `src/state/sessionRecorder.ts` + `tests/state/sessionRecorder.test.ts`
- `src/lib/v2/statsAggregation.ts` + `tests/lib/v2/statsAggregation.test.ts`

撤去前に依存グラフを精査し、上記 5 モジュールが「v2 SettingsScreen / 自テスト / 相互参照」のみで閉じた孤立クラスタであることを確認（v3 から一切参照されない）。`src/screens/v2/` ディレクトリは空になり削除済み。

## 2. F-13 受け入れ基準マッピング（1 項目ずつ）

| # | 受け入れ基準 | 実装 / 確認 |
|---|---|---|
| 1 | 5 変数の有効値部分集合を設定でき梯子に反映 | RG-1 ×5 変数。`setVariableRange` → `updateLevelSettings`。総レベル数プレビューが即更新（Playwright：720→540→150 等を確認） |
| 2 | 各変数 1 値以上必須（全無効不可） | RangeSelector が最後の 1 値を外す操作をブロックし `onMinViolation`→Toast「少なくとも 1 つ選んでください」。単体テスト + Playwright 確認 |
| 3 | 変化順を組み替え可能・梯子に反映 | OR-1 上下ボタン。`setVariableOrder`→`updateLevelSettings`。Playwright で「時間→個数→…」へ並べ替え確認、localStorage `variableOrder` 反映確認 |
| 4 | 範囲/変化順変更で現在レベルクランプ + 連続失敗 0 リセット（§4.5） | `updateLevelSettings`（S3）が `clampLevelState` を実行。単体テスト：currentLevel 700→80 にクランプ・consecutiveFailures 1→0。Playwright：700→640、failures 1→0 を localStorage で確認。クランプ時 Toast「現在レベルは {N} に調整されました」 |
| 5 | レベル自動決定 5 変数の手動スライダーは存在しない | スライダー UI なし。範囲（チップ）と変化順（並べ替え）のみ。NumberSpinner/Slider 不使用 |
| 6 | 旧設定 UI（b/scoringMode/r/n/m/a 手動）は一切存在しない | v2 SettingsScreen 撤去。単体テストで「採点方式」「全問正解で次へ」「ラウンド数」「1 ラウンドの秒数」「周波数変化速度」「格子サイズ（n×n）」が**不在**であることをアサート |
| 7 | 視聴距離 30/40/50（既定 40）即保存 | SegmentedControl → `saveUserProfile`。単体テスト：50 選択で UserProfile 反映 |
| 8 | ダークモード OS連動/明/暗 | SegmentedControl → `setDarkMode`。単体テスト：暗で darkMode 保存 + onSettingsChange 通知（App で即反映） |
| 9 | 音/振動 個別トグル・ON/OFF 一目判別 | Toggle ×2（ノブ位置 + 「ON」/「OFF」テキスト、NF-12）。単体テスト：効果音 OFF 保存 |
| 10 | 片眼ガイダンス なし/左/右/交互 | SegmentedControl → `setOneEyeGuidance` |
| 11 | 免責再閲覧（閲覧のみ） | DisclaimerModal（同意ボタンなし、閉じるのみ）。単体テスト：開閉。Playwright：モーダル描画確認 |
| 12 | 全データ削除 2 段階 → L1/0/0 リセット | タップ → ConfirmDialog → `deleteAllData`。単体テスト：LevelState が {1,0,0}・バッジ earned=false。キャンセルで非削除。Playwright：ダイアログ描画 |
| 13 | 各項目行 56pt 以上 | SettingRow（recommended=56）、RangeSelector チップ/OR-1 ボタン 48pt（タップ領域）、OR-1 行 56pt、リンク行 56pt |
| 14 | バージョン v3.0.x + 免責同意日時 | `v3.0.0` + 同意日時（disclaimerAgreedAt 整形）。単体テスト：/v3\.0\.0/ 表示 |

## 3. 範囲変更 → クランプ動作確認（§4.5）

- 単体（決定論）：currentLevel=700/failures=1 で rotationSpeed を 9→1 値へ段階的に絞ると total 720→80、currentLevel→80、failures→0、highestLevel≤80。
- 範囲が縮んでも現在レベルが収まる場合（L3、total 720→640）はクランプ告知を出さないが failures は 0 リセット（梯子変更のため §4.5 通り）。
- Playwright（実 localStorage）：高レベル 700 から rotationSpeed を絞ると `levelState` が {currentLevel:640, consecutiveFailures:0} に更新されることを確認（クランプ + 連続失敗リセットが端末永続化に反映）。

## 4. 旧 UI 不在の確認

- v2 SettingsScreen（n/m/r/a/b スライダー・採点方式①②③・周波数変化）を撤去。
- 単体テストで旧ラベルの非存在をアサート（上表 #6）。
- 範囲設定は「梯子の定義域」を変えるだけで、個別レベルの値を固定する手動 UI ではない（F-13 / components.md OR-1 注記）。

## 5. 撤去した v2 と残オーファン（S11 最終掃除へ申し送り）

- **撤去済み**：v2 SettingsScreen / v2 state/settings / statsRecorder / sessionRecorder / lib/v2/statsAggregation（+各テスト）。
- **残る v2 オーファン（live な v3 チェーンが依存中のため本 S では撤去せず）**：
  - `state/schema.ts` `state/repository.ts` `state/dataReset.ts` `state/migration.ts` `state/keys.ts`（v2 名前空間。ただし `lib/calibration` 型等を介して v3 が間接利用するものあり。S11 で v2 専用部の切り出し精査）
  - `lib/v2/gameMachine.ts` `lib/v2/roundGen.ts` `lib/v2/patch.ts` `lib/v2/scoring.ts` `lib/v2/gameView.ts` `lib/v2/feedback.ts` `lib/v2/rng.ts` `lib/v2/dateUtil.ts`：v3 ゲーム/描画/履歴チェーンがまだ import 中（GameScreen / GaborGrid / useFeedback / lib/v3/* 等）。S11 で v3 専用実装への移管と同時に撤去判断。
  - `components/v2/{SettingRow, Toggle, SegmentedControl, DisclaimerPanel, NumberSpinner, SkipLink, ConfirmDialog, AdManager*}`：SettingRow/Toggle/SegmentedControl/DisclaimerPanel は v3 設定/オンボで**流用中**（残す）。NumberSpinner/SkipLink は現状 live 参照なし＝S11 で撤去候補。AdManager は native 広告で**維持**（壊さない）。
  - `hooks/v2/useGameTimer.ts` `hooks/v2/useFeedback.ts`：v3 GameScreen / v2 が利用。S11 精査。
  - **これで v2 の画面は全撤去**（screens/v2 ディレクトリ消滅）、主要 v2 ロジック（採点/統計集計/セッション記録）も撤去済み。残るのは v3 が依存中の下層ユーティリティのみ。

## 6. native 懸念監査（CLAUDE.md §5/§6）

- 新規 UI に Web 専用 API（document/window/DOM 直接操作）は**ゲームロジック側に混入なし**。DisclaimerModal/Toast/ConfirmDialog の `document.addEventListener('keydown')` は **`Platform.OS === 'web'` ガード内**のみ（既存 ConfirmDialog の確立パターン踏襲）。`webAria` は Web のみ role/aria-* を付与、Native は no-op。
- `Image` の transform 系メモ化問題は該当なし（本 S は画像なし）。
- セーフエリア（NF-30）：SafeAreaView `edges={['top','left','right']}`、下部はタブバーが担保。
- アイコンは `@expo/vector-icons` Ionicons（既存設定画面と同パターン、native 対応）。

## 7. a11y / レスポンシブ

- RG-1 チップ role=checkbox + aria-checked、グループ aria-label「{変数}の範囲」。
- OR-1 role=list、上下ボタン aria-label「{変数}を 1 つ上へ/下へ」、移動を Toast（aria-live）で読み上げ。
- Toggle=role=switch + ON/OFF テキスト、SegmentedControl=role=radiogroup。
- ダイアログ/モーダルは role=dialog + 初期フォーカス（ConfirmDialog=キャンセル、DisclaimerModal=閉じる）+ Esc（Web）。
- 色のみ非依存：選択チップは塗り+✓+太字、トグルは位置+テキスト、危険操作は色+ラベル。
- レスポンシブ：360/375 は 1 カラム・回転速度 9 チップ折り返し、1280 は最大 720px 中央寄せ。Playwright 3 幅でスクショ確認（console error 0 件 ×3）。

## 8. Playwright 視覚検証（temp-images/s10_5/）

- `settings-{360,375,1280}.png`：3 幅レイアウト。
- `range-count-removed.png` / `range-speed-narrowed.png`：チップ選択で総レベル数が 720→540→150 と変化。
- `min-one-violation.png`：最後の 1 値（3x3）が外せず残る。
- `order-moved.png`：変化順「時間→個数→…」、端ボタン disabled、デフォルトに戻すリンク。
- `disclaimer-modal.png`：免責閲覧モーダル（閉じるのみ）。
- `delete-confirm.png`：全データ削除 2 段階目ダイアログ（danger）。
- localStorage 検証：range/order/soundEnabled/levelState の永続化、クランプ 700→640 + 連続失敗 0 を確認。全幅で console error 0。

## 9. 既知の懸念

- クランプ Toast は「直近の 1 操作でレベルが動いたとき」に出す設計。範囲を複数チップ連続で絞る途中、レベルが既に新上限に収まった以降の操作では告知が出ない（仕様上クランプ未発生のため正しい挙動）。初回にクランプした時点で 1 度告知される。
- Toast は自動消滅せず、次の操作（クランプなし）で消える。意図的（テスト容易性・読み上げ確実性）。常時バナーではなく操作起点のみ。
- 範囲変更の即時性：UI は 1 操作ずつの逐次反映が前提（各 `updateLevelSettings` が storage を都度読み直すため、超高速連打時のみ最後の操作のみ反映されうる。実利用・テストとも逐次操作で問題なし）。

## 10. 検証結果サマリ

- `npm run typecheck`：PASS（エラー 0）
- `npm test`：**601 / 601 PASS**（55 スイート）。新規 24 件追加、v2 孤立テスト 5 ファイル撤去。
- `npm run build:web`（`expo export --platform web`）：成功（dist 出力）。
- `npm run dev`：本 S は dev サーバー起動不要（静的 build を serve して Playwright 検証、CLAUDE.md §6 フォールバック方針）。
