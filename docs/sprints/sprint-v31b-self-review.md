# Sprint v3.1-B セルフレビュー — UI 配線（セッションループ・3 秒開示・要約・設定 UI・5x5/6x6・仕上げ）

対象：`docs/spec.md`（v3.1）F-01/F-03/F-04/F-07/F-08/F-13・§4.3/§4.6/§4.7、§8.0（S14〜S17 の UI 部）。
v3.1-A のデータ／ロジック層（sessionMachine / sessionFlow / sessionRecorder / level / roundGen /
gameMachine）を**画面に全面配線**し、v3.1 をリリース可能状態にした。

## 1. やったこと

### ゲーム画面：セッションループ＋3 秒開示（F-01/F-03/F-04）
- **AppRoot をセッションループへ全面配線**：`startSession` で開始 → ラウンドごとに GameScreen を
  `key` 差し替えで再生成 → 締切判定確定で `onResolveRound`（resolveCompletedRound：applyResult +
  LevelState 永続）→ 累積 < `sessionMinutes`×60 なら**更新後レベルで次ラウンド**、到達/超過なら
  `onFinalizeSession`（finalizeSession：SessionRecord・日次・累計・バッジ）→ セッション要約。
- **締切後 3 秒開示カウントダウン**：GameScreen の revealed フェーズで `REVEAL_COUNTDOWN_SEC`(3) から
  毎秒減算する `revealCountdown` を駆動。`CD-1 disclosure` variant（全区間 danger 赤 + Black 太字・
  点滅なし・刺激領域直下＝総合バッジの右隣で上部タイマーと分離）を表示。3/2/1 で毎秒ティック音、
  0 で `onResolved`。**開示中は格子・カウントダウンともタップ無効**（GaborGrid pointer-events: none）。
- **全問正解で即時終了しない**：締切は TIMEOUT のみ（v3.1-A の gameMachine 準拠。本パスで
  `closedByAllCorrect` 後方互換フィールドを撤去）。
- **セッション残り時間**：GameTopBar 左に「あと {mm}:{ss}」（`font.label` 灰・段階色なし・控えめ、
  GB-1）。ラウンド開始時の残り（`limitSec − elapsedSec`）から GameScreen が当ラウンドの経過分を
  引いて毎秒表示。現在レベルピルはラウンドごとに変化（F-04 観察可能性）。

### セッション要約（F-08）
- **`SessionSummaryCard`（RC-1 改訂）新設**：セッション終了見出し・**現在レベル（64px 主役）**・
  今セッション最高（48px）・ラウンド集計 compact 3 タイル（ラウンド/クリア（緑）/失敗（中立））・
  今日のストリーク・「もう一度」（64px ≥56pt）。バッジ獲得時は BadgeAwardToast を 1 度。
  `role=region` で要約全体を 1 まとめに読み上げ。LD-1 は本カードに出さない（ゲーム内開示へ移設）。
- 「もう一度」で距離リマインド経由の新セッション（累計プレイ +1 は finalizeSession の totalSessions）。

### 中断（F-07／AS-30）
- プレイ中（playing ∧ ラウンド進行中）の ×／他タブで中断ダイアログ。OK で**未完の現ラウンドは破棄**
  （resolveCompletedRound を呼ばない＝レベル・連続失敗・集計・記録に未反映）。**完了済みラウンドの
  レベル変化は LevelState に永続済みで保持**（巻き戻さない）。完了済みラウンドが 1 つ以上あれば
  `abortSession` で SessionRecord 記録。× 起点はセッション終了（距離へ）、タブ起点は当該タブへ。
  距離リマインド中・3 秒開示中（非進行）・要約表示中は自由遷移。
- 中断ダイアログ文言をセッション制へ更新（「いま挑戦中のラウンドは記録されません。それまでに完了した
  ラウンドの結果は残ります」）。

### 設定 UI（F-13）
- **sessionMinutes ステッパー（SR-1a）**を「プレイ」グループ（範囲設定の前）に新設。`[−] {n}分 [+]`、
  各 56pt、1〜15・既定 5。下限 1 で [−] disabled、上限 15 で [+] disabled。`role=spinbutton` +
  `aria-valuenow/min/max/valuetext`、値変更を aria-live。即保存（updateSettings）。梯子に影響しない旨を
  caption で補足。総レベル数プレビューは不変（AS-23 を UI で確認）。
- **拡張レンジチップ**：RangeSelector は `VALUE_SETS`（§4.1 拡張全集合）から描画するため、個数 5/6・
  時間 60/55/50/45/15/10・サイズ 5x5/6x6・回転速度 7/6.5/1.5/1 のチップが**追加値=既定 OFF**で表示済み。
  flex-wrap 折返し（360px 破綻なし）。ON で総レベル数プレビューが連動（例 5x5 ON → 1080）。
- バージョン表示は `APP_VERSION = '3.1.0'`（既存の version ブロックで `v3.1.x` を表示）。

### 5x5/6x6 格子（F-01／§4.7）
- `GaborGrid.computeGap` を system §16.6 の寸法表に合わせ拡張（3:8px / 4:6px / 5:5px / 6:4px）。
  6x6 でも 360px（実効 328px）に収まりパッチ辺 ≈ 51px（≥48px）。✅/❌・選択枠は GaborPatchCell が
  `sizePx` 比例で縮小。過密回避は v3.1-A の `clampCountToGrid` で生成時に担保済み（静止 1 つ以上）。

### 互換シム撤去・仕上げ（S17）
- `homeFlow.ts` 互換シム＋テスト撤去。`state/v3/index.ts` の export 撤去。
- `gameMachine.closedByAllCorrect` フィールド撤去（締切契機は TIMEOUT 一本）。
- `gameView.revealIntervalMs`/`REVEAL_INTERVAL_MS`/`ALL_CORRECT_FEEDBACK_MS`（1.5 秒開示）撤去。
- `App.tsx` を `resolveCompletedRound`/`finalizeSession`/`abortSession` へ配線（セッション識別子 ref で
  sessionId/startedAt をセッション単位に確定）。`sessionMinutes` を AppRoot へ渡す。
- a11y：レベル/個数読み上げ（既存）+ セッション残り時間 SR ラベル「セッション残り時間 {m} 分 {s} 秒」+
  クリア/失敗（OV-3）+ 3-2-1（disclosure assertive）+ セッション要約 region 読み上げ。色のみ非依存・点滅なし。
  NF-8 確定トークン（countdown danger #FF8A82/#A11C16・level fg・控えめ灰 #A6ADBA は #15171C 上 7:1）。

## 2. 確認したこと

- `npm run typecheck`：PASS（0 エラー）。
- `npm test`：**51 suites / 540 tests 全 PASS（赤 0）**。v3.1-A は 52/537 → homeFlow.test 撤去（−1 suite）+
  純増テストで 540。
- `npm run build:web`：PASS（Expo export、Web bundle 出力）。
- 追加テスト（純増）：
  - `SessionSummaryCard`（要約内容・region 読み上げ・ストリーク 0/トースト無し）3 件。
  - `CountdownTimer` disclosure variant（全区間 danger・読み上げ）1 件。
  - `GameTopBar` セッション残り時間（formatSessionRemaining・表示/SR/未指定）3 件。
  - `GaborGrid` 5x5/6x6 隙間・辺長 ≥48px 2 件。
  - `GameScreen` 締切後 3 秒開示（disclosure 表示・3/2/1 ティック・0 で onResolved）1 件 +
    既存 2 件を 3 秒開示タイミングへ更新。
  - `SettingsScreen` sessionMinutes ステッパー（増減即保存・梯子非影響・下限 disabled）3 件 +
    拡張チップ（5x5/6x6 既定 OFF→ON で 1080・個数/時間/速度の追加チップ存在）2 件。
  - `AppRoot` セッションループ（2 ラウンド→要約・レベル変化観察・要約中自由遷移・もう一度・levelup 音）。
  - `integration` セッション通し（クリア→+1 永続→要約→範囲変更クランプ→もう一度／中断で完了保持）2 件。

## 3. Playwright 検証（自己検証方針）

本パスは Generator ツールセットに Playwright MCP を含まないため、**Jest 統合テストで動線を網羅**して
自己検証した（fake timers + 決定論 rng + AsyncStorage インメモリ）：セッション開始 → ラウンド → 締切 →
✅/❌ 開示 + 3 秒カウントダウン → 次ラウンド（GB-1 レベルピル変化）→ 指定時間でセッション終了 →
要約カード → もう一度（`AppRoot.test`/`integration.test`）。設定で sessionMinutes 増減・拡張チップ ON で
総レベル数変化（`SettingsScreen.test`）。中断で未完破棄・完了済みレベル変化を `loadLevelState` で
永続確認（`integration.test`）。`npm run build:web` 成功で Web ランタイム構成も健全。
**ブラウザ実描画の Playwright スクリーンショット検証はオーケストレーター/Evaluator に委譲**する。

## 4. native 懸念監査（CLAUDE.md §5）

変更ファイル（AppRoot/GameScreen/SettingsScreen/SessionSummaryCard/GameTopBar/CountdownTimer/GaborGrid）を監査：
- **Web 専用 API なし**：`document`/`window`/`localStorage`/`requestAnimationFrame`/`performance` の
  直接使用は変更ファイルに無し。`aria-*`/`role` は `{...({...} as any)}` 透過で native では無害。
  永続化は AsyncStorage（sessionFlow/repository、native+web 両対応）経由のみ。
- **Image transform メモ化**：変更ファイルに `Image`/`transform` なし。ガボール回転描画は既存
  GaborPatchCell（v3.1-A から不変）が担い、本パスで触れていない。
- **5x5/6x6 描画負荷**：6x6=36 セルは GaborPatchCell を 36 個マウント。各セルは `React.memo` 済みで
  回転は GaborPatch 内 transform（BMP 再生成なし）。**実機（Expo Go）での 36 セル回転 fps と 6x6 の
  タップ命中率は要実機確認**（NF-28d、system §16.6 が「Generator は実機で 6x6 のタップ命中率を検証」と
  明記）。既定は 3x3/4x4 のため通常プレイでは 5x5/6x6 は設定で ON にしたときのみ。
- セッション残り時間の灰文字 #A6ADBA は暗バー #15171C 上で 7:1 を満たす定数（NF-8）。

## 5. 受け入れ基準マッピング（v3.1 UI 部）

| 基準 | 対応 |
|---|---|
| F-01 締切時判定・即時終了しない・セッション反復・最後完走 | gameMachine（TIMEOUT 一本）/ AppRoot セッションループ / sessionMachine.completeRound（v3.1-A）、AppRoot/integration.test |
| F-03 ✅/❌ 開示・総合クリア/失敗・3 秒カウントダウン・タップ無効・自動遷移 | GameScreen（revealed + CD-1 disclosure + GaborGrid pointer-events）、GameScreen.test |
| F-04 ラウンドごと昇降・次ラウンドのレベル表示変化・中断で完了保持 | AppRoot（onResolveRound→次ラウンド）+ resolveCompletedRound 永続、AppRoot/integration.test |
| F-07 プレイ中の中断ダイアログ・未完破棄・完了保持・非進行で自由遷移 | AppRoot（confirmAbort/abortSession）、AppRoot/integration.test |
| F-08 セッション要約（ラウンド/クリア・失敗/現在レベル/今セッション最高/ストリーク）・もう一度 | SessionSummaryCard、homeComponents/AppRoot.test |
| F-13 sessionMinutes 1〜15 既定 5 即保存・梯子非影響 / 拡張チップ既定 OFF→ON で総数増 | SettingsScreen（SR-1a ステッパー）/ RangeSelector（VALUE_SETS）、SettingsScreen.test |
| §4.7 5x5/6x6 描画・タップ 48pt・比例縮小・過密回避 | GaborGrid.computeGap / GaborPatchCell / clampCountToGrid（v3.1-A）、gameComponents.test |

## 6. 既知の懸念・申し送り

- **6x6 の実機 fps / タップ命中率**：36 セル回転 + 小パッチ（≈51px）の体感は実機（iPhone 12 / Pixel 5
  相当・Expo Go）で要確認（NF-28d / AS-21）。破綻時は cpd を下げ縞を太く（Generator 余地）。既定 OFF の
  ため通常プレイには影響しない。
- **HomeResultCard（RC-1 v3.0 単発結果カード）は未使用残置**：SessionSummaryCard へ置換済みだが、
  自身のコンポーネントテストとともに残す（回帰 0・無害）。完全削除する場合は homeComponents.test の
  該当 describe と `homeV3.*` i18n を併せて撤去する。
- **3 秒開示カウントダウンのタイマー実装**：`setTimeout` 連鎖（毎秒）。テストは 1 秒刻みの act で
  再スケジュールを跨ぐ（fake timers 1 回の大 advance では微妙な経路があるため）。実機は実時間で進行。

## 7. 追加/変更/削除ファイル一覧

新規（1 + テストは既存ファイルへ追記）：
- `src/components/v3/SessionSummaryCard.tsx`

変更：
- `src/screens/v3/{AppRoot,GameScreen,SettingsScreen}.tsx`
- `src/components/v3/{CountdownTimer,GameTopBar,GaborGrid}.tsx`
- `src/lib/v3/{gameMachine,gameView}.ts`・`src/state/v3/index.ts`・`App.tsx`・`src/i18n/ja.ts`
- テスト：`tests/screens/v3/{AppRoot,GameScreen,integration,SettingsScreen}.test.tsx`・
  `tests/components/v3/{gameComponents,homeComponents}.test.tsx`・`tests/lib/v3/{gameMachine,gameView}.test.ts`
- `docs/run.md`

削除：
- `src/state/v3/homeFlow.ts`・`tests/state/v3/homeFlow.test.ts`（v3.0 互換シム撤去）

## 8. 結果

- `npm run typecheck`：PASS
- `npm test`：**51 suites / 540 tests 全 PASS（赤 0）**（v3.1-A 52/537 → homeFlow.test 撤去 −1 suite ＋純増）
- `npm run build:web`：PASS
