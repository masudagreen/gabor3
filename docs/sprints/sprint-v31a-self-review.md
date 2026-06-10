# Sprint v3.1-A セルフレビュー — セッション制データ層＋ロジック層

対象：`docs/spec.md`（v3.1）§4（4.1/4.3/4.4/4.6/4.7）・§7（v3.1 再凍結）・§8.0（S12/S14/S15/S16 のデータ・ロジック部）。
UI（ゲーム開示描画・設定 UI・セッション要約画面）は次パス **v3.1-B**。

## 1. やったこと

### データ層（schema / migration / repository / keys）
- `Settings.sessionMinutes`（int 1..15・**既定 5**）追加。`SESSION_MINUTES_MIN/MAX/DEFAULT` 定数。
- `Settings.variableRanges` の各値域を §4.1 拡張全集合へ（`VALUE_SETS` 拡張）。**`defaultVariableRanges()` は
  v3.0 と同一の既定有効集合**（`DEFAULT_VALUE_SETS`、追加値 OFF・720）。`fullVariableRanges()`（6864）追加。
- `GameRecord` → **`SessionRecord`**（§7.4 のフィールド厳守：sessionId/startedAt/completedAt/sessionMinutes/
  roundCount/clearCount/failCount/startLevel/endLevel/highestLevelInSession）。キー `game:<uuid>` →
  `session:<uuid>`。
- `PlayStats.totalGames` → **`totalSessions`**（+ `totalRounds`）、`DailyStats.gameCount` → **`sessionCount`**
  （+ `roundCount`）。
- `UserProfile.schemaVersion` `'3.0.0'`→`'3.1.0'`。名前空間 `gaboreye:v3:*` 据え置き。
- migration（非リセット）：`ensureV3Initialized` が読み込み時に新フィールドを既定/旧フィールド写像で補完
  （sessionMinutes 既定 5・totalGames→totalSessions/totalRounds・gameCount→sessionCount/roundCount）し、
  schemaVersion を 3.1.0 へ更新して永続化。旧 `game:<uuid>` は無視（破棄せず放置）。v1〜v2 全消去（F-11）維持。

### ロジック層（level / roundGen / gameMachine / sessionMachine / statsAggregation）
- `VALUE_SETS` を易→難で拡張（count[1-6] / seconds[60..10] / gridSize[3-6] / rotationSpeed[7..1]）。
  オドメータ・totalLevels・clamp は range 汎用のためそのまま拡張集合で動作（境界テスト追加）。`GridSize` を
  3|4|5|6 へ拡張。
- `clampCountToGrid(count, gridSize) = min(max(count,1), gridSize²−1)`。`generateRound` が生成時に適用
  （§4.7 / NF-28d）。静止パッチを必ず 1 つ以上残す。`generateSpacedAngles` は任意 count 対応済み（25/36 セル確認）。
- `gameReducer`：**全問正解での即時締め切りを廃止**（§4.3 / AS-24）。締切は `TIMEOUT` のみ。`isAllCorrect` は
  締切時の判定補助として残置。`closedByAllCorrect` は後方互換で常に false（@deprecated）。`REVEAL_COUNTDOWN_SEC=3`
  を `gameView` に追加。
- `sessionMachine`（純ロジック）：`startSession`/`completeRound`/`shouldContinue`/`hasCompletedRounds`。
  各ラウンド完了で `applyResult` を即適用（§4.4・連続失敗/現在レベル連続更新）、累積経過を更新、集計（ラウンド数・
  クリア/失敗・到達最高・クリア最高・クリア各ラウンドの levelParams）を更新、累積 ≥ limitSec で終了。
- `statsAggregation`：セッション単位の `updateDailyStats`（クリア最高 max・sessionCount+1・roundCount 加算）/
  `updatePlayStats(prev, roundCount)`（totalSessions+1・totalRounds 加算）/ `updateStreak`（不変）。

### 記録・配線層（sessionRecorder / sessionFlow / homeFlow 互換シム）
- `sessionRecorder.recordCompletedSession`：SessionRecord 永続化 + DailyStats/Streak/PlayStats 更新 +
  バッジ判定。**高難度バッジ（B-06/07/08）はそのセッションでクリアした各ラウンドの levelParams を 1 件ずつ評価**、
  継続（B-01-05）はセッション末 streak、高レベル（B-09-11）はセッション末 highestLevel。
- `sessionFlow`：`resolveCompletedRound`（ラウンドごと LevelState 即永続＝F-04 再起動跨ぎ保持）/
  `finalizeSession`（セッション末記録）/ `abortSession`（完了済みラウンドありなら記録、0 件なら未記録）。
- `homeFlow.resolveCompletedGame` は **v3.0 互換シム**へ改修（1 ゲーム=1 ラウンド=1 セッションとしてセッション層
  上で動かす）。App.tsx/AppRoot を温存して v3.0 動線の回帰 0 を維持。v3.1-B でセッションループ配線後に撤去予定。

## 2. 確認したこと

- `npm run typecheck` 緑（0 エラー）。
- `npm test` 全 PASS（**52 suites / 537 tests**、赤 0）。v3.1-A 前は 50/491 → +46 件純増。
- `npm run build:web` 成功（Expo export、Web bundle 出力）。
- native 懸念：新規ロジック/記録モジュールに Web 専用 API（document/window/localStorage）混入なし。永続化は
  AsyncStorage（store.ts、native+web 両対応）経由のみ。

### 追加した主なテスト
- level：拡張全集合の梯子（L1=60秒/速7、L6→L7 桁上がり、L6864 全最難、往復一致、範囲外）、既定 720 不変。
- roundGen：`clampCountToGrid` 境界、count6×{3x3/5x5/6x6} 過密回避（静止 1 つ以上）。
- gameMachine：全問正解でも即時締切しない／締切は TIMEOUT のみ／TIMEOUT で clear・fail。
- sessionMachine：即昇降の連続シナリオ、累積到達でループ終了・最後のラウンド完走、3 秒開示非算入、中断保持。
- sessionFlow：ラウンドごと LevelState 永続（再起動跨ぎ連続失敗）、finalizeSession 記録、abortSession 記録要否。
- sessionRecorder：SessionRecord/日次/累計/バッジ（クリア各ラウンド high-difficulty、クリア 0 件で B-06 不獲得）。
- statsAggregation：sessionCount/roundCount/totalSessions/totalRounds。
- settings：sessionMinutes sanitize/setter（梯子不変）、v3.1 追加値 ON で総レベル数増（2160/6864）。
- migration：v3.0→v3.1 補完（sessionMinutes/totalGames/schemaVersion/旧 game 無視）。
- repository：SessionRecord I/O、旧 gameCount/totalGames の読み込み補完。

## 3. 受け入れ基準マッピング（§4 / §7）

| 基準 | 対応 |
|---|---|
| §4.1 値集合拡張・既定 720・追加 OFF | `VALUE_SETS`/`DEFAULT_VALUE_SETS`/`defaultVariableRanges`/`fullVariableRanges`、level.test |
| §4.3 締切時判定・全問正解即時終了廃止 | `gameReducer`（TOGGLE で締めない・TIMEOUT のみ）、gameMachine.test |
| §4.4 ラウンドごと即昇降・連続失敗永続 | `completeRound`（applyResult）/`resolveCompletedRound`（LevelState 永続）、sessionMachine/sessionFlow.test |
| §4.6 セッションループ・累積到達終了・最後完走・3 秒非算入 | `startSession`/`completeRound`/`shouldContinue`、sessionMachine.test |
| §4.7 個数×サイズクランプ・静止 1 つ以上 | `clampCountToGrid`/`generateRound`、roundGen.test |
| §7.2 sessionMinutes 1..15 既定 5・梯子非影響 | `Settings.sessionMinutes`/`setSessionMinutes`、schema/settings.test |
| §7.4 SessionRecord・中断記録要否 | `SessionRecord`/`recordCompletedSession`/`abortSession`、sessionRecorder/sessionFlow.test |
| §7.5/§7.7 sessionCount/roundCount/totalSessions/totalRounds | `statsAggregation`/`DailyStats`/`PlayStats`、statsAggregation.test |
| §7.9 v3.0→v3.1 非リセット補完 | `ensureV3Initialized`/`load*` 補完、migration/repository.test |

## 4. 3 秒開示の経過算入方針（§4.6 余地の決定）

**累積経過には各ラウンドの実プレイ秒数（roundPlaySec = 挑戦レベルの seconds）のみを算入し、締切後の 3 秒開示
カウントダウンは算入しない。** 理由：セッション長を「注視秒数の合計」として予測可能にするため（開示は固定 3 秒の
演出であり注視ではない）。判定基準点は「各ラウンド完了時」に固定（§4.6 準拠）。`sessionMachine.completeRound` の
`roundPlaySec` 引数で表現。

## 5. 中断時の記録方針（§7.4 / F-07 / AS-30）

- 進行中の**未完ラウンドは破棄**（`completeRound` を呼ばない＝レベル・連続失敗・集計に反映しない）。
- 完了済みラウンドのレベル変化は `resolveCompletedRound` で**ラウンドごとに既に LevelState へ永続済み**のため、
  中断で巻き戻さない（保持）。
- 中断セッションの SessionRecord：`abortSession` が **完了済みラウンドが 1 つ以上あるときのみ記録**（§7.4 の
  「完了済みラウンドが 1 つ以上ある中断はその時点までを記録してよい」を採用）。完了済み 0 件の中断は記録しない。

## 6. データモデル §7 からの逸脱

**なし。** §7 で定義された各レコードのフィールドのみを使用。`SessionRecord` は §7.4 の 10 フィールド厳守。
`sessionMachine.SessionTotals.clearedLevelParams`（クリア各ラウンドの levelParams 配列）は**永続化しない**
バッジ判定用の一時集計であり、`SessionRecord` には含めない（§7.4 の「ラウンド詳細は永続化しない」を遵守）。

## 7. 既知の懸念・申し送り（v3.1-B）

- **AppRoot/GameScreen はまだ v3.0 単発フロー**。本パスはロジック層のみ。v3.1-B でセッションループ・3 秒開示 UI・
  セッション要約画面・sessionMinutes 設定 UI・拡張値域チップ UI を配線し、`homeFlow.ts` 互換シムを撤去する。
- `gameView.revealIntervalMs`（1.5 秒）は v3.0 互換で残置。v3.1-B は `REVEAL_COUNTDOWN_SEC`（3 秒）を使う。
- `gameMachine.closedByAllCorrect` は常に false の後方互換フィールド（v3.1-B で参照を外せる）。
- 高難度バッジ（B-06/07/08）はセッション末にクリア各ラウンドの levelParams で評価する設計。リアルタイム性
  （ラウンドクリア瞬間の演出）が必要なら v3.1-B でラウンドごと評価へ移してよい（本パスはセッション末記録に集約）。

## 8. 追加/変更/削除ファイル一覧

新規（3 + テスト 3）：
- `src/lib/v3/sessionMachine.ts`・`src/state/v3/sessionRecorder.ts`・`src/state/v3/sessionFlow.ts`
- `tests/lib/v3/sessionMachine.test.ts`・`tests/state/v3/sessionFlow.test.ts`・`tests/state/v3/sessionRecorder.test.ts`

変更：
- `src/lib/v3/{level,roundGen,gameMachine,gameView,statsAggregation}.ts`
- `src/state/v3/{schema,keys,repository,settings,migration,homeFlow,index}.ts`
- `src/screens/v3/{HistoryScreen,SettingsScreen}.tsx`・`src/i18n/ja.ts`
- テスト：`tests/lib/v3/{level,roundGen,gameMachine,gameView,statsAggregation}.test.ts`・
  `tests/state/v3/{schema,repository,settings,migration,dataReset,homeFlow}.test.ts`・
  `tests/lib/v3/historyView.test.ts`・`tests/components/v3/historyComponents.test.tsx`・
  `tests/screens/v3/{HistoryScreen,SettingsScreen,GameScreen,AppRoot,integration}.test.tsx`
- `docs/run.md`

削除：
- `src/state/v3/gameRecorder.ts`・`tests/state/v3/gameRecorder.test.ts`（sessionRecorder に置換）

## 9. 結果

- `npm run typecheck`：PASS
- `npm test`：52 suites / 537 tests 全 PASS（前 50/491 → +46）
- `npm run build:web`：PASS
