# Sprint 3 自己評価 — データ層・設定・範囲/変化順・v3 初期化（F-11 / F-13 / §7 / §4.5）（v3.0）

> v3.0 リブート S3。**データ/永続化/ロジック層のみ**（設定 UI 画面 S3-1/S3-2 は S5/S7）。
> spec.md v3.0 §7 データモデル（`gaboreye:v3:*`）・F-11（起動時 v3 初期化）・F-13（設定の範囲/変化順・継承項目）・§4.5（範囲変更クランプ）準拠。
> 注：本ファイルは v2.0 の同名レビュー（ゲームコア）を v3.0 S3 内容で上書きしたもの。

## 実装方針（重要）

v2.0 のスコア管理アプリ（App.tsx → AppRoot → 全 v2 screens/components/lib）は依然として全面配線されており、`src/state/schema.ts`（v2 `Settings`/`SessionRecord`/`scoringMode` 等）・`src/state/keys.ts`（`gaboreye:v2:*`）に強く依存している。これを in-place で v3 化すると 50+ ファイル・数百テストが連鎖崩壊し、「型エラー/テスト赤を残さない範囲で進める」指示に反する。

そこで S2（`src/lib/v3/level.ts`）と同じく、**v3 データ層を `src/state/v3/` の並行モジュールとして新設**した。v2 の `src/state/*` は S5 以降の UI 差し替えまで温存（撤去は S5〜S8 で「該当 v3 UI 実装 ↔ 旧コード撤去」を同時に）。これにより v2 アプリは無改変＝typecheck 緑・既存テスト全 PASS（リグレッション 0）、v3 データ層は §7 厳密準拠の独立スキーマで完成。S5 設定タブ・S7 起動フローは `src/state/v3/` を import するだけで配線できる。

> run.md §V3.5-E「`gaboreye:v2:*` → v3 再設計／migration を v1〜v2 全消去に拡張」を満たす。旧 v2 名前空間消去ロジック（`runStartupMigration`）は本 S3 で実装。起動フローへの実配線は S7（screens.md S3-2 の方針どおり）。

## 追加ファイル（src）

| ファイル | 役割 |
|---|---|
| `src/state/v3/schema.ts` | §7 データモデル型 + 既定値。`Settings`（variableRanges/variableOrder/darkMode/sound/haptics/oneEyeGuidance のみ）・`UserProfile`（schemaVersion '3.0.0'）・`GameRecord`・`DailyStats`（highestLevelReached/gameCount）・`Streak`・`PlayStats`（totalGames）・`BadgeStatus`（B-01〜B-11）。`V3_PREFIX='gaboreye:v3:'`・`LEGACY_PREFIXES`（v1/v1.1/v1.2/**v2**）。v2 廃止フィールドは一切含めない |
| `src/state/v3/keys.ts` | `gaboreye:v3:*` キー（§7.10）。`gameKey`/`dailyStatsKey`/`badgeKey` + プレフィックス |
| `src/state/v3/repository.ts` | 型付き load/save（Settings/UserProfile/LevelState/Streak/PlayStats + Game/Daily/Badge コレクション + resetNotice フラグ）。低レベル I/O は既存 `state/store.ts`（名前空間非依存）を再利用。load 時に Settings を sanitize |
| `src/state/v3/settings.ts` | **F-13 中核**。範囲正規化（§4.1 部分集合・易→難順・最低1値）・変化順検証（5変数順列）・各 setter・`settingsTotalLevels`（プレビュー）。永続化ラッパ `updateSettings`（トグル系）/ **`updateLevelSettings`（§4.5：範囲/変化順変更で `clampLevelState` 配線＝現在レベルクランプ + 連続失敗0リセット + highest クランプ）** |
| `src/state/v3/migration.ts` | **F-11**。`runStartupMigration`＝旧名前空間（v1〜v2）全消去 → `ensureV3Initialized`（LevelState=L1/0/0 等を未初期化なら作成）→ `shouldShowNotice`（消去あり×未通知）。`isLegacyKey`/`isV3Key`/`selectLegacyKeys` 純関数。冪等 |
| `src/state/v3/dataReset.ts` | **F-13 全データ削除**。全 `gaboreye:v3:*`（resetNoticeShown 以外）消去 → LevelState=L1/0/0・Settings デフォルト。F-11 通知フラグ保持（再通知防止） |
| `src/state/v3/gameRecorder.ts` | **記録の永続化（§7.4〜§7.7）**。`recordCompletedGame`＝GameRecord 追記 + DailyStats（同日 highestLevelReached=max（クリア基準）・gameCount+1）+ Streak 更新 + PlayStats.totalGames+1。中断は呼ばない。`buildGameRecord` 純関数。バッジ判定は S9 で追加配線 |
| `src/lib/v3/statsAggregation.ts` | 集計純関数。`updateDailyStats`（クリア基準 max・gameCount+1）・`updateStreak`（既存 dateUtil 再利用）・`updatePlayStats`（totalGames+1） |
| `src/state/v3/index.ts` | v3 データ層公開バレル（S5 以降の UI 用） |

## 追加テスト（+68 件、全 PASS）

| ファイル | 件数 | 検証 |
|---|---|---|
| `tests/state/v3/schema.test.ts` | 12 | §7 既定値・Settings が 6 フィールドのみ（v2 廃止フィールド不在）・PlayStats=totalGames・LEGACY に v2 含む・列挙 |
| `tests/state/v3/settings.test.ts` | 18 | 範囲正規化（値集合外除外・易→難順・空集合フル補完）・順列検証・setVariableRange（部分集合反映・全無効は現状維持）・継承 setter・**updateLevelSettings の §4.5 クランプ + 連続失敗0** |
| `tests/state/v3/migration.test.ts` | 11 | F-11：v1〜v2 消去（v2 含む）→ LevelState=L1/0/0・shouldShowNotice・冪等・通知済み判定・既存 v3 値保持 |
| `tests/state/v3/repository.test.ts` | 14 | 各レコード round-trip・未保存既定・コレクション loadAll・破損 Settings 正規化・v3 キー書込 |
| `tests/state/v3/dataReset.test.ts` | 2 | 全削除 → L1/0/0・Settings デフォルト・resetNotice フラグ保持 |
| `tests/state/v3/gameRecorder.test.ts` | 6 | GameRecord 永続化 + 日次/ストリーク/累計・失敗は到達レベル非反映・同日 max・翌日連続+1 |
| `tests/lib/v3/statsAggregation.test.ts` | 12 | 集計純関数（クリア/失敗別 max・gameCount・ストリーク分岐・totalGames） |

## 受け入れ基準マッピング

### F-11 起動時データ初期化（v3 リセット）
- [x] 旧名前空間（v1〜v2）の永続化キーがすべて消去される → `runStartupMigration`（v2 を消去対象に追加）
- [x] 消去後 `gaboreye:v3:*` 初期化、現在レベル L1・連続失敗 0 → `ensureV3Initialized` + `loadLevelState`＝{1,0,0}
- [x] 消去完了後 1 度だけ通知すべき（`shouldShowNotice`）・2 回目以降出さない（冪等 + `wasResetNoticeShown`） → **状態とロジック**を実装（UI 表示は S7）
- [x] 削除は端末ローカルのみ（AsyncStorage）
- （OK 56pt 等の UI は S7）

### F-13 設定の保存/適用ロジック（UI は S5）
- [x] 5 変数の有効値部分集合を設定でき梯子（総レベル数）に反映 → `setVariableRange` + `settingsTotalLevels`
- [x] 各変数 1 値以上必須・全無効不可 → 空集合は変更を無視 / load 時フル補完
- [x] 変化順を組み替え可能・梯子に反映 → `setVariableOrder`/`resetVariableOrder`
- [x] 範囲・変化順変更で現在レベルクランプ + 連続失敗 0 リセット（§4.5） → `updateLevelSettings`（S2 `clampLevelState` 配線）
- [x] 視聴距離 30/40/50 即保存 → `normalizeViewingDistance` + UserProfile
- [x] ダークモード/音/振動/片眼ガイダンス setter（継承項目）を v3 schema に合わせ維持
- [x] 全データ削除 → L1/連続失敗0/highest0 → `deleteAllData`
- [x] 旧設定（n/m/r/a/b/scoringMode）は v3 `Settings` に**フィールドとして存在しない**（`schema.test.ts` 検証）
- （SegmentedControl/Toggle/RG-1/OR-1 等 UI・各行 56pt・バージョン表示は S5）

### §7 データモデル / §4.5
- [x] §7.1〜§7.8 を型・既定値で厳密実装。**§7 からの逸脱（独自フィールド）無し**（`schema.test.ts` 構造検証）
- [x] §4.5 クランプを `updateLevelSettings` で配線

## 撤去した v2 コード/テスト

**撤去なし**（理由：上記「実装方針」）。v2 スコア系（`scoring.ts`/`gameMachine.ts` config/`SessionResultCard`/旧 `schema.ts` の RoundRecord/SessionRecord/sessionScore 等）は依然 App.tsx 経由で配線・テスト依存があり、S3 で撤去すると型エラー/テスト赤が大量発生する。run.md §V3.5 の削除順指針（S4 ゲームコア・S5 描画・S7 履歴・S8 バッジで同時撤去）に従い **v2 撤去は S4 以降**へ申し送る。本スプリントは v2 を一切壊していない。

## データモデル §7 からの逸脱

**無し**。`Settings` は §7.2 の 6 フィールドのみ、`PlayStats` は `totalGames` のみ、他レコードも §7.3〜§7.8 のフィールドのみ。`schema.test.ts` が Settings キー集合・v2 廃止フィールド不在・totalGames を構造的にアサート。

## 検証結果

- `npm run typecheck`：**エラー 0（PASS）**
- `npm test`：**59/60 スイート・585/586 件 PASS**（S3 前 517/518 → **+68 件**）。残り 1 赤は §V3.4 の既知 authored-broken（`SessionResultCard.test.tsx`、スコア依存・本 S3 無関係・未変更）
- `npm run build:web`：**成功**（`Exported: dist`）。v3 データ層は App.tsx から未参照のため web バンドルへの影響なし。S7 の起動フロー配線時に再確認

## 既知の懸念 / 申し送り

1. **v3 UI 未配線（S5/S7）**：設定タブ（S3-1）・データリセット通知（S3-2）UI は未実装。`src/state/v3/` を import して RG-1/OR-1/SegmentedControl/Toggle/DataResetNotice を組む。総レベル数プレビューは `settingsTotalLevels`、クランプ事後トーストは `updateLevelSettings().clamped` を使う
2. **起動フロー切替（S7）**：App.tsx は今も v2 `runStartupMigration`（`gaboreye:v2:*` 初期化）を呼ぶ。v3 へ切替時に `src/state/v3/migration.runStartupMigration` に差し替え、`shouldShowNotice` で RZ-1 を出す。**この切替時に v2 state/migration/keys/schema 等を撤去**（それまで温存）
3. **タイムゾーン依存**：DailyStats/Streak の日付は `dateUtil.localDateString`（端末ローカル日付、AS-20）。gameRecorder テストは `now` に Date を注入し UTC ISO 使用（既存 v2 statsRecorder と同方針）
4. **バッジ判定未配線**：`recordCompletedGame` は Game/Daily/Streak/Play まで。BadgeStatus 付与は S9。永続化基盤（`BadgeStatus`/`badgeKey`/`loadAllBadgeStatuses`）は本 S3 で用意済み
5. **v2 既知赤 1 件**：`SessionResultCard.test.tsx`（§V3.4 authored-broken）は S3 無関係・未変更。SessionResultCard は v2 スコア依存のため S5 で v3 結果表示へ置換・撤去予定
