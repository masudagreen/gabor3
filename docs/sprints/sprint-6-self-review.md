# Sprint 6 セルフレビュー（v3.0）— ボトムタブナビ・中断ダイアログ（F-05 / F-07）+ AppRoot v3 本配線

> spec.md v3.0 / F-05・F-07・§4.4。S5 の v3 ゲーム画面を **AppRoot v3** に配線し、
> `App.tsx` を v3 アプリへ切替え、v2 ゲーム UI チェーンの撤去に着手した。
> （本ファイルは v2.0 S6 の内容を v3.0 S6 で上書き。）

## 1. やったこと

### F-05 ボトムタブナビ
- `src/components/v3/BottomTabBar.tsx`（NV-1）新設。3 タブ（ホーム/履歴/設定）を最下部に常時表示。
- アクティブ表示を**色のみに依存しない**（NF-12）：上辺 3px インジケータ + 前景色 + ラベル太字（Bold/Medium）+ アイコン塗り/線（Ionicons home/time/settings の塗り版/outline 版）。
- タップ領域 64px（>= 48pt）、bottom セーフエリア分の padding（NF-30）。
- a11y：`role="tablist"` / 各 `role="tab"` + `aria-selected` + aria-label（「ホームタブ」等）。Web は Tab/Enter（focus ring 3px、useFocusStyle）。
- `src/screens/v3/AppRoot.tsx` が `onTabPress` を受け、プレイ中なら中断ダイアログ、非進行中なら即切替を判断。

### F-07 中断ダイアログ
- `src/components/v3/ConfirmDialog.tsx`（DG-1）新設。中央モーダル + scrim（背後ゲームが透ける）。
- 2 択「中断する（OK・primary）」「続ける（キャンセル・secondary）」、各 56pt（>= 48pt）。
- a11y：`role="dialog"` `aria-modal` `aria-labelledby`、初期フォーカス=安全側「続ける」、**Esc=キャンセル**（Web のみ。`document` は `Platform.OS!=='web' || typeof document==='undefined'` でガード）。
- 本文は screens.md S6-2 改訂どおり「中断するとこのゲームは記録されず、レベルも変わりません。」（`abortV3.message`）。
- トリガー：**プレイ中**のホーム左上 × / 他タブ選択（両方で同一ダイアログ）。
- OK：起点に応じ着地（× = ホームに留まり同レベルで新ゲーム再生成 / タブ = 当該タブへ遷移）。**進行中ゲームはレベル・記録に一切反映しない**（§4.4：`applyResult`/記録を呼ばず破棄、`gameKey` を進めて作り直し）。
- キャンセル：ダイアログ閉、`paused` 解除でゲーム継続（残り時間・選択状態は GameScreen 内 state 保持）。
- 非進行中（結果開示中・待機中）は × ・タブ移動とも**ダイアログなしで自由遷移**。

### AppRoot v3 本配線 / App.tsx
- `App.tsx` を v2 アプリ（v2 AppRoot/Onboarding/v2 migration）から **v3 AppRoot 本配線**へ切替え。起動で v3 `runStartupMigration`（F-11：旧 v1〜v2 消去 + v3 初期化 L1）→ v3 Settings(darkMode)/UserProfile ロード → DataResetNotice（RZ-1）→ v3 AppRoot。
- ホーム=S5 の v3 GameScreen を現在レベルで暫定起動（本格ホーム結果フローは S7）。履歴/設定=暫定プレースホルダ（`TabPlaceholderScreen`「準備中」）。
- GameScreen に `onPlayingChange(playing)` を追加し、AppRoot が「進行中（締め切り前）/非進行（開示後）」を把握して F-05/F-07 の自由遷移判定に用いる。
- 旧 `EXPO_PUBLIC_V3_GAME` ハーネス分岐と `GameDevHarness.tsx` を撤去・統合。

### v2 撤去
- 削除：`screens/v2/{AppRoot,GameScreen}`・`components/v2/{BottomTabBar,ConfirmButton,SessionResultCard}`・`screens/v3/GameDevHarness`。
- 削除した v2 テスト：`screens/v2/{AppRoot,startupFlow,AppRootFeedback,GameScreen,GameScreenFeedback}`・`components/v2/{BottomTabBar,SessionResultCard}`・`integration/s10FullFlow`。`gameComponents.test` から ConfirmButton ブロックのみ除去。
- **`SessionResultCard` 撤去で run.md §V3.4 の既知 authored-broken テストが解消**（全件グリーン）。
- 温存（S7/S8/S9/S10 が依存）：v2 lib scoring/gameMachine/roundGen/patch/gameView・state stats/badge/sessionRecorder・v2 SettingsScreen/HistoryScreen/DistanceReminder/Onboarding・残る v2 描画コンポーネント（オーファンだが v2 描画テストが緑のため温存、S7 で一括撤去推奨）。詳細は run.md §V3-S6.4。

## 2. 確認したこと（自己評価チェックリスト）

- [x] `npm run typecheck`（tsc strict）エラー 0
- [x] `npm test` 59/59 スイート・**626/626 件 全 PASS**（S5 の 1 赤 = 解消）。新規 AppRoot.test +9 件
- [x] `npm run build:web` 成功・**既定ビルドが v3 アプリ**（AppEntry ≈ 1.07 MB、v2 撤去で縮小）
- [x] Playwright で 360/375/1280 を検証：3 タブ・aria-selected・プレイ中タブ/× で中断ダイアログ・キャンセル継続・OK で当該タブ遷移・非進行中自由遷移（`temp-images/s6/*.png`）
- [x] 空状態：履歴/設定の「準備中」プレースホルダ表示
- [x] デザイン乖離なし：DG-1 / NV-1 / screens.md S6-1/S6-2 に準拠（色+形+ラベル、56pt ボタン、scrim）
- [x] native 懸念監査：Web 専用 API は ConfirmDialog の `document`(Esc) のみ・Platform/typeof ガード済み。Image transform メモ化問題なし
- [x] セーフエリア：タブバー bottom inset / タブ画面・ダイアログはセーフエリア準拠（NF-30）。ゲーム画面はフルスクリーン許容（NF-29、GameScreen 既存）

## 3. 受け入れ基準マッピング

### F-05
| 受け入れ基準 | 実装 |
|---|---|
| 画面下部に 3 タブ常時表示 | BottomTabBar（AppRoot 最下部固定） |
| タップで対応画面に切替 | requestTab → setTab（非進行中即時） |
| 選択中タブを色のみ非依存で明示 | 上辺3px+前景色+太字+塗り/線アイコン（NF-12） |
| タップ領域 48pt 以上 | tab minHeight 64px |
| プレイ中の他タブで中断ダイアログ | playing ∧ next≠home → ダイアログ |
| 非進行中のタブ移動は自由 | playing=false（開示後）で即切替 |
| Web キーボード操作 | role=tab + Pressable + focus ring（Tab/Enter） |

### F-07
| 受け入れ基準 | 実装 |
|---|---|
| プレイ中 × でダイアログ | requestAbortFromX（playing 時のみ） |
| プレイ中 他タブで同一ダイアログ | requestTab、同一 ConfirmDialog |
| 2 択「中断する」「続ける」 | abortV3.confirm/cancel |
| OK=記録せず中断・レベル不変・着地（×=終了/タブ=当該タブ） | confirmAbort（applyResult/記録を呼ばず破棄、起点で setTab） |
| キャンセル=継続（残り時間・選択保持） | cancelAbort（paused 解除、GameScreen state 保持） |
| 非進行中は × ・タブとも自由 | playing=false で × は no-op・タブは即切替 |
| ボタン 48pt 以上 | ConfirmDialog button minHeight 56pt |

## 4. 既知の懸念 / 申し送り（S7）

- **起動フロー暫定**：S6 ではオンボーディング・距離リマインドを挟まず直接ホームゲーム開始。F-06 の初回オンボ → 距離リマインド → 自動開始は S7。
- **ホーム結果暫定**：`onResolved` は `applyResult` のメモリ反映 + 次ゲーム生成のみ。ホーム結果カード（RC-1）・記録永続化（`recordCompletedGame`）・「もう一度」は S7 で `onResolved` に接続。レベルの永続化（`saveLevelState`）も S7。
- **× 起点の中断着地**：現状「同レベルで新ゲーム再生成」。S7 のホームフロー（待機/結果）設計時に着地点を再検討。
- **v2 オーファン撤去**：v2 描画コンポーネント群（GaborGrid 等）は App から未参照だが v2 テストが緑のため温存。S7 で v2 起動フローを完全に外したら一括撤去推奨（CountdownTimer v2 は DistanceReminder v2 が依存中）。
- **act() 警告**：GameScreen のタイマー（useGameTimer）由来の act 警告は S5 から既存（テストは PASS）。挙動影響なし。
- **データモデル変更なし**（§7 凍結スキーマ準拠）。
