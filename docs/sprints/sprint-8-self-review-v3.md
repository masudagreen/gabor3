# Sprint S8（v3.0）セルフレビュー — 履歴タブ・レベル進捗グラフ（F-09 グラフ部）

> 対象：spec v3.0 §8 S8 / F-09（日次到達レベル・最高到達レベル・連続日数・累計プレイ回数のグラフ/指標）。
> バッジ一覧（F-09 バッジ部）は S9 範囲のため本 S8 ではプレースホルダ。
> 注：`sprint-8-self-review.md` は v2.0 アーカイブ（バッジ）。本書が v3.0 S8 の self-review。

## 1. やったこと

- **v3 履歴画面 `HistoryScreen` を新設**し、`AppRoot` の履歴タブ（プレースホルダ）を差し替え。
- 永続化（S7 で書き込み済み）を読み込み表示：
  - **日次到達レベル折れ線**（CH-1 `LevelLineChart`）。同日複数ゲームは max（`DailyStats.highestLevelReached`）を代表値に。
  - **最高到達レベル基準線**：橙の水平破線 + 「最高 {n}」凡例ラベル（色のみ非依存）。`LevelState.highestLevel`。
  - **最高到達レベル StatTile**（青強調 `level.fg`）。
  - **連続日数**（🔥 + `Streak.currentStreak`、0 日でも実値）。
  - **累計プレイ回数**（`PlayStats.totalGames`）。
  - **当日強調**：◆ 形 + 赤（`levelChartV3.pointToday`）。他日は ● 青。
  - **Y 軸 動的スケール**（到達レベル 1〜720 対応、`computeYMax`）。軸ラベル 18pt 以上。点滅なし。
  - **データ 7 日未満**：EmptyState「もう少しデータが集まると傾向が見えます」。
- 集計は既存純関数（`statsAggregation.ts`、S3 作成）を流用。本 S8 は**表示用整形の純関数を追加**（`historyView.ts`／`chartGeometry.ts` の v3 化）。

## 2. F-09（グラフ部）受け入れ基準マッピング

| 受け入れ基準 | 対応 | 検証 |
|---|---|---|
| 日次到達レベルの推移を折れ線で表示 | `LevelLineChart` + `historyView` | historyView.test / HistoryScreen.test / Playwright |
| 同日複数ゲームは max（その日の最高到達レベル） | `DailyStats.highestLevelReached`（S3 で max 確定）をそのままプロット | historyView.test |
| 最高到達レベル（過去全体の最高）表示 | StatTile 強調 + グラフ基準線 | HistoryScreen.test（`最高到達レベル 25`）/ Playwright |
| 連続日数（現在値） | StatTile 🔥 + `currentStreak` | HistoryScreen.test（`連続日数 5 日`）|
| 累計プレイ回数 | StatTile + `totalGames` | HistoryScreen.test（`累計プレイ回数 37 回`）|
| グラフ軸ラベル 18pt 以上 | `font.label`（24px）で X/Y 軸ラベル | components 実装・Playwright 目視 |
| 当日の到達レベルを強調 | ◆ 形（borderRadius 0 + 45° 回転）+ 赤色 | HistoryScreen.test（point-today borderRadius=0）/ Playwright |
| データ 7 日未満は案内 | `showTrendHint` → EmptyState | historyView.test（6 日=true/7 日=false）/ HistoryScreen.test / Playwright |
| 点滅エフェクトなし | アニメーション・点滅一切なし（静的描画） | 実装（NF-11）|

## 3. 集計の正しさ

- **日次到達レベル＝クリア基準 max**：`statsAggregation.updateDailyStats`（S3）が clear のみ `highestLevelReached` を更新する仕様を尊重。本 S8 は `DailyStats.highestLevelReached` を読むだけ（再集計しない）。
- **直近 30 日窓・日付昇順・欠損日は点を作らない・未来日/窓外を除外**：`buildHistoryView` で実装、単体テスト済み。
- **動的 Y スケール**：系列最大と最高到達レベル基準線の大きい方にヘッドルーム（1.15 倍）を足し、レベル帯に応じた刻み（<20→5 / <100→10 / それ以上→50）へ切り上げ。空データは上端 10 で軸が潰れない。`computeYMax` 単体テスト済み。

## 4. 撤去した v2 と申し送り

- **撤去**（v3 履歴が代替）：`screens/v2/HistoryScreen.tsx`、`components/v2/{LineChart,StatTile,EmptyState}.tsx`、`lib/v2/{historyView,chartGeometry}.ts`（いずれも 0〜100 スコア折れ線）+ それぞれのテスト。撤去対象は v2 HistoryScreen からしか参照されておらず、リグレッションなし（typecheck/test 緑）。
- **温存**：`components/v2/{BadgeGrid,BadgeCell,BadgeAwardToast}`・`lib/v2/badgeView`・`state/badgeRecorder`（S9 でバッジ部 v3 化時に置換/撤去）、`screens/v2/SettingsScreen` 系（設定タブ未実装）、`components/v2/AdManager*`（native 広告維持＝壊していない）。

### バッジ部の S9 申し送り
- 本 S8 は履歴画面内の「バッジ」見出し直下に EmptyState プレースホルダ（testID `history-badges`）を置くのみ。S9 で `BadgeCell`（BG-1）一覧（獲得/未獲得 + 条件ヒント）+ 獲得演出（BG-2）に差し替える。`BadgeStatus` 永続化（`loadAllBadgeStatuses`）は S3 で配線済み、`badge.*` i18n キーは ja.ts に既存。

## 5. native 懸念監査

- 新規 src ファイルに **Web 専用 API（document/window/localStorage/navigator）なし**（grep 確認）。
- グラフは **View ベース（SVG/native モジュール非追加）**で描画（既存 v2 LineChart と同方式＝native 実績あり）。`transform: rotateZ` を点・線分に使用（`Image` ではなく `View` のため native メモ化問題に該当せず）。
- `fontVariant: ['tabular-nums']`・絵文字（🔥🏅📈⚠️）は既存 v3 コンポーネントと同パターン。
- セーフエリア（NF-30）：`SafeAreaView edges={['top','left','right']}`、ボトムタブ分は AppRoot 側で確保。
- **未確認（要 Android 実機）**：Expo Go 実機での折れ線レンダリング（`transformOrigin: 'left center'` の挙動）と絵文字フォント表示。Web 検証は完了。

## 6. a11y / レスポンシブ / コントラスト

- グラフ：`accessibilityRole="image"` + aria-label 要約（「過去 N 日の到達レベル。最新 {date} は レベル {n}。最高到達レベル {m}」）。当日強調は**色＋形（◆）**で色のみ非依存（NF-12）。基準線は**橙線＋「最高 {n}」テキスト**で意味を補強。
- StatTile：`accessibilityLabel`（「最高到達レベル 25」「連続日数 5 日」「累計プレイ回数 37 回」）。
- 軸ラベル 18pt 以上（`font.label`）。最高到達レベル数値色は `level.fg`（system §1.5 で 8.6:1 / dark 9.71:1、AAA）。折れ線/基準線/当日点は system §1.3 の `color.level.line.*` / `point.today` 実値を `levelChartV3` トークン化。
- レスポンシブ：360 / 390 / 1280 を Playwright で確認。PC は 720px 中央、StatTile を最高/累計 2 列 + 連続日数 1 行。360 でラベル折り返しても破綻なし。

## 7. Playwright 視覚検証

`npm run build:web` → `serve` → localStorage に v3 データを seed → 履歴タブで以下を確認：
- リッチ（9 日・一部 count>1・当日含む）：折れ線・橙破線基準線「最高 25」・当日 ◆（赤）・StatTile（25 青強調 / 37 / 🔥5）。390 / 360 / 1280 全て正常。
- スパース（3 日 < 7）：折れ線 + 「もう少しデータが集まると傾向が見えます」案内が両方表示。

## 8. 既知の懸念

- 当日 ◆（赤）は線色（青）との差はあるが、PC の縮小表示では小さく見える。形（45° 回転）でも区別できるため NF-12 は満たすが、Designer 余地として点サイズの当日強調拡大は将来検討可。
- Android 実機での折れ線（View transform）と絵文字表示は未検証（Web のみ）。
- 履歴はマウント時 1 回読み込みの静的スナップショット（タブ往復で再読込されない）。S8 受け入れ基準上は問題ないが、ゲーム直後にタブを切り替えた場合の即時反映は AppRoot 側のタブ state 保持仕様に依存（現状は再マウントで読み直し）。

## 9. 結果

- `npx tsc --noEmit`：エラー 0。
- `npm test`：**58 スイート / 602 件 PASS**（赤 0）。本 S8 新規 +33 件（historyView 11 / chartGeometry 10 / HistoryScreen 5 / historyComponents 7）、撤去 v2 −45 件。
- `npm run build:web`：PASS（v3 既定アプリ）。
