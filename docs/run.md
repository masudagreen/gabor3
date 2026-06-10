# GaborEye 起動・開発手順

このドキュメントは Generator が各スプリント完了時に追記する、**動かすための単一情報源** です。

> **本書の構成（2026-06-10 更新）**：冒頭の **§V3 v3.0** が現在のソース・オブ・トゥルース（`docs/spec.md`）。
> その下の **§0〜§0-S10** は v2.0 の記録、**§1 以降** は v1 / v1.1 / v1.2 の歴史的記録（**アーカイブ**）。
> v3.0 開発では §V3 を参照すること。§0 系は v2.0 コードの所在把握用、§1 以降は v1.x コードの所在把握用。

---

## V3. v3.0 リブート — S1：テスト基盤確認・v2 コードクリーンアップ（2026-06-10）

> **このセクションが v3.0 の現在の起動・開発手順**。`docs/spec.md`（v3.0 凍結仕様）が機能のソース・オブ・トゥルース。
> S1 は基盤確認と run.md 整備、インフラ起因破損の修復のみ。v3.0 機能（レベル管理）の実装は S2 以降。

### V3.1 結論（S1 完了時点）

| 項目 | 状態 | 備考 |
|---|---|---|
| Node / npm | **OK** | `.tool-versions` 準拠（node 22.9.0 系） |
| `npx tsc --noEmit`（typecheck） | **エラー 0（PASS）** | strict |
| `npm test`（Jest） | **51 / 52 スイート PASS・469 / 470 件 PASS**。残り 1 件は既知の test/component 不整合（V3.4 参照） | インフラ起因の load 失敗 5 スイートを修復（worklets モック）。これにより 33 件のテストが復活（436 → 469 PASS） |
| `npm run build:web`（本番 Web バンドル） | **PASS** | AdMob の native-only import で web バンドルが失敗していたのを修復。`dist/_expo/static/js/web/AppEntry-*.js` ≈ **1.87 MB**（reanimated/Ionicons/AdMob 追加でサイズ増）。`npx serve -s dist` で **HTTP 200・`<title>GaborEye</title>`** 確認 |
| dev サーバー（`npm run web`） | フォールバック採用 | CLAUDE.md §6 に従い、検証は **静的本番ビルド（build:web）+ serve** で実施 |
| Expo SDK | **54 系維持** | 55 以降に上げない（CLAUDE.md §6） |

### V3.2 起動・テスト・ビルドコマンド（v3.0）

```bash
cd /Users/np_202212_11/projects/gabor3
npm install                    # 依存解決（初回のみ）

npm test                       # Jest 全テスト（51/52 スイート・469/470 件 PASS。V3.4 参照）
npm run typecheck              # = tsc --noEmit（エラー 0）
npm run build:web              # 本番 Web バンドル → dist/（PASS）
npx serve -s dist -l 4599      # dist を HTTP 配信して動作確認（dev サーバー代替・HTTP 200）
```

#### Web 確認（2 経路）

1. **dev サーバー（ホットリロード）**：`npm run web` → `http://localhost:8081`。
   macOS で `EMFILE`（too many open files）が出る場合は dev サーバーの再起動ではなく、
   **静的本番ビルドを serve するフォールバック**（下記）に切り替える（CLAUDE.md §6）。
2. **静的本番ビルド + serve（EMFILE フォールバック・CI 相当）**：
   ```bash
   npm run build:web            # expo export --platform web → dist/
   npx serve -s dist -l 4599    # http://localhost:4599 で配信。HTTP 200 / <title>GaborEye</title>
   ```

#### Android（Expo Go ワークフロー優先）

```bash
npm start                      # QR コード表示 → Expo Go で読み取り（CLAUDE.md §6：EAS より Expo Go 優先）
# または
npm run android                # Android Studio + AVD があれば直接起動
```

- **EAS ビルドは行わない**（bash の stdin 経由ログインは失敗する。CLAUDE.md §6）。Expo Go で実機確認する。
- Expo SDK は **54 系を維持**（55 以降は Android Expo Go 互換が壊れる）。

### V3.3 S1 で修復したインフラ起因の破損（v3.0 実装と無関係・v2.0 完成後の後続コミットで混入）

v2.0 完成（§0-S10、52 スイート / 462 件 PASS・build:web PASS）の **後**に入った 2 コミットが基盤を壊していた。
S1 ではテスト内容・プロダクトロジックを書き換えず、**インフラ層のみ**を是正した。

| # | 破損 | 原因コミット | 症状 | S1 の是正（インフラのみ） |
|---|---|---|---|---|
| 1 | **Jest が 5 スイートを load 不能** | `0285ac5`（reanimated 追加） | `react-native-reanimated@4` が依存する `react-native-worklets` の native 初期化が jest-expo 下で失敗（"Native part of Worklets doesn't seem to be initialized"）。`SessionResultCard.tsx` を import する 5 スイートが起動時クラッシュ | `jest.setup.ts` に `jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'))` を追加。公式モックで native 初期化を回避。4 スイート完全 PASS・33 件のテストが復活 |
| 2 | **`npm run build:web` が失敗** | `675940d`（AdMob 追加） | `react-native-google-mobile-ads` が native-only モジュール（`react-native/Libraries/Utilities/codegenNativeComponent`）を top-level import するため、`App.tsx → AdManager.tsx` 経由で Web バンドルがエラー（runtime の `Platform.OS==='web'` ガードでは静的 import を防げない） | `AdManager.tsx` を Metro のプラットフォーム別解決で分割：`AdManager.native.tsx`（AdMob 実装そのまま）/ `AdManager.web.tsx`（広告なしスタブ）/ `AdManager.d.ts`（tsc 用の共通型宣言）。`App.tsx` の import パスは不変。**native の AdMob 挙動は変更なし** |

- 修正ファイル：`jest.setup.ts`（追記）、`src/components/v2/AdManager.tsx` → `AdManager.native.tsx`（rename・中身不変）、`src/components/v2/AdManager.web.tsx`（新規スタブ）、`src/components/v2/AdManager.d.ts`（新規型宣言）。
- **プロダクトロジック・テスト内容の書き換えなし**。Expo SDK / 依存バージョン変更なし。

### V3.4 既知の残課題（1 件・要オーケストレーター判断）

- **`tests/components/v2/SessionResultCard.test.tsx` の「セッションスコアを表示する」1 件が赤**。
  - 原因：このテストとコンポーネントは v2.0 完成後のコミット `0285ac5` で**同時に新規追加**されたが、コンポーネントはスコアを `requestAnimationFrame` ベースのカウントアップで描画する一方、テストは `render` 直後に `rc-score` の値が `'72'` であることを**同期的**に検証する。jest 環境の rAF は `setTimeout` ベースで同期完了しないため、初期値 `0` のままアサートに失敗する（**この commit 時点から一度も緑になっていない＝authored-broken**）。
  - S1 では未修正。修正には**テスト内容かプロダクト（アニメーション）ロジックの変更**が必要で、setup モードの責務（仕様外の改変禁止）を超える。
  - **このスコア表示は v3.0 でスコア → レベルに置き換わる予定**（spec §0：0〜100 スコア全廃）。`SessionResultCard` 自体が S5/S7 で作り直し対象のため、本不整合は v3.0 実装（S5 以降）で自然に解消される見込み。オーケストレーター判断で「v3.0 実装まで残置」または「S1 内で 1 行のテスト調整」を選択されたい。

### V3.5 S1：スコア管理由来の死にコード候補リストアップ（実削除は Phase 2 / 凍結デザイン後）

> spec §0/§10 に従い、v3.0 で全廃される概念（**採点 3 方式 / 部分点 TP-FP-FN / 0〜100 スコア / 複数ラウンド r / 空間周波数変化 b**）に紐づく v2.0 コードを洗い出す。
> **S1 では削除しない**（整理方針の確定とリスト化のみ）。実削除は凍結デザイン後の各スプリント（spec §8）で、該当機能の作り直しと同時に行う。

#### A. 採点 3 方式（scoringMode ①②③）— spec §0「クリア/失敗 1 本に統一」で全廃
| 場所 | 死にコード候補 |
|---|---|
| `src/state/schema.ts` | `ScoringMode` 列挙・`Settings.scoringMode`・既定値 |
| `src/state/settings.ts` | scoringMode の妥当化 setter |
| `src/lib/v2/gameMachine.ts` | 方式①②③ の状態機械分岐（`CONFIRM` 無視 / auto-confirm / all-correct-advance）。v3 は「全問正解で即締め切り or 時間切れ」の 1 本のみ |
| `src/components/v2/ConfirmButton.tsx`（BN-1） | 方式② の確定ボタン。v3 に確定ボタンは存在しない |
| `src/screens/v2/SettingsScreen.tsx` | 採点方式ラジオ UI（spec F-13：旧設定 UI は一切存在しないこと） |
| 関連テスト | `gameMachine.test.ts` の方式別ケース・`SettingsScreen.test.tsx` の採点方式行・`settingsControls.test.tsx` の該当分・`s10FullFlow` の方式②/① フロー |

#### B. 部分点・0〜100 セッションスコア（TP/FP/FN・FP_PENALTY・sessionScore）— spec §0/§10「全廃」
| 場所 | 死にコード候補 |
|---|---|
| `src/lib/v2/scoring.ts` | `scoreRound`（TP/FP/FN・TP−FP）・`computeSessionScore`（0〜100・FP_PENALTY=50）・`toRoundRecord`。v3 は `result: 'clear' \| 'fail'` の 2 値判定（spec §4.3）に置換 |
| `src/state/schema.ts` | `RoundRecord`（TP/FP/FN/score 保持）・`SessionRecord.sessionScore`・`DailyStats.bestSessionScore`。v3 は `GameRecord.result`・`DailyStats.highestLevelReached`（§7）に置換 |
| `src/components/v2/SessionResultCard.tsx` | 0〜100 スコアの 72px 強調表示（カウントアップ含む＝V3.4 の赤テストもここ）。v3 はクリア/失敗・レベル変化表示に置換（spec F-08） |
| `src/lib/v2/historyView.ts` / `chartGeometry.ts` / `LineChart.tsx` | 日次スコア（0〜100）折れ線。v3 は日次到達レベル折れ線に置換（spec F-09） |
| `src/lib/v2/badges.ts` / `badgeDefinitions.ts` | 高スコア軸 B-09〜11（score≥80 等）。v3 は高レベル到達軸に再定義（spec §6.3） |
| 関連テスト | `scoring.test.ts`・`historyView.test.ts`・`chartGeometry.test.ts`・`badges.test.ts`・`SessionResultCard.test.tsx`・`HistoryScreen.test.tsx` のスコア依存ケース |

#### C. 複数ラウンド（roundCount = r / SessionRecord / RoundRecord）— spec §0/§10「1 ゲーム = 1 ラウンド = 1 レベル挑戦」
| 場所 | 死にコード候補 |
|---|---|
| `src/state/schema.ts` | `Settings.roundCount`・`SessionRecord`（r ラウンド束ね）・`RoundRecord`。v3 は 1 ゲーム = 1 レコード（`GameRecord`、§7.4）に置換 |
| `src/lib/v2/gameMachine.ts` | ラウンド → セッション進行ロジック（`roundIndex` / `roundScores` 集約） |
| `src/state/sessionRecorder.ts` | r ラウンドを `SessionRecord` に組み立てる配線 |
| `src/components/v2/SettingsScreen.tsx` / `Slider.tsx` | roundCount(r) スライダー UI |
| 関連テスト | `gameMachine.test.ts`（ラウンド進行）・`sessionRecorder.test.ts`・`s10FullFlow`（roundCount=2 ケース） |

#### D. 空間周波数変化（sfChangeSpeed = b / cpd アニメ）— spec §0/§10「変化軸は回転のみ・b は死にパラメータ」
| 場所 | 死にコード候補 |
|---|---|
| `src/state/schema.ts` | `Settings.sfChangeSpeed`・`PARAM_SPECS` の b 範囲 |
| `src/lib/v2/patch.ts` | `patchCpdAt(t)`・cpd 増減方向・cpd 物理下限（周波数変化用）。v3 は回転（`patchOrientationAt`）のみ |
| `src/lib/v2/roundGen.ts` | 種類割当（回転40/周波数40/両方20）の「周波数/両方」分岐・初期 cpd ばらつき。v3 は回転種別のみ |
| `src/lib/v2/gameView.ts` | `quantizeCpd`（cpd 量子化・BMP 再生成スロットル） |
| `src/components/v2/GaborPatchCell.tsx` / `GaborGrid.tsx` | cpd アニメ駆動部 |
| `src/components/v2/SettingsScreen.tsx` / `Slider.tsx` | sfChangeSpeed(b) スライダー UI |
| `src/lib/v2/badges.ts` | b≤0.10「小さい」判定（B-07/B-08） |
| 関連テスト | `patch.test.ts`（cpd）・`roundGen.test.ts`（周波数割当）・`gameView.test.ts`（quantizeCpd）・`badges.test.ts`（b 閾値） |

#### E. その他 v3 で再設計され死にコード化する見込み（参考）
- `src/lib/v2/gameMachine.ts` の `config`（gridSize/roundSeconds/roundCount/rotationSpeed/sfChangeSpeed/scoringMode 直接指定）→ v3 は「レベル番号 → 5 変数」へ置換（spec §4）。
- 手動スライダー UI 全般（n/m/r/a/b の `Slider.tsx` 利用箇所・`SettingsScreen`）→ v3 は範囲設定 + 変化順 UI に置換（spec F-13）。
- `gaboreye:v2:*` 名前空間（`src/state/keys.ts`）→ v3 は `gaboreye:v3:*` で再設計（spec §7・F-11）。マイグレーション（`src/state/migration.ts`）は v1〜v2 全消去に拡張。

> **削除順の指針**：上記 A〜D は単独で消すと依存が連鎖して落ちるため、spec §8 の各スプリントで「該当機能の v3 実装 ↔ 旧コード撤去」を同時に行う（S2 レベル中核 → C/E、S3 データ層 → 名前空間/スキーマ、S4 ゲームコア → A/B/D、S5 描画/結果 → SessionResultCard 系、S7 履歴 → スコア折れ線、S8 バッジ → 高スコア軸）。S1 はリスト確定まで。

---

## V3-S2. v3.0 — S2：レベルシステム中核ロジック（§4 / F-04）（2026-06-10）

> **純ロジック層のみ**（描画・永続化・UI は S3 以降）。spec §4（レベルシステム）・§5 F-04（レベル昇降）・§7.3 LevelState 準拠。

### V3-S2.1 結論

| 項目 | 状態 | 備考 |
|---|---|---|
| `npm run typecheck`（tsc strict） | **エラー 0（PASS）** | — |
| `npm test`（Jest） | **52/53 スイート・517/518 件 PASS** | S2 前 469/470 → **+48 件**（`tests/lib/v3/level.test.ts`）。残り 1 赤は §V3.4 の既知 authored-broken（`SessionResultCard.test.tsx`、本 S2 と無関係） |
| `npm run build:web` | 挙動不変（未配線） | S2 は純ロジック追加で App.tsx から未参照のため web バンドルへの影響なし。S3 の初回配線時に確認 |
| Expo SDK | 54 系維持・native 依存追加なし | — |

### V3-S2.2 追加ファイル

| ファイル | 役割 |
|---|---|
| `src/lib/v3/level.ts`（新規） | レベルシステム中核の純関数群。値集合（§4.1）/ mixed-radix オドメータ `levelToParams`・`paramsToLevel`・`totalLevels`（§4.2）/ レベル昇降 `applyResult`・`initialLevelState`（§4.4・F-04）/ 範囲クランプ `clampLevelToRange`・`clampLevelState`（§4.5）。型：`VariableKey`/`Direction`/`GridSize`/`LevelParams`/`VariableRanges`/`LevelState`/`LevelDelta` |
| `tests/lib/v3/level.test.ts`（新規） | 48 件。値集合・段数・境界（L1/L2/L4→L5/L20→L21/L40→L41/L80→L81/L720）・全 720 一意・往復恒等・部分範囲・代替変化順・昇降（クリア/失敗/2連続失敗/クランプ/連続失敗永続シナリオ）・範囲変更クランプ |

### V3-S2.3 S3 への申し送り

- **永続化未実装（S3 担当）**：`LevelState`（`gaboreye:v3:levelState`）と `Settings.variableRanges`/`variableOrder` の読み書き、F-11 起動時 v3 初期化（currentLevel=1）。S2 は AsyncStorage 非依存の純関数のみ。
- `applyResult`/`clampLevelState`/`levelToParams` のデフォルト引数はフル範囲・デフォルト変化順。S3 以降は `Settings` 由来の ranges/order を渡す。
- `VariableRanges` 各配列は VALUE_SETS 部分集合かつ易→難順を保つ前提。各変数 1 値以上の強制（F-13）は S3 の設定 setter/UI 側の責務。
- 死にコード撤去（run.md §V3.5 C/E：v2 gameMachine の config・手動スライダー系）は本 S2 では未実施（新規ロジック追加に集中）。v2 コードは S4 のゲームコア v3 化と同時に撤去予定。

---

## V3-S3. v3.0 — S3：データ層・設定・範囲/変化順・v3 初期化（§7 / F-11 / F-13 / §4.5）（2026-06-10）

> **データ/永続化/ロジック層のみ**（設定 UI 画面 S3-1/S3-2 は S5/S7）。spec §7 データモデル（`gaboreye:v3:*`）・F-11・F-13・§4.5 準拠。

### V3-S3.1 結論

| 項目 | 状態 | 備考 |
|---|---|---|
| `npm run typecheck`（tsc strict） | **エラー 0（PASS）** | — |
| `npm test`（Jest） | **59/60 スイート・585/586 件 PASS** | S3 前 517/518 → **+68 件**（v3 state/lib 7 スイート）。残り 1 赤は §V3.4 の既知 authored-broken（`SessionResultCard.test.tsx`、スコア依存・本 S3 無関係） |
| `npm run build:web` | **成功（Exported: dist）** | v3 データ層は App.tsx から未参照のため web バンドル影響なし。起動フロー配線（S7）時に再確認 |
| Expo SDK | 54 系維持・native 依存追加なし | 低レベル I/O は既存 `state/store.ts`（AsyncStorage）を再利用 |

### V3-S3.2 実装方針：v3 データ層は `src/state/v3/` 並行モジュール

v2.0 アプリ（App.tsx → AppRoot → 全 v2 screens/components/lib）は今も `src/state/schema.ts`（v2 `Settings`/`scoringMode`/`SessionRecord` 等）・`src/state/keys.ts`（`gaboreye:v2:*`）に全面依存。in-place v3 化は 50+ ファイル/数百テストを連鎖崩壊させるため、S2（`src/lib/v3/`）と同様に **v3 を `src/state/v3/` の並行モジュールで新設**。v2 state は S5 以降の UI 差し替えまで温存し、リグレッション 0 を維持。

### V3-S3.3 追加ファイル

| ファイル | 役割 |
|---|---|
| `src/state/v3/schema.ts`（新規） | §7 型 + 既定値。`Settings`（variableRanges/variableOrder/darkMode/sound/haptics/oneEyeGuidance のみ）・`GameRecord`・`DailyStats`（highestLevelReached/gameCount）・`Streak`・`PlayStats`（totalGames）・`BadgeStatus`（B-01〜11）・`UserProfile`（schemaVersion '3.0.0'）。`V3_PREFIX`・`LEGACY_PREFIXES`（v1/v1.1/v1.2/**v2**）。v2 廃止フィールド不在 |
| `src/state/v3/keys.ts`（新規） | `gaboreye:v3:*` キー（§7.10）。`gameKey`/`dailyStatsKey`/`badgeKey` |
| `src/state/v3/repository.ts`（新規） | 型付き load/save（単一 + Game/Daily/Badge コレクション + resetNotice フラグ）。`store.ts` を再利用。load 時 Settings sanitize |
| `src/state/v3/settings.ts`（新規） | **F-13 中核**。範囲正規化（§4.1 部分集合・易→難順・最低1値）・変化順検証・setter・`settingsTotalLevels`・`updateSettings`/**`updateLevelSettings`（§4.5 クランプ + 連続失敗0 配線）** |
| `src/state/v3/migration.ts`（新規） | **F-11**。`runStartupMigration`（v1〜v2 全消去 → v3 初期化 L1/0/0 → `shouldShowNotice`）。冪等 |
| `src/state/v3/dataReset.ts`（新規） | **F-13 全削除** → L1/0/0・Settings デフォルト。resetNotice フラグ保持 |
| `src/state/v3/gameRecorder.ts`（新規） | **§7.4〜§7.7 記録永続化**。`recordCompletedGame`（GameRecord + Daily max(クリア基準) + Streak + PlayStats.totalGames+1）。バッジは S9 |
| `src/lib/v3/statsAggregation.ts`（新規） | 集計純関数（Daily/Streak/Play、dateUtil 再利用） |
| `src/state/v3/index.ts`（新規） | v3 データ層公開バレル |
| `tests/state/v3/*.test.ts`（5）・`tests/lib/v3/statsAggregation.test.ts`（新規） | +68 件 |

### V3-S3.4 S4/S5/S7 への申し送り

- **v2 撤去は S4 以降**：S3 は v2 を一切壊さない。run.md §V3.5 の削除順（S4 ゲームコア → A/B/D、S5 描画 → SessionResultCard、S7 履歴・起動 → v2 state/migration/keys/schema 撤去）で同時撤去。
- **起動フロー切替（S7）**：App.tsx の v2 `runStartupMigration` を `src/state/v3/migration.runStartupMigration` に差し替え、`shouldShowNotice` で RZ-1 表示。この切替時に v2 state を撤去。
- **設定タブ（S5）**：`src/state/v3/`（`settingsTotalLevels`・`updateLevelSettings().clamped`・各 setter）を import。RG-1/OR-1/SegmentedControl/Toggle/DataResetNotice を組む。
- **バッジ判定（S9）**：`recordCompletedGame` に BadgeStatus 付与を追加配線（永続化基盤は S3 で用意済み）。
- データモデル §7 からの逸脱は**無い**（`schema.test.ts` で構造検証）。

---

## V3-S4. v3.0 — S4：ゲームコア（生成・選択・クリア判定・振動回転）（F-01 ロジック / F-03 / §4.3）（2026-06-10）

> **ロジック層のみ**（描画・✅/❌ オーバーレイ・カウントダウン UI は S5）。spec §4.3（クリア/失敗）・§4.1（5 変数）・F-01 ロジック・F-03 判定準拠。`src/lib/v3/` に新設。App.tsx からは未配線（S5 で接続）。

### V3-S4.1 結論

| 項目 | 状態 | 備考 |
|---|---|---|
| `npm run typecheck`（tsc strict） | **エラー 0（PASS）** | — |
| `npm test`（Jest） | **62/63 スイート・640/641 件 PASS** | S3 前 585/586 → **+55 件**（v3 新規 3 スイート：patch 23 / roundGen 16 / gameMachine 16）。残り 1 赤は §V3.4 の既知 authored-broken（`SessionResultCard.test.tsx`、スコア依存・本 S4 無関係・S5 で UI 差し替え時に自然解消） |
| `npm run build:web` | **成功（Exported: dist）** | v3 ゲームコアは App.tsx から未参照のため web バンドル影響なし（AppEntry ≈ 1.87 MB・S3 から不変）。描画配線（S5）時に再確認 |
| Expo SDK | 54 系維持・native 依存追加なし | Skia 等不使用。回転は S5 で transform による |

### V3-S4.2 追加ファイル

| ファイル | 役割 |
|---|---|
| `src/lib/v3/patch.ts`（新規） | v3 パッチモデル。**回転のみ**（cpd 時間変化＝死にコード候補 D を v3 では不採用）。`patchOrientationAt`（一方向=単調 / 振動=三角波往復）・`oscillationOffsetDeg`・`normalizeDeg180`・`isChanging`。`OSCILLATION_AMPLITUDE_DEG=30`（体感調整定数・AS-21） |
| `src/lib/v3/roundGen.ts`（新規） | v3 ラウンド生成。**個数はレベルで確定**（死にコード候補：v2 の個数ランダム抽選を v3 では不採用）。`generateRound`/`generateRoundFromLevel`/`levelParamsToRoundGen`/`generateSpacedAngles`。回転パッチは全て同 speed/direction、静止は離散初期角度で固定（NF-28b） |
| `src/lib/v3/gameMachine.ts`（新規） | v3 ゲーム機械。**1 ゲーム=1 ラウンド=1 レベル挑戦**（r ラウンド廃止）。`initGame`/`gameReducer`（TOGGLE/TIMEOUT のみ・確定ボタンなし）・`isAllCorrect`（§4.3）・`deriveReveal`（✅/❌ 分類）。結果は clear/fail の 2 値（部分点・0〜100 スコア廃止） |
| `tests/lib/v3/{patch,roundGen,gameMachine}.test.ts`（新規 3 スイート） | +55 件。振動往復性/振幅/周期/折り返し停止/角速度保存・個数固定・rng 決定論・即時締め切り/TIMEOUT 判定・deriveReveal |

依存：v2 `rng.ts`（汎用 PRNG・スコア非依存）と S2 `level.ts` を再利用。

### V3-S4.3 振動（往復回転）実装（NF-28c / system §4.1 / AS-11）

- 三角波：位相 `sign×speed×t` を周期 `4A`（A=30°）の三角波に写像。1 往復 = `4A/speed` 秒。
- 一方向との弁別＝1 周期で初期角度へ復帰 vs 単調離脱。静止との弁別＝折り返しで瞬間角速度 0（振動が難しい根拠）。角速度保存＝折り返し点以外で |角速度| ≈ speed。いずれも単体テストで担保。

### V3-S4.4 S5/S7 への申し送り

- **死にコード撤去は未着手**（A/B/D：v2 scoring/gameMachine/roundGen/patch）。理由＝今も live な v2 UI チェーン（`App.tsx → AppRoot → GameScreen → gameMachine/scoring/roundGen/patch/ConfirmButton/GaborGrid`）が依存しており、撤去すると build:web が壊れる。**S5 で v3 ゲーム画面に差し替えると同時に撤去**（run.md §V3.5 の削除順どおり）。`src/lib/v2/rng.ts` は v3 再利用中のため撤去しない。
- **S5 描画配線**：`initGame(config, rng)` で開始 → `useGameTimer` 相当で経過秒 t を `patchOrientationAt(patch, t)` に渡し描画 → タップで `gameReducer(state, {type:'TOGGLE',index})` → 締め切り（即時 clear or TIMEOUT）後 `deriveReveal(patches, selected)` で ✅/❌ を配置。`closedByAllCorrect` で開示時間を分岐（system §6 ＝即時クリアも 1.5 秒開示推奨）。
- **S7 ゲーム終了処理**：`gameReducer` は result（clear/fail）を確定するだけ。レベル増減（`applyResult`・S2）と記録（`recordCompletedGame`・S3）はホームフローが `result` を受けて呼ぶ。中断（F-07）はどちらも呼ばない。

---

## V3-S5. v3.0 — S5：ゲーム描画・レベル/個数表示・結果開示 UI（F-01 描画 / F-02 / F-03 / F-12）（2026-06-10）

> S4 の v3 ゲームコアを画面に配線。ガボール格子描画・レベル/個数表示・カウントダウン・✅/❌ 結果開示を実装。
> v3 を `src/components/v3/`・`src/screens/v3/`・`src/lib/v3/gameView.ts` の**並行モジュール**で新設。
> v2 ゲーム UI チェーンは温存（AppRoot 本配線 = S6/S7 で同時撤去。§V3-S5.4 申し送り）。

### V3-S5.1 結論

| 項目 | 状態 | 備考 |
|---|---|---|
| `npm run typecheck`（tsc strict） | **エラー 0（PASS）** | — |
| `npm test`（Jest） | **65/66 スイート・674/675 件 PASS** | S4 前 640/641 → **+34 件**（v3 新規 3 スイート：gameView 9 / gameComponents 19 / GameScreen 6）。残り 1 赤は §V3.4 既知 authored-broken（`SessionResultCard.test.tsx`、S6/S7 で自然解消） |
| `npm run build:web`（既定 = v2） | **成功（Exported: dist）** | AppEntry ≈ 1.9 MB。既定フラグなしビルドは従来の v2 アプリ（リグレッションなし） |
| `npm run build:web`（`EXPO_PUBLIC_V3_GAME=1`） | **成功** | v3 ゲーム開発ハーネスを出力。Playwright で 375/1280/360/L41 を目視確認 |
| Expo SDK | 54 系維持・native 依存追加なし | 回転は `GaborPatch` の View transform（Skia 不使用） |

### V3-S5.2 追加 / 変更ファイル

| ファイル | 役割 |
|---|---|
| `src/lib/v3/gameView.ts`（新規） | カウントダウン段階色 `countdownTier`・aria-live `countdownAriaLive`・開示インターバル `revealIntervalMs`（即時クリア/時間切れとも 1.5 秒） |
| `src/lib/v3/a11yAnnounce.ts`（新規） | SR アナウンス薄ラッパ（ゲーム開始時のレベル/個数読み上げ） |
| `src/components/v3/LevelBadge.tsx`（LB-1 新規） | レベル番号ピル「レベル {n}」（inline/large）。`levelV3` トークン |
| `src/components/v3/CountBanner.tsx`（CB-1 新規） | 「◯個探せ！」個数案内（26px Bold） |
| `src/components/v3/CountdownTimer.tsx`（CD-1） | 数字のみ・3 段階色・太字補強・点滅なし |
| `src/components/v3/GameTopBar.tsx`（GB-1） | X + カウントダウン + **レベル番号ピル**（v3 改訂） |
| `src/components/v3/GaborPatchCell.tsx`（GG-2） | v3 PatchDef を `patchOrientationAt(t)` で transform 回転描画。cpd 固定（回転のみ） |
| `src/components/v3/GaborGrid.tsx`（GG-1） | n×n 格子。レイアウト算出 `computeGridEdge/Gap/PatchSize` を純関数 export |
| `src/components/v3/ResultMark.tsx`（OV-2） | ✅実線(correct)/✅薄め(missed)/❌(wrong) |
| `src/components/v3/AggregateResultBadge.tsx`（OV-3） | 総合「クリア」/「失敗」（色 + アイコン + テキスト、NF-12） |
| `src/components/v3/ResultOverlayLayer.tsx`（OV-1） | 200ms フェードイン + `aria-live=assertive`「クリア/失敗」読み上げ |
| `src/screens/v3/GameScreen.tsx`（新規） | gameMachine + useGameTimer + 描画 + 開示を配線。`onAbort`/`onResolved(result)` 委譲 |
| `src/screens/v3/GameDevHarness.tsx`（新規） | 評価用暫定エントリ（レベル固定、結果で applyResult 簡易反映、永続化なし） |
| `src/theme/tokens.ts`（変更） | `levelV3` / `resultV3` トークン追加（system §1.3・§1.4） |
| `src/i18n/ja.ts`（変更） | `gameV3.*` / `resultV3.*` キー追加（v2 `game.*`/`result.*` は温存） |
| `App.tsx`（変更） | `EXPO_PUBLIC_V3_GAME=1` のとき `GameDevHarness` を表示する分岐を冒頭に追加（既定は v2 アプリ） |
| `tests/lib/v3/gameView.test.ts`・`tests/components/v3/gameComponents.test.tsx`・`tests/screens/v3/GameScreen.test.tsx`（新規 3 スイート） | +34 件 |

依存：`useGameTimer`（`hooks/v2/`、スコア非依存の汎用タイマー）と `Rng`（`lib/v2/rng.ts`）を再利用。

### V3-S5.3 v3 ゲーム画面への到達方法（評価用）

```bash
# Web（推奨）：v3 ゲームハーネスを有効化してエクスポート
EXPO_PUBLIC_V3_GAME=1 npx expo export --platform web --clear
npx serve -s dist -l 4613
# http://localhost:4613/            … 既定 L7（個数3・3x3・一方向）
# http://localhost:4613/?level=21   … 振動確認（デフォルト梯子で direction=振動 に入る最初の域は L21〜40 / L61〜80）。?level=N（N=1〜720）で任意レベル
#   ※ S5 当初の「?level=41=振動域」は誤記。振動は L21〜40・L61〜80（S6 で訂正）。
```

> **S6 で本ハーネス（GameDevHarness）は撤去**。v3 アプリへの本配線が完了したため、評価は
> 既定の `npm run build:web`（v3 アプリ）で行う（§V3-S6.3）。

```bash
# テスト（決定論 rng + fake timers で clear/fail/中断を検証）
npx jest tests/screens/v3/GameScreen.test.tsx
```

> 既定の `npm run build:web`（フラグなし）は従来の v2 アプリを出力する（リグレッションなし）。
> `?level=` は Web のクエリ override（`GameDevHarness`、ハーネス限定・native は無視）。`EXPO_PUBLIC_V3_LEVEL` は computed access のため inline されず効かない点に注意（クエリを使う）。

### V3-S5.4 S6/S7 への申し送り（v2 撤去）

- **本 S5 では v2 ゲーム UI / スコア系ロジックを撤去していない**。`App.tsx → AppRoot`（v2）が今もゲーム/履歴/設定/タブを担い、v2 ゲームチェーンに全面依存しているため。撤去は run.md §V3.5 の削除順どおり **S6（タブ・中断）/S7（起動フロー・ホーム結果・レベル増減/記録）で AppRoot を v3 化すると同時**に行う。
- **S6 配線**：`GameScreen v3` に `onAbort`（中断ダイアログ F-07）・`paused`（ダイアログ中の一時停止）・タブバーを接続。
- **S7 配線**：`onResolved(result, state)` を受けて `applyResult`（S2）でレベル増減・`recordCompletedGame`（S3）で記録 → ホーム結果（RC-1）→「もう一度」。中断はどちらも呼ばない。距離リマインド → 自動開始も S7。
- **撤去対象（S6/S7 で同時）**：`screens/v2/GameScreen`・`components/v2/{GaborGrid,GaborPatchCell,GameTopBar,CountdownTimer,ResultMark,ResultOverlayLayer,AggregateResultBadge,ConfirmButton,SessionResultCard}`・`lib/v2/{scoring,gameMachine,roundGen,patch,gameView}`・関連 v2 テスト。`SessionResultCard` 撤去で §V3.4 の赤テストも解消。`useGameTimer`/`rng` は v3 が再利用中のため撤去せず移設/共有。`App.tsx` の `EXPO_PUBLIC_V3_GAME` 暫定分岐は S7 完了時に除去。

---

## V3-S6. v3.0 — S6：ボトムタブナビ・中断ダイアログ（F-05 / F-07）・AppRoot v3 本配線（2026-06-10）

> S5 の v3 ゲーム画面を **AppRoot v3** に配線し、`App.tsx` を v3 アプリに切替えた。
> 3 タブ（ホーム/履歴/設定）切替・プレイ中の中断ダイアログを実装。v2 ゲーム UI チェーンの撤去に着手。

### V3-S6.1 結論

| 項目 | 状態 | 備考 |
|---|---|---|
| `npm run typecheck`（tsc strict） | **エラー 0（PASS）** | — |
| `npm test`（Jest） | **59/60 → 59/59 スイート・626/626 件 全 PASS** | S5 は 65/66 スイート・674/675（うち 1 赤 = 既知 authored-broken `SessionResultCard.test.tsx`）。S6 で v2 ゲーム UI チェーン（AppRoot/GameScreen/BottomTabBar/ConfirmButton/SessionResultCard）とその v2 テストを撤去し、**赤テストが解消・全件グリーン**。新規 `tests/screens/v3/AppRoot.test.tsx`（+9 件）。撤去差分があるため件数は 674 → 626 |
| `npm run build:web`（**既定 = v3**） | **成功（Exported: dist）** | **既定ビルドが v3 アプリになった**。AppEntry ≈ **1.07 MB**（v2 ゲームチェーン撤去で S5 の ≈1.9 MB から縮小）。`npx serve -s dist` で HTTP 200・`<title>GaborEye</title>` |
| Playwright 検証 | **PASS（360/375/1280）** | タブ 3 つ・aria-selected・プレイ中タブ/× で中断ダイアログ・キャンセル継続・OK で当該タブ遷移を目視 + 自動アサート。`temp-images/s6/*.png`（gitignore） |
| Expo SDK | 54 系維持・native 依存追加なし | AdManager native/web 分割は維持（広告 native 不変） |

### V3-S6.2 追加 / 変更 / 削除ファイル

**新規（v3）**
| ファイル | 役割 |
|---|---|
| `src/components/v3/BottomTabBar.tsx`（NV-1） | 3 タブ（ホーム/履歴/設定）。色+上辺3pxインジケータ+太字+塗り/線アイコンで非依存（NF-12）。role=tablist/tab + aria-selected。48pt+/bottom セーフエリア |
| `src/components/v3/ConfirmDialog.tsx`（DG-1） | 2 択確認（中断/削除汎用）。role=dialog/aria-modal/aria-labelledby、初期フォーカス=安全側「続ける」、Esc=キャンセル（Web）。ボタン 56pt+ |
| `src/screens/v3/AppRoot.tsx` | **v3 アプリ骨格**。タブ切替・ホームゲーム・中断ダイアログ統括。プレイ中の他タブ/× で F-07 ダイアログ、非進行中は自由遷移。OK=記録/レベル不変（§4.4） |
| `src/screens/v3/TabPlaceholderScreen.tsx` | 履歴(S8)/設定(S7) 暫定プレースホルダ（「準備中」）。セーフエリア準拠 |
| `tests/screens/v3/AppRoot.test.tsx`（+9 件） | F-05 タブ/aria-selected、F-07 ダイアログ（タブ起点/× 起点・キャンセル継続・OK 遷移・レベル不変）・非進行中自由遷移 |

**変更**
| ファイル | 変更 |
|---|---|
| `App.tsx` | v2 アプリ（v2 AppRoot/Onboarding/v2 migration）→ **v3 AppRoot 本配線**。v3 `runStartupMigration`（F-11）+ v3 Settings/UserProfile ロード + DataResetNotice。`EXPO_PUBLIC_V3_GAME` ハーネス分岐を撤去・統合 |
| `src/screens/v3/GameScreen.tsx` | `onPlayingChange?(playing)` を追加（締め切り前=true/開示後=false）。AppRoot が中断判定（F-05/F-07：非進行中は自由）に使う |
| `src/i18n/ja.ts` | `abortV3.*`（「レベルも変わりません」改訂本文）・`tabPlaceholderV3.*` 追加 |
| `docs/run.md` | 「?level=41=振動域」誤記を「振動確認は ?level=21（振動域 L21〜40/L61〜80）」に訂正 |

**削除（v2 撤去・v3 が代替）**
| ファイル | 理由 |
|---|---|
| `src/screens/v2/AppRoot.tsx` | v3 AppRoot が代替（タブ/中断/フロー統括） |
| `src/screens/v2/GameScreen.tsx` | v3 GameScreen（S5）が代替 |
| `src/components/v2/BottomTabBar.tsx` | v3 BottomTabBar が代替 |
| `src/components/v2/ConfirmButton.tsx`（BN-1） | 採点方式②の確定ボタン。v3 に確定ボタンは存在しない（§V3.5 A） |
| `src/components/v2/SessionResultCard.tsx` | 0〜100 スコア結果カード。v3 はクリア/失敗・レベル変化（S7 RC-1 で実装）。**撤去で §V3.4 赤テスト解消** |
| `src/screens/v3/GameDevHarness.tsx` | S5 評価用暫定ハーネス。本配線完了で不要 |
| 上記の v2 テスト 8 本 | `AppRoot/startupFlow/AppRootFeedback/GameScreen/GameScreenFeedback`（screens v2）・`BottomTabBar/SessionResultCard`（components v2）・`integration/s10FullFlow`。仕様廃止（v2 スコア/採点/セッション）に伴い削除 |
| `tests/components/v2/gameComponents.test.tsx`（一部） | ConfirmButton describe ブロックのみ削除（他の v2 描画コンポーネントは温存） |

### V3-S6.3 v3 アプリ起動・評価手順（既定が v3 になった）

```bash
cd /Users/np_202212_11/projects/gabor3
npm test                       # Jest 全テスト（59/59 スイート・626/626 件 全 PASS）
npm run typecheck              # tsc --noEmit（エラー 0）
npm run build:web              # 本番 Web バンドル → dist/（既定 = v3 アプリ。AppEntry ≈ 1.07 MB）
npx serve -s dist -l 4621      # http://localhost:4621/ で配信。HTTP 200 / <title>GaborEye</title>
#  → 起動でホームタブの v3 ゲームが現在レベルで開始。下部 3 タブで切替。
#     プレイ中の他タブ/× で中断ダイアログ（OK=記録/レベル不変、キャンセル=継続）。
```

```bash
# Android（Expo Go）
npm start                      # QR → Expo Go（CLAUDE.md §6）
```

### V3-S6.4 v2 撤去の判断と S7/S8 への申し送り

- **撤去した範囲**：v3 が S6 で代替する **タブ・中断・ゲーム画面チェーン**（v2 AppRoot/GameScreen/BottomTabBar/ConfirmButton/SessionResultCard）とその v2 テスト。`App.tsx` も v3 へ全面切替。
- **温存した v2 コード（S7/S8/S9/S10 がまだ参照）と理由**：
  - `lib/v2/{scoring,gameMachine,roundGen,patch,gameView}`・`state/{statsRecorder,badgeRecorder,sessionRecorder}` … **S8 履歴/S9 バッジの v2 集計が依存中**。v3 の `recordCompletedGame`/`statsAggregation`（S3）へ S7/S8 で差し替えるまで残す。
  - `screens/v2/{SettingsScreen,HistoryScreen,DistanceReminderScreen,OnboardingScreen,IdleHomeScreen}` … **S7 設定/起動フロー・S8 履歴**で v3 化するまで残す（現状 App.tsx からは未参照＝デッド気味だが、S7/S8 の差し替え基準点として保持）。
  - `components/v2/{GaborGrid,GaborPatchCell,GameTopBar,CountdownTimer,ResultMark,ResultOverlayLayer,AggregateResultBadge}` … 現状 v2 GameScreen 撤去で **App から未参照（オーファン）**だが、v2 描画テスト（`gameComponents`/`ResultOverlayLayer`/`webAriaComponents`）が緑のまま残るため**今回は撤去せず温存**。S7 完了で v2 起動フローを完全に外したタイミングで一括撤去推奨。`CountdownTimer`(v2) は `DistanceReminderScreen`(v2) が依存中のため S7 まで必須。
  - `lib/v2/rng`・`hooks/v2/useGameTimer` … **v3 が再利用中**。撤去せず共有継続（将来 v3 へ移設可）。
  - `state/{schema,keys,repository,migration,settings,dataReset}`（v2）… v2 SettingsScreen/HistoryScreen が依存中。v3 は `state/v3/*` 並行モジュールで稼働。S7/S8 で v2 起動・履歴を外したら撤去。
  - `components/v2/{DataResetNotice,AdManager*}` … **App.tsx（v3）が現役で使用**（RZ-1 通知・広告）。撤去しない。RZ-1 の v3 化（i18n キー化）は S7。
- **既知の暫定（S7 で本実装）**：
  - 起動フローが簡素化されている（**オンボーディング・距離リマインドを S6 では挟まず**、直接ホームゲーム開始）。F-06 の初回オンボ → 距離リマインド → 自動開始は S7。
  - ホームの結果が暫定（`applyResult` のメモリ反映で次ゲーム生成のみ。**ホーム結果カード RC-1・記録永続化 `recordCompletedGame`・「もう一度」は未配線**）。S7 で `onResolved` を記録/RC-1 へ接続。
  - 中断後の × 起点の着地は「同レベルで新ゲーム再生成」（IdleHome 相当の待機画面は S7 のホームフロー設計時に再検討）。
- **データモデル変更なし**（§7 凍結スキーマ準拠。S6 はスキーマに触れていない）。

---

## V3-S7. v3.0 — S7：ホームタブ・起動フロー・免責（F-08 / F-06 / F-10 / F-11 通知 / §4.4 本結線）（2026-06-10）

> S5/S6 の v3 ゲーム・タブを起動フローとホームフローに本配線。**レベル増減（applyResult）と記録
> （recordCompletedGame）をここで本結線・永続化**。v2 起動フロー・描画オーファン群を一括撤去。

### V3-S7.1 結論

| 項目 | 状態 | 備考 |
|---|---|---|
| `npm run typecheck`（tsc strict） | **エラー 0（PASS）** | — |
| `npm test`（Jest） | **59/59 スイート・614/614 件 全 PASS** | S6 626 → 614。S7 追加（homeFlow 5 / homeComponents 6 / Onboarding v3 7 / Distance v3 5 / AppRoot S7 +5）と v2 撤去（gameComponents/ResultOverlayLayer/Onboarding/Distance v2 テスト）の差し引き。赤 0 維持 |
| `npm run build:web`（既定 = v3） | **成功（Exported: dist）** | AppEntry ≈ **1.1 MB**。`npx serve -s dist` で HTTP 200・`<title>GaborEye</title>` |
| Playwright 検証 | **PASS（375/360/1280）** | 起動→オンボ(免責/年齢/距離/概要)→距離リマインド→ゲーム→結果カード→もう一度→距離 を目視 + コンソールエラー 0。`temp-images/s7/*.png`（gitignore） |
| Expo SDK | 54 系維持・native 依存追加なし | AdManager native/web 分割維持（広告 native 不変） |

### V3-S7.2 追加 / 変更 / 削除ファイル

**新規**
| ファイル | 役割 |
|---|---|
| `src/state/v3/homeFlow.ts` | **§4.4 / F-04 / §7.4-7.7 本結線**。`resolveCompletedGame`：applyResult → saveLevelState（永続）→ recordCompletedGame。levelDelta を返す。中断は呼ばない |
| `src/components/v3/LevelDeltaIndicator.tsx`（LD-1） | +1/±0/−1 を色+矢印形+テキストで（NF-12）。−1 暗橙（責めない）。aria-live=polite |
| `src/components/v3/HomeResultCard.tsx`（RC-1） | クリア/失敗 + LD-1 + 現在レベル(LB-1 large) + ストリーク + もう一度(64px)。role=region 読み上げ |
| `src/components/v3/DataResetNotice.tsx`（RZ-1 i18n 化） | F-11 通知（dataResetV3.* キー）。v2 ハードコード版を置換 |
| `src/screens/v3/OnboardingScreen.tsx`（ON-1） | 4 ステップ・タップ ≤6。免責同意ゲート・年齢(70 代警告)・距離・概要(回転のみ)。onboardingV3.* |
| `src/screens/v3/DistanceReminderScreen.tsx`（DR-1） | 「画面から {n}cm」36px・v3 CountdownTimer large・3 秒自動進行・片眼補助・X 中断。distanceV3.* |
| `tests/state/v3/homeFlow.test.ts`(5)・`tests/components/v3/homeComponents.test.tsx`(6)・`tests/screens/v3/{OnboardingScreen,DistanceReminderScreen}.test.tsx`(7+5) | +23 件 |

**変更**
| ファイル | 変更 |
|---|---|
| `src/screens/v3/AppRoot.tsx` | ホームタブに 3 サブフェーズ（distance→playing→result）。距離リマインド→自動開始→結果カード→もう一度。`onResolveGame` 注入で本結線。F-07 中断ダイアログ維持 |
| `App.tsx` | F-11 → ロード → 初回オンボ（完了で UserProfile 保存）→ AppRoot（initialHomePhase='distance'・onResolveGame=resolveCompletedGame）。RZ-1 を v3 へ |
| `src/theme/tokens.ts` | `levelDeltaV3`（up/same/down）追加 |
| `src/i18n/ja.ts` | `homeV3` / `levelDeltaV3` / `onboardingV3` / `distanceV3` / `dataResetV3` 追加 |
| `src/state/v3/index.ts` | homeFlow を公開 |
| `tests/screens/v3/AppRoot.test.tsx` | S7 フローに更新（距離リマインド再入・結果カード・+1/±0/−1・もう一度） |
| `tests/a11y/webAriaComponents.test.tsx` | GaborPatchCell/PatchDef を v2 → **v3** に差し替え |

**削除（v2 撤去・v3 が代替）**
| ファイル | 理由 |
|---|---|
| `src/screens/v2/{OnboardingScreen,DistanceReminderScreen,IdleHomeScreen}.tsx` | v3 が代替（起動フロー・ホーム） |
| `src/components/v2/{GaborGrid,GaborPatchCell,GameTopBar,CountdownTimer,ResultMark,ResultOverlayLayer,AggregateResultBadge,DataResetNotice}.tsx` | v3 描画/通知が代替（§V3-S6.4 推奨の一括撤去） |
| `tests/screens/v2/{OnboardingScreen,DistanceReminderScreen}.test.tsx`・`tests/components/v2/{gameComponents,ResultOverlayLayer}.test.tsx` | 上記撤去に伴う |

### V3-S7.3 v3 アプリ起動・評価手順（S6 から不変、既定 = v3）

```bash
cd /Users/np_202212_11/projects/gabor3
npm test                       # Jest 全テスト（59/59 スイート・614/614 件 全 PASS）
npm run typecheck              # tsc --noEmit（エラー 0）
npm run build:web              # 本番 Web バンドル → dist/（既定 = v3 アプリ。AppEntry ≈ 1.1 MB）
npx serve -s dist -l 4631      # http://localhost:4631/ で配信。HTTP 200
#  → 初回：オンボ(免責→年齢→距離→概要)→距離リマインド→ホームで現在レベル自動開始。
#     1 ゲーム完了→結果カード(クリア/失敗・レベル変化・現在レベル・ストリーク)→「もう一度」。
#     2 回目以降：オンボなし→距離リマインド→前回 currentLevel から。
#  ※ ブラウザの localStorage を消すと「初回」状態に戻る（オンボ再表示）。
```

### V3-S7.4 S8 への申し送り
- **設定タブ（F-13）未実装**：範囲設定/変化順/継承項目/免責再閲覧の設定 UI は本 S7 範囲外。DisclaimerPanel（DC-1）は稼働中・設定から呼べる土台あり。設定タブ実装時に DisclaimerPanel の「閲覧のみ」モードも追加。
- **温存した v2**：`screens/v2/{HistoryScreen,SettingsScreen}`（S8 履歴・設定本実装まで）、`lib/v2/{scoring,gameMachine,roundGen,patch,gameView}`・`state/v2 系`（HistoryScreen/SettingsScreen が依存）、`components/v2/{Toggle,SegmentedControl,SettingRow,StatTile,BadgeCell,BadgeGrid,BadgeAwardToast,LineChart,EmptyState,NumberSpinner,SkipLink,ConfirmDialog,DisclaimerPanel,AdManager*}`。S8 で履歴を v3 化（`state/v3/statsAggregation`・`loadAllDailyStats` 等）すると同時に v2 集計/HistoryScreen を撤去推奨。
- **記録は永続化済み**：S8 履歴グラフは `state/v3/repository.loadAllDailyStats` / `loadStreak` / `loadPlayStats` を読むだけでよい（S7 で書き込み配線済み）。
- **データモデル変更なし**（§7 凍結スキーマ準拠）。

---

## V3-S8. v3.0 — S8：履歴タブ・レベル進捗グラフ（F-09 グラフ部・DailyStats/Streak/PlayStats 集計）（2026-06-10）

### V3-S8.1 結論

| 項目 | 状態 |
|---|---|
| `npm test`（Jest） | **緑（全 PASS）**。58 スイート / **602 件**（S7=587 → +15）。新規：historyView 16 / chartGeometry 13 一部 + HistoryScreen 6 + historyComponents 7。撤去 v2 テスト分は差し引き |
| `npx tsc --noEmit` | **エラー 0**（strict） |
| `npm run build:web` | **PASS**（v3 既定アプリ） |
| Playwright 視覚検証 | **済**（履歴グラフ・指標・データ少時案内・360/390/1280、localStorage seed） |

### V3-S8.2 やったこと（F-09 グラフ部）

- **v3 履歴画面を新設**し、AppRoot の履歴タブ（プレースホルダ）を `HistoryScreen`（v3）へ差し替え。
- 表示：日次到達レベル折れ線（同日 max ＝ `DailyStats.highestLevelReached`）/ 最高到達レベル基準線（橙破線 + 「最高 {n}」）/ 最高到達レベル StatTile（青強調）/ 連続日数（🔥 + `Streak.currentStreak`）/ 累計プレイ回数（`PlayStats.totalGames`）。
- 当日点を ◆ + 赤で強調（色 + 形で非依存、NF-12）。Y 軸は **動的スケール**（到達レベル 1〜720 対応）。軸ラベル 18pt 以上（`font.label`）。点滅なし。
- データ 7 日未満は EmptyState「もう少しデータが集まると傾向が見えます」。
- **バッジ部は S9**：本 S8 では「バッジ」見出し + プレースホルダ案内（🏅）のみ。

### V3-S8.3 追加 / 変更 / 削除ファイル

| 区分 | パス | 内容 |
|---|---|---|
| 追加 | `src/lib/v3/historyView.ts` | DailyStats → 折れ線系列（日付昇順・直近 30 日窓・当日フラグ・7 日未満案内・aria 要約）。純関数 |
| 追加 | `src/lib/v3/chartGeometry.ts` | View ベース折れ線座標 + **動的 Y スケール**（`computeYMax`）+ 最高到達レベル基準線 y。純関数 |
| 追加 | `src/components/v3/LevelLineChart.tsx`（CH-1） | 到達レベル折れ線 + 橙破線基準線 + 当日 ◆ + aria 要約 |
| 追加 | `src/components/v3/StatTile.tsx`（ST-1） | 最高到達レベル（強調）/ 連続日数（🔥）/ 累計回数の数値タイル |
| 追加 | `src/components/v3/EmptyState.tsx`（EM-1） | データ少時/空/エラー案内 |
| 追加 | `src/screens/v3/HistoryScreen.tsx` | 永続化読込 → 整形 → 描画。now 注入可・PC 720px 中央・セーフエリア |
| 変更 | `src/screens/v3/AppRoot.tsx` | 履歴タブを `HistoryScreen`（v3）へ差し替え |
| 変更 | `src/i18n/ja.ts` | `historyV3.*` キー追加 |
| 変更 | `src/theme/tokens.ts` | `levelChartV3`（line/lineHighest/pointToday/point）追加 |
| 変更 | `tests/screens/v3/AppRoot.test.tsx` | 履歴タブ着地アサーションを v3 HistoryScreen に更新 |
| 追加（テスト） | `tests/lib/v3/historyView.test.ts` / `chartGeometry.test.ts` / `tests/screens/v3/HistoryScreen.test.tsx` / `tests/components/v3/historyComponents.test.tsx` | |
| **削除（v2 撤去）** | `src/screens/v2/HistoryScreen.tsx`・`src/components/v2/{LineChart,StatTile,EmptyState}.tsx`・`src/lib/v2/{historyView,chartGeometry}.ts` + 各テスト | v3 履歴が代替（スコア折れ線 → 到達レベル） |

### V3-S8.4 履歴タブ到達 / データ seed 手順（評価用）

1. ビルド & serve：`npm run build:web` → `npx serve -s dist -l 5051`。
2. ブラウザで `http://localhost:5051/`。オンボ → 距離リマインド → ホームでゲームをプレイすると、`gaboreye:v3:dailyStats:*` / `streak` / `playStats` / `levelState.highestLevel` が記録され、**履歴タブ**で反映される。
3. 手早く確認したい場合は localStorage 直 seed（web の AsyncStorage は `gaboreye:v3:*` 平キー）：
   - `gaboreye:v3:userProfile` に `{"onboardingCompleted":true, ...}`、`gaboreye:v3:resetNoticeShown` に `true`。
   - `gaboreye:v3:levelState` `{"currentLevel":26,"consecutiveFailures":0,"highestLevel":25}`。
   - `gaboreye:v3:streak` `{"currentStreak":5,"longestStreak":7,"lastPlayedDate":"<today>"}`。
   - `gaboreye:v3:playStats` `{"totalGames":37}`。
   - `gaboreye:v3:dailyStats:YYYY-MM-DD` を複数日分 `{"date":"...","highestLevelReached":N,"gameCount":1}`（当日含む）。
   - reload → 「履歴」タブをタップ。

### V3-S8.5 S9 への申し送り

- **バッジ一覧（F-09 バッジ部・§6 3 軸 11 種）は S9 本実装**。本 S8 の `HistoryScreen` 内「バッジ」見出し直下の EmptyState プレースホルダ（testID `history-badges`）を S9 で `BadgeCell`（BG-1）一覧 + 獲得/未獲得 + ヒントに差し替える。`BadgeStatus` 永続化（`loadAllBadgeStatuses`）は S3 で配線済み。`badge.*` i18n キーは ja.ts に既存。
- **温存した v2**：`components/v2/{BadgeGrid,BadgeCell,BadgeAwardToast}`・`lib/v2/badgeView`・`state/badgeRecorder`（スコア依存バッジ。S9 で v3 バッジへ置換 or 撤去）、`screens/v2/SettingsScreen` 系（設定タブ未実装のため温存）、`components/v2/AdManager*`（native 広告維持）。

---

## V3-S9. v3.0 — S9：バッジ（F-09 バッジ部・§6 3 軸 11 種・§7.8 BadgeStatus）（2026-06-10）

### V3-S9.1 結論

| 項目 | 状態 |
|---|---|
| `npm run typecheck` | **PASS（エラー 0）** |
| `npm test`（Jest） | **56 スイート / 585 件 PASS（赤 0）**。S8 後より純増 |
| `npm run build:web` | **PASS**（dist 出力、AppEntry ≈ 1.13 MB） |
| Playwright 視覚検証 | バッジ一覧（獲得/未獲得+ヒント）3 軸を 375 / 1280 で確認（temp-images/s9-*） |

### V3-S9.2 やったこと（§6 / F-09 バッジ部）

- **v3 バッジ定義/判定/表示を新設**（`lib/v3/badgeDefinitions` / `badges` / `badgeView`）。3 軸 11 種：継続 B-01〜05 / 高難度 B-06〜08 / 高レベル B-09〜11。
- **付与判定をゲーム完了時に配線**：`state/v3/gameRecorder.recordCompletedGame` が stats 更新後に `evaluateBadges` を呼び、新規獲得分のみ `gaboreye:v3:badge:*` へ永続化。`homeFlow.resolveCompletedGame` が `highestLevel`/`ranges`/`order` を伝搬。
- **履歴タブのバッジプレースホルダ（testID `history-badges`）を `BadgeGrid`（BG-2）に差し替え**。3 軸見出し + 獲得（🏅+獲得日）/未獲得（🔒+ヒント）。
- **獲得演出**：`HomeResultCard` 上層に `BadgeAwardToast` を新規獲得時のみ 1 度（点滅なし）。音/ハプティクスは S10 へ `onBadgeShown` フック。
- **旧 v2 バッジ撤去**：`lib/v2/{badges,badgeView,badgeDefinitions}`・`state/badgeRecorder`・`components/v2/{BadgeCell,BadgeGrid,BadgeAwardToast}` + 各テストを削除。`statsRecorder` からバッジ配線を除去。`webAriaComponents` の BadgeCell を v3 版へ。

### V3-S9.3 閾値仮置き（AS-21）

- B-07 遅い域：`rotationSpeed ≤ 3`（9 段の下位 1/3、絶対値固定）。
- B-08 最難域：個数4 ∧ 4x4 ∧ 振動 ∧ `rotationSpeed ≤ 2.5`（絶対値 AND）。
- B-09 ≥ 10（絶対値）/ B-10 ≥ ⌈総レベル数×50%⌉ / B-11 ≥ ⌈総レベル数×85%⌉（**割合ベース**、範囲設定で総数が変わっても中盤/終盤を保つ）。

### V3-S9.4 バッジ確認手順（評価用）

1. `npm run build:web` → `npx serve -s dist -l 5051`。
2. localStorage 直 seed（web の AsyncStorage は `gaboreye:v3:*` 平キー）：
   - `gaboreye:v3:userProfile` `{"onboardingCompleted":true,...}` / `gaboreye:v3:resetNoticeShown` `true`。
   - `gaboreye:v3:levelState` `{"currentLevel":12,"consecutiveFailures":0,"highestLevel":12}`。
   - `gaboreye:v3:streak` `{"currentStreak":4,...}` / `gaboreye:v3:playStats` `{"totalGames":18}`。
   - `gaboreye:v3:badge:B-01` `{"badgeId":"B-01","earned":true,"earnedAt":"<iso>"}`（B-02/B-06/B-09 も同様）。
3. reload →「履歴」タブ → 下スクロールでバッジ一覧。獲得＝🏅+獲得日、未獲得＝🔒+ヒント、3 軸見出し。
4. 実プレイ確認：ホームでゲームをプレイ → 完了でバッジ判定 → 新規獲得時はホーム結果カードにトースト。

### V3-S9.5 S10 への申し送り

- バッジ獲得音/ハプティクスは未結線。S10 で `HomeResultCard` の `onBadgeShown` に `playEvent('badge')` + ハプティクス（heavy+medium、system §10.1）を結線する。
- 温存 v2：`screens/v2/SettingsScreen` 系（v3 設定タブ F-13 未実装のため温存）、v2 `statsRecorder`/`sessionRecorder`（孤立 dead コード、後続で一括撤去可能）、`components/v2/AdManager*`（native 広告維持）。

---

## V3-S10. v3.0 — S10：音・ハプティクス（F-14・NF-31/32/33・system §10）（2026-06-10）

### V3-S10.1 結論

| 項目 | 状態 |
|---|---|
| `npm run typecheck` | **PASS（エラー 0）** |
| `npm test`（Jest） | **58 スイート / 618 件 PASS（赤 0）**。S9 後（585 件）より +33 件純増 |
| `npm run build:web` | **PASS**（dist 出力、AppEntry ≈ 1.15 MB） |

### V3-S10.2 やったこと（F-14）

- **v3 発火決定の純関数を新設**（`lib/v3/feedback.ts`、`decideFeedbackV3`）。v2 の `lib/v2/feedback`（round-correct/wrong/session-complete）を v3 イベント（clear/fail/countdown-tick/levelup/badge-earned）へ読み替え。音 OFF・振動 OFF・サイレントの個別判定は v2 と同一規範。
- **v3 副作用配線フックを新設**（`hooks/v3/useFeedback.ts`）。決定（純関数）と再生（platform/audio・haptics）を橋渡し。初回マウントで audio.prime、設定は emit 時点の最新値を参照。
- **platform/audio に v3 音種を追加**（`clear`/`fail`/`levelup`）。v2 互換 `correct`/`wrong`/`end` は残置。**新規アセットは追加せず**既存 mp3 を流用（clear=correct.mp3 / fail=wrong.mp3 / levelup=end.mp3）。Web 合成音は clear=上行2音 / fail=低音1音 / levelup=上行3音。
- **結線**：
  - `GameScreen`：締め切り（revealed）時に `clear`/`fail` を 1 度 emit。カウントダウン残り 3/2/1 秒で `countdown-tick` を毎秒 1 度ずつ emit（試行中の唯一の例外）。`onFeedback` プロップ経由。
  - `AppRoot`：`useFeedback` を 1 箇所で保持し emit を配下へ供給。レベルアップ（`levelDelta > 0`）時に `levelup` emit。`HomeResultCard.onBadgeShown` → `badge-earned` emit。`soundEnabled`/`hapticsEnabled` を App.tsx の Settings から受け取り。
  - `App.tsx`：`AppRoot` に `settings.soundEnabled`/`settings.hapticsEnabled` を伝搬。

### V3-S10.3 発火マトリクス（system §10.1 準拠）

| イベント | 発火点 | 音種(音量) | ハプティクス | 試行中抑制 |
|---|---|---|---|---|
| clear | GameScreen reveal | clear(0.6) | light | 締め切り後のみ |
| fail | GameScreen reveal | fail(0.5) | medium | 締め切り後のみ |
| countdown-tick | GameScreen 残り3/2/1秒 | tick(0.4/0.5/0.6) | なし | 残り3秒以下の例外として許可 |
| levelup(+1) | AppRoot delta>0 | levelup(0.65) | medium | — |
| badge-earned | HomeResultCard onBadgeShown | badge(0.7) | badge(heavy+medium) | — |

- **発火順序（ホーム結果で重なる場合）**：clear（GameScreen 開示時）→ levelup（結果カード表示時）→ badge（トースト表示時）。時間的にずれるため重複しない。
- **サイレントモード（NF-33）**：`decideFeedbackV3` の silent 引数で音抑止・ハプティクス継続。実機 iOS は audio backend が `playsInSilentMode:false` で OS 側も無音化（二重担保）。フックは決定段階 silent=false 固定で OS に委ねる。
- **音 OFF / 振動 OFF**：当該チャネルのみ無発火（個別、F-14）。
- **−1 専用音は付けない**：spec F-14・system §10.2・S5 Evaluator 申し送り・Planner 申し送り2 に従い、レベルダウンには専用音/イベントを設けない（失敗音で足りる）。`FeedbackEventV3` に leveldown 型は存在しない。

### V3-S10.4 追加テスト（+33 件）

- `tests/lib/v3/feedback.test.ts`（新規）：各イベント × 音ON/OFF × 振動ON/OFF × サイレントの決定検証。
- `tests/hooks/v3/useFeedback.test.tsx`（新規）：フェイクバックエンドで emit ルーティング・prime・設定追従を検証。
- `tests/screens/v3/GameScreen.test.tsx`（+3）：clear/fail 締め切り emit、試行中は clear/fail 非発火、ティック 3/2/1。
- `tests/screens/v3/AppRoot.test.tsx`（+5）：clear+levelup、失敗1回目は fail のみ（levelup なし・−1専用音なし）、音OFF/振動OFFの個別抑止、バッジ獲得音。
- `tests/platform/audio.test.ts`（更新）：SOUND_KINDS を v3+互換 8 種へ。

### V3-S10.5 native 懸念（CLAUDE.md §5/§6）

- audio/haptics の native/web 分岐は既存 platform 層を流用（Web=Web Audio 合成音・haptics no-op、native=expo-audio/expo-haptics）。本 S10 で触れたファイルに `document`/`window`/DOM 直接アクセスの混入なし（`globalThis` 経由のみ）。
- `expo-audio` の音源は既存 5 mp3 を流用（clear/fail/levelup は require をエイリアス）。新規アセットなしのため app.json 変更不要。
- 実機未検証項目（ユーザー Android/iOS で確認推奨）：(1) 音再生レイテンシ 100ms 以内（NF-31、初回 prime 後）、(2) サイレントスイッチで音なし・振動あり（iOS、NF-33）、(3) badge ハプティクス heavy→medium 2 連の体感、(4) Android システム音量 0 時の挙動（OS 任せ）。

### V3-S10.6 S11 への申し送り

- 設定タブ F-13（v3）は未実装のため `screens/v2/SettingsScreen` 系を温存。S11 で v3 設定タブを実装する際、音/振動トグルは `Settings.soundEnabled`/`hapticsEnabled`（S3 永続化済み）を `AppRoot` に渡す経路が既に通っている（App.tsx）。
- 距離リマインドのカウントダウン（DR-1）のティック音は本 S10 では未配線（spec F-14 はゲームのカウントダウンを主対象。距離リマインドの 3/2/1 ティックを足すなら `DistanceReminderScreen` に同様の emit を追加）。

---

## V3-S10.5. v3.0 — S10.5：設定タブ UI（F-13 / screens.md S3-1 / components.md RG-1・OR-1）（2026-06-10）

### V3-S10.5.1 結論

| 項目 | 状態 |
|---|---|
| typecheck | **PASS**（エラー 0） |
| test | **601 / 601 PASS**（55 スイート）。新規 24 件、v2 孤立テスト 5 ファイル撤去 |
| build:web | **成功**（`expo export --platform web` → dist） |
| 設定タブ | プレースホルダ → **v3 SettingsScreen** に差し替え（AppRoot） |

### V3-S10.5.2 やったこと（F-13）

- **v3 設定画面** `src/screens/v3/SettingsScreen.tsx` を新設し、`AppRoot` の設定タブを差し替え。
- **新規コンポーネント**：`RangeSelector`（RG-1、5 変数の振れ幅チップ）/ `VariableOrderList`（OR-1、変化順並べ替え）/ `DisclaimerModal`（免責再閲覧・閲覧のみ）/ `Toast`（クランプ/最低 1 値違反の aria-live 通知）。
- 範囲・変化順の変更は S3 の `updateLevelSettings` を呼び §4.5 クランプ（現在レベルを新総レベル数にクランプ + 連続失敗 0 リセット）を実行。クランプで現在レベルが動いたら Toast 告知。
- 継承項目（視聴距離 / ダークモード / 音 / 振動 / 片眼）は即保存（`updateSettings` / `saveUserProfile`）。darkMode・ranges/order は `onSettingsChange` で App→AppRoot へ反映。
- 総レベル数プレビュー（`settingsTotalLevels`）、バージョン `v3.0.0` + 免責同意日時。

### V3-S10.5.3 v2 撤去（screens/v2 消滅）

撤去（孤立クラスタを依存グラフで確認後）：`screens/v2/SettingsScreen` / `state/settings`（v2）/ `state/statsRecorder` / `state/sessionRecorder` / `lib/v2/statsAggregation`（+各テスト）。`src/screens/v2/` ディレクトリは空になり削除。**v2 の画面は全撤去・主要 v2 ロジック（採点/統計集計/セッション記録）も撤去済み**。残る v2 オーファン（gameMachine/patch/scoring/roundGen/gameView/feedback/rng/dateUtil、state/schema・repository・migration・keys・dataReset、hooks/v2/*、components/v2 の一部）は**live な v3 チェーンが依存中のため S11 で精査・撤去**。`components/v2/{SettingRow,Toggle,SegmentedControl,DisclaimerPanel}` は v3 設定/オンボで流用（残す）。AdManager native は維持。

### V3-S10.5.4 設定タブ到達手順（手動 / Web）

1. `npm run build:web`（または既存 dist）→ `npx serve -s dist -l <port>`。
2. 初回はオンボーディング（免責同意 → 年齢 → 距離 → はじめる）を完了。
3. 距離リマインド後ホームに着地 → 下部タブ **「設定」** を押す。
4. 範囲チップ／変化順の上下ボタン／各トグル／「免責事項を読む」／「全データ削除」を操作。範囲を絞ると上部「現在の設定：{N} レベル」が変化し、現在レベルが上限超なら Toast でクランプ告知。

### V3-S10.5.5 Playwright 視覚検証

`temp-images/s10_5/`（gitignore 下）に 360/375/1280 のスクショと操作スクショ（範囲縮小・最低 1 値違反・変化順移動・免責モーダル・削除確認）。全幅 console error 0。localStorage で range/order/soundEnabled/levelState 永続化、クランプ 700→640 + 連続失敗 0 リセットを確認。

---

## V3-S11. v3.0 — S11：仕上げ（a11y・レスポンシブ・セーフエリア・全体結合・最終掃除）（2026-06-10）

> 非機能要件（§9）を全画面で満たし、NF-8 コントラスト是正・NF-9 Space キー補完・残 v2 オーファン撤去・全体結合テストを実施した v3.0 最終スプリント。これで v3.0 は **S1〜S11 完成**。

### V3-S11.1 結論

| 項目 | 状態 | 備考 |
|---|---|---|
| `npm run typecheck`（tsc strict） | **エラー 0（PASS）** | — |
| `npm test`（Jest） | **50 スイート / 487 件 全 PASS（赤 0）** | S10.5 時点 55 スイート/601 件 → 残 v2 オーファン 9 スイート（135 件）撤去 + S11 新規 4 スイート（21 件）追加で 50/487 |
| `npm run build:web`（既定 = v3） | **成功（Exported: dist）** | AppEntry ≈ **1.18 MB**。`npx serve -s dist` で HTTP 200・`<title>GaborEye</title>` 確認 |
| NF-8 コントラスト実測 | **全ペア 7:1 以上** | 下記 §V3-S11.3 |
| NF-9 Space キー | **非 button ロール全てに補完** | 下記 §V3-S11.4 |
| Expo SDK | 54 系維持・native 依存追加なし | AdManager native/web 維持（広告 native 不変） |

### V3-S11.2 やったこと

1. **NF-8 コントラストトークン是正**（`src/theme/tokens.ts`、Designer amendment 確定値）：
   - light `brandPrimary #4F46E5→#13449D` / `brandPrimaryHover #4338CA→#0F3580` / `streakFlameFg #EA580C→#7A3C00`。
   - dark を本書確定値へ統一：`brandPrimary #00E5FF→#7FB0FF` / `brandPrimaryHover #00B8CC→#A6CBFF` / `streakFlameFg #FBBF24→#FFB266`（+ semanticWarning/info を本書 dark 値へ）。
2. **NF-9 Space キー補完**（新規 `src/theme/keyActivation.ts` の `webSpaceActivation`）：RN-Web 0.21 の PressResponder は非 button ロールで Space 起動しない（Enter のみ）ため、`GaborPatchCell`(checkbox) / `BottomTabBar`(tab) / `SegmentedControl`(radio) / `Toggle`(switch) / `RangeSelector`(checkbox) / `SettingRow`(radio 行) に Web 限定で Space 起動を補完（Enter は RN-Web 既定に委譲、二重発火回避・preventDefault でスクロール抑止）。
3. **NF-14 Skip link 結線**：既存 `SkipLink`(v2) を `AppRoot` 先頭へ結線し、main コンテンツに Web 限定 `nativeID="ge-main-content"` を付与（従来は未結線オーファンだった）。
4. **残 v2 オーファン撤去**（撤去前に grep で参照ゼロを確認）：`lib/v2/{roundGen,gameMachine,gameView,scoring,feedback,patch}`、`hooks/v2/useFeedback`、`components/v2/{ConfirmDialog,NumberSpinner}`、`state/{schema,repository,migration,keys,dataReset}` を撤去（+ それらの専用テスト 9 スイート）。**v3 が依存中のものは温存**：`lib/v2/{rng,dateUtil}`（v3 が import 中）、`state/store`（v3 migration/repository/dataReset が依存）、`state/adTracker`（AdManager.native 依存）、`components/v2/{SegmentedControl,SettingRow,Toggle,DisclaimerPanel,SkipLink,AdManager*}`、`hooks/v2/useGameTimer`。
5. **全体結合テスト**（新規 `tests/screens/v3/integration.test.tsx`）：起動→距離→ゲーム(クリア)→結果(+1)→もう一度→ゲーム(失敗±0)→履歴→設定(範囲変更 720→540)→ホームの通し動線を実永続化（homeFlow.resolveCompletedGame）で 1 本検証。

### V3-S11.3 NF-8 実測コントラスト（WCAG 2.1 相対輝度比）

| ペア | 実測 | 判定 |
|---|---|---|
| 白文字 on light `#13449D`（プライマリボタン/アクティブタブ） | **8.97:1** | AAA |
| 白文字 on light `#0F3580`（hover） | 11.41:1 | AAA |
| light `#7A3C00` on 白背景（ストリーク炎テキスト） | **8.49:1** | AAA |
| 黒文字 on dark `#7FB0FF`（プライマリボタン dark） | **9.56:1** | AAA |
| dark `#FFB266` on dark surface `#12131A`（ストリーク） | 10.42:1 | AAA |

（自動検証：`tests/a11y/contrastNF8.test.ts`。WCAG 相対輝度を計算し全ペア ≥7:1 を assert）

### V3-S11.4 NF-9 / a11y 点検

- Space キー補完を `tests/a11y/keyActivation.test.tsx` で検証（Space で起動・Enter は委譲・disabled は無発火・Native は onKeyDown なし）。
- aria-checked/pressed/selected（NF-15）・focus 3px（focusStyle の `:focus-visible`）・色のみ非依存（NF-12、各コンポーネントのインジケータ/テキスト併記）は既存実装を維持。
- reduced-motion（NF-13）：装飾アニメ（BadgeAwardToast / ResultOverlayLayer）は `AccessibilityInfo.isReduceMotionEnabled` で抑制。ゲーム刺激の回転は課題上必須のため抑制対象外（仕様通り）。
- Skip link（NF-14）：`tests/a11y/appRootSkipLink.test.tsx` で Web 描画 / Native 非描画を検証。

### V3-S11.5 セーフエリア（NF-29/30）

- ゲーム刺激提示中（`GameScreen`）は SafeAreaView を使わず `flex:1` のフルスクリーン（NF-29 許容）。
- それ以外（距離リマインド / ホーム結果 / 履歴 / 設定 / オンボ / タブバー / GameTopBar）は `SafeAreaView` / `useSafeAreaInsets` でセーフエリア準拠（NF-30）。変更なし（既存実装を確認）。

### V3-S11.6 起動・テスト・ビルド（v3.0 完成状態）

```bash
cd /Users/np_202212_11/projects/gabor3
npm install                 # 初回のみ

npm run typecheck           # tsc strict（エラー 0）
npm test                    # Jest（50 スイート / 487 件 全 PASS）
npm run build:web           # 既定 v3 を Web 静的エクスポート（Exported: dist）

# dev サーバーが EMFILE を出す場合は静的本番ビルドを serve（CLAUDE.md §6 フォールバック）
npx serve -s dist -l 4599   # http://localhost:4599/ で起動確認（HTTP 200・<title>GaborEye</title>）

# Android（Expo Go）
npm run start               # QR を Expo Go で読む（SDK 54）
```

到達手順（Web）：起動 → 初回はオンボ（免責→年齢→距離→概要）→ 距離リマインド → ホームで現在レベル自動開始。1 ゲーム完了 → 結果カード（クリア/失敗・レベル変化・現在レベル・ストリーク）→「もう一度」。下部 3 タブ（ホーム/履歴/設定）。プレイ中の他タブ/× で中断ダイアログ。設定で範囲/変化順/継承項目。キーボード：Tab で Skip link → 各要素、Enter/Space で起動。

### V3-S11.7 native 懸念（最終監査・Android 実機確認前）

- `keyActivation.ts` / SkipLink / AppRoot の `nativeID`：いずれも `Platform.OS === 'web'` ガードで native には `onKeyDown` / `document` / DOM id を一切出さない。
- `Image transform` メモ化パターンの新規導入なし（描画系は未変更）。
- AsyncStorage：v3 は `state/store`（AsyncStorage 公式 API）+ `state/v3/*` 経由。撤去したのは未参照の v2 ストレージ層のみで native/web 共通の `state/store` は温存。
- 広告（AdManager native/web）不変。

### V3-S11.8 テスト件数

- S10.5 後：55 スイート / **601 件**
- S11 後：**50 スイート / 487 件**（残 v2 オーファン 9 スイート/135 件撤去、S11 新規 4 スイート/21 件追加：contrastNF8 +13・keyActivation +9・appRootSkipLink +2・integration +1、および settingsControls から NumberSpinner 3 件除去）

### V3-S11.9 撤去ファイル一覧

- source（14）：`src/lib/v2/{roundGen,gameMachine,gameView,scoring,feedback,patch}.ts`、`src/hooks/v2/useFeedback.ts`、`src/components/v2/{ConfirmDialog,NumberSpinner}.tsx`、`src/state/{schema,repository,migration,keys,dataReset}.ts`
- test（9）：`tests/lib/v2/{roundGen,gameMachine,gameView,scoring,feedback,patch}.test.ts`、`tests/state/{migration,repository,dataReset}.test.ts`

---

## 0. v2.0 セットアップ + Sprint 1 完了状態（2026-05-30）

### 0.1 結論（Sprint 1 完了時点）

| 項目 | 状態 | 備考 |
|---|---|---|
| Node / npm | **OK** | node v22.9.0 / npm 10.8.3（`.tool-versions` 通り） |
| `npm test`（Jest） | **緑（全 PASS）** | **7 スイート / 46 件 PASS**。v1.x 依存テストを全撤去し、流用基盤（GaborPatch / gaborPixels / calibration / theme）の疎通テストのみ残置 |
| `npx tsc --noEmit`（typecheck） | **エラー 0** | strict。`src/` も `App.tsx` も型エラーなし |
| `npm run build:web`（本番 Web バンドル） | **PASS** | `dist/_expo/static/js/web/AppEntry-*.js` ≈ **318 kB**（旧 778 kB / 148 modules に縮小）。`npx serve -s dist` で HTTP 200・`<title>GaborEye</title>` 確認 |
| dev サーバー（`npm run web`） | フォールバック採用 | CLAUDE.md 方針に従い、検証は **静的本番ビルド（build:web）+ serve** で実施（EMFILE 回避） |
| Expo SDK | **54 系維持** | 55 以降に上げない（CLAUDE.md 制約） |

**Sprint 1 でやったこと**：v1 / v1.1 / v1.2 の全ゲーム実装・旧ルーター・旧データ層・旧テストを撤去し、
v2.0 で流用する描画/テーマ基盤だけを残した。`App.tsx` は v2.0 の最小プレースホルダに退避（足場が緑）。
v2.0 の本実装（データ層・設定・ゲームコア・タブ・履歴 …）は **S2 以降**で構築する。

### 0.2 起動・テスト・ビルドコマンド（v2.0）

```bash
cd /Users/np_202212_11/projects/gabor3
npm install                    # 依存解決（初回のみ）

npm test                       # Jest 全テスト（7 スイート / 46 件 PASS）
npx tsc --noEmit               # 型検査（エラー 0）
npm run build:web              # 本番 Web バンドル → dist/（PASS）
npx serve -s dist -l 4599      # dist を HTTP 配信して動作確認（dev サーバー代替）
```

dev サーバーを直接使う場合は `npm run web`。macOS で `EMFILE` が出たら
**`npm run build:web` → `npx serve -s dist`** に切り替える（CLAUDE.md §6 フォールバック）。

### 0.3 現在のエントリと足場（S1 後）

- **エントリ**：`App.tsx` → `SafeAreaProvider` → `ThemeProvider` → 最小プレースホルダ画面（`GaborEye / v2.0 / 準備中`）。S2 以降でボトムタブ構成へ置換する
- **テスト設定**：`package.json` の `jest` ブロック（preset: `jest-expo`、`jest.setup.ts` で safe-area mock）。`testMatch` は `tests/**` と `src/**/*.test.ts(x)`
- **型設定**：`tsconfig.json`（strict、パスエイリアス `@/` `@components/` 等、`app.json` の `experiments.tsconfigPaths` で Metro 解決）
- **音抽象**：`expo-audio` / `expo-haptics` プラグイン導入済み（F-14 / S9 で利用予定。S1 では v1.2 の `src/platform/audio.ts` 抽象は撤去済み）

### 0.4 S1 で残した「流用基盤」（v2.0 で再利用）

| ファイル | 役割 | v2.0 での使途 |
|---|---|---|
| `src/components/GaborPatch.tsx` | ガボール単一描画（cpd / orientationDeg / contrast / sigma を props 受け、NF-27/28 クリッピング品質） | S3/S4 の n×n 格子・回転＋周波数変化の描画土台 |
| `src/lib/gaborPixels.ts` | 純 JS で RGBA バッファ → BMP data URL | GaborPatch の内部計算 |
| `src/lib/calibration.ts` | cpd→px・ppd・推奨パッチサイズ・device 推定 | 視聴距離 → 表示サイズ算定（F-13 / 描画） |
| `src/theme/tokens.ts` | デザイントークン（色・タイポ・spacing・tapTarget・countdown / resultBadge 色 等。v2.0 確定値） | 全画面のスタイル基盤 |
| `src/theme/ThemeProvider.tsx` | ダークモード（system/light/dark）解決 Context。`DarkModePreference` を tokens.ts へ移設し自己完結化 | F-13 ダークモード即時切替 |
| `src/theme/focusStyle.ts` | Web `focus-visible` 3px outline ヘルパー（NF-9） | a11y（S10） |
| `src/i18n/`（index + ja） | `t / tArray / interpolate` の i18n キー基盤（AS-20）。`ja.ts` は最小辞書にリセット | 各スプリントで v2.0 文言を再投入 |

### 0.5 S1 で撤去したもの（v1.x 完全リタイア、spec.md §10）

- **A. v11 ツリー（v1.1/v1.2）**：`src/screens/v11/` / `src/components/v11/` / `src/components/v12/` / `src/lib/v11/` / `src/navigation/v11/` / `src/i18n/v11/` / `src/hooks/v11/`
- **B. v1 最初期ツリー**：`src/screens/*.tsx`（全 14 画面）/ `src/screens/Onboarding/` / `src/navigation/AppRouter.tsx`
- **v1.x lib（流用基盤以外）**：`game1/2/3` / `staircase` / `badges` / `streak` / `v1score` / `dailyBest` / `weeklyStats` / `gaborOrientations` / `keyboardShortcuts` / `motion` / `appState` / `audio` / `haptics`
- **v1.x state**：`src/state/storage.ts` / `storage-v11.ts` / `gameIds-v11.ts` / `gameRegistry.ts`（S2 で `gaboreye:v2:*` 名前空間として新規構築）
- **v1.x components（GaborPatch 以外の全 28 個）**：Button / Toggle / DisclaimerSheet / GaborGrid / GaborMask / ClockAnswerButtons / V1ScoreChart / StreakBadge … 等
- **`src/platform/audio.ts`**：F-14（S9）で `../rapidreading2/src/platform/audio.ts` 抽象を流用予定のため一旦撤去
- **テスト**：`tests/v11/`（78）・`tests/lib/`・`tests/screens/`・v1.x component テスト・`tests/staircase|storage|i18n/ja` を削除。残置は 7 スイート（sanity / theme / calibration / gaborPixels / GaborPatch / ThemeProvider / focusStyle）

### 0.6 ハウスキーピング（S1）

- ルート直下の作業用 `build-*.apk`（66MB）と手動スクショ `*.png`（117 枚）は **git 未追跡**。誤コミット防止のため `.gitignore` に `/build-*.apk` / `/*.apk` / `/*.png` / `/*.jpg` / `/*.jpeg` を追記（**削除はしていない＝ユーザー資産を保持**）。`docs/` 配下の QA スクショ（追跡済み）は対象外で継続追跡。

---

## 0-S2. Sprint 2 — データ層・設定（F-13・F-11・データモデル §6）（2026-05-30）

### S2.1 結論

| 項目 | 状態 | 備考 |
|---|---|---|
| `npm test`（Jest） | **緑（全 PASS）** | **13 スイート / 100 件 PASS**（S1=46 → +54）。新規：`tests/state/*`（repository 11 / migration 12 / settings 12 / dataReset 4 ＝ 39）+ `tests/components/v2/settingsControls`（8）+ `tests/screens/v2/SettingsScreen`（7） |
| `npx tsc --noEmit` | **エラー 0** | strict |
| `npm run build:web` | **PASS** | `AppEntry-*.js` ≈ 393 kB（App.tsx が起動マイグレーション + SettingsScreen を含む） |
| Expo SDK | 54 系維持 | — |

### S2.2 追加したデータ層（`src/state/`、`gaboreye:v2:*` 名前空間）

| ファイル | 役割 |
|---|---|
| `schema.ts` | §6 全型（UserProfile/Settings/RoundRecord/SessionRecord/DailyStats/Streak/PlayStats/BadgeStatus）+ 列挙 + パラメータ可動範囲 `PARAM_SPECS`（system §9.1）+ 既定値ファクトリ。漸進難化用の任意フィールド（`progressiveModeEnabled`/`progressionState`）を Settings に残置（§6.2） |
| `keys.ts` | `gaboreye:v2:*` キー定義（§6.10） |
| `store.ts` | AsyncStorage 低レベル JSON 読み書き（破損時フォールバック） |
| `repository.ts` | 各レコードの型付き load/save（単一 + コレクション） |
| `migration.ts` | **F-11** 起動時データリセット。旧名前空間（v1/v1.1/v1.2）検出・消去 → v2 初期化。`shouldShowNotice`（消去あり ∧ 未通知）を返す。`acknowledgeResetNotice()` で 1 度だけ化 |
| `settings.ts` | **F-13** 範囲制約付き setter（`clampToSpec`）+ 採点方式/列挙妥当化 + `updateSettings`（即時永続化） |
| `dataReset.ts` | **F-13** 全データ削除（v2 全消去 → 既定再初期化。リセット通知フラグは保持し再通知させない） |

### S2.3 追加した UI

| ファイル | 役割（components.md） |
|---|---|
| `src/components/v2/Toggle.tsx` | FT-1。ON/OFF + テキスト併記（NF-12） |
| `src/components/v2/SegmentedControl.tsx` | FT-3。n/視聴距離/ダーク/片眼の択一 |
| `src/components/v2/Slider.tsx` | FT-2。m/r/a/b。−/＋ステッパ式（依存追加なし・Web Tab/Enter 可）。a/b は難→易ヒント |
| `src/components/v2/SettingRow.tsx` | SR-1（56pt 以上）+ グループ見出し |
| `src/components/v2/ConfirmDialog.tsx` | DG-1。全データ削除 2 段階目 |
| `src/components/v2/DataResetNotice.tsx` | RZ-1。F-11 通知（OK 64pt） |
| `src/screens/v2/SettingsScreen.tsx` | F-13 設定タブ本体（S2-1）。n/m/r/a/b・採点方式①②③・視聴距離・ダーク・音/振動・片眼・免責入口・全データ削除・バージョン/同意日時 |

### S2.4 起動フロー（暫定、App.tsx）

1. `runStartupMigration()` で旧データ消去 + v2 初期化
2. `loadSettings()` の `darkMode` を `ThemeProvider` に反映
3. `shouldShowNotice` なら `DataResetNotice` を 1 度だけ表示（OK → `acknowledgeResetNotice()`）
4. `SettingsScreen` を単体表示（**ボトムタブ統合は S5**）

> 視聴距離は `UserProfile`、その他は `Settings` に保存（各変更で即時保存・F-13）。

---

## 0-S3. Sprint 3 — ゲームコア：変化検出ロジック（F-01・F-02・F-04）（2026-05-30）

### S3.1 結論

| 項目 | 状態 | 備考 |
|---|---|---|
| `npm test`（Jest） | **緑（全 PASS）** | **19 スイート / 180 件 PASS**（S2=100 → **+80**）。新規：`tests/lib/v2/*`（rng 10 / patch 13 / roundGen 19 / scoring 24 / gameMachine 21 ＝ 87）+ `tests/state/sessionRecorder`（7） |
| `npx tsc --noEmit` | **エラー 0** | strict |
| `npm run build:web` | **PASS** | `AppEntry-*.js` ≈ 393 kB（S3 は純ロジックで App.tsx 未配線のためサイズ据置。ゲーム画面への配線は S4） |
| Expo SDK | 54 系維持 | — |

### S3.2 範囲（ロジック層に集中）

S3 は**描画に依存しない純関数 + reducer**のみ。ガボール実描画・回転/周波数アニメ・✅/❌ オーバーレイの見た目・m 秒カウントダウン UI は **S4**。

### S3.3 追加したロジック層（`src/lib/v2/`）

| ファイル | 役割 |
|---|---|
| `rng.ts` | 注入可能 PRNG（mulberry32）。`Rng = () => number` を外部注入してテスト決定論を確保。本番は `Math.random` |
| `patch.ts` | `PatchDef` 型 + 時刻 t の `patchOrientationAt(t)` / `patchCpdAt(t)`（**S4 描画入力**）。CW/CCW・増/減・0–180 正規化・cpd 物理下限 |
| `roundGen.ts` | n×n 格子生成。個数 1〜floor(n²/3)・0なし・少なめ寄り（調和減衰）、種類割当（回転40/周波数40/両方20）、回転/周波数方向独立ランダム、静止/変化の初期角度等分・初期 cpd 2.0–4.0 |
| `scoring.ts` | `scoreRound`（TP/FP/FN・TP−FP）/ `isAllCorrect`（方式③）/ `computeSessionScore`（0〜100、FP_PENALTY=50）/ `toRoundRecord` |
| `gameMachine.ts` | `initGame` / `gameReducer(state, event, rng)`。3 採点方式の状態機械・ラウンド→セッション進行・スコア確定 |

### S3.4 追加した状態層（`src/state/`）

| ファイル | 役割 |
|---|---|
| `sessionRecorder.ts` | 完了セッションを `SessionRecord`（§6.4）へ組み立て・S2 repository で永続化。`paramsSnapshot` 記録。中断（completedAt=null）は受け取らない（F-07） |

### S3.5 採点 3 方式の動作（reducer イベント）

- **方式①auto-no-confirm**：`TIMEOUT` のみで採点。`CONFIRM` は無視。
- **方式②auto-confirm**：`TIMEOUT` または `CONFIRM` で採点。
- **方式③all-correct-advance**：`TOGGLE` で全問正解（FP=0∧FN=0∧変化>0）になった瞬間に即採点（`advancedByAllCorrect=true`）。または `TIMEOUT` で強制採点。`CONFIRM` 無視。
- 全方式共通：未選択のまま `TIMEOUT` でも採点（TP=0/FP=0）。`revealed` 中の `TOGGLE` は無効（採点後の選択変更防止）。

### S3.6 S4 への申し送り

- m 秒タイマー駆動・経過秒 t の供給・`patchOrientationAt(t)`/`patchCpdAt(t)` 消費は **S4**。reducer は時刻非依存で `TIMEOUT` を受けるだけ。
- 静止角度マージンは「達成可能な最大の最小ギャップ（完全等分）」で実装（n≥4 では 12° を全ペアで満たせないため）。詳細は `docs/sprints/sprint-3-self-review.md` §4-1。
- `sessionId`/`startedAt`/`completedAt` は呼び出し側（S4/S6）が uuid + 現在時刻で供給。
- 日次集計・ストリーク・バッジ・音/ハプティクスは S7/S8/S9（S3 では未着手）。

---

## 0-S4. Sprint 4 — ゲーム描画・結果開示 UI（F-01 描画・F-03・F-12）（2026-05-31）

### S4.1 結論

| 項目 | 状態 |
|---|---|
| `npm test`（Jest） | **緑（全 PASS）**：24 スイート / **240 件**（S3=180 → +60） |
| `npx tsc --noEmit` | **エラー 0** |
| `npm run build:web` | **PASS**（web bundle ≈ 394 kB） |
| Expo SDK | 54 系維持。**native 依存追加なし**（Skia 等を入れていない） |

### S4.2 新規ファイル

ロジック（1）：
- `src/lib/v2/gameView.ts`（カウントダウン色段階 / aria-live / 結果マーク分類 / 総合判定 / cpd 量子化）

UI コンポーネント（7）：
- `src/components/v2/CountdownTimer.tsx`（CD-1 / F-12）
- `src/components/v2/GameTopBar.tsx`（GB-1）
- `src/components/v2/GaborPatchCell.tsx`（GG-2、既存 `GaborPatch` をラップ）
- `src/components/v2/GaborGrid.tsx`（GG-1、レイアウト算出を純関数 export）
- `src/components/v2/ResultMark.tsx`（OV-2）
- `src/components/v2/AggregateResultBadge.tsx`（OV-3）
- `src/components/v2/ResultOverlayLayer.tsx`（OV-1）
- `src/components/v2/ConfirmButton.tsx`（BN-1 / 方式②）

配線（2）：
- `src/hooks/v2/useGameTimer.ts`（rAF 経過秒駆動 + 残り秒 + TIMEOUT 発火、setInterval フォールバック）
- `src/screens/v2/GameScreen.tsx`（gameMachine + タイマー + 描画 + 開示を配線。`onAbort`/`onSessionComplete` 委譲）

テスト（5）：
- `tests/lib/v2/gameView.test.ts`
- `tests/hooks/v2/useGameTimer.test.tsx`
- `tests/components/v2/gameComponents.test.tsx`
- `tests/components/v2/ResultOverlayLayer.test.tsx`
- `tests/screens/v2/GameScreen.test.tsx`

ドキュメント（1）：
- `docs/sprints/sprint-4-self-review.md`（v2.0 で上書き）

### S4.3 更新ファイル

- `src/theme/tokens.ts`（`countdownV2` / `resultV2` / `selectionV2` トークン追加、system §1.4）
- `src/i18n/ja.ts`（`game.*` / `result.*` キー追加）

### S4.4 描画戦略（S1 申し送りへの回答）

- **回転（a deg/sec）**：`GaborPatch` の transform 回転（BMP 再計算ゼロ）。t から `patchOrientationAt(t)` を渡すのみ。
- **空間周波数（b hz/sec）**：`quantizeCpd(step=0.25)` で cpd を量子化し、`GaborPatch` の useMemo が刻みを
  またいだときだけ BMP 再生成（スロットリング）。最速 b=0.40 でも約 0.6 秒に 1 回。
- **Expo Go 互換維持**：既存 BMP→`<Image>` + transform + cpd スロットルのみ。NF-1（30fps 最低許容）達成可能と判断。

### S4.5 GameScreen の使い方（S5/S6 接続用）

```tsx
<GameScreen
  config={{ gridSize, roundSeconds, roundCount, rotationSpeed, sfChangeSpeed, scoringMode }}
  viewingDistanceCm={40}
  onAbort={() => {/* S5：中断確認ダイアログ */}}
  onSessionComplete={(state) => {/* S6：セッション結果カード + sessionRecorder で永続化 */}}
/>
```

- 開示遷移：方式①② = `REVEAL_INTERVAL_MS`(1500ms)、方式③全問正解即遷移 = `ALL_CORRECT_FEEDBACK_MS`(600ms)。
- 中断ダイアログ・タブバー・セッション記録は S5/S6 で接続（本スプリントはコールバック委譲のみ）。

### S4.6 S5/S6 への申し送り

- GameScreen はまだ `App.tsx` から到達不可（S5 タブナビ・S6 起動フローで接続）。**実描画スクリーンショット確認は接続後に推奨**。
- `onSessionComplete(state)` の `state.roundScores` を `src/state/sessionRecorder.ts` の `persistCompletedSession` に渡して永続化（S6）。
- 音/ハプティクス（ティック・正解/不正解音）は S9 で接続。本スプリントは無音。

---

## 0-S6. Sprint 6 — ホームタブ・起動フロー・免責（F-08・F-06・F-10）（2026-05-31）

### S6.1 結論

| 項目 | 状態 |
|---|---|
| `npm test`（Jest） | **緑（全 PASS）**：33 スイート / **297 件**（S5=256 → +41） |
| `npx tsc --noEmit` | **エラー 0** |
| `npm run build:web` | **PASS**（web bundle ≈ 588 kB） |
| Expo SDK | 54 系維持。**native 依存追加なし** |

### S6.2 起動フローと体験（F-06/F-08）

```
起動 → F-11 マイグレーション（S2）→ プロフィール読込
  → 初回（onboardingCompleted=false）：オンボーディング 4 ステップ（S6-1）
  → 距離リマインド（S6-2、3 秒カウントダウン自動進行）
  → ホームで自動開始（GameScreen / S4）
  → r ラウンド完了 → セッション結果カード（RC-1 / S6-3）
  → 「もう一度」→ 距離リマインドへ戻り再プレイ（回数制限なし）
2 回目以降：起動 → 距離リマインド → 自動開始（オンボなし）
```
- クールダウン画面は無し（廃止、F-06）。
- ホームタブは 3 フェーズ：`distance`（距離リマインド）/ `playing`（ゲーム）/ `result`（結果カード）。
  `distance`・`result` は非進行＝タブ自由遷移、`playing` のみ中断ダイアログ対象（F-05/F-07）。

### S6.3 新規ファイル

ロジック（2）：
- `src/lib/v2/dateUtil.ts`（端末ローカル日付 YYYY-MM-DD / 日数差。日付注入でテスト可能、AS-20）
- `src/lib/v2/statsAggregation.ts`（DailyStats max / Streak 連続日数 / PlayStats 累計の純関数）

データ配線（1）：
- `src/state/statsRecorder.ts`（完了セッション永続化 + 日次/ストリーク/累計更新の I/O 束ね）

UI コンポーネント（2）：
- `src/components/v2/DisclaimerPanel.tsx`（DC-1 / F-10。オンボ初回と設定再閲覧で共用）
- `src/components/v2/SessionResultCard.tsx`（RC-1 / F-08・F-04）

画面（2）：
- `src/screens/v2/OnboardingScreen.tsx`（ON-1 / S6-1。4 ステップ・合計タップ ≤6）
- `src/screens/v2/DistanceReminderScreen.tsx`（DR-1 / S6-2。CountdownTimer large 自動進行）

テスト（6）：
- `tests/lib/v2/dateUtil.test.ts`
- `tests/lib/v2/statsAggregation.test.ts`
- `tests/state/statsRecorder.test.ts`
- `tests/screens/v2/OnboardingScreen.test.tsx`
- `tests/screens/v2/DistanceReminderScreen.test.tsx`
- `tests/components/v2/SessionResultCard.test.tsx`
- `tests/screens/v2/startupFlow.test.tsx`（起動フロー統合）

ドキュメント（1）：
- `docs/sprints/sprint-6-self-review.md`（v2.0 で上書き）

### S6.4 更新ファイル

- `src/screens/v2/AppRoot.tsx`（ホーム 3 フェーズ化・距離リマインド/結果カード配線・完了時の永続化+集計配線。`initiallyPlaying` を `initialHomePhase` に置換）
- `App.tsx`（オンボーディングゲート・UserProfile 保存・免責再閲覧モーダル追加）
- `src/i18n/ja.ts`（`onboarding.*` / `disclaimer.*` / `distance.*` / `home.result_*`・`replay`・`streak_*` キー追加）
- `tests/screens/v2/AppRoot.test.tsx`（S5 から起動フロー対応に更新）

### S6.5 撤去ファイル

- `src/screens/v2/HomeWaitingScreen.tsx`（S5 暫定の手動開始 CTA。S6 の自動開始フローに置換され不要化）

### S6.6 S7/S8 への申し送り

- **S7 履歴**：`statsRecorder` が更新する DailyStats（max・件数）/ Streak（連続日数）/ PlayStats（累計）を集計元にする。日次スコア折れ線・連続日数・累計プレイ回数。
- **S8 バッジ**：完了時のバッジ判定は本スプリント未配線。`recordCompletedSession` の戻り値（session/streak/dailyStats/playStats）を判定入力にできる。バッジ獲得演出は `SessionResultCard` 上に重畳（点滅なし、設計済みの空き領域あり）。
- **S9 音/ハプティクス**：距離リマインドのティック・セッション完了音は未配線。`CountdownTimer` / 完了 effect に接続予定。

---

## 0-S7. Sprint 7 — 履歴タブ・進捗グラフ（F-09 グラフ部・DailyStats/Streak/PlayStats 集計）（2026-05-31）

### S7.1 結論

| 項目 | 状態 |
|---|---|
| `npm test`（Jest） | **緑（全 PASS）**：38 スイート / **341 件**（S6=297 → +44） |
| `npx tsc --noEmit` | **エラー 0** |
| `npm run build:web` | **PASS**（web bundle ≈ 601 kB） |
| Expo SDK | 54 系維持。**native 依存追加なし**（react-native-svg を採用せず View ベースで折れ線描画） |

### S7.2 体験（F-09 グラフ部）

履歴タブ（`HistoryScreen`、`HistoryPlaceholderScreen` を置換）が表示する：
- **日次スコア折れ線**：永続化済み `DailyStats.bestSessionScore`（§6.5 で同日 max 確定済み）を
  日付昇順・直近 30 日窓でプロット。当日点は赤 + ◆ 形で強調（他日は青 + ● 円。色 + 形で非依存、NF-12）。
- **連続日数**（`Streak.currentStreak`、🔥 + 数値 48px）/ **累計プレイ回数**（`PlayStats.totalSessions`）を StatTile ×2。
- **データ 7 日未満**は「もう少しデータが集まると傾向が見えます」案内（EmptyState）。StatTile は 0 でも実値表示。
- **完全初期（0 セッション）**：空グラフ（代替テキスト「まだ日次スコアのデータがありません」）+ 連続 0 日 / 累計 0 回 + 案内。
- バッジ領域は **S8 用のプレースホルダ**（見出し「バッジ」+ プレースホルダカード）で場所だけ確保。

### S7.3 グラフ描画手段の選択理由（Expo Go / SDK 54 互換）

- `react-native-svg` は **未インストール**（native モジュール）。Expo Go / SDK 54 互換を確実に保つため**採用しない**。
- 折れ線は **View ベース**で描画：座標計算を純関数 `lib/v2/chartGeometry.ts`（Y 軸 0〜100 マッピング・X 軸等間隔・
  線分の長さ/角度）に分離し、`LineChart` は絶対配置 View（点）+ `rotateZ` + `transformOrigin:'left center'`（線分）で描く。
- 描画アニメーションなし（静的描画）＝ reduced-motion を自然に満たす（NF-13）。点滅なし（NF-11）。
- `transformOrigin` は RN 0.74+（本プロジェクト 0.81）でサポート。`npm run build:web` で検証済み。

### S7.4 新規ファイル

ロジック（2）：
- `src/lib/v2/historyView.ts`（DailyStats → 折れ線系列。直近 N 日窓・当日強調・データ少時閾値。today 注入でテスト可能）
- `src/lib/v2/chartGeometry.ts`（折れ線の座標計算。SVG 非依存・View 描画の土台）

UI コンポーネント（3）：
- `src/components/v2/LineChart.tsx`（CH-1 / F-09。View ベース折れ線・軸ラベル 24px・当日 ◆ 強調・aria 要約）
- `src/components/v2/StatTile.tsx`（ST-1 / F-09。連続日数 🔥 / 累計回数の数値タイル）
- `src/components/v2/EmptyState.tsx`（EM-1 / F-09。データ少時案内）

画面（1）：
- `src/screens/v2/HistoryScreen.tsx`（S7-1。`HistoryPlaceholderScreen` を置換。now 注入で日付決定論）

テスト（5）：
- `tests/lib/v2/historyView.test.ts`（19 件：系列変換・同日 max・窓・当日強調・閾値・要約）
- `tests/lib/v2/chartGeometry.test.ts`（10 件：Y/X マッピング・線分・当日フラグ）
- `tests/components/v2/StatTile.test.tsx`（3 件）
- `tests/components/v2/LineChart.test.tsx`（6 件：要約・空・軸・当日点）
- `tests/screens/v2/HistoryScreen.test.tsx`（8 件：グラフ要約・StatTile・閾値・初期・バッジ枠）

### S7.5 更新ファイル

- `src/screens/v2/AppRoot.tsx`（history タブを `HistoryScreen` に差し替え、`now` を伝播）
- `src/i18n/ja.ts`（`history.*` 本実装キー・`common.loading`/`common.load_error` 追加）
- `src/theme/tokens.ts`（`Colors` に `streakFlameFg`/`streakFlameBg` を公開＝StatTile 炎色。トークン定義値の追加なし）

### S7.6 申し送り

- **S8 バッジ**：`HistoryScreen` のバッジ見出し下プレースホルダ（`*-badges-placeholder`）を本実装（BadgeCell 一覧）に置換する。
- グラフは ScrollView 内の最初の領域。バッジ一覧はその下に続く想定（screens.md S7-1）。
- `color.score.line` = `actionPrimary`、`color.score.point.today` = `semanticError`（既存トークンを利用、新規色なし）。

---

## 0-S8. Sprint 8 — バッジ（F-09 バッジ部・§5 3 軸 11 バッジ・BadgeStatus）（2026-05-31）

### S8.1 結論

| 項目 | 状態 |
|---|---|
| `npm test`（Jest） | **緑（全 PASS）**：43 スイート / **402 件**（S7=341 → +61） |
| `npx tsc --noEmit` | **エラー 0** |
| `npm run build:web` | **PASS**（web bundle ≈ 614 kB） |
| Expo SDK | 54 系維持。**native 依存追加なし**。スキーマ（§6.8 BadgeStatus）変更なし（既存定義を使用） |

### S8.2 体験（F-09 バッジ部 / §5.4）

- セッション完了時に **3 軸 11 バッジ**（継続日数 B-01〜05 / 高難度 B-06〜08 / 高スコア B-09〜11）の付与判定が走る。
- **履歴タブ**のバッジ見出し下に全 11 バッジを 2 列（広幅 3 列）グリッドで一覧表示。
  - 獲得＝🏅 フルカラー枠 + 名称 + 獲得日、未獲得＝🔒（形で区別、NF-12）+ 名称 + 条件ヒント。
  - セルタップで条件全文を展開／折りたたみ。
  - B-11 のヒントは「スコア 80 以上をあと {n} 回で獲得」を残り回数で動的展開。
- **獲得演出**：セッション結果カード上層に `BadgeAwardToast` を中央上に重畳。拡大 + フェードのみ（点滅なし NF-11、
  reduced-motion 時は静的表示）。複数同時獲得は 1 トーストに名称列挙（合計時間が伸びない）。`aria-live` で読み上げ。
  「もう一度」操作を妨げない（`pointerEvents: none`）。新セッション開始時に演出をリセット（1 度だけ）。

### S8.3 判定ロジック（純関数・テスト可能）

- 高難度閾値（screens.md S8 / system §9.2）：**a ≤ 3 °/sec を「遅い」、b ≤ 0.10 hz/sec を「小さい」**。
  - B-06：a ≤ 3 かつセッション全問正答（全ラウンドで FN=0 & FP=0、変化パッチ ≥ 1）。
  - B-07：b ≤ 0.10 かつ全問正答。
  - B-08：a ≤ 3 かつ b ≤ 0.10 かつ sessionScore ≥ 80（高スコア。全問正答は不要）。
- 高スコア：B-09 score ≥ 80 / B-10 score = 100 / B-11 score ≥ 80 を累計 5 セッション。
- 継続：B-01 連続 1（初回完了）/ B-02 3 / B-03 7 / B-04 14 / B-05 30 日（>= 判定）。
- 連続日数・高スコア累計は `BadgeContext` で**注入**（日付依存をテスト決定論化）。
  既獲得は `earnedAt` を保持し**二重獲得しない**。

### S8.4 配線（完了時）

- `recordCompletedSession`（`statsRecorder`）が SessionRecord 永続化 + Streak 更新の**後**に
  `recordBadgesForSession`（`badgeRecorder`）を呼ぶ。戻り値に `badges` / `newlyEarnedBadges` を追加。
- B-11 の高スコア累計は**永続済み全セッション**（完了済み・score ≥ 80）から算出（`countHighScoreSessions`）。
  今回セッションは既に永続化済みのため累計に含まれる。
- `AppRoot.handleSessionComplete` が `newlyEarnedBadges` を `SessionResultCard` へ渡す。

### S8.5 S9（音・ハプティクス）への接続点

- `BadgeAwardToast` は表示開始時に `onShown(badgeIds)` を **1 度だけ**呼ぶ（音/ハプティクスは発火しない＝責務分離）。
- `SessionResultCard` は `onBadgeShown` プロップで上位へ中継。S9 はここに badge.mp3 + heavy/medium ハプティクスを配線する。

### S8.6 新規ファイル

ロジック（3）：
- `src/lib/v2/badgeDefinitions.ts`（B-01〜11 定義・閾値定数・id 索引）
- `src/lib/v2/badges.ts`（`evaluateBadges` / `meetsBadgeCondition` / `isSessionPerfectClear` / `remainingForStableHighScore`）
- `src/lib/v2/badgeView.ts`（一覧表示モデル `buildBadgeRows`・獲得日整形・B-11 残り回数展開・`earnedCount`・`resolveBadgeNames`）

永続化配線（1）：
- `src/state/badgeRecorder.ts`（`recordBadgesForSession` / `countHighScoreSessions`。repository の load/save を使用）

UI コンポーネント（3）：
- `src/components/v2/BadgeCell.tsx`（BG-1。獲得/未獲得 + 鍵アイコン + ヒント + 展開）
- `src/components/v2/BadgeGrid.tsx`（一覧グリッド・レスポンシブ 2/3 列・role=list）
- `src/components/v2/BadgeAwardToast.tsx`（BG-2。拡大+フェード・点滅なし・reduced-motion 静的・aria-live・onShown）

テスト（5 新規 + 既存 2 拡張）：
- `tests/lib/v2/badges.test.ts`（31 件：各バッジ境界・全問正答・二重獲得しない・複数同時・B-11 累計）
- `tests/lib/v2/badgeView.test.ts`（11 件：行整形・獲得日・B-11 残り回数・earnedCount・名称解決）
- `tests/state/badgeRecorder.test.ts`（10 件：完了配線・付与/保存・二重獲得しない・B-11 5 回目・高スコア累計集計）
- `tests/components/v2/BadgeCell.test.tsx`（7 件：獲得/未獲得表示・aria・展開）
- `tests/components/v2/BadgeAwardToast.test.tsx`（5 件：名称表示・複数列挙・空非表示・onShown 1 度）
- `tests/components/v2/SessionResultCard.test.tsx`（+3：演出重畳・空非表示・onBadgeShown 1 度）
- `tests/screens/v2/HistoryScreen.test.tsx`（+2：全 11 セル表示・初期全未獲得）

### S8.7 更新ファイル

- `src/state/schema.ts` — **変更なし**（BadgeId / BadgeStatus / defaultBadgeStatus は既存）。
- `src/state/repository.ts` — **変更なし**（badge load/save は既存）。
- `src/state/statsRecorder.ts`（`CompletedSessionResult` に `badges`/`newlyEarnedBadges` 追加・バッジ配線）
- `src/screens/v2/AppRoot.tsx`（`newlyEarnedBadges` 状態・結果カードへ伝播・新セッションでリセット）
- `src/components/v2/SessionResultCard.tsx`（`newlyEarnedBadges`/`onBadgeShown` プロップ・`BadgeAwardToast` 重畳）
- `src/screens/v2/HistoryScreen.tsx`（プレースホルダを `BadgeGrid` に置換・バッジ/全セッション読み込み）
- `src/i18n/ja.ts`（`badge.*` キー・`history.badges_empty` 追加）

### S8.8 受け入れ基準マッピング（§5.4 / F-09 バッジ部）

| 基準 | 対応 |
|---|---|
| 各バッジ獲得条件を満たすと付与 | `evaluateBadges`（badges.test.ts 全境界） |
| 獲得時に短時間・点滅なしの演出を結果で 1 度 | `BadgeAwardToast`（拡大+フェード・reduced-motion 静的・AppRoot で 1 度リセット） |
| 履歴一覧で獲得/未獲得確認・未獲得にヒント | `BadgeGrid`/`BadgeCell`（HistoryScreen.test.tsx） |
| 獲得時に音+ハプティクス（個別 OFF 可・S9） | `onShown`/`onBadgeShown` 発火点を用意（実発火は S9） |
| 旧バッジ（ゲーム依存）は存在しない | 定義は §5 の 11 種のみ。旧バッジ参照なし |

### S8.9 既知の懸念・申し送り

- **音/ハプティクスは未発火**：S8 は接続点（`onShown`/`onBadgeShown`）のみ。S9 で badge.mp3 + heavy/medium を配線。
- 視覚確認は RNTL（react-native-web レンダリング）+ `npm run build:web` で担保。Playwright スクリーンショットは
  本スプリントでは未取得（MCP 起動はオーケストレーター側で実行可能）。実機/Web の見た目最終確認は S10 仕上げで推奨。
- 未獲得セルのグレースケール表現は `opacity: 0.85` + 🔒 + ヒントテキスト（色のみ非依存、NF-12 充足）。
  もし視覚コントラストが弱い場合は S10 で彩度低減を強める余地あり（判定・a11y には影響しない）。

---

## 0-S9. Sprint 9 — 音・ハプティクス（F-14・NF-31〜33）（2026-05-31）

### S9.1 結論

| 項目 | 状態 |
|---|---|
| `npx tsc --noEmit` | **エラー 0** |
| `npm test`（Jest） | **緑：48 スイート / 439 件 PASS**（S8 後 402 → +37 件） |
| `npm run build:web` | **PASS**（AppEntry ≈ 671 kB。assets に audio 5 件がバンドル） |
| Expo SDK | 54 系維持（expo-audio ~1.1.1 / expo-haptics ~15.0.8） |

### S9.2 アーキテクチャ（3 層分離）

1. **プラットフォーム抽象（副作用層）**
   - `src/platform/audio.ts`：`AudioBackend`（`prime`/`play(kind,volume)`/`stop`/`isAvailable`）。
     Web=Web Audio API の OscillatorNode で 5 音種を合成（音源ファイル不要）。Native=expo-audio で
     `assets/audio/<kind>.mp3` を 5 プレイヤーで再生。`getDefaultAudioBackend()`（Platform 分岐・キャッシュ）/
     `setDefaultAudioBackend()`（テスト差し替え）。
   - `src/platform/haptics.ts`：`HapticsBackend`（`trigger(kind)`/`isAvailable`）。Native=expo-haptics
     `impactAsync`（light/medium、badge=heavy→medium の 2 連）。Web=Noop。同じく get/set Default。
2. **決定（純関数）**：`src/lib/v2/feedback.ts` の `decideFeedback(event, settings, silent)` が
   「イベント × soundEnabled × hapticsEnabled × サイレント」→ 鳴らす音種・音量・振動種を返す。副作用なし。
3. **配線（コントローラ）**：`src/hooks/v2/useFeedback.ts` が決定と再生を橋渡し（`emit(event)`）。
   初回マウントで `audio.prime()`。AppRoot が 1 インスタンスを保持し GameScreen / 結果カードへ配る。

### S9.3 発火点（system §10.1 / screens.md S9）

| イベント | 配線箇所 | 音 | ハプティクス |
|---|---|---|---|
| ラウンド正解（総合 ✅） | `GameScreen` 開示 effect（`aggregateKind`） | correct 60% | light |
| ラウンド不正解（総合 ❌） | 同上 | wrong 60% | medium |
| カウントダウン残り 3/2/1 秒 | `GameScreen` playing 中の remainingSec 監視（各秒 1 度） | tick 40/50/60% | なし |
| セッション完了 | `AppRoot.handleSessionComplete` | end 50% | なし |
| バッジ獲得 | `AppRoot.handleBadgeShown`（`SessionResultCard.onBadgeShown` 経由） | badge 70% | badge（heavy+medium） |

### S9.4 サイレントモード尊重（NF-33）

- iOS：`setAudioModeAsync({ playsInSilentMode: false })` により**サイレントスイッチ時は OS が音を抑止**。
  ハプティクスは OS サイレントの影響を受けず発火継続。Android は OS の着信音量に従う。
- `decideFeedback` も `silent` 引数で「音抑止・ハプティクス継続」を表現でき、テストで明示検証。
  実行時は OS の audio session に委ねるため `useFeedback` は `silent=false` を渡す。

### S9.5 実機（Expo Go）確認推奨項目

自動テストは「正しい kind で backend が叩かれる／OFF 時に叩かれない／試行中は採点 FB 以外を出さない」まで
配線検証済み。**実音・実振動の体感は実機でのみ確認可能**：

1. 正解 / 不正解で correct.mp3 / wrong.mp3 + light/medium 振動
2. カウントダウン残り 3-2-1 秒で tick.mp3（音量漸増、danger 赤転換と同期）
3. セッション完了で end.mp3
4. 初回完了など獲得時に badge.mp3 + heavy→medium 連続振動
5. iOS サイレントスイッチ ON：音なし・ハプティクスあり（NF-33）
6. 設定の音 OFF / 振動 OFF を個別に切替えて当該チャネルのみ無発火になること
7. NF-31 レイテンシ：タップ → 音まで体感遅延が無いこと（prime 済みのため 1 発目も実用範囲想定）

### S9.6 新規ファイル

- `src/platform/audio.ts`（効果音バックエンド）
- `src/platform/haptics.ts`（触覚バックエンド）
- `src/lib/v2/feedback.ts`（発火決定の純関数）
- `src/hooks/v2/useFeedback.ts`（決定 ↔ 再生の配線コントローラ）
- `tests/lib/v2/feedback.test.ts`（決定純関数 +16）
- `tests/platform/audio.test.ts`（音 backend +6）
- `tests/platform/haptics.test.ts`（触覚 backend +6）
- `tests/screens/v2/GameScreenFeedback.test.tsx`（採点 FB / ティック配線 +6）
- `tests/screens/v2/AppRootFeedback.test.tsx`（完了音 / バッジ / 個別 OFF +3）

### S9.7 更新ファイル

- `src/screens/v2/GameScreen.tsx`（`onFeedback` prop、開示時の正解/不正解発火、残り 3/2/1 秒ティック）
- `src/screens/v2/AppRoot.tsx`（`useFeedback` 配備、`onFeedback`/`onBadgeShown` 配線、完了音発火、テスト用 backend prop）
- `docs/run.md`（本セクション）

### S9.8 既知の懸念・申し送り

- **Web の音は合成音**：音源 mp3 は native 専用。Web は OscillatorNode で「上行 2 音」等を近似する
  （バンドル増を避けるため）。体感が native と微妙に異なるが、機能要件（鳴る/鳴らない）は満たす。
- **アセット欠落耐性**：native の `require('../../assets/audio/*.mp3')` は個別 try/catch。欠落・API 失敗でも
  silent fail しクラッシュしない（NoopAudioBackend / 個別プレイヤー null 保持）。`assets/audio/` に 5 mp3 存在を確認済み。
- **native API 混入監査（CLAUDE.md §5）**：`document`/`window`/`navigator` の直叩きなし。Web は `globalThis.AudioContext`
  を Platform=='web' 分岐内でのみ参照。expo-audio/expo-haptics の require は Native 分岐内で lazy。`Image` transform 等の
  メモ化問題は本スプリント無関係（描画変更なし）。
- **prime のタイミング**：マウント時に prime するが、Web の自動再生制限は厳密にはユーザージェスチャ内 prime が理想。
  起動フロー上ゲーム到達時点で既にタップを経ているため実用上問題ない想定。気になれば S10 で最初のタップ内 prime に移せる。

---

## 0-S10. Sprint 10 — 仕上げ（a11y・レスポンシブ・セーフエリア・全体結合）（2026-05-31）

> **このセクションが v2.0 リリース時点の最終状態**。起動・テスト・ビルド・既知の制約・実機確認事項は §0-S10 を参照。
> §1 以降（前提環境・EAS ビルド手順 等）は引き続き有効。§4.1 / §5 の旧「現在の状態」記述は歴史的記録（実際の最新は本節）。

### S10.1 結論（v2.0 完成状態）

| 項目 | 状態 | 備考 |
|---|---|---|
| `npx tsc --noEmit` | **エラー 0** | strict |
| `npm test`（Jest） | **緑：52 スイート / 462 件 PASS**（S9=439 → **+23**） | 新規：`tests/a11y/*`（ariaWeb 6 / webAriaComponents 4 / settingRow+SkipLink 6 ＝ 16）+ `tests/integration/s10FullFlow`（7） |
| `npm run build:web` | **PASS** | `AppEntry-*.js` ≈ 673 kB |
| Expo SDK | 54 系維持 | native 依存追加なし |
| version | **2.0.0** | `package.json` / `app.json` / `schema.APP_VERSION` を 2.0.0 に統一。設定タブに「バージョン v2.0.0 + 免責同意日時」表示（F-13） |

### S10.2 a11y 是正（NF-7〜15）

S10 評価で S10 送りにされた a11y Minor 4 点を是正：

| # | 対象 | 是正内容 |
|---|---|---|
| 1 | 採点方式ラジオ（設定タブ） | `SettingRow` に `radio`/`checked` を追加し `accessibilityRole="radio"` + `accessibilityState.checked`、Web へ `role="radio"` + `aria-checked` 透過。グループは `radiogroup`。SegmentedControl も `aria-checked` を出すよう補強 |
| 2 | Toggle（音/振動 ON/OFF） | `accessibilityRole="switch"` に加え Web へ `role="switch"` + `aria-checked` 透過 |
| 3 | 選択パッチ（GaborPatchCell） | `accessibilityRole="checkbox"` に加え Web へ `role="checkbox"` + `aria-checked` + `aria-disabled` 透過 |
| 4 | バッジセル（BadgeCell） | `accessibilityRole="button"` に加え Web へ `role="button"` + `aria-expanded` 透過 |

- **是正の要点**：react-native-web 0.21 の `createDOMProps` は `accessibilityState`（checked/expanded/selected）を
  DOM の `aria-*` へ自動透過**しない**（W3C プロパティ `aria-checked` 等のみ DOM へ写す）。
  そこで新ヘルパー `src/theme/ariaWeb.ts` の `webAria(role, state, label)` で **Web のときだけ** `role` + `aria-*` を
  明示スプレッドする方式に統一（Native は `accessibilityRole`/`State` が担うため空 props）。
  forwardedProps（RNW 本体）に `aria-checked`/`aria-expanded`/`aria-selected`/`aria-pressed`/`role` が含まれることを確認済み。
- **Skip link（NF-14）**：`src/components/v2/SkipLink.tsx` を新設（Web 専用、Native は `null`）。AppRoot 先頭に配置し
  `targetId="ge-main-content"` のメインコンテンツへフォーカス移動。通常は画面外退避、focus 時のみ左上に出る
  （`focusStyle.installFocusVisibleStyle` の大域 CSS に `[data-ge-skip-link]` ルールを追加）。
- **focus-visible（NF-9）**：S5 で導入済みの 3px ring（offset 2px）を継続（変更なし）。
- **reduced-motion（NF-13）**：`ResultOverlayLayer` / `BadgeAwardToast` が `AccessibilityInfo.isReduceMotionEnabled()`
  （RNW で `prefers-reduced-motion` にマップ）で装飾アニメを静的化済み。**ゲーム刺激の回転/周波数変化は抑制対象外**（NF-13 明記どおり）。
- 点滅なし（NF-11）/ 色のみ非依存（NF-12）は S4〜S8 で担保済み（カウントダウン色+太字、トグル位置+ON/OFF、当日点 ◆、バッジ 🔒）。

### S10.3 レスポンシブ（NF-21/22）

- 全タブ画面（ホーム/履歴/設定）は PC で最大幅中央寄せ、タブバーは全幅・各 48pt 以上。
- ゲーム格子は `computeGridEdge`（スマホ `min(short-32, 360)` / PC 480）で n=3/4/5 とも破綻なし。
- ダイアログ/カードは最大幅制約。360/375/1280px で本文 24px・操作要素 48pt 以上を維持。

### S10.4 セーフエリア（NF-29/30）

各画面の `edges` を点検（変更不要だったことを確認）：

| 画面 | 方式 | edges |
|---|---|---|
| ゲームプレイ中（S4） | フルスクリーン許容 | 背景 #808080 は全面。X/残り秒は `GameTopBar` が `useSafeAreaInsets` で top inset 内 |
| ホーム結果/履歴/設定 | セーフエリア準拠 | `['top','left','right']`（bottom はタブバーが inset 担保） |
| 距離リマインド/オンボ | セーフエリア準拠（タブバーなし全画面） | `['top','left','right','bottom']` |
| ボトムタブバー | — | `useSafeAreaInsets` で bottom inset パディング |
| 免責再閲覧モーダル（App.tsx） | — | `['top','bottom']` |

### S10.5 未参照コードの整理

- `src/screens/v2/HistoryPlaceholderScreen.tsx`（S5 仮置き、S7 で `HistoryScreen` に置換済み・どこからも import されず）を削除。
- `src/state/index.ts`（バレル、どこからも import されず）を削除。
- `src/theme/index.ts` は `tests/theme.test.ts` が import しているため**残置**。
- モジュール到達性は App.tsx を起点にした静的解析で確認（残る未到達ファイルは上記 2 件のみだった）。

### S10.6 CLAUDE.md §5 監査（Web 専用 API / Image transform）

- `document`/`window` 直叩きは `SkipLink.tsx`（`Platform.OS!=='web'` で早期 return + `typeof document` ガード）と
  `focusStyle.ts`（同様の二重ガード）のみ。Native ビルドに混入しない。
- `Image` transform メモ化：`GaborPatch` は transform を**ラッパ View** に当てる既存方式を維持（Android Fabric で
  Image 直 transform が更新されない問題の回避、S1〜既存）。本スプリントで描画ロジック変更なし＝回帰なし。
- 音/ハプティクスの Web/Native 分岐は S9 のまま（変更なし）。

### S10.7 全体結合テスト（新規 `tests/integration/s10FullFlow.test.tsx`）

- 方式②（auto-confirm）：距離リマインド → 自動開始 → 確定ボタン → 開示 → 完了 → 結果カード + 永続化。
- タブ切替：プレイ中の他タブ選択で中断ダイアログ（キャンセル=継続 / 確定=当該タブ着地・未記録）。idle はダイアログなしで自由遷移。
- 設定反映：`roundCount=2` で 1 ラウンド確定では完了しない（2 ラウンド必要）ことを確認。
- Skip link：Web で AppRoot 先頭に `role=link` 描画、Native では非描画。
- 方式①（auto-no-confirm）と方式③（all-correct-advance）は既存 `startupFlow` / `GameScreen.test` で網羅済み。

### S10.8 新規・更新ファイル

新規（4 src/test）：
- `src/theme/ariaWeb.ts`（`webAria` ヘルパー、NF-15）
- `src/components/v2/SkipLink.tsx`（NF-14）
- `tests/a11y/ariaWeb.test.tsx` / `tests/a11y/webAriaComponents.test.tsx` / `tests/a11y/settingRowRadioAndSkipLink.test.tsx`
- `tests/integration/s10FullFlow.test.tsx`

更新：
- `src/components/v2/{Toggle,SegmentedControl,GaborPatchCell,BadgeCell,SettingRow}.tsx`（webAria 配線）
- `src/screens/v2/{AppRoot,SettingsScreen}.tsx`（SkipLink 配置 / scoring radio に radio+checked / radiogroup 透過）
- `src/theme/focusStyle.ts`（skip link 用 CSS ルール追加）
- `src/i18n/ja.ts`（`nav.skip_to_content` 追加）
- `package.json` / `app.json`（version 2.0.0）

削除：
- `src/screens/v2/HistoryPlaceholderScreen.tsx` / `src/state/index.ts`

### S10.9 実機（Expo Go）で最終確認したい項目

自動テスト・`build:web` で機能とロジックは緑。**見た目・体感は実機/Web 実機で確認推奨**：

1. **VoiceOver/TalkBack**：トグルが「スイッチ オン/オフ」、採点方式が「ラジオ 選択中/未選択」、パッチが「チェックボックス 選択済み/未選択」、バッジが「展開済み/折りたたみ」と読み上げられること。
2. **Web キーボード**：Tab 最初でスキップリンク出現 → Enter でメインへジャンプ。全操作要素に Tab 到達・Enter/Space 起動・3px focus ring。
3. **レスポンシブ**：360/375/1280px で全画面はみ出しゼロ、タップ 48pt 以上（Playwright スクショ推奨）。
4. **セーフエリア**：ノッチ/Home Indicator 端末でゲーム背景が全面・X/残り秒/タブバーが安全領域内。他画面はコンテンツが inset 内。
5. **reduced-motion**：OS の「視差効果を減らす」ON で結果開示フェード・バッジ拡大が静的化、**ゲーム刺激の回転/周波数変化は継続**すること。
6. **ガボール描画品質（NF-26〜28b）**：回転中も四隅に背景露出なし・隙間なし、静止パッチが時間変化しないこと。

---

## 1. 前提環境

| 項目 | 推奨 | 備考 |
|---|---|---|
| Node.js | 22.9.0 | `.tool-versions` で固定。asdf 利用推奨 |
| npm | 10+ | Node.js 22.9.0 同梱版 |
| Expo CLI | プロジェクト内（`npx expo`） | グローバルインストール不要 |
| iOS シミュレータ | Xcode 15+ | iOS で動作確認する場合のみ |
| Android エミュレータ | Android Studio + API 26+ | Android で動作確認する場合のみ |
| ブラウザ | Chrome / Safari / Edge / Firefox 最新 2 メジャー | Web 動作確認 |

---

## 2. 初回セットアップ

```bash
cd /Users/np_202212_11/projects/gabor3
npm install
```

依存解決に 30〜60 秒程度。`npm warn deprecated` は Expo SDK 50 系の既知警告で動作には影響しない。

---

## 3. 開発サーバー起動

### 3.1 Web ブラウザで開く（推奨：開発の主軸）

```bash
npm run web
```

- 自動でブラウザが立ち上がり `http://localhost:8081` を開く
- ホットリロード対応
- "GaborEye / Phase 1 Setup OK" が中央表示されれば成功
- ブラウザの DevTools の `prefers-color-scheme` でライト／ダーク切替確認可能

### 3.2 iOS シミュレータで開く

```bash
npm run ios
```

- Xcode が必要
- 初回は数分かかる
- Expo Go アプリでも QR コードから読み込んで起動可能

### 3.3 Android エミュレータで開く

```bash
npm run android
```

- Android Studio + AVD が必要
- Expo Go アプリ + QR コードでも可

### 3.4 dev サーバーのみ起動（QR コード表示）

```bash
npm start
```

- iOS / Android の Expo Go 用に QR コードを表示
- `i` キー押下で iOS、`a` キー押下で Android、`w` キー押下で Web

---

## 4. テスト・ビルド・型検査

| コマンド | 内容 |
|---|---|
| `npm test` | Jest 全テスト実行（jest-expo preset） |
| `npm run test:watch` | watch モード |
| `npm run typecheck` | TypeScript strict 型検査（コードは出力しない） |
| `npm run build:web` | 本番 Web バンドルを `dist/` に出力 |

### 4.1 現在の状態（Sprint 3 完了時点）

- テスト: 17 ファイル / **96 件 PASS**
  - `tests/sanity.test.ts`（Jest 動作確認）
  - `tests/theme.test.ts`（OPT-1 / OPT-2 / OPT-8 トークン検証）
  - `tests/staircase.test.ts`（3-down/1-up、step 半減、reversal、クランプ、リセット、閾値推定）
  - `tests/calibration.test.ts`（cpd→px、ppd、推奨パッチサイズ、device type 推定）
  - `tests/storage.test.ts`（StaircaseState round-trip、Sessions/Trials append）
  - `tests/gaborPixels.test.ts`（RGBA バッファ計算、コントラスト反映、BMP data URL）
  - `tests/components/GaborWithMask.test.tsx`（fixation→A→mask→B→answer 状態機）
  - `tests/components/Game2Screen.test.tsx`（描画クラッシュなし）
- typecheck: PASS
- build:web: PASS（`dist/_expo/static/js/web/AppEntry-*.js` ≈ 349 kB）

### 4.2 EAS ローカルビルド（ネイティブ APK / IPA）

`eas build --local` は Expo クラウドに送らず、手元の Mac でネイティブビルドを完結させる。**iOS / Android どちらも事前ログインなしで実行可能**（プロジェクト ID は `app.json` に同梱）。ただし署名は必要。

#### 4.2.1 環境変数（`~/.zshrc` に登録済み）

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/emulator:$PATH"
```

新規ターミナルなら自動反映。同じセッションで使うなら `source ~/.zshrc`。

#### 4.2.2 必須ツール（インストール済み）

| ツール | 確認コマンド | 備考 |
|---|---|---|
| `eas-cli` 18+ | `eas --version` | `npm i -g eas-cli` で導入。asdf 環境では `asdf reshim nodejs` 必須 |
| JDK 17 | `java -version` | Android Studio 同梱の JBR を使用 |
| Android SDK | `adb --version` / `ls $ANDROID_HOME` | build-tools 36.0.0 / platforms android-36 / NDK 26.1 / cmdline-tools/latest |
| Xcode 15+ | `xcodebuild -version` | iOS ローカルビルド用 |
| CocoaPods | `pod --version` | iOS の `pod install` で使用 |
| fastlane | `fastlane --version` | iOS の署名・配布で使用 |

#### 4.2.3 Android ローカルビルド（preview / APK）

```bash
cd /Users/np_202212_11/projects/gabor3
eas build --platform android --profile preview --local
```

- 初回はプロジェクトのプリビルド（`android/` 生成）→ Gradle 依存解決で数百 MB ダウンロード、所要 5〜15 分。
- 完了するとカレントディレクトリに `build-<timestamp>.apk` が出力される。
- 実機転送：`adb install build-*.apk`（USB デバッグを有効化した端末を接続）。
- 署名鍵が無い場合、初回のみ EAS が `credentials.json` を作るかリモート保存するか聞く。完全オフラインで進めたいなら事前に `eas credentials` でローカル keystore を生成しておく。

> **NDK バージョン注意**：RN 0.81 は NDK 27.x を要求するケースがある。Gradle が `Compatible side by side NDK version was not found` で失敗したら、Android Studio の **SDK Manager → SDK Tools → NDK (Side by side)** で 27.1.12297006 を追加。

#### 4.2.4 iOS ローカルビルド（preview）

```bash
cd /Users/np_202212_11/projects/gabor3
eas build --platform ios --profile preview --local
```

- シミュレータ向けに `.tar.gz`（解凍で `.app`）を出すには eas.json の `preview.ios.simulator: true` が必要（現状未設定 → 4.2.5 参照）。
- 実機向けは Apple Developer 登録 + プロビジョニングプロファイルが必要。最初の起動時に対話で設定するか `credentials.json` を用意する。

#### 4.2.5 シミュレータ向け iOS ビルドを使うなら

`eas.json` に下記プロファイルを追加（任意）：

```json
"preview-ios-sim": {
  "extends": "preview",
  "ios": { "simulator": true }
}
```

実行：

```bash
eas build --platform ios --profile preview-ios-sim --local
# 出力: build-*.tar.gz → 解凍して .app をシミュレータにドラッグ
```

#### 4.2.6 既知の落とし穴

- **asdf shim 未更新**：`npm i -g eas-cli` の直後は `eas` が PATH に出ない。`asdf reshim nodejs` で解消。
- **EAS ログイン**：`eas build --local` 自体はログイン不要だが、`credentials.json` を使わない場合は最初の Android 署名鍵生成で `eas login` を促される。CLAUDE.md にあるとおり stdin 経由のログインは失敗するので、**ユーザー自身がインタラクティブに `eas login` を実行**する。
- **`ios/` `android/` ディレクトリ**：`.gitignore` で除外済み。`eas build --local` が毎回プリビルドで作り直すため、コミットしない。

---

## 5. 採用スタックと選定理由

| 領域 | 採用 | バージョン | 理由 |
|---|---|---|---|
| ランタイム | React Native + Expo SDK | 50 系 | iOS / Android / Web 三系統を 1 コードベースで対応する最短ルート |
| Web 化 | react-native-web | 0.19 系 | Expo 公式サポート、Metro 経由で同梱 |
| 言語 | TypeScript strict | 5.3 系 | 型安全。`tsconfig.json` で `strict: true` |
| テスト | Jest + jest-expo preset | 29 系 | React Native コンポーネントのモックが整っている。Vitest は RN 系のトランスフォーム周りで追加設定が必要なため見送り |
| 永続化（予定） | @react-native-async-storage/async-storage | 1.21 系 | 端末ローカル保存、iOS/Android/Web 全対応 |

### 5.1 ガボール描画戦略（Sprint 1 確定）

Sprint 1 では **純 JS でガボール RGBA バッファを計算 → BMP data URL → React Native `<Image>`** という方式を採用した。理由：

| 観点 | 評価 |
|---|---|
| iOS / Android / Web 対応 | `<Image>` は全プラットフォームで動作、ネイティブ pod 不要 |
| Sprint 1 の要件達成 | 静的提示（A / mask / B 各 1 frame）には十分。動きが無いのでドロップフレーム発生せず |
| ピクセル制御 | 純 JS なので決定論的、テスト容易 |
| バンドルサイズ | +0KB（依存追加なし） |
| 計算時間 | 64x64 で 5ms、240x240 dpr=2 で 200ms（重め）。Sprint 4 で iPhone 実機検証要 |

**Sprint 2 で `@shopify/react-native-skia` v0.1.221（Expo SDK 50 公式版）に移行する**：
- Game 1 のモーフィング（60fps 連続変化）には Skia の `<Canvas>` + `<Image>` が必要
- 依存は Sprint 1 で先行導入済み（`package.json` に `@shopify/react-native-skia: ^0.1.221`）
- GaborPatch コンポーネントの API（`components.md §14`）は変えず、内部実装のみ差し替える

**選定外：**

- `expo-gl` + WebGL シェーダ：制御性は高いが Web 互換が脆弱、開発コスト高
- HTML Canvas 2D：Web 専用、ネイティブで動かないため除外
- React Native Reanimated + SVG：パフォーマンス不足（60fps 厳しい）

---

## 6. ディレクトリ構成

```
gabor3/
├── App.tsx                      # エントリ。Hello GaborEye 表示
├── app.json                     # Expo 設定（iOS / Android / Web）
├── babel.config.js              # babel-preset-expo
├── tsconfig.json                # strict TypeScript
├── package.json                 # 依存・スクリプト・jest 設定
├── .tool-versions               # nodejs 22.9.0
├── .gitignore
├── assets/                      # アイコン素材（Designer 確定後）
├── src/
│   ├── theme/                   # デザイントークン（暫定値、Designer 確定後上書き）
│   │   ├── index.ts
│   │   └── tokens.ts
│   ├── components/              # 再利用 UI（Sprint 2+）
│   ├── screens/                 # 画面（Sprint 2+）
│   ├── lib/                     # 純粋ロジック（gabor / staircase / score / calibration）
│   └── state/                   # 永続化（AsyncStorage Repository）
├── tests/
│   ├── sanity.test.ts
│   └── theme.test.ts
└── docs/
    ├── spec.md
    ├── questions.md
    ├── design/                  # Designer 出力
    ├── sprints/                 # Generator 自己評価（sprint-N-self-review.md）
    └── run.md                   # 本ファイル
```

---

## 7. 落とし穴・既知制約

### 7.1 Expo SDK 50 系
- React Native 0.73 系を要求。Node.js 18 以上が必須
- `metro-runtime` 系の警告は無害

### 7.2 react-native-web
- 一部 RN ネイティブ専用 API（Haptics 等）は Web で no-op 化が必要。Sprint 7（設定）で対応
- `useColorScheme` は Web でも `prefers-color-scheme` を読む

### 7.3 Jest 設定
- `transformIgnorePatterns` に React Native / Expo / Skia を含めている。新規 RN 系ライブラリ追加時は pattern 追記が必要
- React コンポーネントテストは `@testing-library/react-native` 導入を Sprint 1 で検討

### 7.4 TypeScript パスエイリアス
- `@/`、`@components/` 等を tsconfig.json で定義
- Metro でも解決させるには `app.json` の `experiments.tsconfigPaths: true` を有効化済み（Sprint 1 以降の import で活用）

### 7.5 アセット未配置
- `assets/icon.png` 等は未配置。Designer 確定後に配置し、`app.json` の参照を有効化する
- 現状は Expo デフォルトアイコンが使われる

---

## 8. スプリント履歴

| Sprint | 完了日 | 主要変更 | テスト件数 |
|---|---|---|---|
| Phase 1 setup | 2026-04-29 | Expo + RN Web + TS + Jest 基盤、theme トークン雛形、Hello GaborEye | 5 |
| Sprint 1 | 2026-04-30 | 描画基盤（GaborPatch / Mask / WithMask）、Game 2 画面、staircase 3-down/1-up、視聴距離 40cm 固定、結果サマリ暫定、デバッグ表示 | 38 |
| Sprint 2 | 2026-04-29 | ホーム画面（screens.md S2-01）、Game 1（変化察知）、おまかせコース骨格（Game 1+2 連続）、単体プレイ動線（GameSelect / SinglePlayPost）、AppRouter 分離、SessionRecord course/single 両対応 | 72 |
| Sprint 3 | 2026-04-29 | Game 3（周辺視野ハント）、PeripheralLayout / ClockAnswerButtons、3 ゲーム連続コース完成、ホームの Game 3 有効化、Game 3 staircase 独立 | 96 |
| Sprint 4 | 2026-04-29 | オンボーディング、免責事項、視聴距離キャリブレーション、UserProfile 永続化 | 140 |
| Sprint 5 | 2026-04-29 | V1 スコア・前回比・週次グラフ・クールダウン・進捗画面・DailyStats 集計 | 190 |
| Sprint 6 | 2026-04-29 | ストリーク（0:00 跨ぎ判定）、達成バッジ B-01〜B-08、バッジ一覧／詳細モーダル、日次ベスト画面、StreakBadge / AchievementBadge / BadgeDetailModal、SessionComplete でバッジ獲得 1.5 秒演出、V1ScoreChart 軸ラベル幅・X 軸密度修正 | 242 |
| Sprint 7-A | 2026-04-29 | 設定画面（screens.md S7-01）、ThemeProvider（system/light/dark）、Settings 永続化拡張、全データ削除 2 段階確認、ダークモード即時切替、ListItem / Toggle / OptionPickerModal / DataDeletionConfirmModal / Snackbar | 271 |
| Sprint 7-B | 2026-04-29 | 音声（Web Audio）、ハプティクス（navigator.vibrate）、AppState 検知、Web キーボードショートカット（Game 2 ←/→・Game 3 1-8・Esc）、Game 1/2/3 へ正解音 + 軽振動を組込 | 294 |
| — v2.0 リブート境界 — | | 以下は v2.0（spec.md）の履歴。上記は v1.x アーカイブ | |
| **Sprint 1 (v2.0)** | 2026-05-30 | v1/v1.1/v1.2 の全ゲーム・旧ルーター・旧データ層・旧テストを撤去。流用基盤（GaborPatch / gaborPixels / calibration / theme / i18n 基盤）を残置。App.tsx を v2.0 最小プレースホルダへ。`.gitignore` に作業用 APK/PNG 追記。詳細は §0 | **46** |
| **Sprint 2 (v2.0)** | 2026-05-30 | データ層（`gaboreye:v2:*` schema/keys/store/repository/migration/settings/dataReset）+ 設定タブ UI（F-13・F-11）。詳細は §0-S2 | **100** |
| **Sprint 3 (v2.0)** | 2026-05-30 | ゲームコア ロジック層（`src/lib/v2/` rng/patch/roundGen/scoring/gameMachine + `src/state/sessionRecorder`）。F-01 格子生成・F-02 採点3方式・F-04 0〜100 集計。描画/UI は未配線（S4）。詳細は §0-S3 | **180** |

各スプリント完了時に Generator が 1 行追記する。

---

## 8.5 Sprint 1：Game 2 の起動・操作方法

### Game 2 を起動する

1. `npm run web` でブラウザを開く（または `npm run ios` / `npm run android`）
2. ホーム画面で「**Game 2 を始める**」をタップ
3. 距離リマインド画面で「画面から 40 cm 離れてください」を確認 → 「**準備ができました**」をタップ
4. Game 2 プレイ画面：
   - 上部に残り時間と試行カウンタ
   - 中央のグレー領域で `固視点 500ms → A 1000ms → マスク 200ms → B 1000ms` を見る
   - 下部の「**反時計回り ↶**」「**時計回り ↷**」のいずれかをタップ
   - 3 秒以内に答えなければ「未回答」として記録され、staircase は up（易方向）
5. 60 秒経過 / 30 試行で結果サマリへ自動遷移
6. 結果サマリで「次へ」をタップ → ホームへ戻る

### staircase の動作確認

- ホーム画面の「**デバッグ表示を見る**」で `Staircase Debug` 画面に入る
- `currentParam` / `currentStep` / `reversalCount` / `lastDirection` / `consecutiveCorrect` をリアルタイムで確認できる
- Trial History（最新 30 件）も表示

### staircase をリセットする

ホーム画面の「**staircase をリセット**」をタップ → 確認ダイアログで「リセットする」を選ぶ。
Game 2 の角度差（currentParam）が初期値 6° に戻り、step / reversal カウントもリセットされる。

または `Staircase Debug` 画面下部の「Reset staircase」（destructive）からも実行可能。

### 起動時の自動ロード

- アプリ起動時に AsyncStorage から `gaboreye:v1:staircase:game2` を読み出す
- 未保存ならゲームごとの初期値（spec.md §7.2 の 6°）から始まる
- セッション間で staircase が引き継がれる（spec.md §6.3、F-10 受け入れ基準）

---

## 8.6 Sprint 2：ホーム / コース / Game 1 の起動・操作方法

### ホーム画面（S2-01）

1. `npm run web` でブラウザを開く
2. ホーム画面に表示されるもの：
   - 上部：タイトル「GaborEye」と設定アイコン（⚙）
   - StreakBadge プレースホルダ（Sprint 6 で本実装）
   - **「3 分コースを始める」プライマリ CTA**（中央、64px 高、26px ラベル）
   - 単体ゲーム選択：Game 1 / Game 2 を 2 列カード、Game 3 は折返し 1 列フル幅で disabled（aria-disabled、focusable=false、「準備中」チップ）
   - 進捗グラフ／バッジ一覧 tertiary（Sprint 5/6 で実装、現在は disabled 表示）
   - 「デバッグ表示」tertiary（Sprint 1 と同じく `Staircase Debug` への遷移）

### おまかせ 3 分コースを起動

1. ホームの「**3 分コースを始める**」をタップ
2. 距離リマインド（S2-02）→ 「準備ができました」
3. **Game 1（変化察知）**：
   - 上部に 残り 60 秒のカウントダウン
   - 3×3 / 4×4 / 5×5 グリッド（staircase の難易度に応じて自動切替）
   - 1〜3 個のパッチが緩やかに角度モーフィング（線形補間、60 秒で最大角度差まで変化）
   - 「変化したパッチをタップ」（先頭 3 秒のみガイド表示）
   - タップ：選択トグル（黄色 4px 枠）／再タップで解除
   - 完了ボタン押下 or 60 秒経過 → 採点 → 1.5 秒拡大ハイライト → 結果へ
   - **タップ無しのまま 60 秒経過した場合**：自動採点 → 正解パッチを 1.5 秒拡大ハイライト → 結果サマリで「未挑戦」と表示
4. **Game 1 結果サマリ（S2-04）**：今回の閾値（最大角度差）、正答／誤タップ数。「次へ」で進む
5. **Game 2（二重表裏判別）**：Sprint 1 と同じ動作
6. **Game 2 結果サマリ**：閾値・正答率・試行数
7. **セッション完了画面（S2-07 暫定）**：🎉 + StreakBadge（+1）+「ホームに戻る」

### 単体プレイを起動

1. ホームの **Game 1 / Game 2 カード**をタップ
2. 距離リマインド → ゲーム → 結果サマリ
3. **単体プレイ後選択（S2-08）**：「ホームに戻る」「同じゲームをもう一度」「別のゲームをやる」の 3 択

### staircase の独立性

- Game 1 / Game 2 は独立した staircase レコードを持つ（spec.md A-4）
- Game 1 初期値：5°（min 1°、max 10°、step 1）
- Game 2 初期値：6°（min 1°、max 10°、step 4 → reversal で 2 → 1）
- セッション間で永続化（AsyncStorage）

### Sprint 2 の暫定対応

- セッション完了で StreakBadge は +1 表示するが、ストリーク本実装は Sprint 6
- ストリーク加算は仕様上「3 ゲーム完了時」だが、Sprint 2 では暫定的に「2 ゲーム完了で +1」（Sprint 3 で 3 ゲーム必須に修正）
- 設定画面アイコンは Stub（Sprint 7）
- 進捗グラフ／バッジ一覧ボタンは disabled（Sprint 5/6）
- 視聴距離は 40cm 固定（Sprint 4 でキャリブレーション本実装）

---

## 8.7 Sprint 3：Game 3 / 3 ゲーム連続コース

### Game 3（周辺視野ハント）の動作

1. ホーム画面で **Game 3 カード**（「周辺視野ハント」）をタップ
   - Sprint 2 の「準備中」チップは撤去、3 ゲームすべて enabled
   - スマホ縦は 3 カード縦積み、PC 横（≥600px）は 3 カード横並び
2. 距離リマインド → 「準備ができました」
3. Game 3 プレイ画面（screens.md S3-01）：
   - 上部に 残り 60 秒 / 試行カウンタ（GameStatusBar）
   - 中央のグレー枠（スマホ 320×320 / PC 400×400）に **8 個のガボールパッチ + 中心固視点**
   - 1 試行のフェーズ進行：
     - `trialStart`（500ms）：固視点のみ
     - `presentation`（300〜800ms、staircase 連動）：8 個のガボール提示。1 個だけ向きが違う（odd one）
     - `mask`（200ms）：全 8 位置を高コントラストのランダムガボールで覆う
     - `answer`（最大 2000ms）：時計 8 ボタン enabled、回答待ち
     - `feedback`（800ms）：正解位置を矢印 + 該当ボタンに枠ハイライト
     - `cooldown`（100ms）：次試行へ
4. 8 ボタンは時計の **12 / 1:30 / 3 / 4:30 / 6 / 7:30 / 9 / 10:30** 時方向。各 72×72px、ラベル 24px Medium
   - 円直径：スマホ 320px / PC 360px
   - 押下で正誤判定、staircase 更新
5. 60 秒経過 / 40 試行で結果サマリへ自動遷移
6. 結果サマリ（S3-02 暫定）：閾値（最小角度差）、正答率、試行数 → 「次へ」でホーム or コース次フェーズへ

### おまかせ 3 分コース（完成版、screens.md S3-03）

1. ホームの **「3 分コースを始める」**
2. 距離リマインド → Game 1（60 秒） → 結果 1 → Game 2（60 秒） → 結果 2 → **Game 3（60 秒） → 結果 3** → セッション完了画面
3. 合計 **約 3 分（180〜220 秒）**：60×3 + 結果 3 + リマインド 5〜15
4. 完了時に SessionRecord（type='course'）が AsyncStorage に保存され、3 ゲーム閾値（game1/game2/game3Threshold）が記録される

### staircase の独立性（spec.md A-4 / Sprint 3 受け入れ）

- 3 ゲームが**独立**した StaircaseState レコードを持つ（`gaboreye:v1:staircase:game1` / `:game2` / `:game3`）
- Game 3 初期値：30°（min 5°、max 45°、step 4 → reversal で 2 → 1）
- 3 ゲームのうち 1 つで誤答してもほかゲームの閾値には影響しない（テスト：`tests/staircase.test.ts` の「3 ゲーム独立」）

### Game 3 の難易度連動

| staircase param | 提示時間 | 離心角 | 難易度ラベル |
|---|---|---|---|
| ≥ 25° | 800ms | 6° | 易 |
| 15〜24° | 500ms | 8° | 中 |
| < 15° | 300ms | 10° | 難 |

角度差が縮まるほど提示時間も短く、離心角も大きくなる（spec.md §7.3）。

### Sprint 3 の暫定対応

- 結果サマリ画面の「前回比」「V1 スコア」表示は Sprint 5
- ストリーク加算は SessionCompleteScreen 上の数字だけ表示し、本実装は Sprint 6
- BGM は OFF 固定（Sprint 7 設定画面で本実装）

---

## 8.8 Sprint 5：結果サマリ完成版 / V1 スコア / 進捗グラフ / クールダウン

### 動作確認のポイント

1. `npm run web` でブラウザを開く
2. 初回はオンボーディング → ホームへ
3. **おまかせ 3 分コースを完走**：
   - 各ゲーム終了後の結果サマリで「↓ 前回より 0.3 度改善 ✨」のような前回比が表示される（初回は「はじめての記録です」）
   - Game 1 / 2 / 3 の各サマリは 10 秒カウントダウンで自動進行（コースモードのみ）
   - Game 3 結果サマリの「次へ」/ 自動進行で **クールダウン画面（10 秒）** が表示
   - 「スキップ」または 0 秒到達で **セッション完了画面**：今日の V1 スコア + 前回比、ストリーク、グラフボタン、ホームボタン
4. ホームに戻ると：
   - 「今日の V1 スコア」カード表示
   - 「📈 進捗グラフ」が enabled に
5. **進捗グラフ画面**：
   - 28 日折れ線（1 日でも記録があれば overlay 付きで描画）
   - 7 日未満の場合は「もう少しデータが集まると傾向が見えます」 overlay
   - 0 日（全データ削除直後など）は「まずは 1 セッション完了させましょう」+ CTA
   - タブ「日次ベスト」で過去 7 日分のゲーム別ベスト閾値テーブル
6. **単体プレイ後の結果サマリ**：
   - カウントダウン文言は描画されない（自動進行しない）
   - 「次へ」を押さないと進まない
   - 前回比 diff も表示される

### 永続化

- `gaboreye:v1:dailyStats` に DailyStats を JSON で保存
- ベスト閾値は同日内の min を採用（小さい方が改善）
- V1 スコアは同日内の max を採用（大きい方が改善）
- セッション件数はインクリメント

### V1 スコア計算（spec.md §9.1）

```
score(g1) = clamp((8 - threshold) / 5 × 100, 0, 100)
score(g2) = clamp((10 - threshold) / 9 × 100, 0, 100)
score(g3) = clamp((45 - threshold) / 40 × 100, 0, 100)
V1 スコア = round(平均(実施したゲームのスコア))
```

例：g1=4°, g2=4.2°, g3=12° → 80 / 64.4 / 82.5 → 平均 75.6 → **76 点**

### Sprint 5 の暫定対応

- ストリーク値は 1 固定（Sprint 6 で本実装）
- バッジ獲得演出は未実装（Sprint 6）
- TrialRecord 個別ログの append は本スプリントでは追加せず（Sprint 6 で B-05「100 試行」バッジ実装時に着手）
- PC 横の進捗画面レイアウトは未専用化（screens.md S5-04 PC 版）
- クールダウンのイラストは `🌄` emoji 暫定（Sprint 7 で正式素材差し替え）

---

## 8.9 Sprint 6：ストリーク・バッジ・日次ベスト

### 動作確認のポイント

1. `npm run web` でブラウザを開く
2. ホーム画面に **🔥 連続日数バッジ**（StreakBadge）が表示される
   - 0 日：「コースを始めて、連続記録をスタート」
   - N 日連続：「23 / 日連続」
   - 22 時以降で前日完了 / 当日未完了：「⚠ 今日終わるとリセットされます」警告
3. **おまかせ 3 分コースを完走**：
   - SessionCompleteScreen で StreakBadge が +1 された値を表示
   - 新規バッジ獲得時、バッジカードが scale 0.6 → 1.05 → 1.0 で出現（合計 1.5 秒、点滅なし）
   - 複数バッジ同時獲得時は 1.5 秒ずつ順次表示（aria-live="assertive" で SR 通知）
4. **ホーム下部のバッジ一覧**：「🏅 バッジ一覧」で BadgeListScreen
   - 8 種類のバッジが 2 列（スマホ）/ 4 列（PC）グリッドで表示
   - 「獲得 N / 8」を上部に表示
   - 未獲得バッジは半透明 + ヒント（「あと N 日」「累計 N 試行 / 100」など）
5. **バッジ詳細モーダル**（タップで開く）：
   - 獲得済み：説明 + 獲得日付（M 月 D 日）
   - 未獲得：獲得条件 + 進捗ヒント
   - **B-08「全方位改善」**：3 ゲームすべての先週比改善状態を表示
     - 「↓ 改善中」「→ 横ばい／悪化」「─ データ不足」のラベル
     - 「3 ゲーム中 N ゲームが先週比で改善中」（screens.md S6-03 §4）
   - **B-06 / B-07**：「Game 3 をプレイ」「Game 2 をプレイ」CTA
6. **日次ベスト画面**：「🏆 日次ベスト」から DailyBestScreen
   - 今日のベスト（3 列カード G1 / G2 / G3）
   - 過去 7 日のベスト履歴テーブル

### バッジ獲得条件（spec.md §9.3）

| ID | 名称 | 獲得条件 |
|---|---|---|
| B-01 | はじめの一歩 | 初回コース完了（DailyStats.courseCompleted=true） |
| B-02 | 三日坊主突破 | 3 日連続コース完了（streak.currentStreak ≥ 3） |
| B-03 | 一週間の習慣 | 7 日連続（≥ 7） |
| B-04 | 一ヶ月の継続 | 30 日連続（≥ 30） |
| B-05 | 100 試行 | 累計 100 試行（TrialRecord 件数 or SessionRecord.trialCount 集計、≥ 100） |
| B-06 | 視野ハンター | Game 3 ベスト閾値からスコア ≥ 80 |
| B-07 | 弁別の達人 | Game 2 ベスト閾値からスコア ≥ 80 |
| B-08 | 全方位改善 | 3 ゲームすべて先週比閾値が小さい（過去 7 日平均 < 前 7 日平均） |

### 0:00 跨ぎ判定（spec.md §9.3 / screens.md §8）

- アプリ起動時 / ホーム遷移時に `reconcileStreakOnView(streak, now)` を実行
- `lastCompletedDate` が今日：維持
- `lastCompletedDate` が昨日：維持（22 時以降は「今日終わるとリセットされます」警告）
- `lastCompletedDate` が 2 日以上前：currentStreak=0 にリセット、longestStreak は保持

### 永続化キー

- `gaboreye:v1:streak`：Streak（currentStreak / longestStreak / lastCompletedDate）
- `gaboreye:v1:badges`：BadgeStatus[]（8 種類）
- `gaboreye:v1:trials`：TrialRecord[]（B-05 累計試行数のソース）

### Sprint 5 申し送り Major 修正

- **V1ScoreChart Y 軸ラベル幅**：48px に拡張、numberOfLines=1 で「100」が折り返さない
- **V1ScoreChart X 軸密度**：スマホ幅（< 480px）では 7 日刻み、PC 横では 4 日刻みに自動切替
- **WeeklyGraph タブ aria-selected**：Pressable に直接 `aria-selected={active}` を付与（Web SR 互換）

### Sprint 6 の暫定対応

- バッジアイコンは絵文字（🌱 / 🌿 / 📅 など）を暫定で使用。SVG イラストは Sprint 7 以降で差し替え
- ハプティクス・効果音（バッジ獲得時のチャイム）は設定画面の本実装と合わせて Sprint 7
- TrialRecord は Sprint 6 ではサマリ件数分のスタブ（trialCount 個分）を append。1 試行ごとの詳細記録（responseTimeMs / isCorrect）は将来拡張
- スキーマ変更（Streak / BadgeStatus 追加）は spec.md §12.1 で凍結済みのため申し送り

---

## 8.10 Sprint 7-A：設定画面 / ダークモード / 全データ削除

### 設定画面を開く

1. ホーム画面の右上 **歯車アイコン**（⚙）をタップ
2. 設定画面（5 セクション）が表示される：
   - **画面表示**：ダークモード（OS 連動 / 明 / 暗）
   - **音と振動**：効果音 / 振動 / Game 3 BGM トグル
   - **視聴環境**：視聴距離（30/40/50cm）/ 片眼ガイダンス
   - **データと法的事項**：免責事項を読む / 全データを削除
   - **アプリ情報**：バージョン V1.0.0 + 免責同意日時

### ダークモード切替

1. 「ダークモード」行をタップ → モーダル表示
2. 「OS 連動」「明るい(ライト)」「暗い(ダーク)」の 3 択
3. 選択 → 即時に全画面のテーマが切替（ガボール表示領域は OS 設定に関わらずグレー固定）
4. 設定値は AsyncStorage `gaboreye:v1:settings` に永続化

### 全データ削除（spec.md §10.2）

1. 「全データを削除」（赤色文字）をタップ
2. **段階 1 モーダル**：削除対象一覧（セッション履歴・staircase 状態・バッジ・ストリーク・設定）と「この操作は取り消せません」警告
3. 「次へ進む」（destructive）をタップ
4. **段階 2 モーダル**：「削除」とテキスト入力
5. 「削除」と完全一致した文字を入力 → confirm ボタン enabled
6. 「削除」を実行 → AsyncStorage 全消去 → オンボーディングからやり直し

### Settings 永続化キー

- `gaboreye:v1:settings`：Settings（soundEnabled / hapticsEnabled / darkMode / oneEyeGuidance / game3BgmEnabled）

### Sprint 7-A の暫定対応 / 申し送り

- **音声・ハプティクス・AppState 連携**：設定 ON にしても実際の音／振動の発火は Sprint 7-B で実装
- **キーボード操作・focus outline 強化・skip link**：Sprint 7-C
- **staircase リセット導線**：spec.md F-15 にある「difficulty reset」設定行は本タスクで未実装。Sprint 7-B/C で追加（resetAllStaircases 関数自体は実装済み）
- **バッジ一覧の設定経由導線**：Sprint 6 のバッジ一覧画面はホーム経由のままで OK
- **完全なテーマ統合**：HomeScreen / SessionCompleteScreen など既存画面は引き続き useColorScheme() ベースで動作。ThemeProvider preference を直接購読する移行は Sprint 7-B/C

---

## 8.11 Sprint 7-B：音声・ハプティクス・AppState・キーボード

### 動作確認のポイント

1. `npm run web` でブラウザを開く（音声・キーボードは Web で動作）
2. 設定画面で **効果音 ON** / **振動 ON** を確認（デフォルト ON）
3. **Game 2 を起動**：
   - **マウス／タップ**：「反時計回り ↶」「時計回り ↷」をクリック
   - **キーボード**：← キーで反時計回り、→ キーで時計回り
   - 正解時に短い 2 音（C5 → E5、240ms）が鳴る
   - 振動対応端末（Android Chrome 等）では 50ms 軽振動
4. **Game 3 を起動**：
   - **マウス／タップ**：時計の 8 ボタン
   - **キーボード**：1-8 キー（1=12時、2=1:30、3=3時、4=4:30、5=6時、6=7:30、7=9時、8=10:30）
   - 正解時に効果音 + 振動
5. **Game 1 を起動**：
   - 「完了」ボタン押下後、全正解判定なら効果音 + 振動
6. **設定 OFF を確認**：
   - 設定画面 → 効果音 OFF → ゲームに戻ると音が鳴らない（即時反映）
   - 振動 OFF も同様

### Web キーボードショートカット一覧

| 画面 | キー | 動作 |
|---|---|---|
| Game 2 | ← (ArrowLeft) | 反時計回り回答 |
| Game 2 | → (ArrowRight) | 時計回り回答 |
| Game 3 | 1 | 12 時方向 |
| Game 3 | 2 | 1:30 方向 |
| Game 3 | 3 | 3 時方向 |
| Game 3 | 4 | 4:30 方向 |
| Game 3 | 5 | 6 時方向 |
| Game 3 | 6 | 7:30 方向 |
| Game 3 | 7 | 9 時方向 |
| Game 3 | 8 | 10:30 方向 |
| 全データ削除モーダル | Esc | キャンセル（モーダル閉じ） |

### AppState 連携（spec.md A-8）

- ゲーム中にブラウザのタブを切替 / バックグラウンドへ → 自動的に「中断」扱いでホームへ戻る
- Web：`document.visibilitychange` イベントで検知
- ネイティブ：`AppState.addEventListener('change', ...)` で検知（実装あり、本タスクの動作確認は Web のみ）
- 中断時の試行は staircase の更新には**含めない**（既存の onAbort パスと同じ）
- セッション履歴にも未完了として記録されない（Sprint 7-A までと同じ A-8 簡易対応）

### 実装ファイル

新規：
- `src/lib/audio.ts`：Web Audio API シンセサイズで `playCorrect()` / `playIncorrect()`
- `src/lib/haptics.ts`：`navigator.vibrate` で `lightImpact()`
- `src/lib/appState.ts`：`useAppForeground` フック + `subscribeAppForeground`
- `src/lib/keyboardShortcuts.ts`：`mapKeyToGame2` / `mapKeyToGame3` 純関数 + `useGame2Keyboard` / `useGame3Keyboard` / `useEscapeKey` フック

統合：
- `src/screens/Game1Screen.tsx`：finalizeTrial 内で `playCorrect()` + `lightImpact()`、useAppForeground で onBackground → onAbort
- `src/screens/Game2Screen.tsx`：handleAnswer 正解時に音声 + 振動、useGame2Keyboard で ←/→ ショートカット、useAppForeground
- `src/screens/Game3Screen.tsx`：handleAnswer 正解時に音声 + 振動、useGame3Keyboard で 1-8 ショートカット、useAppForeground
- `src/components/DataDeletionConfirmModal.tsx`：useEscapeKey で Esc キー対応
- `src/navigation/AppRouter.tsx`：Settings ロード時 + 更新時に `setSoundEnabled` / `setHapticsEnabled` をモジュール状態に反映

### Sprint 7-B の暫定対応 / 申し送り

- **ネイティブ音声・ハプティクス**：本タスクは Web 専用実装。`expo-av` / `expo-haptics` は v1.1 で導入予定（現状ネイティブは no-op）
- **a11y 仕上げ**：focus outline、Skip link、prefers-reduced-motion、aria-checked 反映は Sprint 7-C
- **staircase リセット導線**：F-15 の S7-06 モーダル + 設定行配置は Sprint 7-C（resetAllStaircases 関数は実装済）
- **Game 3 BGM**：`game3BgmEnabled` 設定は永続化のみ。実際の BGM ループ再生は v1.1
- **キーボード Tab 順序 / Skip Link**：Sprint 7-C で実装

---

## 9. トラブルシューティング

### `npm install` が失敗する

- Node.js バージョンを `.tool-versions` 通り（22.9.0）にする：`asdf install nodejs 22.9.0 && asdf local nodejs 22.9.0`
- `node_modules` 削除して再実行：`rm -rf node_modules package-lock.json && npm install`

### `npm run web` でブラウザが開かない

- `http://localhost:8081` を手動で開く
- ポート競合なら `PORT=8082 npm run web`

### iOS / Android で起動しない

- Xcode / Android Studio が最新か
- Expo Go アプリを最新にする
- 開発機と同じ Wi-Fi に接続しているか

---

## 10. Sprint 7-C：a11y 仕上げ + i18n 構造（v1 完成）

Sprint 7-C は v1 ラストスプリント。a11y Minor 残課題、prefers-reduced-motion、Skip Link、i18n 構造下準備をまとめて反映。

### 主な変更

| 項目 | 影響 |
|---|---|
| focus outline 3px 化（Web） | Button / IconButton / Toggle に focus-visible 時の 3px outline を付与（過去 Minor 1） |
| Skip Link | `<SkipLink>` を AppRouter ルートに配置。Web Tab 最初に「メインコンテンツへ移動」（過去 Minor 3） |
| prefers-reduced-motion | `usePrefersReducedMotion()` / `scaleDuration()`。Game 1 の 1.5 秒拡大ハイライト、Game 3 のフィードバック、Game 2 の最終ハイライトを reduce 時に 0ms 化 |
| AgeGroupScreen aria-checked | `accessibilityState.checked / selected` を pendingSelected で正しく反映（過去 Minor 1） |
| ClockAnswerButtons 枠線 | borderDefault → fgMuted（neutral500、コントラスト 7:1+）に強化（WCAG 1.4.11） |
| DisclaimerSheet test prop | `bypassScrollGate` → `__bypassScrollGateForTest`（NODE_ENV=test のみ尊重） |
| i18n 構造 | `src/i18n/ja.ts` に主要文言を集約。`t(key, params?)` ヘルパー。HomeScreen / DisclaimerSheet の主要文言を移行 |

### 実装ファイル

新規：
- `src/lib/motion.ts`：`usePrefersReducedMotion` / `scaleDuration`
- `src/theme/focusStyle.ts`：`buildFocusStyle` / `useFocusStyle` ヘルパー
- `src/components/SkipLink.tsx`：Web 専用 Skip Link
- `src/i18n/ja.ts`：日本語辞書
- `src/i18n/index.ts`：`t` / `tArray` / `interpolate`

更新：
- `src/components/Button.tsx`：focus-visible 3px outline（Web）
- `src/components/IconButton.tsx`：同上
- `src/components/Toggle.tsx`：同上
- `src/components/ClockAnswerButtons.tsx`：枠線色を fgMuted（コントラスト強化）
- `src/components/DisclaimerSheet.tsx`：テスト用 prop を `__bypassScrollGateForTest` に改名 + `t()` 統合
- `src/screens/Onboarding/AgeGroupScreen.tsx`：accessibilityState.checked/selected を反映、`initialSelected` prop 追加
- `src/screens/HomeScreen.tsx`：主要文言を `t()` 経由に移行
- `src/screens/Game1Screen.tsx` / `Game2Screen.tsx` / `Game3Screen.tsx`：`scaleDuration` でフィードバック時間を reduce-motion 連動
- `src/navigation/AppRouter.tsx`：`<SkipLink>` を最上段に配置、メインコンテナに `tabIndex={-1}` + `nativeID="main"`

### Sprint 7-C で v1 完成チェック（spec.md §13 Sprint 7 完成定義）

- [x] 全設定項目が動く（Sprint 7-A）
- [x] 全データ削除でオンボーディングからやり直せる（Sprint 7-A）
- [x] a11y 監査をパス：
  - [x] focus outline 3px（Web、focus-visible）
  - [x] Skip link（メインコンテンツへ移動、Web）
  - [x] aria-checked が選択カード／ラジオで反映される
  - [x] prefers-reduced-motion 対応（Game 1/2/3 のフィードバック）
  - [x] WCAG 1.4.11 非テキスト要素 3:1 を満たす枠線色
- [x] 360 / 375 / 768 / 1280px すべてでレイアウト崩れなし（HomeScreen useIsWide=600 で切替、各画面 maxWidth 720 で中央寄せ）
- [x] 24px 以上のフォント、48-64px 以上のタップ領域、コントラスト 7:1+ 維持
- [x] ライト/ダーク両モード対応
- [x] Sprint 1〜7-B のリグレッションなし（全 317 テスト PASS）

### Sprint 7-C テスト件数（前 → 後）

- 前：Sprint 7-B 完了時点 294 件 / 42 ファイル
- 後：**317 件 / 46 ファイル**（+23 件 / +4 ファイル）
  - `tests/lib/motion.test.ts`（5 件）
  - `tests/components/SkipLink.test.tsx`（3 件）
  - `tests/i18n/ja.test.ts`（9 件）
  - `tests/theme/focusStyle.test.tsx`（2 件）
  - `tests/screens/Onboarding/AgeGroupScreen.test.tsx`（既存 + 3 件）
  - `tests/components/ClockAnswerButtons.test.tsx`（既存 + 1 件）

### v1 → v2 への申し送り

- **i18n 全画面置換**：v1 では HomeScreen / DisclaimerSheet の主要文言のみ `t()` 化。Game1〜3 / 結果サマリ / バッジ画面 / 設定全項目は文字列リテラルのまま。v2 で en/zh 辞書追加と同時に全置換
- **ネイティブ音声・ハプティクス**：iOS/Android では現状 no-op。`expo-av` / `expo-haptics` 導入時に有効化
- **Apple Watch / Google Fit / HealthKit**：spec.md §15 V2 候補
- **物理キャリブレーション**（クレジットカードで dpi 計測）：spec.md §15 V2 候補
- **Eye Tracking / ARKit / ARCore**：spec.md §15 V2 候補
- **多言語対応**（英語・中国語・韓国語）：i18n 構造は準備済。`src/i18n/en.ts` を追加して `switchLocale()` を実装すれば動く
- **Bayesian adaptive method**：staircase の高度化、v2 検討
- **プッシュ通知 / 解析テレメトリー**：v2、ユーザー同意とプライバシー設計が必要

---

## 11. v1.1 への移行（Sprint 8 以降）

v1（Sprint 1〜7-C）はリリース候補として完成。v1.1 は **クリーンルーム再設計**（A-2）として上に積み上げる 12 スプリントで進める。

### 11.1 仕様書

- **`docs/spec-v11.md`**：v1.1 の正式仕様書（v1 の `docs/spec.md` を上書きせず別ファイルとして並置）
- **`docs/design-v11/`**：v1.1 のバッチ設計成果物（system / components / sprint-8〜19/screens.md）
- v1.1 のソース・オブ・トゥルースは `spec-v11.md`。v1 の `spec.md` は履歴として残置

### 11.2 12 スプリント計画（spec-v11.md §13）

| Sprint | 名称 | 含む機能 ID | 主な完成定義 |
|---|---|---|---|
| **Sprint 8** | v1.1 基盤と起動時データリセット | F-17 / F-08 / F-09 / F-04 / F-16 | v1 由来データ消去、新ホーム骨格、空 gameRegistry、改訂 staircase |
| **Sprint 9** | G-01 変化察知（v1 改修） | F-07（G-01）/ F-10 | G-01 単体プレイ、結果サマリ v1.1 完結 |
| **Sprint 10** | G-02 左右並び傾き判別（v1 改修） | F-07（G-02） | OPT-12 統一フォーマット適用 |
| **Sprint 11** | G-03 周辺視野ハント（v1 改修） | F-07（G-03） | マスクなし・60 秒同時提示型 |
| **Sprint 12** | G-04 コントラスト弁別 | F-07（G-04） | 単体プレイ動作 |
| **Sprint 13** | G-05 空間周波数弁別 | F-07（G-05） | 単体プレイ動作 |
| **Sprint 14** | G-06 ガウス窓サイズ + G-07 エッジ検出 | F-07（G-06、G-07） | 2 ゲーム単体プレイ動作 |
| **Sprint 15** | G-08 残像方位 + G-09 側方マスキング | F-07（G-08、G-09） | Polat 系 Lateral Masking パラダイム |
| **Sprint 16** | G-10 テクスチャ分離 + G-11 Vernier 整列 | F-07（G-10、G-11） | 8×8 grid・上下 Vernier 描画 |
| **Sprint 17** | G-12 クラウディング + G-13 数字探し | F-07（G-12、G-13） | 13 ゲーム全実装完了 |
| **Sprint 18** | 全ゲーム連続コース + ワイドスコア + 進捗グラフ | F-05 / F-11 / F-12 | 13 ゲーム連続実行（約 13 分）、ストリーク稼働 |
| **Sprint 19** | 仕上げ：バッジ・設定・a11y 監査・F-18 リリース選定 | F-13 / F-14 / F-15 / F-18 | リリース候補ビルド |

### 11.3 v1.1 の新ゲーム（10 種、G-04〜G-13）

| ID | 名称（日本語） | 何を弁別するか |
|---|---|---|
| **G-04** | コントラスト弁別（Contrast Discrim） | 2 つのガボールパッチのコントラスト差 |
| **G-05** | 空間周波数弁別（SF Discrim） | 2 つのガボールパッチの空間周波数差 |
| **G-06** | ガウス窓サイズ弁別（Window Size Discrim） | ガボールのエンベロープ（窓サイズ）差 |
| **G-07** | ガボールエッジ検出（Edge Hunt） | 周辺パッチ群の中から「エッジ」状ガボールを検出 |
| **G-08** | 残像方位弁別（Tilt Aftereffect） | 順応後の残像方位を判別 |
| **G-09** | 側方マスキング（Lateral Masking） | 中央 target に対する flanker 抑制／促進。Polat ら 2004/2012 |
| **G-10** | テクスチャ分離（Texture Segmentation） | 同方位背景中の異方位パッチ象限を判別。Karni & Sagi 1991 |
| **G-11** | Vernier 整列判定（Vernier Alignment） | 上下 2 ガボールの水平ズレを判別（ハイパーアキュイティ） |
| **G-12** | クラウディング（Crowding） | target-flanker spacing の限界。Levi & Li 2009 |
| **G-13** | 数字探し（Embedded Numeral） | コントラスト感度。v1 の G-12 から ID 変更（内容据置） |

> v1 の G-01「変化察知」/ G-02「二重表裏判別」→「左右並び傾き判別」改修 / G-03「周辺視野ハント」改修も Sprint 9〜11 で v1.1 仕様に合わせて再実装する。

### 11.4 起動時データリセット（F-17）

v1.1 はクリーンスキーマ前提（A-2）。アプリ起動時に v1 由来のキー（`gaboreye:v1:*`）が残っていたら **全消去 → 完了通知 → v1.1 用キーで初期化** という流れ。

- **対象キー**：v1 の `staircase:game1/2/3` / `sessions` / `trials` / `userProfile` / `dailyStats` / `streak` / `badges` / `settings`（計 10 キー）
- **v1.1 用キー**：`gaboreye:v1.1:*` プレフィックス（spec-v11.md §11）
- 詳細は `src/state/storage-v11.ts`（Sprint 8 セットアップ時に骨格を先行配置済み）を参照

### 11.5 v1.1 セットアップ確認（2026-04-30 / Sprint 8 開始前）

| 項目 | 状態 |
|---|---|
| 既存テスト件数 | **333 件 / 46 ファイル PASS**（v1 完成時 317 → +16 件分は周辺整備） |
| typecheck | PASS |
| build:web | PASS（dist 出力 693 kB） |
| `src/state/storage-v11.ts` | スケルトン配置済み（v1.1 用キー定数 + v1 旧キー一覧） |
| `src/state/storage.ts`（v1） | **無変更**（Sprint 8 で正式に統合する） |
| Sprint 8 自己評価（self-review） | 未作成（Sprint 8 開始時に generator が作成） |

### 11.6 v1.1 開始の合図

Sprint 8 から実装スタート。詳細は `docs/spec-v11.md §13` のスプリント計画と `docs/design-v11/sprints/sprint-8/` の Designer 成果物を参照。

---

## 12. Sprint 8：v1.1 基盤と起動時データリセット

Sprint 8 は v1.1 の基盤スプリント。クリーンルーム再設計の土台を構築。

### 12.1 主な実装

- **F-17 起動時データリセット**：`detectV1LegacyData()` / `clearV1LegacyStorage()` /
  `isDataResetNoticeShown()` / `markDataResetNoticeShown()`（src/state/storage-v11.ts）
- **F-08 gameRegistry**：13 ゲーム全件登録（src/state/gameRegistry.ts）。
  全ゲーム `releaseEnabled=true`（Sprint 8 デフォルト）
- **F-09 staircase v1.1**：セッション間 1 step / 直近 5 セッション平均閾値
  （src/lib/v11/staircaseV11.ts）
- **F-04 ホーム骨格**：HomeScreenV11 + HomeHeroCTA。CTA タップ時は Sprint 18
  プレースホルダ。「単体プレイ」リンクで全ゲーム一覧へ
- **F-16 距離リマインド改訂**：DistanceReminderV11（3 秒カウントダウン自動進行、
  「準備ができました」ボタン廃止）
- **F-01 オンボーディング**：OB-01〜OB-06 + OB-03b の 7 画面フロー
  （src/screens/v11/Onboarding/）。タップ数 5（70 代以上経路で 6）
- **F-02 免責事項**：オンボーディング版（v1 DisclaimerSheet を mode='onboarding' で流用）
- **F-03 視聴距離**：オンボーディング版 OB-04（v1 DistanceCalibrator を流用）
- **AppRouterV11**：v1.1 のルーター。App.tsx を v1 → v1.1 に切替

### 12.2 v1 ソースの扱い

- v1 の `src/navigation/AppRouter.tsx` / `src/screens/HomeScreen.tsx` 等は **削除せず残置**。
  Sprint 9〜17 で各ゲーム実装時に v1 のロジック（gabor 描画・staircase 基盤）を
  再利用する可能性があるため
- v1 の永続化キー `gaboreye:v1:*` を使うコードは v1.1 ランタイムからは呼ばれない
  （AppRouterV11 のみ実行されるため）

### 12.3 動作確認手順

1. `npm run web` でブラウザを開く
2. **初回起動**：オンボーディングが自動表示される（OB-01 ようこそ → 5〜7 画面 → ホーム）
3. **v1 データありで起動**（テストでシミュレート）：
   - DataResetNotice モーダル「最新版へのアップデート」が表示
   - OK タップ → オンボーディングへ
4. **2 回目起動**：通知は出ない、直接ホームへ
5. **ホーム画面**：
   - 「全ゲーム連続プレイ（約 13 分）」プライマリ CTA
   - タップで「Sprint 18 で実装予定」プレースホルダ
   - 「単体プレイ（13 ゲームから）」セカンダリリンク
   - タップで全ゲーム一覧画面へ
6. **全ゲーム一覧**：13 ゲームすべてが「準備中」状態。タップでプレースホルダ
7. **設定 / 進捗グラフ / バッジ**：それぞれプレースホルダ画面（Sprint 18-19 で実装）

### 12.4 永続化キー（v1.1）

| キー | 用途 |
|---|---|
| `gaboreye:v1.1:userProfile` | UserProfileV11 |
| `gaboreye:v1.1:settings` | SettingsV11 |
| `gaboreye:v1.1:streak` | StreakV11 |
| `gaboreye:v1.1:dataResetNoticeShown` | F-17 通知表示済みフラグ |
| `gaboreye:v1.1:staircase:G-04` 等 | 13 ゲーム個別 staircase |
| `gaboreye:v1.1:dailyStats:YYYY-MM-DD` | 日付分割（Sprint 9 以降で書き込み） |
| `gaboreye:v1.1:badge:B-01` 等 | バッジ ID 単位（Sprint 19 以降で書き込み） |

### 12.5 テスト件数（前 → 後）

- 前：333 件 / 46 ファイル
- 後：**465 件 / 56 ファイル**（+132 件 / +10 ファイル、目標 +20 件大幅クリア）
  - `tests/v11/state/gameRegistry.test.ts`（10 件、F-08 受け入れ）
  - `tests/v11/state/storage-v11.test.ts`（27 件、F-17 + 永続化）
  - `tests/v11/lib/staircaseV11.test.ts`（28 件、F-09 受け入れ）
  - `tests/v11/components/DistanceReminderV11.test.tsx`（9 件、F-16）
  - `tests/v11/components/DataResetNotice.test.tsx`（5 件、F-17 UI）
  - `tests/v11/components/HomeHeroCTA.test.tsx`（6 件、F-04 CTA）
  - `tests/v11/screens/HomeScreenV11.test.tsx`（9 件、F-04）
  - `tests/v11/screens/AllGamesListScreen.test.tsx`（8 件、F-04 / F-08 / F-18）
  - `tests/v11/screens/OnboardingFlowV11.test.tsx`（13 件、F-01 / F-02 / F-03）
  - `tests/v11/screens/AppRouterV11.test.tsx`（7 件、起動シーケンス統合）

### 12.6 申し送り（Sprint 9 以降）

- **OB-06 1 試行体験**：現状プレースホルダ。Sprint 12（G-04 実装）以降で実プレイ + 結果サマリ + 完了通知バナーに差し替える
- **`AllGamesListScreen.implementedGameIds`**：Sprint 9 で `['G-01']` を追加。Sprint 17 完了時に全 13 が implemented になる
- **`AppRouterV11.unimplemented` ルート**：Sprint 9 以降、`reminder` → ゲーム画面 → 結果サマリ → 単体プレイ後フッター（components.md §22 SinglePlayPostFooter）の動線を実装する
- **`Settings v1.1`**：v1 の `game3BgmEnabled` フィールドは v1.1 では削除（spec-v11.md §F-14 / 用語集）。Sprint 19 の設定画面実装時に確認
- **DailyStats / SessionRecord / TrialRecord / BadgeStatus**：Sprint 8 ではキー定数のみ。Sprint 9（DailyStats、SessionRecord）/ Sprint 18（フルコース）/ Sprint 19（Badge）で順次本実装
- **`releaseEnabled=false` での挙動検証**：Sprint 19 で実機チェック

---

## 13. Sprint 9：G-01 変化察知の OPT-12 改修 / 共通コンポーネント本実装

Sprint 9 は v1.1 各ゲーム共通コンポーネントを本実装し、最初のゲーム G-01 を OPT-12
統一フォーマットで動かすスプリント。

### 13.1 主な実装

#### v1.1 共通コンポーネント（`src/components/v11/`）

- **`GameStatusBarV11`（GD-1）**：上部 64px、× ボタン + 「残り N 秒」（30px Bold tabular-nums）。
  v1 から「N / M 試行」表記を削除（OPT-12：1 セッション 1 試行）
- **`GamePlaySurface`（GS-1）**：13 ゲーム共通の OPT-12 骨格コンテナ
- **`AnswerChoiceGroup`（AC-1）**：13 ゲーム共通選択肢ボタン群（horizontal-2 / grid-4 / vertical-list 等）。
  選択中＝黄色 4px 枠、再タップで解除（Q5 確定）
- **`ImageChoiceCell`（AC-2）**：グリッド型ゲーム（G-01/G-07/G-10）でパッチ自体が選択肢になるセル
- **`MetricCard`（MC-1）**：F-10 結果サマリの数値カード（閾値・前回比）
- **`ResultSummaryV11`（RS-1）**：13 ゲーム共通結果サマリ。「正解 + 回答 + 閾値 + 前回比」を 1 枚で開示
- **`SinglePlayPostFooter`（FT-1）**：単体プレイ後 3 択（もう一度 / 一覧 / ホーム）。
  ResultSummaryV11 の `isCourseMode=false` 時に自動描画

#### G-01 ゲーム実装（`src/components/v11/games/`、`src/screens/v11/games/`）

- **`MorphGridStimulus`（GE-01）**：3×3〜5×5 グリッドの 60 秒モーフィング描画。
  v1 `GaborGrid` のロジックを `ImageChoiceCell` に分離して再構築
- **`G01ChangeDetectScreen`**：60 秒注視 → 自動採点。確定ボタンなし。
  v1 `Game1Screen` のロジック（`buildGame1Trial` / `gradeGame1` / `isUnattempted`）を
  そのまま流用
- **`G01ResultScreen`**：F-10 結果サマリ画面。`ResultSummaryV11` をラップし
  G-01 固有の正解ラベル（「N 列 M 行目」）と「（正解 K, 誤答 L）」を組み立てる
- **`G01MiniInstructionScreen`**：S9-01 ミニ説明画面（初回のみ）

#### データ層追加（`src/state/storage-v11.ts`）

- `SessionRecordV11` / `TrialRecordV11` の永続化ヘルパー（uuid 単位の個別キー）
- `DailyStatsV11` の永続化（日付分割キー）
- `recordSingleGameSessionV11`：単体ゲーム完了結果を DailyStats に反映
  （sessionCount +1、ベスト閾値は min を採用）
- `loadHistoricalBestThresholdV11`：過去のベスト閾値（今日を除く、F-10 前回比用）

#### G-01 結果ヘルパー（`src/lib/v11/g01Result.ts`）

- `patchIdToJaLabel`：「r1c2」→「3 列 2 行目」
- `buildCorrectAnswerLabel` / `buildUserAnswerLabel`：パッチ ID 群 → 表示文字列
- `buildAnswerCountSummary`：「（正解 N, 誤答 M）」or「未回答」
- `computeDiffFromBest`：直近平均 vs 過去ベスト → MetricDiff（improved / flat / worsened）

#### ルーティング（`AppRouterV11`）

- `IMPLEMENTED_GAME_IDS_V11 = ['G-01']`：G-01 を implemented に追加
- 単体プレイ動線：一覧 → G-01 タップ → ミニ説明（初回のみ）→ 距離リマインド（3s）
  → G-01 プレイ（60s）→ 結果サマリ → 単体プレイ後フッター（一覧 / もう一度 / ホーム）

### 13.2 G-01 の動作確認手順

1. `npm run web` でブラウザを開く
2. ホーム → 「単体プレイ」リンク
3. 「G-01 変化察知」カード（accessibilityState.disabled=false）をタップ
4. **ミニ説明画面**（初回のみ）：5 つの箇条書きを確認 → 「はじめる」
5. **距離リマインド（3 秒）**：自動進行
6. **G-01 プレイ画面**：
   - 上部に「残り 60 秒」（5 秒以下になると 🕐 装飾）
   - 中央に 3×3〜5×5 グリッド（staircase の難度に応じて自動切替）
   - パッチタップで黄色 4px 枠（複数選択可、再タップで解除）
   - **確定ボタンなし**
   - 60 秒間ずっと同じグリッドが表示されモーフィング進行
   - prefers-reduced-motion: reduce 時は 5 段階階段状モーフィング
7. **60 秒経過 → 自動採点**：onComplete 呼び出し → 結果サマリへ
8. **結果サマリ画面**：
   - 「G-01 変化察知 の結果」
   - 「正解は『N 列 M 行目』」（黄色 4px 装飾枠）
   - 「あなたの回答『◯◯』」（不正解時は ⚠ アイコン）
   - 「（正解 K, 誤答 L）」or「未回答」
   - MetricCard ×2：今回の閾値（角度差 °、直近 5 セッション平均）+ 前回比（過去ベスト比較、初回は「初回測定」）
   - SinglePlayPostFooter：「同じゲームをもう一度」（Primary）/「ゲーム一覧へ戻る」（Secondary）/「ホームへ」（Tertiary）
9. **「同じゲームをもう一度」**：reminder 経由で再挑戦（ミニ説明はスキップ）
10. **「ゲーム一覧へ戻る」**：単体プレイ一覧へ
11. **「ホームへ」**：ホームへ

### 13.3 staircase 動作確認

- G-01 の staircase は `gaboreye:v1.1:staircase:G-01` に永続化（spec-v11.md §11）
- 全変化対象を選択かつ FP=0 のときのみ「正解」（applySessionResultV11 'correct'）
- それ以外（未回答 / 部分点 / FP あり）は「不正解」（'incorrect'）→ 易方向（max 方向）へ 1 step
- 連続 3 セッション正解で難方向（min 方向）へ 1 step
- DevTools の Application → Local Storage で `gaboreye:v1.1:staircase:G-01` の値を確認可能

### 13.4 永続化キー（Sprint 9 で追加）

| キー | 用途 |
|---|---|
| `gaboreye:v1.1:dailyStats:YYYY-MM-DD` | 日付分割：その日のセッション件数・ゲーム別ベスト閾値 |
| `gaboreye:v1.1:session:<uuid>` | SessionRecord（Sprint 9 ではヘルパーのみ。AppRouter は未呼出。Sprint 18 で書き込み） |
| `gaboreye:v1.1:trial:<uuid>` | TrialRecord（同上） |

注：Sprint 9 では AppRouterV11 が `recordSingleGameSessionV11()` を呼び `dailyStats` のみ
書き込む。`session:<uuid>` / `trial:<uuid>` のレコード本体は Sprint 18 のフルコース
実装時に書き込む。

### 13.5 テスト件数（前 → 後）

- 前：Sprint 8 完了時 465 件 / 56 ファイル
- 後：**558 件 / 66 ファイル**（+93 件 / +10 ファイル、目標 +15 件大幅クリア）
  - `tests/v11/lib/g01Result.test.ts`（17 件、純関数）
  - `tests/v11/state/storage-v11-session.test.ts`（13 件、SessionRecord / DailyStats）
  - `tests/v11/components/GameStatusBarV11.test.tsx`（10 件、GD-1）
  - `tests/v11/components/AnswerChoiceGroup.test.tsx`（7 件、AC-1）
  - `tests/v11/components/ImageChoiceCell.test.tsx`（6 件、AC-2）
  - `tests/v11/components/MetricCard.test.tsx`（6 件、MC-1）
  - `tests/v11/components/SinglePlayPostFooter.test.tsx`（6 件、FT-1）
  - `tests/v11/components/ResultSummaryV11.test.tsx`（13 件、RS-1）
  - `tests/v11/screens/games/G01ChangeDetectScreen.test.tsx`（5 件）
  - `tests/v11/screens/games/G01ResultScreen.test.tsx`（8 件）
  - `tests/v11/screens/AppRouterV11.test.tsx`（+2 件、G-01 動線）

### 13.6 申し送り（Sprint 10 以降）

- **G-02 / G-03**：Sprint 10 / 11 で G-02・G-03 を OPT-12 統一フォーマットで実装。
  共通コンポーネントは Sprint 9 で本実装済みのため、各ゲームは：
  1. `GE-XX` 刺激描画コンポーネント（左右 2 ガボール / 周辺 8 ガボール等）
  2. ゲーム個別 Screen（`src/screens/v11/games/GXXScreen.tsx`）
  3. ゲーム個別結果ラベルヘルパー（`src/lib/v11/gXXResult.ts`）
  4. AppRouterV11 のルート追加（`{name: 'gXX-play'}` / `{name: 'gXX-result'}`）
  5. `IMPLEMENTED_GAME_IDS_V11` に追加
- **OB-06 1 試行体験の差し替え**：Sprint 12（G-04）以降で実プレイに差し替え可能。
  Sprint 9 では `G01ChangeDetectScreen` を組み込まなかった（OB-06 はプレースホルダ
  のまま、Sprint 12 か Sprint 9 generator 判断で G-01 採用）
- **MorphGridStimulus の正解ハイライト**：Sprint 9 では結果サマリ側の MetricCard
  上で「N 列 M 行目」テキストとして開示するに留めた。screens.md §3「実際の変化箇所
  を拡大ハイライト 1.5 秒」の Animated.View ベース演出は Sprint 19 a11y 監査時に
  追加検討（prefers-reduced-motion 連動）
- **コース時の自動進行カウントダウン**：`ResultSummaryV11.countdownSeconds` の
  値表示はあるが、自動進行ロジック本体は Sprint 18（F-05 全ゲーム連続コース）で
  実装する
- **AppRouterV11 の `unimplemented` 利用ゲーム**：G-02〜G-13 はまだプレースホルダ
- **Wide Score 算出 / バッジ判定**：Sprint 9 ではスコープ外。Sprint 18 / 19

---

## 14. Sprint 10：G-02 左右並び傾き判別の OPT-12 改修

Sprint 9 で本実装した v1.1 共通コンポーネントを使い、**G-02 左右並び傾き判別**を
OPT-12 統一フォーマット（1 試行 60 秒、確定ボタンなし、自由回答変更可）で動かす。

### 14.1 起動方法

Sprint 8〜9 と同様に `npm run web` で起動。

1. ホーム → 「単体プレイ（13 ゲームから）」
2. 全ゲーム一覧で **G-02 左右並び傾き判別**をタップ（disabled 表示なし）
3. **G-02 ミニ説明（S10-01）**：5 つの箇条書き（60 秒 / 左右タップ / 何度でも変更可 /
   確定ボタンなし / 60 秒経過時の選択が回答）→「はじめる」
4. **距離リマインド（3 秒）**：自動進行
5. **G-02 プレイ画面（S10-02）**：
   - 上部：✕ + 「残り 60 秒」（5 秒以下で 🕐 装飾）
   - 中央：左右 2 ガボール 60 秒同時提示（点滅・マスク・フェードなし）+ 中央固視点「+」
   - パッチ自体タップ or 下部「左」「右」ボタンで回答（黄 4px 枠）
   - 再タップで解除、別タップで切替（radio 動作、複数選択不可）
   - **確定ボタンなし**
   - 60 秒経過 → 自動採点
6. **G-02 結果サマリ（S10-03）**：
   - 「正解は『左/右』」（黄 4px 装飾枠）
   - 「あなたの回答『左/右/未回答』」（不正解時 ⚠）
   - MetricCard ×2：今回の閾値（°、直近 5 セッション平均）+ 前回比
   - SinglePlayPostFooter：「同じゲームをもう一度」/「ゲーム一覧へ戻る」/「ホームへ」
7. **再挑戦シナリオ**：「同じゲームをもう一度」→ reminder（ミニ説明スキップ）→ プレイ
8. **× ボタン中断シナリオ**：プレイ中に × → 確認ダイアログ → 「中断する」 → 一覧へ戻る

### 14.2 staircase 動作

- gameRegistry G-02：`paramRange={min:1, max:10, initial:6, step:1}`
- 不正解 → +1°（易方向、max 方向）、3 連続正解 → -1°（難方向、min 方向）
- 永続化キー：`gaboreye:v1.1:staircase:G-02`
- 閾値推定：直近 5 セッションの paramValue 平均

### 14.3 ファイル一覧（Sprint 10 で追加・更新）

新規（ロジック層）：
- `src/lib/v11/g02Trial.ts`：trial 生成 / 採点 / レイアウト計算
- `src/lib/v11/g02Result.ts`：結果サマリ用ラベル組立 / 前回比 diff

新規（UI 層）：
- `src/components/v11/games/SideBySideStimulus.tsx`：GE-02、左右並びガボール（タップ可）
- `src/screens/v11/games/G02SideBySideTiltScreen.tsx`：プレイ画面
- `src/screens/v11/games/G02ResultScreen.tsx`：結果サマリラッパー
- `src/screens/v11/games/G02MiniInstructionScreen.tsx`：S10-01 ミニ説明

更新：
- `src/navigation/v11/AppRouterV11.tsx`：`IMPLEMENTED_GAME_IDS_V11=['G-01', 'G-02']`、
  G-02 のルート（`g02-instruction` / `g02-play` / `g02-result`）を追加
- `src/components/v11/ImageChoiceCell.tsx`：M-1 修正（aria-checked 動的更新の確認・コメント補強）
- `src/components/v11/MetricCard.tsx`：m-3 修正（showInitialMeasurementHint prop で「今回の閾値」での冗長表示を抑止）
- `src/components/v11/ResultSummaryV11.tsx`：「今回の閾値」MetricCard に
  showInitialMeasurementHint=false を渡す

### 14.4 テスト件数（前 → 後）

- 前：Sprint 9 完了時 558 件 / 66 ファイル
- 後：**636 件 / 72 ファイル**（+78 件 / +6 ファイル、目標 +15 件を大幅クリア）
  - `tests/v11/lib/g02Trial.test.ts`（23 件、trial 生成 / 採点 / レイアウト）
  - `tests/v11/lib/g02Result.test.ts`（13 件、結果ラベル / 前回比）
  - `tests/v11/components/games/SideBySideStimulus.test.tsx`（8 件、GE-02 描画 / 選択 / M-1）
  - `tests/v11/screens/games/G02SideBySideTiltScreen.test.tsx`（11 件、F-07 / OPT-12 / staircase）
  - `tests/v11/screens/games/G02ResultScreen.test.tsx`（11 件、F-10 結果サマリ）
  - `tests/v11/screens/games/G02MiniInstructionScreen.test.tsx`（4 件、S10-01）
  - `tests/v11/components/ImageChoiceCell.test.tsx`（+3 件、M-1 動的 aria-checked 検証）
  - `tests/v11/components/MetricCard.test.tsx`（+2 件、m-3 showInitialMeasurementHint 検証）
  - `tests/v11/screens/AppRouterV11.test.tsx`（+3 件、G-02 動線）

### 14.5 申し送り（Sprint 11 以降）

- **G-03 周辺視野ハント**：Sprint 11 で同パターン（共通コンポーネントは流用、
  `GE-03 RadialEightStimulus` / `clock-8` 選択肢ボタンを新規追加）
- **AnswerChoiceGroup の `clock-8` / `keypad-10` レイアウト**：Sprint 11（G-03）/
  Sprint 17（G-13）で AC-3 / AC-4 として追加実装する
- **正解開示の拡大ハイライト 1.5 秒**：screens.md §4 では「正解側のパッチを 1.5 秒
  拡大ハイライト」が指定されている。Sprint 10 では SideBySideStimulus に
  `highlightSide` prop を用意したが、結果サマリ側での Animated.View 演出は未実装
  （prefers-reduced-motion 連動は Sprint 19 a11y 監査時に検討）
- **G-02 ミニ説明の OB-06 採用検討**：Sprint 10 では OB-06「1 試行体験」は
  プレースホルダのまま。G-02 を 60 秒体験させると重いため、Sprint 12（G-04
  コントラスト弁別、ミニ版）採用が引き続き有力
- **GamePlaySurface の SR 隔離と testID 走査**：GamePlaySurface の stimulusFrame は
  `accessibilityElementsHidden` を持つため、内部に置いた testID は
  `@testing-library/react-native` の `findByTestId` から到達できない。
  Sprint 10 ではこの制約を受け入れ、stimulus 内部の動作テストは単体テスト
  （SideBySideStimulus.test.tsx）で担保する設計に統一した。Sprint 11 以降の
  ゲーム個別 Screen テストでも同方針を踏襲する

---

## 15. Sprint 11：G-03 周辺視野ハントの OPT-12 改修

Sprint 11 では v1 Game 3（マスク 200ms / 40 試行ループ）を **v1.1 OPT-12 統一**
フォーマットに沿って改修。
- 1 試行 = 60 秒固定（早期終了不可、OPT-11 / OPT-12）
- 中央固視点 + 円周 8 ガボール 60 秒同時提示（マスクなし、点滅なし、フェードなし）
- 8 ガボールのうち 1 個（odd one）が他と異なる向き
- 各ガボール直接タップ or 8 択時計方向ボタン（clock-8）で回答
- 再タップで解除、別を押すと切替（複数選択不可、radio 規約）
- 確定ボタンなし、60 秒経過で自動採点
- staircase は **odd one の向き差**（°）のみ。離心角は 8° 固定（Sprint 10 / G-02 と
  同じパターン、提示時間 staircase / 離心角 staircase は v1.1 で廃止）
- 採点後は正解位置を矢印で 1.5 秒提示 + 該当パッチを 1.5 秒拡大ハイライト

### 15.1 起動方法

```bash
npm run web
```

1. ホーム → 「単体プレイ」 → 「G-03 周辺視野ハント」
2. 初回のみミニ説明（5 つの注意点）→ 「はじめる」
3. 距離リマインド（3 秒カウントダウン）
4. プレイ画面：60 秒間ずっと中央固視点 + 円周 8 ガボールが表示
   - 各ガボールを直接タップして回答可
   - 8 択ボタン（12 / 1:30 / 3 / 4:30 / 6 / 7:30 / 9 / 10:30）でも回答可
   - キーボード 1〜8 キー（1=12 時、2=1:30、…、8=10:30）でも選択可
   - 何度でもタップで切替、選択中のものを再タップで解除
   - 60 秒経過で自動採点
5. 結果画面：「正解は『3 時の方向』」+ 矢印 + 拡大ハイライト + 閾値カード + 前回比カード
6. 「同じゲームをもう一度」/「一覧へ戻る」/「ホームへ」の 3 ボタン

### 15.2 staircase 動作

- 初期パラメータ：25°（gameRegistry G-03、`paramRange.initial=25`）
- min/max：5°（難）/ 45°（易）
- step：2°
- 連続 3 セッション正解 → 1 step 難方向（25 → 23 → 21 → ...）
- 不正解 → 即座に 1 step 易方向
- 閾値 = 直近 5 セッションのプレイ済みパラメータ平均

### 15.3 ファイル一覧（Sprint 11 で追加・更新）

新規：
- `src/lib/v11/g03Trial.ts`（trial 生成・採点・clock 位置変換・レイアウト計算）
- `src/lib/v11/g03Result.ts`（結果サマリ用ヘルパー）
- `src/components/v11/games/RadialEightStimulus.tsx`（GE-03、8 ガボール円周 +
  固視点 + 矢印演出）
- `src/screens/v11/games/G03PeripheralHuntScreen.tsx`（プレイ画面、S11-02）
- `src/screens/v11/games/G03ResultScreen.tsx`（結果サマリ、S11-03）
- `src/screens/v11/games/G03MiniInstructionScreen.tsx`（ミニ説明、S11-01）

更新：
- `src/components/v11/AnswerChoiceGroup.tsx`：`layout="clock-8"` を追加
  （AC-3 ClockChoiceLayout 相当、8 ボタン文字盤型絶対配置 + キーボード 1〜8 連動）
- `src/navigation/v11/AppRouterV11.tsx`：G-03 ルート（instruction / play / result）
  追加、`IMPLEMENTED_GAME_IDS_V11` に `'G-03'` を追加

### 15.4 テスト件数（前 → 後）

| 領域 | Sprint 10 | Sprint 11 | 差分 |
|---|---|---|---|
| 全テスト | 679 | 771 | +92 |

新規テストの内訳：
- `tests/v11/lib/g03Trial.test.ts`（+33 件、trial 生成 / 採点 / clock 変換 /
  レイアウト計算）
- `tests/v11/lib/g03Result.test.ts`（+10 件、ラベル / detail / diff）
- `tests/v11/components/games/RadialEightStimulus.test.tsx`（+11 件、8 配置 /
  選択 / aria-checked / 矢印 / disabled）
- `tests/v11/components/AnswerChoiceGroup.test.tsx`（+11 件、clock-8 layout：
  8 ボタン / aria-label / aria-checked / 切替 / disabled / サイズ）
- `tests/v11/screens/games/G03PeripheralHuntScreen.test.tsx`（+10 件、画面骨格 /
  確定ボタンなし / 60 秒自動採点 / 採点正答 / 切替 / staircase）
- `tests/v11/screens/games/G03ResultScreen.test.tsx`（+15 件、正解 / 不正解 /
  未回答 / 閾値表示 / 矢印 / 改善 / 各時計位置 8 件）
- `tests/v11/screens/games/G03MiniInstructionScreen.test.tsx`（+4 件、ヘッダ /
  リスト / はじめる / 戻る）

### 15.5 申し送り（Sprint 12 以降）

- **G-04 コントラスト弁別**：Sprint 12 で実装。GE-04 `ContrastDiscrimStimulus` は
  GE-02 SideBySideStimulus と同レイアウト（左右 2 ガボール）。共通要素はほぼ流用可、
  staircase はコントラスト差（0.05〜0.30、初期 0.15、step 0.02）。
  AC-2 horizontal-2（既実装）をそのまま使えるため新規共通要素はゼロ
  に近い見込み（楽なスプリント）
- **AnswerChoiceGroup clock-8 の汎用化**：本実装で `layout="clock-8"` を追加した
  が、内部実装は `ClockEightLayout` という別コンポーネントとして書いた。今後
  G-04〜G-13 では使われない予定。AC-4 keypad-10（G-13）も同パターンで別レイアウト
  実装を AnswerChoiceGroup 内に追加する想定
- **G-02 ミニ説明の OB-06 採用検討**：引き続き G-04 採用が有力（Sprint 12）
- **GamePlaySurface 内部の testID 不可視問題**：Sprint 11 でも同方針を踏襲。
  ガボール領域内部の動作確認は `RadialEightStimulus.test.tsx` 単体テストで完結。
  Screen テストは「画面骨格 + 回答領域」のみカバー
- **正解開示の Animated 拡大演出**：Sprint 11 では `RadialEightStimulus` 内に
  scale アニメーション（1→1.18→1）を埋め込み実装。prefers-reduced-motion 時は
  scale=1 固定で黄 4px 枠のみで開示（Sprint 10 SideBySideStimulus と同設計）

## 16. Sprint 12：G-04 コントラスト弁別（OPT-12 / GE-02 流用）

Sprint 12 では新規ゲーム G-04 を実装。GE-04 `ContrastDiscrimStimulus` は GE-02
`SideBySideStimulus` と同レイアウト（左右 2 ガボール）であり、components.md §15
GE-04 の規定に従って **`SideBySideStimulus` を新規コンポーネント化せずに再利用**
する設計とした。staircase は「コントラスト差」（角度ではなく）。

- 1 試行 = 60 秒固定（早期終了不可、OPT-11 / OPT-12）
- 左右 2 ガボール 60 秒同時提示（マスクなし、点滅なし、フェードなし）
- 向き・cpd は左右同一、コントラストのみ可変
- 「左が濃い」/「右が濃い」ボタン or 各パッチ直接タップで回答
- 再タップで解除、別を押すと切替（複数選択不可、radio 規約）
- 確定ボタンなし、60 秒経過で自動採点
- staircase は **コントラスト差**（min=0.05 難、max=0.30 易、initial=0.15、step=0.02）
- 採点後は正解側パッチを 1.5 秒拡大ハイライト（GE-02 と同じ Animated.scale 演出）

### 16.1 起動方法

```bash
npm run web
```

1. ホーム → 「単体プレイ」 → 「G-04 コントラスト弁別」
2. 初回のみミニ説明（4 つの注意点）→ 「はじめる」
3. 距離リマインド（3 秒カウントダウン）
4. プレイ画面：60 秒間ずっと左右 2 ガボール（中央固視点 + コントラスト差）が表示
   - 左右パッチを直接タップして回答可
   - 「左が濃い」/「右が濃い」ボタンでも回答可
   - 何度でもタップで切替、選択中のものを再タップで解除
   - 60 秒経過で自動採点
5. 結果画面：「正解は『右が濃い』」+ 拡大ハイライト + 閾値カード（小数 2 桁）+ 前回比カード
6. 「同じゲームをもう一度」/「一覧へ戻る」/「ホームへ」の 3 ボタン

### 16.2 staircase 動作

- 初期パラメータ：0.15（gameRegistry G-04、`paramRange.initial=0.15`）
- min/max：0.05（難・低差）/ 0.30（易・大差）
- step：0.02
- 連続 3 セッション正解 → 1 step 難方向（0.15 → 0.13 → 0.11 → ...）
- 不正解 → 即座に 1 step 易方向（0.15 → 0.17）
- 閾値 = 直近 5 セッションのプレイ済みパラメータ平均（小数 2 桁丸め）
- 浮動小数点誤差は `clampContrast` の `Math.round * 1_000_000` と画面側 `round2` で吸収

### 16.3 ファイル一覧（Sprint 12 で追加・更新）

新規：
- `src/lib/v11/g04Trial.ts`（trial 生成・採点・コントラストクランプ・レイアウト計算）
- `src/lib/v11/g04Result.ts`（結果サマリ用ヘルパー、digits=2 / step=0.02）
- `src/screens/v11/games/G04ContrastDiscrimScreen.tsx`（プレイ画面、S12-02）
- `src/screens/v11/games/G04ResultScreen.tsx`（結果サマリ、S12-03）
- `src/screens/v11/games/G04MiniInstructionScreen.tsx`（ミニ説明、S12-01）

更新：
- `src/navigation/v11/AppRouterV11.tsx`：G-04 ルート（instruction / play / result）
  追加、`IMPLEMENTED_GAME_IDS_V11` に `'G-04'` を追加、PlaceholderScreen 文言更新
- `tests/v11/screens/AppRouterV11.test.tsx`：「準備中ゲーム」テストを G-04 → G-05 に
  差し替え（G-04 は実装済みになったため）

注：GE-04 専用コンポーネントは作成せず、`src/components/v11/games/SideBySideStimulus.tsx`
（GE-02）を G02GaborSpec 構造的型互換で再利用。G04GaborSpec / G04Side は同型のため
TypeScript の structural typing で受け入れられる。

### 16.4 テスト件数（前 → 後）

| 領域 | Sprint 11 | Sprint 12 | 差分 |
|---|---|---|---|
| 全テスト | 771 | 855 | +84 |
| Suite | 80 | 85 | +5 |

新規テストの内訳：
- `tests/v11/lib/g04Trial.test.ts`（+39 件、trial 生成 / 採点 / 左右コントラスト
  ペア / レスポンシブ / staircase 全レンジ）
- `tests/v11/lib/g04Result.test.ts`（+13 件、ラベル / detail / diff、digits=2、
  step=0.02）
- `tests/v11/screens/games/G04ContrastDiscrimScreen.test.tsx`（+12 件、画面骨格 /
  確定ボタンなし / ガイド文 / 採点正答 / 切替 / staircase 0.15→0.17 / 閾値桁）
- `tests/v11/screens/games/G04ResultScreen.test.tsx`（+15 件、正解 / 不正解 /
  未回答 / 閾値 0.15 表示 / コントラスト差単位 / SideBySideStimulus 埋め込み /
  highlightSide 連動 / 0.05 桁落ちなし）
- `tests/v11/screens/games/G04MiniInstructionScreen.test.tsx`（+5 件、ヘッダ /
  リスト 4 項 / はじめる / 戻る / タイトル）

### 16.5 申し送り（Sprint 13 以降）

- **G-05 空間周波数弁別**：Sprint 13 で実装。GE-05 SFDiscrimStimulus も GE-02 と
  同レイアウト（左右 2 ガボール）。staircase は cpd 比（1.1〜2.0、初期 1.5、
  step 0.1）。Sprint 12 の G-04 とほぼ同型のため流用可
- **G-06 ガウス窓サイズ弁別 / G-07 ガボールエッジ検出**：Sprint 14 で実装
- **GE-04 構造的型互換**：本実装では `G04GaborSpec` / `G04Side` を新規定義した
  うえで、TypeScript の structural typing により `SideBySideStimulus`（GE-02）を
  そのまま再利用した。Sprint 13〜14 の G-05 / G-06 でも同じパターンで再利用予定
- **コントラスト差の浮動小数点誤差**：JavaScript 二進浮動小数で `0.15 + 0.02 ≠ 0.17`
  になる問題を、`g04Trial.clampContrast` の `Math.round(v * 1_000_000) / 1_000_000`
  と画面側の `round2`（× 100 → Math.round → ÷ 100）の二段階で吸収。テストは
  `toBeCloseTo` で許容
- **共通基盤の安定**：Sprint 9〜12 で確立した GamePlaySurface / ResultSummaryV11 /
  SinglePlayPostFooter / ImageChoiceCell / MetricCard / AnswerChoiceGroup
  （horizontal-2, grid-4, vertical-list, clock-8）/ SideBySideStimulus は
  Sprint 13 以降も基本変更なしで使い回す方針。新規追加が必要なのは AC-4 keypad-10
  （G-13、Sprint 17）のみ

## 17. Sprint 13：G-05 空間周波数弁別（OPT-12 / GE-02 流用 + aria-label 改修）

Sprint 13 では新規ゲーム G-05 を実装。GE-05 `SFDiscrimStimulus` は GE-02 / GE-04
と同レイアウト（左右 2 ガボール）であり、design-v11 sprint-13/screens.md §3 の
規定に従って **`SideBySideStimulus` を新規コンポーネント化せずに再利用**する設計
とした。staircase は「cpd 比」（コントラスト差や角度差ではなく）。

加えて、Sprint 12 self-review §6.2 で予告した `SideBySideStimulus` の
**aria-label 共通改修**を本スプリントで同時実施した（後方互換、optional prop
追加方式）。

- 1 試行 = 60 秒固定（早期終了不可、OPT-11 / OPT-12）
- 左右 2 ガボール 60 秒同時提示（マスクなし、点滅なし、フェードなし）
- 向き・コントラストは左右同一、cpd のみ可変
- 「左が細かい」/「右が細かい」ボタン or 各パッチ直接タップで回答
- 再タップで解除、別を押すと切替（複数選択不可、radio 規約）
- 確定ボタンなし、60 秒経過で自動採点
- staircase は **cpd 比**（min=1.1 難、max=2.0 易、initial=1.5、step=0.1）
- 採点後は正解側パッチを 1.5 秒拡大ハイライト（GE-02 / GE-04 と同じ Animated.scale 演出）

### 17.1 起動方法

```bash
npm run web
```

1. ホーム → 「単体プレイ」 → 「G-05 空間周波数弁別」
2. 初回のみミニ説明（4 つの注意点）→ 「はじめる」
3. 距離リマインド（3 秒カウントダウン）
4. プレイ画面：60 秒間ずっと左右 2 ガボール（中央固視点 + cpd 比）が表示
   - 左右パッチを直接タップして回答可
   - 「左が細かい」/「右が細かい」ボタンでも回答可
   - 何度でもタップで切替、選択中のものを再タップで解除
   - 60 秒経過で自動採点
5. 結果画面：「正解は『右が細かい』」+ 拡大ハイライト + 閾値カード（小数 1 桁）+ 前回比カード
6. 「同じゲームをもう一度」/「一覧へ戻る」/「ホームへ」の 3 ボタン

### 17.2 staircase 動作

- 初期パラメータ：1.5（gameRegistry G-05、`paramRange.initial=1.5`）
- min/max：1.1（難・小差）/ 2.0（易・大差）
- step：0.1
- 連続 3 セッション正解 → 1 step 難方向（1.5 → 1.4 → 1.3 → ...）
- 不正解 → 即座に 1 step 易方向（1.5 → 1.6）
- 閾値 = 直近 5 セッションのプレイ済みパラメータ平均（小数 1 桁丸め）
- 浮動小数点誤差は `clampCpd` / `roundRatio` の `Math.round * 1_000_000` と
  画面側 `round1` で吸収

### 17.3 ファイル一覧（Sprint 13 で追加・更新）

新規：
- `src/lib/v11/g05Trial.ts`（trial 生成・採点・cpd クランプ・レイアウト計算）
- `src/lib/v11/g05Result.ts`（結果サマリ用ヘルパー、digits=1 / step=0.1）
- `src/screens/v11/games/G05SfDiscrimScreen.tsx`（プレイ画面、S13-02）
- `src/screens/v11/games/G05ResultScreen.tsx`（結果サマリ、S13-03）
- `src/screens/v11/games/G05MiniInstructionScreen.tsx`（ミニ説明、S13-01）

更新：
- `src/components/v11/games/SideBySideStimulus.tsx`：(a) `leftAriaLabel` /
  `rightAriaLabel` / `groupAriaLabel` の optional prop 追加（後方互換、Evaluator
  Sprint 12 推奨改修）; (b) `left` / `right` prop 型を `StimulusGaborSpec`
  （cpd: number 受け）に一般化
- `src/components/GaborPatch.tsx`：`cpd` 型を `1.5 | 3 | 6 | 9` literal union
  → `number` に緩和（v1 用途は変わらず動作）
- `src/screens/v11/games/G02SideBySideTiltScreen.tsx`：aria-label を明示化
  （既定値と同等、後方互換）
- `src/screens/v11/games/G04ContrastDiscrimScreen.tsx`：G-04 文脈の aria-label
  「濃い」を明示指定
- `src/screens/v11/games/G04ResultScreen.tsx`：G-04 結果開示の aria-label を
  明示指定
- `src/navigation/v11/AppRouterV11.tsx`：G-05 ルート（instruction / play / result）
  追加、`IMPLEMENTED_GAME_IDS_V11` に `'G-05'` を追加、PlaceholderScreen 文言更新
- `tests/v11/screens/AppRouterV11.test.tsx`：「準備中ゲーム」テストを G-05 → G-06
  に差し替え（G-05 は実装済みになったため）

注：GE-05 専用コンポーネントは作成せず、`src/components/v11/games/SideBySideStimulus.tsx`
（GE-02）を構造的型互換で再利用。`SideBySideStimulus` の `cpd` 受け入れ型を
`number` に緩めることで、G-05 の連続 cpd 比に対応した。

### 17.4 テスト件数（前 → 後）

| 領域 | Sprint 12 | Sprint 13 | 差分 |
|---|---|---|---|
| 全テスト | 855 | 950 | +95 |
| Suite | 85 | 90 | +5 |

新規テストの内訳：
- `tests/v11/lib/g05Trial.test.ts`（+36 件、trial 生成 / 採点 / 左右 cpd ペア /
  レスポンシブ / staircase 全レンジ / 比 < 1 のクランプ動作）
- `tests/v11/lib/g05Result.test.ts`（+19 件、ラベル / detail / diff、digits=1、
  step=0.1）
- `tests/v11/screens/games/G05SfDiscrimScreen.test.tsx`（+13 件、画面骨格 /
  確定ボタンなし / ガイド文 / 採点正答 / 切替 / staircase 1.5→1.6 / 閾値桁 /
  max=2.0 でのクランプ）
- `tests/v11/screens/games/G05ResultScreen.test.tsx`（+16 件、正解 / 不正解 /
  未回答 / 閾値 1.5 表示 / cpd 比単位 / SideBySideStimulus 埋め込み /
  highlightSide 連動 / 1.1 桁落ちなし / 2.0 末尾ゼロ保持）
- `tests/v11/screens/games/G05MiniInstructionScreen.test.tsx`（+5 件、ヘッダ /
  リスト 4 項 / はじめる / 戻る / タイトル）
- `tests/v11/components/games/SideBySideStimulus.test.tsx` 追記（+6 件、
  既定 aria-label 後方互換 / G-04「濃い」上書き / G-05「細かい」上書き /
  groupAriaLabel デフォルト + 上書き / 部分指定）

### 17.5 SideBySideStimulus aria-label 改修（Sprint 12 持ち越し対応）

Sprint 12 self-review §6.2 で予告した「aria-label が GE-02 由来文面（時計回り）
固定」問題を本スプリントで解消。

#### 改修内容（後方互換、破壊的変更なし）

| 追加 prop | 既定値 | 用途 |
|---|---|---|
| `leftAriaLabel?: string` | `'左の縞模様（タップで「左が時計回り」と回答）'` | 左パッチのアクセシブル名 |
| `rightAriaLabel?: string` | `'右の縞模様（タップで「右が時計回り」と回答）'` | 右パッチのアクセシブル名 |
| `groupAriaLabel?: string` | `'左右の縞模様（時計回りに傾いている方を選んでください）'` | radiogroup のアクセシブル名 |

#### 各画面の文面

| 画面 | 文脈 |
|---|---|
| G-02 プレイ / 結果 | 「時計回り」（既定値と同等） |
| G-04 プレイ / 結果 | 「濃い」 |
| G-05 プレイ / 結果 | 「細かい」 |

ガボール領域全体は依然として `accessibilityElementsHidden=true` 配下にあり、
SR からは直接読み上げられない（既存仕様維持）。aria-label は将来 SR 解放時の
整合性のため整備した。既存 `SideBySideStimulus` 単体テスト 12 件は無変更で
全件 PASS（後方互換）。

### 17.6 申し送り（Sprint 14 以降）

- **G-06 ガウス窓サイズ弁別**：Sprint 14 で実装。GE-06 SizeDiscrimStimulus も
  GE-02 と同レイアウト（左右 2 ガボール）。staircase は SD 比（1.1〜2.0、
  初期 1.5、step 0.1）。Sprint 13 の G-05 とほぼ同型のため流用可。
  `GaborPatchProps.sigmaDeg` の型は元から `number` なので追加緩和は不要
- **G-07 ガボールエッジ検出**：Sprint 14 で実装。新規 GE-07 EdgeHuntStimulus
  （4×4 grid）が必要、Sprint 9 の G-01 `MorphGridStimulus` を参考に作る
- **GaborPatch / SideBySideStimulus の cpd 型緩和**：Sprint 13 で
  `cpd: 1.5 | 3 | 6 | 9` → `cpd: number` に緩和（後方互換）。既存呼び出しは
  すべて 4 段階の数値を渡しているため挙動変化なし
- **共通基盤の安定**：Sprint 9〜13 で確立した GamePlaySurface / ResultSummaryV11 /
  SinglePlayPostFooter / ImageChoiceCell / MetricCard / AnswerChoiceGroup
  （horizontal-2, grid-4, vertical-list, clock-8）/ SideBySideStimulus
  （aria-label 改修済、cpd: number 受け付け）は Sprint 14 以降も基本変更なしで
  使い回す方針。新規追加が必要なのは AC-4 keypad-10（G-13、Sprint 17）と
  GE-07 EdgeHuntStimulus（Sprint 14）

## 18. Sprint 14：G-06 ガウス窓サイズ弁別 + G-07 ガボールエッジ検出（2 ゲーム複合）

Sprint 14 では新規 2 ゲーム G-06 / G-07 を実装。G-06 は GE-02 系（SideBySideStimulus）
の流用で楽な実装、G-07 は新規 GE-07 GaborGridStimulus（4×4 グリッド）で負荷が高い構成。
両ゲームとも v1.1 OPT-12 統一フォーマットに従って実装。

### 18.1 起動方法

Sprint 13 と同じ：

```bash
npm install
npm run web      # Web 開発サーバ
npm run typecheck
npm test         # 1146 件 / 101 suites
npm run build:web
```

ホーム → 「単体プレイ」 → G-06 / G-07 のカードをタップでプレイ可能。

### 18.2 動作確認手順

#### G-06 ガウス窓サイズ弁別

1. ホーム → 単体プレイ → 「G-06 ガウス窓サイズ弁別」 → ミニ説明 → 「はじめる」
2. 距離リマインド 3 秒 → プレイ画面（左右 2 ガボール、cpd・コントラスト・向き同一、
   ガウス窓 SD のみ異なる、SD 比 1.5 で初期表示）+ 中央固視点 + 残り 60 秒カウントダウン
3. 左右パッチ直接タップ or 「左が大きい」「右が大きい」ボタンで回答
4. 再タップで解除、別を押すと切替
5. 60 秒経過で自動採点 → 結果画面：
   - 「正解は『右が大きい』」+ 拡大ハイライト（黄 4px 枠 + 1.5 秒 scale 1→1.18→1）
   - 「あなたの回答『右が大きい』」/ 「未回答」
   - 「閾値 1.5 SD 比」+ 「初回測定」または「+0.1 やや低下」等
   - フッター 3 ボタン：「同じゲームをもう一度」/「ゲーム一覧へ戻る」/「ホームへ」

#### G-07 ガボールエッジ検出

1. ホーム → 単体プレイ → 「G-07 ガボールエッジ検出」 → ミニ説明 → 「はじめる」
2. 距離リマインド 3 秒 → プレイ画面（4×4 = 16 ガボール盤面）
3. 16 個のうち 3 個が同じ向き・同一線上（10 直線：行 4 / 列 4 / 対角 2、各 4 セルから
   3 個選択 = 計 40 線パターン）。残り 13 個はノイズ（基準向きから少なくとも
   `paramValueDeg`° 離れたランダム向き）
4. 各セルを直接タップで選択（複数選択可、checkbox 系）、再タップで解除
5. 60 秒経過で自動採点：
   - 正解 3 個をすべて選択 = 正解（isCorrect=true）
   - 1 個でも誤り or 欠落で不正解
6. 結果画面：
   - 「正解は『2 行 2 列・3 行 3 列・4 行 4 列』」（具体的な 3 セル位置）
   - 「あなたの回答『3/3 個正解』」/「2/3 個正解（1 過剰）」/「未回答」
   - 4×4 グリッド再表示で正解 3 セル拡大ハイライト
   - 「閾値 5 向きズレ°」（整数）

### 18.3 ファイル一覧（Sprint 14 で追加・更新）

#### 新規（13 ファイル）

##### G-06（5 ファイル）
- `src/lib/v11/g06Trial.ts` — trial 生成 / 採点 / SD 比分配 / レイアウト
- `src/lib/v11/g06Result.ts` — 結果ラベル + diff（digits=1 / step=0.1）
- `src/screens/v11/games/G06WindowSizeScreen.tsx` — S14-02 プレイ
- `src/screens/v11/games/G06ResultScreen.tsx` — S14-03 結果
- `src/screens/v11/games/G06MiniInstructionScreen.tsx` — S14-01 ミニ説明

##### G-07（6 ファイル）
- `src/lib/v11/g07Trial.ts` — trial 生成（10 直線列挙、ジッタ）/ 採点（集合一致）
- `src/lib/v11/g07Result.ts` — 結果ラベル（位置連結 / 数値内訳）+ diff（digits=0 / step=1）
- `src/components/v11/games/GaborGridStimulus.tsx` — **GE-07 4×4 グリッド、checkbox 系**
- `src/screens/v11/games/G07EdgeHuntScreen.tsx` — S14-05 プレイ
- `src/screens/v11/games/G07ResultScreen.tsx` — S14-06 結果
- `src/screens/v11/games/G07MiniInstructionScreen.tsx` — S14-04 ミニ説明

##### テスト（11 ファイル、+196 件）
| ファイル | 件数 |
|---|---|
| `tests/v11/lib/g06Trial.test.ts` | 36 |
| `tests/v11/lib/g06Result.test.ts` | 19 |
| `tests/v11/lib/g07Trial.test.ts` | 47 |
| `tests/v11/lib/g07Result.test.ts` | 14 |
| `tests/v11/components/games/GaborGridStimulus.test.tsx` | 13 |
| `tests/v11/screens/games/G06MiniInstructionScreen.test.tsx` | 5 |
| `tests/v11/screens/games/G06WindowSizeScreen.test.tsx` | 13 |
| `tests/v11/screens/games/G06ResultScreen.test.tsx` | 15 |
| `tests/v11/screens/games/G07MiniInstructionScreen.test.tsx` | 5 |
| `tests/v11/screens/games/G07EdgeHuntScreen.test.tsx` | 11 |
| `tests/v11/screens/games/G07ResultScreen.test.tsx` | 18 |

#### 更新（2 ファイル）
- `src/navigation/v11/AppRouterV11.tsx` — G-06 / G-07 ルート（instruction / play / result）
  追加、`IMPLEMENTED_GAME_IDS_V11` に `'G-06'` / `'G-07'` 追加、PlaceholderScreen
  文言を「Sprint 15 以降」「Sprint 8〜14」に更新
- `tests/v11/screens/AppRouterV11.test.tsx` — 「準備中ゲーム」テストを G-06 → G-08 に
  差し替え（G-06 は本スプリントで実装済み）

### 18.4 検証結果

```
$ npm run typecheck
PASS（0 errors）

$ npm run build:web
PASS（695 kB bundle、約 3 秒）

$ npm test
Test Suites: 101 passed, 101 total
Tests:       1146 passed, 1146 total（差分 +196 件）
Time:        ~5 秒
```

| 領域 | Sprint 13 | Sprint 14 | 差分 |
|---|---|---|---|
| テスト件数 | 950 | 1146 | +196 |
| Suite 数 | 90 | 101 | +11 |
| 実装ゲーム | 5（G-01〜G-05） | 7（G-01〜G-07） | +2 |
| 新規共通要素 | 0（流用のみ） | 1（GaborGridStimulus） | +1 |

### 18.5 申し送り（Sprint 15 以降）

- **G-08 残像方位弁別 + G-09 側方マスキング**：Sprint 15 で実装。新規 GE-08
  `TiltAftereffectStimulus`（上下並び 2 ガボール、adapter + テスト）+ GE-09
  `LateralMaskingStimulus`（横一列 3 ガボール、flanker × 2 + target）が必要
- **G-10 テクスチャ分離**：Sprint 16 で実装。8×8 = 64 ガボールが必要。Sprint 14 の
  GaborGridStimulus（4×4 固定）と性質が異なる（パッチタップ不可、選択肢は 4 象限ボタン）
  ため、別途 `TextureSegmentationStimulus` を実装する方針
- **共通基盤の安定**：Sprint 9〜14 で確立した骨格は Sprint 15 以降も基本変更なしで
  使い回す。新規追加が必要なのは AC-4 keypad-10（G-13、Sprint 17）+ GE-08〜13 の
  ゲーム固有 stimulus

---

## 19. Sprint 15：G-08 残像方位弁別 + G-09 側方マスキング（2 ゲーム複合、新規 stimulus 2 種）

Sprint 15 では新規 2 ゲーム G-08 / G-09 を実装。両ゲームともゲーム固有 stimulus が
必要なため新規 GE-08 `VerticalStackStimulus`（上下 2 ガボール）と GE-09
`LateralMaskingStimulus`（横一列 3 ガボール）を実装。**Polat ら 2004/2012 の
Lateral Masking パラダイム**（target/flanker 同時提示）を v1.1 OPT-12 統一に
適合させた点が技術的ハイライト。

### 19.1 起動方法

Sprint 14 と同じ：

```bash
npm install
npm run web      # Web 開発サーバ
npm run typecheck
npm test         # 1356 件 / 113 suites
npm run build:web
```

ホーム → 「単体プレイ」 → G-08 / G-09 のカードをタップでプレイ可能。

### 19.2 動作確認手順

#### G-08 残像方位弁別

1. ホーム → 単体プレイ → 「G-08 残像方位弁別」 → ミニ説明 → 「はじめる」
2. 距離リマインド 3 秒 → プレイ画面：
   - 上：adapter（傾き 20° 固定、高コン 0.6）
   - 下：テストパッチ（傾き absolute 5°、向き cw or ccw ランダム、コン 0.4）
   - 残り 60 秒カウントダウン
3. 「時計回り」/「反時計回り」ボタンで回答。再タップで解除、別を押すと切替
4. 60 秒経過で自動採点 → 結果画面：
   - 「正解は『下のパッチは時計回り』」+ 下パッチ 1.5 秒拡大ハイライト
   - 「あなたの回答『下のパッチは時計回り』」/「未回答」
   - 「閾値 5°」+ 「初回測定」または「-1 改善」等
   - フッター 3 ボタン

#### G-09 側方マスキング（Polat パラダイム）

1. ホーム → 単体プレイ → 「G-09 側方マスキング」 → ミニ説明 → 「はじめる」
2. 距離リマインド 3 秒 → プレイ画面：
   - 横一列「flanker | target | flanker」3 ガボール
   - flanker × 2：高コントラスト 0.5、垂直 90° 平行
   - target：低コントラスト（初期 0.10、staircase 連動）、向き vertical or horizontal
     ランダム
   - flanker-target spacing：target 直径の 3.0 倍（初期、contrast 連動）
   - 残り 60 秒カウントダウン
3. 「縦寄り」/「横寄り」ボタンで回答
4. 60 秒経過で自動採点 → 結果画面：
   - 「正解は『中央は縦寄り』」+ target 1.5 秒拡大ハイライト
   - 「あなたの回答『中央は縦寄り』」/「未回答」
   - **合成閾値「c=0.10 / d=3.0λ」**（コントラスト + 距離）+ unit「コントラスト/距離」
   - フッター 3 ボタン

### 19.3 staircase 動作

- **G-08**：絶対角度（°、易 10° → 難 1°、初期 5°、step 1°）。整数で丸め、
  AsyncStorage に小数点なしで永続化。
- **G-09**：target コントラスト（易 0.20 → 難 0.05、初期 0.10、step 0.01）が
  staircase の単一パラメータ。flanker 距離は `derivePolatSpacingFromContrast`
  純関数で派生（線形補間：0.05→1.5λ / 0.10→3.0λ / 0.20→5.0λ）。staircase 値の
  +0.01 / -0.01 で contrast と distance が同時に動く設計。

### 19.4 ファイル一覧（Sprint 15 で追加・更新）

#### 新規（13 ファイル）

##### G-08（5 ファイル）
- `src/lib/v11/g08Trial.ts` — trial 生成（adapter 110°固定、test cw/ccw × 角度）/ 採点 / レイアウト
- `src/lib/v11/g08Result.ts` — 結果ラベル + diff（digits=0 / step=1）
- `src/components/v11/games/VerticalStackStimulus.tsx` — **GE-08 上下 2 ガボール**
- `src/screens/v11/games/G08TiltAftereffectScreen.tsx` — S15-02 プレイ
- `src/screens/v11/games/G08ResultScreen.tsx` — S15-03 結果
- `src/screens/v11/games/G08MiniInstructionScreen.tsx` — S15-01 ミニ説明

##### G-09（6 ファイル）
- `src/lib/v11/g09Trial.ts` — trial 生成 / 採点 / **`derivePolatSpacingFromContrast` 純関数** / レイアウト / spacing 計算
- `src/lib/v11/g09Result.ts` — 結果ラベル + 合成閾値表記（「c=0.10 / d=3.0λ」）+ diff（digits=2 / step=0.01）
- `src/components/v11/games/LateralMaskingStimulus.tsx` — **GE-09 横一列 3 ガボール**
- `src/screens/v11/games/G09LateralMaskingScreen.tsx` — S15-05 プレイ
- `src/screens/v11/games/G09ResultScreen.tsx` — S15-06 結果
- `src/screens/v11/games/G09MiniInstructionScreen.tsx` — S15-04 ミニ説明

##### テスト（12 ファイル、+210 件）
| ファイル | 件数 |
|---|---|
| `tests/v11/lib/g08Trial.test.ts` | 47 |
| `tests/v11/lib/g08Result.test.ts` | 13 |
| `tests/v11/components/games/VerticalStackStimulus.test.tsx` | 8 |
| `tests/v11/screens/games/G08MiniInstructionScreen.test.tsx` | 5 |
| `tests/v11/screens/games/G08TiltAftereffectScreen.test.tsx` | 12 |
| `tests/v11/screens/games/G08ResultScreen.test.tsx` | 13 |
| `tests/v11/lib/g09Trial.test.ts` | 52 |
| `tests/v11/lib/g09Result.test.ts` | 22 |
| `tests/v11/components/games/LateralMaskingStimulus.test.tsx` | 7 |
| `tests/v11/screens/games/G09MiniInstructionScreen.test.tsx` | 5 |
| `tests/v11/screens/games/G09LateralMaskingScreen.test.tsx` | 13 |
| `tests/v11/screens/games/G09ResultScreen.test.tsx` | 13 |

#### 更新（2 ファイル）
- `src/navigation/v11/AppRouterV11.tsx` — G-08 / G-09 ルート（instruction / play / result）
  追加、`IMPLEMENTED_GAME_IDS_V11` に `'G-08'` / `'G-09'` 追加、PlaceholderScreen
  文言を「Sprint 16 以降」「Sprint 8〜15」に更新
- `tests/v11/screens/AppRouterV11.test.tsx` — 「準備中ゲーム」テストを G-08 → G-10 に
  差し替え（G-08 / G-09 は本スプリントで実装済み）

### 19.5 検証結果

```
$ npm run typecheck
PASS（0 errors）

$ npm run build:web
PASS（732 kB bundle）

$ npm test
Test Suites: 113 passed, 113 total
Tests:       1356 passed, 1356 total（差分 +210 件）
Time:        ~6 秒
```

| 領域 | Sprint 14 | Sprint 15 | 差分 |
|---|---|---|---|
| テスト件数 | 1146 | 1356 | +210 |
| Suite 数 | 101 | 113 | +12 |
| 実装ゲーム | 7（G-01〜G-07） | 9（G-01〜G-09） | +2 |
| 新規共通要素 | 1（GaborGridStimulus） | 2（VerticalStackStimulus、LateralMaskingStimulus） | +2 |

### 19.6 申し送り（Sprint 16 以降）

- **G-10 テクスチャ分離 + G-11 Vernier 整列判定**：Sprint 16 で実装。
  - G-10：8×8 = 64 ガボール grid を画面いっぱいに敷き、3×3 領域だけ向き異。
    新規 `TextureSegmentationStimulus`（GE-10）+ 4 象限ボタン（grid-4 layout）。
  - G-11：上下 2 ガボール（垂直）、下が水平 N arcmin ズレ。新規 `VernierStimulus`
    （GE-11）+ horizontal-2 layout。VerticalStackStimulus の単純流用は微妙
    （adapter/test の役割が異なる）、別実装が無難。
- **G-12 クラウディング（Sprint 17）**：staircase 値が「target-flanker spacing
  倍率」（gameRegistry 既登録：min 1.2, max 4, initial 2, step 0.2）。Sprint 15 の
  G-09 で実装した `computeG09SpacingPx` のクランプロジックが参考になる（中央
  target + 周囲 flanker の配置でも画面幅を超えないクランプが必要）。
- **共通基盤の安定**：Sprint 9〜15 で確立した骨格は Sprint 16 以降も基本変更なしで
  使い回す。新規追加は GE-10〜13 のゲーム固有 stimulus + AC-4 keypad-10
  （G-13、Sprint 17）のみ。

## 20. Sprint 16：G-10 テクスチャ分離 + G-11 Vernier 整列判定（2 ゲーム複合、新規 stimulus 2 種）

Sprint 16 では新規 2 ゲーム G-10 / G-11 を実装。両ゲームともゲーム固有 stimulus が
必要なため新規 GE-10 `TextureGridStimulus`（8×8 = 64 ガボール grid）と GE-11
`VernierStackStimulus`（上下 2 ガボール + 水平ズレ）を実装。**Karni & Sagi 1991
のテクスチャ分離パラダイム**と **Vernier acuity（並列整列視力、ハイパーアキュイティ）**
を v1.1 OPT-12 統一に適合させた点が技術的ハイライト。

### 20.1 起動方法

Sprint 15 と同じ：

```bash
npm install
npm run web      # Web 開発サーバ
npm run typecheck
npm test         # 1598 件 / 125 suites
npm run build:web
```

ホーム → 「単体プレイ」 → G-10 / G-11 のカードをタップでプレイ可能。

### 20.2 動作確認手順

#### G-10 テクスチャ分離（Karni & Sagi 1991 パラダイム）

1. ホーム → 単体プレイ → 「G-10 テクスチャ分離」 → ミニ説明 → 「はじめる」
2. 距離リマインド 3 秒 → プレイ画面：
   - 8×8 = 64 ガボールパッチを敷き詰めて表示
   - 背景：全パッチが同じ向き（rng で決定）
   - target 領域：3×3 = 9 個のパッチが背景と異なる向き（向き差 = staircase 値）
   - 4 象限のいずれかに配置（rng）
   - 残り 60 秒カウントダウン
3. 「左上」「右上」「左下」「右下」の **4 択ボタン（grid-4 layout）**で回答
4. 60 秒経過で自動採点 → 結果画面：
   - 「正解は『左上』」+ target 領域 3×3 全体を 1.5 秒拡大ハイライト + 黄 4px 枠
   - 「あなたの回答『左下』」/「未回答」
   - 「閾値 30°」+ unit「向き差°」+ 「初回測定」または「-5 改善」等
   - フッター 3 ボタン

#### G-11 Vernier 整列判定（ハイパーアキュイティ訓練）

1. ホーム → 単体プレイ → 「G-11 Vernier 整列判定」 → ミニ説明 → 「はじめる」
2. 距離リマインド 3 秒 → プレイ画面：
   - 上：reference ガボール（垂直、高 cpd 6、高コントラスト 0.5）
   - 下：テストパッチ（垂直、上と同じパラメータ、ただし水平にズレ）
   - **下の水平ズレ量 = staircase 値（arcmin、初期 2.0'）**を arcmin → px 換算で適用
     - iphone 460dpi / 距離 40cm：1 arcmin ≈ 2.1px、初期 2.0' ≈ 4.2px
     - PC 110dpi / 距離 40cm：1 arcmin ≈ 0.5px、ズレ < 1px は minVisiblePx=1 でクランプ
   - 左右の方向は rng で 50% ずつ
   - ギャップ 16〜32px（レスポンシブ）
   - 残り 60 秒カウントダウン
3. 「左にずれている」/「右にずれている」ボタン（horizontal-2）で回答
4. 60 秒経過で自動採点 → 結果画面：
   - 「正解は『下のパッチは右にずれている』」+ 下パッチ 1.5 秒拡大ハイライト
   - 結果画面では minVisiblePx=2 で視認性強調
   - 「あなたの回答『…』」/「未回答」
   - **「閾値 2.0'」+ unit「ズレ量(arcmin)」**+ 「初回測定」または「-0.2 改善」等
   - フッター 3 ボタン

### 20.3 staircase 動作

- **G-10**：背景と target 領域の向き差（°、易 90° → 難 5°、初期 30°、step 5°）。
  整数で丸め、AsyncStorage に小数点なしで永続化。
- **G-11**：下パッチの水平ズレ量（arcmin = 角度視野分、易 5.0' → 難 0.5'、初期 2.0'、
  step 0.2'）。小数 1 桁で丸め永続化。

### 20.4 ファイル一覧（Sprint 16 で追加・更新）

#### 新規（13 ファイル）

##### G-10（6 ファイル）
- `src/lib/v11/g10Trial.ts` — trial 生成（4 象限ランダム / 3×3 配置 16 通り / 64 セル）/ 採点 / レイアウト
- `src/lib/v11/g10Result.ts` — 結果ラベル + diff（digits=0 / step=5）+ 閾値整形
- `src/components/v11/games/TextureGridStimulus.tsx` — **GE-10 8×8 grid stimulus**
- `src/screens/v11/games/G10TextureSegmentationScreen.tsx` — S16-02 プレイ
- `src/screens/v11/games/G10ResultScreen.tsx` — S16-03 結果
- `src/screens/v11/games/G10MiniInstructionScreen.tsx` — S16-01 ミニ説明

##### G-11（6 ファイル）
- `src/lib/v11/g11Trial.ts` — trial 生成 / 採点 / **`arcminToPx` / `arcminToVisiblePx` / `computeG11LowerOffsetPx` 純関数** / レイアウト
- `src/lib/v11/g11Result.ts` — 結果ラベル + 閾値整形（「2.0'」）+ diff（digits=1 / step=0.2）
- `src/components/v11/games/VernierStackStimulus.tsx` — **GE-11 上下 2 パッチ + translateX**
- `src/screens/v11/games/G11VernierAlignmentScreen.tsx` — S16-05 プレイ
- `src/screens/v11/games/G11ResultScreen.tsx` — S16-06 結果
- `src/screens/v11/games/G11MiniInstructionScreen.tsx` — S16-04 ミニ説明

##### テスト（12 ファイル、+225 件）
| ファイル | 件数 |
|---|---|
| `tests/v11/lib/g10Trial.test.ts` | 60 |
| `tests/v11/lib/g10Result.test.ts` | 22 |
| `tests/v11/components/games/TextureGridStimulus.test.tsx` | 9 |
| `tests/v11/screens/games/G10MiniInstructionScreen.test.tsx` | 5 |
| `tests/v11/screens/games/G10TextureSegmentationScreen.test.tsx` | 13 |
| `tests/v11/screens/games/G10ResultScreen.test.tsx` | 11 |
| `tests/v11/lib/g11Trial.test.ts` | 47 |
| `tests/v11/lib/g11Result.test.ts` | 13 |
| `tests/v11/components/games/VernierStackStimulus.test.tsx` | 14 |
| `tests/v11/screens/games/G11MiniInstructionScreen.test.tsx` | 5 |
| `tests/v11/screens/games/G11VernierAlignmentScreen.test.tsx` | 13 |
| `tests/v11/screens/games/G11ResultScreen.test.tsx` | 11 |

#### 更新（2 ファイル）

- `src/navigation/v11/AppRouterV11.tsx` — G-10 / G-11 instruction / play / result の 6 ルート
  追加、`IMPLEMENTED_GAME_IDS_V11` に `'G-10'` / `'G-11'` 追加（11 件）、Placeholder
  文言を「Sprint 17 以降」に更新
- `tests/v11/screens/AppRouterV11.test.tsx` — 「準備中ゲーム」テストを G-10 → G-12 に
  差し替え

### 20.5 検証結果

| 領域 | Sprint 15 | Sprint 16 | 差分 |
|---|---|---|---|
| 全体テスト件数 | 1373 件 | **1598 件** | **+225** |
| typecheck errors | 0 | 0 | 0 |
| build:web | PASS | PASS | - |
| 実装済 gameId 数 | 9（G-01〜G-09）| **11（G-01〜G-11）** | **+2** |
| screens/v11/games | 27 | **33** | **+6** |
| components/v11/games | 6 | **8** | **+2** |
| lib/v11 | 18 | **22** | **+4** |

### 20.6 申し送り（Sprint 17 以降）

- **G-12 クラウディング + G-13 数字探し**：Sprint 17 で実装。
  - **G-12**：staircase 値が「target-flanker spacing 倍率」（gameRegistry 既登録：
    min 1.2, max 4, initial 2, step 0.2）。中央 target + 周囲 4〜6 個 flanker 配置で
    画面幅を超えないクランプは Sprint 15 の `computeG09SpacingPx` 流。新規 GE-12
    `CrowdingStimulus` 必要。
  - **G-13**：staircase 値が「数字のコントラスト」、新規 stimulus
    `EmbeddedNumeralStimulus`（GE-13）+ AC-4 keypad-10（0〜9 ボタン）。spec §7.13。
- **共通基盤の安定**：Sprint 9〜16 で確立した骨格は Sprint 17 以降も基本変更なしで
  使い回す。新規追加は GE-12 / GE-13 + AC-4 keypad-10 のみ。
- **G-10 結果画面の 8×8 描画コスト**：64 GaborPatch を結果画面でも再描画する。
  実機で 30fps 維持を NF-1 観点で目視確認推奨。問題があれば結果画面のセル数を
  減らす（4×4 縮小描画）案あり。

## 21. Sprint 17：G-12 クラウディング + G-13 数字探し（13 ゲーム全実装完了）

Sprint 17 では新規 2 ゲーム G-12 / G-13 を実装し、**13 ゲーム全実装完了** となった。
Sprint 18 以降では全ゲーム連続コース・進捗グラフ・バッジを実装する。

### 21.1 起動方法

Sprint 16 と同じ。`npm run web` で `http://localhost:8081` を開き、ホーム → 「単体プレイ」
→ G-12 / G-13 のカードを選択 → ミニ説明 → 距離リマインダー（3 秒）→ 60 秒プレイ → 結果サマリ。

### 21.2 G-12 クラウディング（screens.md S17-01〜03）

- 中央 target ガボール + 周囲 6 個 flanker（ヘキサゴン頂点配置）を 60 秒同時提示
- 「垂直 / 水平 / 斜め右 / 斜め左」の 4 択（horizontal-4 layout）
- staircase: target-flanker spacing 倍率（min 1.2 / max 4 / initial 2 / step 0.2）
- 結果画面：中央 target を 1.5 秒拡大ハイライト
- 新規 stimulus：`CrowdingStimulus`（GE-12、components.md §15）

### 21.3 G-13 数字探し（screens.md S17-04〜06）

- ノイズ背景 + 低コントラストで 0〜9 の数字を 60 秒間表示
- 「0」〜「9」の 10 択（keypad-10 layout、AC-4、5×2 グリッド）
- staircase: 数字のコントラスト（min 0.03 / max 0.30 / initial 0.10 / step 0.01）
- 結果画面：数字を本来コントラストで 1.5 秒表示（黄ハイライト）
- 新規 stimulus：`EmbeddedNumeralStimulus`（GE-13、決定論的ノイズ + 数字オーバーレイ）
- AnswerChoiceGroup に **`layout="keypad-10"`** を追加（AC-4）。Web 0〜9 数字キーで操作可

### 21.4 ファイル一覧（Sprint 17 で追加・更新）

#### 新規（14 ファイル）

| ファイル | 役割 |
|---|---|
| `src/lib/v11/g12Trial.ts` | G-12 trial 生成 / 採点 / 6 flanker ヘキサゴン配置 / spacing → px 換算 |
| `src/lib/v11/g12Result.ts` | G-12 結果サマリラベル / 前回比 / 閾値整形（"2.0×"） |
| `src/lib/v11/g13Trial.ts` | G-13 trial 生成 / 採点 / コントラスト → alpha 換算 / 決定論ノイズ rng |
| `src/lib/v11/g13Result.ts` | G-13 結果サマリラベル / 前回比 / 閾値整形（"0.10"） |
| `src/components/v11/games/CrowdingStimulus.tsx` | GE-12 中央 target + 周囲 6 flanker（ヘキサゴン配置、ImageChoiceCell ラップ） |
| `src/components/v11/games/EmbeddedNumeralStimulus.tsx` | GE-13 ノイズ + 数字オーバーレイ（8×8 ノイズグリッド、決定論 seed） |
| `src/screens/v11/games/G12CrowdingScreen.tsx` | G-12 プレイ画面（60 秒タイマー / staircase / 4 択） |
| `src/screens/v11/games/G12ResultScreen.tsx` | G-12 結果サマリ画面 |
| `src/screens/v11/games/G12MiniInstructionScreen.tsx` | G-12 ミニ説明画面 |
| `src/screens/v11/games/G13EmbeddedNumeralScreen.tsx` | G-13 プレイ画面（60 秒タイマー / staircase / 10 択 keypad） |
| `src/screens/v11/games/G13ResultScreen.tsx` | G-13 結果サマリ画面 |
| `src/screens/v11/games/G13MiniInstructionScreen.tsx` | G-13 ミニ説明画面 |
| **テスト** | 12 ファイル（後述） |

#### テスト（12 ファイル、+217 件）

| ファイル | 件数 |
|---|---|
| `tests/v11/lib/g12Trial.test.ts` | 47 |
| `tests/v11/lib/g12Result.test.ts` | 18 |
| `tests/v11/lib/g13Trial.test.ts` | 41 |
| `tests/v11/lib/g13Result.test.ts` | 21 |
| `tests/v11/components/games/CrowdingStimulus.test.tsx` | 9 |
| `tests/v11/components/games/EmbeddedNumeralStimulus.test.tsx` | 10 |
| `tests/v11/screens/games/G12MiniInstructionScreen.test.tsx` | 5 |
| `tests/v11/screens/games/G12CrowdingScreen.test.tsx` | 14 |
| `tests/v11/screens/games/G12ResultScreen.test.tsx` | 11 |
| `tests/v11/screens/games/G13MiniInstructionScreen.test.tsx` | 5 |
| `tests/v11/screens/games/G13EmbeddedNumeralScreen.test.tsx` | 14 |
| `tests/v11/screens/games/G13ResultScreen.test.tsx` | 11 |
| AnswerChoiceGroup keypad-10 追加 | 11 |

#### 更新（3 ファイル）

- `src/components/v11/AnswerChoiceGroup.tsx` — `layout="keypad-10"` を追加（AC-4）。
  内部に `KeypadTenLayout` + `KeypadButton` を新設（5×2 グリッド、64×64 ボタン）。
  `enableNumericKeyboard` を keypad-10 にも対応（0〜9 数字キーで選択肢操作）
- `src/navigation/v11/AppRouterV11.tsx` — G-12 / G-13 instruction / play / result の 6 ルート
  追加、`IMPLEMENTED_GAME_IDS_V11` に `'G-12'` / `'G-13'` 追加（**13 件、全実装完了**）、
  Placeholder 文言を「Sprint 18」に更新（連続コース・進捗・バッジ）
- `tests/v11/screens/AppRouterV11.test.tsx` — 「準備中ゲーム」テストを廃止し、
  「Sprint 17 で G-12 / G-13 もミニ説明画面へ進む」テストに差し替え

### 21.5 検証結果

| 領域 | Sprint 16 | Sprint 17 | 差分 |
|---|---|---|---|
| 全体テスト件数 | 1598 件 | **1817 件** | **+219** |
| typecheck errors | 0 | 0 | 0 |
| build:web | PASS | PASS | - |
| 実装済 gameId 数 | 11（G-01〜G-11）| **13（G-01〜G-13）** | **+2 = 全実装完了** |
| screens/v11/games | 33 | **39** | **+6** |
| components/v11/games | 8 | **10** | **+2** |
| lib/v11 | 22 | **26** | **+4** |

### 21.6 13 ゲーム全実装完了の集計

| ゲーム | 実装スプリント | screens 数 | lib 数 | components 数 |
|---|---|---|---|---|
| G-01 変化察知 | Sprint 9 | 3 | 1 | 1（GaborGrid 流用） |
| G-02 左右並び傾き | Sprint 10 | 3 | 2 | 1 SideBySideStimulus |
| G-03 周辺視野ハント | Sprint 11 | 3 | 2 | 1 RadialEightStimulus |
| G-04 コントラスト弁別 | Sprint 12 | 3 | 2 | （G-02 流用） |
| G-05 空間周波数弁別 | Sprint 13 | 3 | 2 | （G-02 流用） |
| G-06 ガウス窓サイズ弁別 | Sprint 14 | 3 | 2 | （G-02 流用） |
| G-07 ガボールエッジ検出 | Sprint 14 | 3 | 2 | 1 MorphGridStimulus（既存） |
| G-08 残像方位弁別 | Sprint 15 | 3 | 2 | 1 VerticalStackStimulus |
| G-09 側方マスキング | Sprint 15 | 3 | 2 | 1 LateralMaskingStimulus |
| G-10 テクスチャ分離 | Sprint 16 | 3 | 2 | 1 TextureGridStimulus |
| G-11 Vernier 整列判定 | Sprint 16 | 3 | 2 | 1 VernierStackStimulus |
| **G-12 クラウディング** | **Sprint 17** | **3** | **2** | **1 CrowdingStimulus** |
| **G-13 数字探し** | **Sprint 17** | **3** | **2** | **1 EmbeddedNumeralStimulus** |
| **計** | — | **39** | **26** | **10**（うち V11 専用 8） |

### 21.7 申し送り（Sprint 18 以降）

13 ゲーム全実装完了を受け、Sprint 18 以降は以下を実装する：

- **Sprint 18**：F-05（全ゲーム連続コース）/ F-11（ワイドスコア）/ F-12（進捗グラフ）
  - 13 ゲームを順番に実行する Course Runner（約 13 分のセッション）
  - ワイドスコア = 13 ゲームの正規化スコア平均
  - 進捗グラフ（タブ切替：ワイドスコア / ゲーム別）
  - ストリーク（連続日数）
- **Sprint 19**：F-13（バッジ）/ F-14（設定）/ F-15（クールダウン）/ F-18（リリース選定）
  - 13 種バッジ獲得演出
  - 設定画面（ダークモード / 距離 / 全データ削除など）
  - `releaseEnabled` フラグでゲーム動的除外

#### Sprint 18 の前提（Sprint 17 で確立した基盤）

- 全 13 ゲームの **screens / lib / components が揃っている**：Course Runner は
  各ゲームの play / result screen をそのまま順次レンダリングするだけでよい
- すべてのゲームで `loadStaircaseV11(gameId)` / `saveStaircaseV11(state)` が動く
- `recordSingleGameSessionV11(today, gameId, threshold)` が DailyStats に記録する
- `loadHistoricalBestThresholdV11(gameId, today)` が前回比を計算できる
- `gameRegistry.getEnabledGames()` が `releaseEnabled=true` の順序付きリストを返す

#### 共通基盤の安定（変更不要）

`GamePlaySurface` / `ResultSummaryV11` / `SinglePlayPostFooter` / `ImageChoiceCell` /
`AnswerChoiceGroup`（horizontal-2 / horizontal-4 / clock-8 / grid-4 / keypad-10 全実装済）/
`MetricCard` / `staircaseV11` / `storage-v11` は Sprint 18 以降も基本変更なしで使い回せる。
新規追加は **Sprint 18 で Course Runner / WideScore Calculator / ProgressGraphTabs**。

#### G-13 ノイズ / 数字描画の実機パフォーマンス

EmbeddedNumeralStimulus は 8×8 = 64 個のノイズセル View + 数字 Text 重ね描画で構成。
描画コストは React Native View 数で見ると軽量だが、実機（iPhone 12 / Pixel 5）で
60 秒間提示中の 30fps 維持を NF-1 観点で目視確認推奨。


---

## 22. Sprint 18：全ゲーム連続コース + ワイドスコア + 進捗グラフ + ストリーク（13 ゲーム統合体験）

**作業日**：2026-04-30  
**対応**：spec-v11.md §13 Sprint 18 行 / F-05 全ゲーム連続コース / F-10 結果サマリ改訂 / F-11 ワイドスコア・進捗グラフ / F-12 ストリーク・日次ベスト / F-15 クールダウン / F-16 距離リマインド  
**入力デザイン**：docs/design-v11/sprints/sprint-18/screens.md（S18-01〜S18-09）

### Sprint 18 で完結したもの

- 全 13 ゲームを 1 セッションとして連続実行できる「全ゲーム連続コース」フロー
- 各ゲームの結果サマリ（コース時）に 10 秒カウントダウン自動進行 + 「次へ」即進行
- コース完了画面：本日のワイドスコア + 前回比 + ストリーク
- F-15 セッションクールダウン（10 秒、スキップ可、静止イラスト）
- F-11 進捗グラフ：ワイドスコアタブ / ゲーム別タブ（13 子タブ、F-18 enabled フィルタ）
- F-11 28 日折れ線、軸ラベル 24px（18pt+ 適合）、当日強調点、< 7 日メッセージ
- F-12 ストリーク：ホーム表示 / フルコース完了 +1 / 0:00 跨ぎリセット / 22 時以降警告
- AppRouterV11：home → course-start → course-run → progress 全配線完了

### 起動方法（Sprint 17 から変化なし）

```sh
asdf install
npm install
npm run web
```

### 新規ファイル一覧

#### lib（5 ファイル、純関数）
- `src/lib/v11/courseSession.ts`：コース状態機械 / 順序生成 / phase 列挙 / 所要時間概算
- `src/lib/v11/wideScore.ts`：閾値→ 0〜100 線形マッピング / 算術平均
- `src/lib/v11/dailyStats.ts`：DailyStats 集計（フルコース完了 / 単体プレイ反映）
- `src/lib/v11/streak.ts`：ストリーク +1 / 0:00 跨ぎリセット / 22 時警告
- `src/lib/v11/courseGameAdapter.ts`：13 ゲームの TrialResult から共通形式に正規化

#### state（既存に追加）
- `src/state/storage-v11.ts`：`loadRecentDailyStatsV11` / `recordFullCourseCompletionV11` 追加

#### components（1 ファイル、SVG 等の依存追加なし）
- `src/components/v11/charts/LineChart.tsx`：汎用折れ線グラフ（V1ScoreChart の v1.1 汎用化）

#### screens（5 ファイル）
- `src/screens/v11/course/CourseStartScreen.tsx`：S18-01 開始確認
- `src/screens/v11/course/CourseRunnerScreen.tsx`：S18-02 全体オーケストレータ
- `src/screens/v11/course/CourseInterstitialResultScreen.tsx`：S18-03 ゲーム間結果サマリ + 10 秒カウントダウン
- `src/screens/v11/course/CourseCompleteScreen.tsx`：S18-04 完了画面
- `src/screens/v11/course/CourseCooldownScreen.tsx`：S18-05 クールダウン
- `src/screens/v11/progress/ProgressGraphScreen.tsx`：S18-07 / S18-08 進捗グラフ（ワイド / ゲーム別タブ）

### 永続化キー（spec §11 名前空間内）

- 既存：`gaboreye:v1.1:streak` / `gaboreye:v1.1:dailyStats:<YYYY-MM-DD>` / `gaboreye:v1.1:session:<uuid>`
- 新規キーは追加なし。Sprint 18 で書き込み始めた値は既存キーを使用。

### 主要動線

```
ホーム
  ├─ 全ゲーム連続プレイ（HeroCTA） → CourseStartScreen
  │   ├─ はじめる → DistanceReminderV11（3 秒）→ G-01 60 秒
  │   │   → CourseInterstitialResultScreen（10 秒、次へ即進行）
  │   │   → G-02 60 秒 → ... → G-13 60 秒 → 最終 interstitial
  │   │   → CourseCooldownScreen（10 秒、スキップ可）
  │   │   → CourseCompleteScreen（ワイドスコア / 前回比 / ストリーク）
  │   │       ├─ 進捗グラフを見る → ProgressGraphScreen
  │   │       └─ ホームへ → ホーム
  │   └─ キャンセル → ホーム
  ├─ 単体プレイ → AllGamesListScreen → 各ゲーム単体動線（既存）
  ├─ 進捗グラフ → ProgressGraphScreen（タブ切替：ワイドスコア / ゲーム別）
  └─ × 中断（コース中） → ConfirmDialog → 中断 → ホーム
```

### テスト件数（Sprint 17 完了 1817 → Sprint 18 完了 1977、+160 件）

- `tests/v11/lib/courseSession.test.ts`：22 件
- `tests/v11/lib/wideScore.test.ts`：18 件
- `tests/v11/lib/dailyStats.test.ts`：14 件
- `tests/v11/lib/streak.test.ts`：18 件
- `tests/v11/lib/courseGameAdapter.test.ts`：10 件
- `tests/v11/state/storage-v11-course.test.ts`：8 件
- `tests/v11/components/charts/LineChart.test.tsx`：10 件
- `tests/v11/screens/course/CourseStartScreen.test.tsx`：7 件
- `tests/v11/screens/course/CourseInterstitialResultScreen.test.tsx`：8 件
- `tests/v11/screens/course/CourseCooldownScreen.test.tsx`：6 件
- `tests/v11/screens/course/CourseCompleteScreen.test.tsx`：9 件
- `tests/v11/screens/course/CourseRunnerScreen.test.tsx`：7 件（**統合テスト**：13 ゲーム順次完了 + 永続化検証含む）
- `tests/v11/screens/progress/ProgressGraphScreen.test.tsx`：15 件
- `tests/v11/screens/HomeScreenV11.test.tsx`：+4 件（ストリーク / 警告）
- `tests/v11/screens/AppRouterV11.test.tsx`：+1 件（progress 動線）

合計 +160（受け入れ基準「+30 件以上」を大幅にクリア）。

### F-05 / F-11 / F-12 受け入れ基準カバー（全件 ✅）

詳細は `docs/sprints/sprint-18-self-review.md` 参照。

### 既知の懸念 / Sprint 19 への申し送り

- **CourseInterstitialResultScreen の各ゲーム正解／回答ラベル**：現状 G-01 / G-02 のみ
  実際の label builder（`buildCorrectAnswerLabel` / `buildG02CorrectAnswerLabel`）を呼ぶ
  実装。G-03〜G-13 は「— / —」表示。学習効果を最大化するなら Sprint 19 で各ゲームの
  label builder（`g03Result.ts` 等）を呼ぶように拡張するのが望ましい。**仕様外でないため、
  本スプリントでは行わない**（YAGNI / 1 スプリント 1 機能の原則）。
- **コース順序の `date-seeded-random` モード**：実装済みだが現在 UI からは選択不可。
  Sprint 19 の設定画面で切替可能にするかは別途検討。
- **F-13 達成バッジの統合**：Sprint 19 の対応範囲。CourseCompleteScreen には
  `AchievementBadge` 挿入位置の枠だけ用意（screens.md S18-04）、Sprint 19 で接続。
- **長時間タイマー**：13 ゲーム連続 = 約 15 分のセッション中、画面ロックや App Background
  への遷移は Sprint 18 では特別対応していない。実機では既存ゲーム同様 60 秒タイマーが
  pause しない可能性がある。Sprint 19 a11y 監査時に AppState 連動を検討する余地。

---

## 23. Sprint 19：仕上げ — バッジ・設定・a11y 監査・F-18 リリース選定（v1.1 最終スプリント）

Sprint 19 で **v1.1 のすべての受け入れ基準を満たし**、F-13 / F-14 / F-18 を完成させた。

### Sprint 19 で完結したもの

- F-13 達成バッジ 13 種：判定エンジン + 一覧画面 + 詳細モーダル + 獲得演出（1.5 秒、点滅なし）
- F-14 設定画面：5 セクション × 全項目動作（ダークモード / 視聴距離 / 効果音 / 振動 / 片眼 / バッジ一覧 / staircase リセット / 全データ削除 / 免責事項再閲覧 / バージョン情報）
- F-18 一元化：`releaseFilter.ts` でロジック集約、ホーム / コース / グラフ / バッジ全レイヤに動的除外が伝播
- a11y 全件再監査：role / aria-label / focus order / 56pt+ minHeight / コントラスト 7:1 全件適合
- レスポンシブ全件確認：360px〜1280px 全画面崩れなし
- Sprint 18 Minor 2 件「ついで修正」：LineChart 軸ラベル幅 56→72 / bottom padding 36→56

### 起動方法（Sprint 18 から変化なし）

```sh
asdf reshim nodejs
npm install
npm test          # 2142 件全 PASS
npm run typecheck # 0 errors
npm run web       # http://localhost:8081
npm run build:web # dist/ に静的成果物
```

### 新規ファイル一覧

#### lib（4 ファイル、純関数）
- `src/lib/v11/badgeDefinitions.ts`：13 バッジメタデータ + `dependsOnGameIds`
- `src/lib/v11/badges.ts`：`evaluateBadgesV11` / `checkBadgeConditionV11` / `buildBadgeHintV11`
- `src/lib/v11/releaseFilter.ts`：F-18 一元化
- `src/lib/v11/badgeContext.ts`：永続化データから BadgeEvalContext を構築

#### state（既存に追加）
- `src/state/storage-v11.ts`：BadgeStatus 永続化 4 関数（loadBadgeStatusV11 / saveBadgeStatusV11 / saveAllBadgeStatusesV11 / loadAllBadgeStatusesV11）

#### components（2 ファイル）
- `src/components/v11/SettingsRow.tsx`：56pt+ リスト行、3 形態（link / toggle / static）
- `src/components/v11/badges/BadgeUnlockToast.tsx`：1.5 秒 scale 演出、role=alert / aria-live=assertive

#### screens（5 ファイル + 1 既存修正）
- `src/screens/v11/badges/BadgeListScreen.tsx`（S19-01）
- `src/screens/v11/badges/BadgeDetailModal.tsx`（S19-02）
- `src/screens/v11/settings/SettingsScreen.tsx`（S19-03）
- `src/screens/v11/settings/DisclaimerScreen.tsx`（S19-04）
- `src/screens/v11/settings/StaircaseResetConfirmDialog.tsx`（S19-05）
- `src/screens/v11/settings/DataDeleteScreen.tsx`（S19-06）

#### 更新
- `src/components/v11/ResultSummaryV11.tsx`：`newlyAwardedBadges` prop 追加、Toast 挿入
- `src/components/v11/charts/LineChart.tsx`：Sprint 18 Minor 1+2 修正
- `src/screens/v11/games/G01ResultScreen.tsx` 〜 `G13ResultScreen.tsx`：13 ファイルに `newlyAwardedBadges` prop 追加
- `src/screens/v11/course/CourseCompleteScreen.tsx`：StreakBadge と Primary 間に Toast 挿入
- `src/screens/v11/course/CourseRunnerScreen.tsx`：完了時にバッジ評価・永続化
- `src/navigation/v11/AppRouterV11.tsx`：settings / badges ルート + 評価ヘルパ

### 永続化キー（spec §11 名前空間内）

新規キー：
- `gaboreye:v1.1:badge:B-XX`（B-01〜B-13、計 13 件）：BadgeStatusV11 を 1 件 1 レコードで保存

仕様書 §11 名前空間内（`gaboreye:v1.1:*`）に収まり、F-17 起動時データリセット対象外。

### 主要動線

```
[ホーム]
  ├─ 設定 ⚙ → SettingsScreen
  │     ├─ ダークモード ›（system→light→dark→system 循環）
  │     ├─ 視聴距離 ›（30→40→50→30 循環）
  │     ├─ 効果音 [ON/OFF]、振動 [ON/OFF]
  │     ├─ 片眼ガイダンス ›（off→left→right→alternate→off 循環）
  │     ├─ 🏅 バッジ一覧 › → BadgeListScreen → BadgeDetailModal
  │     ├─ staircase をリセット › → StaircaseResetConfirmDialog → resetAllStaircasesV11
  │     ├─ 全データを削除 › → DataDeleteScreen（2 段確認） → clearAllStorageV11
  │     ├─ 免責事項を読む › → DisclaimerScreen（再閲覧）
  │     └─ バージョン v1.1.0（同意日 2026-04-30）
  ├─ 🏅 バッジ NavCard → BadgeListScreen → BadgeDetailModal
  ├─ 全ゲーム連続プレイ → CourseStartScreen → CourseRunnerScreen
  │     └─ 13 ゲーム順次 + cooldown + complete
  │           └─ 完了時：evaluateAndPersistBadges() → CourseCompleteScreen に newlyAwardedBadges 渡す
  │                 └─ StreakBadge と Primary ボタンの間で 1.5 秒演出
  └─ 単体プレイ（13 ゲーム） → reminder → game → result
        └─ 完了時：evaluateAndPersistBadges() → result screen に newlyAwardedBadges 渡す
              └─ MetricCard と Footer の間で 1.5 秒演出
```

### バッジ獲得条件（13 種、spec §10）

| ID | 名称 | 条件 |
|---|---|---|
| B-01 | はじめの一歩 | 初回フルコース完了 |
| B-02 | 三日坊主突破 | 3 日連続 |
| B-03 | 一週間の習慣 | 7 日連続 |
| B-04 | 一ヶ月の継続 | 30 日連続 |
| B-05 | 100 試行 | 累計 100 試行（13 ゲーム合算） |
| B-06 | 視野ハンター | G-03 ワイドスコア 80+（G-03 disabled なら獲得不能） |
| B-07 | 弁別の達人 | G-02 ワイドスコア 80+（G-02 disabled なら獲得不能） |
| B-08 | 全方位改善 | enabled 全ゲームで前週比改善 |
| B-09 | 探検家 | enabled 全ゲームを 1 回以上プレイ |
| B-10 | 全制覇 | enabled 全ゲームで 1 度はベスト更新 |
| B-11 | 連続マスター | 14 日連続 |
| B-12 | 夜更かし返上 | 22 時前完了 7 日連続 |
| B-13 | コンプリート | enabled 全ゲームでワイドスコア 80+ |

### F-18 リリース選定運用（spec §15.1）

`gameRegistry.ts` の `releaseEnabled: false` でゲームを除外する。コードの編集のみで切り替わり、ホーム / コース / グラフ / バッジ全部に動的反映される（一般ユーザー UI は提供しない）。

```ts
// 例：G-13 を非公開対象にしたい場合
{
  gameId: 'G-13',
  // ...
  releaseEnabled: false, // ← この行を変更
  order: 13,
},
```

### テスト件数（Sprint 18 完了 1977 → Sprint 19 完了 2142、+165 件）

| 段 | 増分 |
|---|---|
| 段 19-A（lib + state） | +82 |
| 段 19-B（バッジ + 設定 UI） | +63 |
| 段 19-C（AppRouter / 統合 / Sprint 19 動線） | +20 |

### F-13 / F-14 / F-18 受け入れ基準カバー（全件 ✅）

詳細は `docs/sprints/sprint-19-self-review.md` 参照。

### v1.1 完了 — F-01〜F-18 全 18 機能達成

| 機能 | 実装スプリント | 状態 |
|---|---|---|
| F-01〜F-09 | Sprint 8 | ✅ |
| F-07 13 ゲーム | Sprint 9〜17 | ✅ |
| F-05 / F-10〜F-12 / F-15 | Sprint 18 | ✅ |
| F-13 / F-14 / F-18 完成 / a11y / レスポンシブ | **Sprint 19** | ✅ |
| F-16 / F-17 | Sprint 8 | ✅ |

累計テスト件数：**2142 件**（v1 完了 約 600 → v1.1 完了 +1542 件）

### v1.2 への申し送り（既知の制限）

1. CourseInterstitialResult の G-03〜G-13 詳細ラベル化（仕様外、YAGNI）
2. コース順序 `date-seeded-random` の UI 切替
3. 視聴距離キャリブレーション独立画面（S19-CAL-01）— 詳細スライダー化
4. 公開対象外ゲームへの DeepLink フォールバック（S19-10）
5. `useReducedMotion` フック化（BadgeUnlockToast の prop API は提供済み）
6. AppState 連動（長時間タイマーの pause/resume）
7. SVG バッジアイコン化（emoji 暫定）
8. B-12 タイムゾーン旅行時の挙動詳細


---

## 24. Sprint 20：v1.1.1 結果開示と選択 UX 改善（実機テストフィードバック反映、**全段完了**）

### 起動方法

dev サーバーは **ポート 8083** で稼働。

```bash
# Web（推奨、開発の主軸）
npm run web -- --port 8083
# ブラウザで http://localhost:8083 を開く
```

### Sprint 20 の目的（spec-v11.md §13 Sprint 20）

実機テストでユーザーから「結果サマリ画面のメトリクスがガボール視認を妨げる」「黄色 4px 選択枠がガボールパッチに干渉する」「G-02 / G-08 のテキスト 2 択ボタンは画面遷移を強いて視線を奪う」のフィードバックを受けた v1.1.1 マイナー改訂。

1. 13 ゲーム全部で結果開示が刺激画面統合（独立 result 画面の撤去）
2. G-02 / G-08 のテキスト 2 択撤去、ガボール直接選択
3. 選択枠を黄 4px → 中性グレー 2px / 1px に控えめ化
4. 結果オーバーレイは ◯ / ✕ + 「次へ」ボタン + カウントダウンのみ（メトリクスバー撤去）
5. 永続化スキーマ・staircase 値・閾値計算ロジックは不変

### 段別進捗

| 段 | 内容 | 状態 |
|---|---|---|
| **段 20-A** | 共通基盤：tokens / MarkBadge / ResultOverlay / 控えめ選択枠 / data-target-id 属性 | ✅ **完了**（+34 テスト、2222 件 PASS） |
| **段 20-B-1** | CourseInterstitialResultScreen 撤去 + CourseRunner の interstitial phase を ResultOverlay 直接呼び出しに切替 + resultMarks ヘルパ + ResultOverlay に extraStimulus / onAbort / paused props 追加 | ✅ **完了**（+21 -12 = +9 テスト、**2231 件 PASS**） |
| **段 20-B-2** | 13 G0XResultScreen を ResultOverlay ラッパに書換 + ResultSummaryV11 撤去 + AppRouter `g0X-result` route 維持（B-3 で撤去） | ✅ **完了**（-3 net テスト、**2228 件 PASS**） |
| **段 20-B-3** | 各 G0XScreen 内に result phase 統合（単体時の同画面重畳）+ AppRouter `g0X-result` route 13 件撤去 + CourseRunner 動線整備 | ✅ **完了**（+2 net テスト、**2230 件 PASS**） |
| **段 20-C** | G-02 / G-08 設問刷新：horizontal-2 撤去、ガボール直接選択 | ✅ **完了**（+19 net テスト、**2249 件 PASS**） |

### 段 20-A で完成した共通基盤

#### 新規トークン（`src/theme/tokens.ts`）

- `selectionSubtle` / `selectionSubtleIdle`：中性グレー 55% / 30% 不透明（選択枠）
- `successFg` / `dangerFg`：◯ 緑 / ✕ 赤（AAA 7:1 以上）
- `overlayResultBg`：MarkBadge 円形背景 82% 不透明

#### `MarkBadge`（components.md §24）

```tsx
<MarkBadge
  kind="correct" // "correct" | "wrong" | "missed"
  sizePx={48}
  ariaLabel="正解です"
/>
```

- 円形背景 + ◯ / ✕ / 薄 ◯ アイコン
- sizePx は呼び出し側で決定、24〜80px クランプ
- `markBadgeSizeForCell(cellSizePx)` ヘルパ：セル直径 60〜80 → 24px、80〜200 → cellSize × 0.35、200+ → 80px

#### `ResultOverlay`（components.md §23）

```tsx
<ResultOverlay
  gameId="G-04"
  gameNameJa="G-04 コントラスト弁別"
  marks={[
    { targetId: 'g04-right', kind: 'correctChosen' },  // ◯
    { targetId: 'g04-left',  kind: 'wrongChosen' },     // ✕
  ]}
  correctAnswerLabel="右が濃い"
  userAnswerLabel="左が濃い"
  isCorrect={false}
  mode="course"           // "single" | "course"
  nextGameLabel="G-05 空間周波数弁別"  // null で「クールダウンへ」
  onAdvance={() => courseRunner.advanceToNext()}
/>
```

- mode="course" で 10 秒カウントダウン → 自動 onAdvance
- mode="single" で押すまで止まらない、SinglePlayPostFooter（同じゲームをもう一度／一覧へ／ホームへ）内蔵
- メトリクスバー（閾値・前回比・単位）は表示しない（spec 再確定）
- バッジ獲得演出（newlyAwardedBadges）スロット内蔵

#### 控えめ選択枠（`ImageChoiceCell` / `AnswerChoiceGroup`）

- 選択中：黄 4px → **中性グレー 2px**（`color.selection.subtle` 不透明度 55%）
- 未選択：枠なし → **薄い 1px**（`color.selection.subtle.idle` 不透明度 30%）
- 選択中の文字を Bold にして識別軸を補強
- disabled cell は枠なし（border 0）

#### data-target-id 属性

13 ゲームの選択肢ボタン / 画像セルに `data-target-id` 属性が付与可能（`dataTargetId` / `dataTargetIdPrefix` prop）。Web 環境で ResultOverlay の MarkBadge 配置探索に使う想定。

### テスト件数（Sprint 19 完了 2188 → 段 20-A 完了 2222、+34 件）

| 追加 | 件数 |
|---|---|
| `tests/v11/components/v11/MarkBadge.test.tsx` | +13 |
| `tests/v11/components/v11/ResultOverlay.test.tsx` | +18 |
| `tests/v11/components/ImageChoiceCell.test.tsx`（v1.1.1 改訂グループ） | +3 |

### 既存テストの改修（5 件、`borderWidth: 4` 期待を border 0 期待に）

| 改修ファイル |
|---|
| `tests/v11/components/games/VerticalStackStimulus.test.tsx` |
| `tests/v11/components/games/LateralMaskingStimulus.test.tsx` |
| `tests/v11/components/games/VernierStackStimulus.test.tsx` |
| `tests/v11/screens/games/G08ResultScreen.test.tsx` |
| `tests/v11/screens/games/G09ResultScreen.test.tsx` |

### 段 20-B-1 で完成した CourseInterstitial 撤去 + ResultOverlay 拡張

#### 新規ファイル

| パス | 役割 |
|---|---|
| `src/lib/v11/resultMarks.ts` | 13 ゲームの GradingResult から `ResultMark[]` を構築するヘルパ集（components.md §25 規範） |
| `tests/v11/lib/resultMarks.test.ts` | resultMarks の 21 件単体テスト |

#### 改訂ファイル

| パス | 主な変更 |
|---|---|
| `src/components/v11/ResultOverlay.tsx` | `extraStimulus` / `onAbort` / `paused` props 追加。コースモード時の上部バーに中断 × ボタン（IconButton）を配置可能に |
| `src/screens/v11/course/CourseRunnerScreen.tsx` | `interstitial` phase の描画を `CourseInterstitialResultScreen` から `ResultOverlay`（mode="course"）直接呼び出しに切替。`buildMarksForGame(gameId, result)` を新規 export して 13 ゲームのマーク構築を一元化。`formatThresholdForDisplay` は撤去（メトリクスバー撤去のため不要）。 |
| `tests/v11/screens/course/CourseRunnerScreen.test.tsx` | `course-interstitial-countdown` → `result-overlay-countdown`、`course-interstitial-abort` → `result-overlay-abort`（既存 14 件全 PASS 維持） |

#### 撤去ファイル

| パス | 理由 |
|---|---|
| `src/screens/v11/course/CourseInterstitialResultScreen.tsx` | ResultOverlay に責務統合（screens.md §11 / §12.3） |
| `tests/v11/screens/course/CourseInterstitialResultScreen.test.tsx` | 上記コンポーネント撤去に伴い |

### 段 20-B-3 で完成した PlayScreen result phase 統合 + AppRouter route 撤去

#### 改訂ファイル

| パス | 主な変更 |
|---|---|
| 13 個の `src/screens/v11/games/G0XPlayScreen.tsx`（G01〜G13） | Phase: `'done'` → `'result'`。新 props（`isCourseMode` / `nextGameLabel` / `onCourseAdvance` / `onPlayAgain` / `onBackToList` / `onGoHome`）追加。`onComplete` 戻り値型を `Promise<GamePostCompleteData> \| void` に変更。新規 state `resultPayload` / `postData` で result phase 表示用情報保持。`isCourseModeRef` 経由で `setPhase('result')` を**コース時はスキップ**する分岐追加。result phase 描画ブロックで `G0XResultScreen` を内包描画 |
| 13 個の `src/screens/v11/games/G0XResultScreen.tsx`（G01〜G13） | props 型に `nextGameLabel?: string \| null` 追加し、`ResultOverlay` の `nextGameLabel` props にパススルー |
| `src/navigation/v11/AppRouterV11.tsx` | **13 個の `g0X-result` route を完全撤去**。`G0XResultScreen` import 13 件 + `G0XTrialResult` import 13 件を撤去。`g0X-play` の `onComplete` から `setRoute({name:'gX-result',...})` 呼び出しを撤去し、代わりに `return { previousBest, newlyAwardedBadges }` で PostCompleteData を返す形に変更。`onPlayAgain` / `onBackToList` / `onGoHome` を `<G0XPlayScreen>` の props として直接渡す |
| `src/screens/v11/course/CourseRunnerScreen.tsx` | `handleGameComplete` を `async` 化し `Promise<PostCompleteData>` を返す（コース時は両方とも null/空配列）。`CoursePlayDispatch` に `isCourseMode` / `nextGameLabel` / `onCourseAdvance` 伝搬 props 追加。`interstitial` phase 描画は Stage 20-B-1 の動作（`ResultOverlay` 直接描画）を継続 |

#### 新規ファイル

| パス | 役割 |
|---|---|
| `src/screens/v11/games/_shared/types.ts` | 13 PlayScreen 共通の `GamePostCompleteData` 型定義 |

#### 改訂テストファイル

| パス | 改修 |
|---|---|
| `tests/v11/screens/games/G01ChangeDetectScreen.test.tsx` | 新規 describe ブロック「Sprint 20-B-3：60 秒経過後の結果開示動線」追加（2 件）。①単体プレイ時に同じ Screen 内に `result-overlay-action-bar` が表示される（独立画面遷移なし）②コースモード時は PlayScreen 内 result phase に入らず onComplete のみ呼ばれる |

#### 動作

- **単体プレイ時**：60 秒経過 → `phase` が `'result'` に切替 → 同じ `g0X-...-screen` testID を保持したまま `G0XResultScreen` が描画される（独立 route 遷移なし）。「次へ」（onAdvance=onBackToList）「もう一度」（onPlayAgain）「ホームへ」（onGoHome）の動線が機能
- **コース時**：60 秒経過 → PlayScreen は `setPhase('result')` を**スキップ**して `onComplete` のみ呼ぶ → CourseRunner が `interstitial` phase に遷移 → CourseRunner が `ResultOverlay` を描画（Stage 20-B-1 動作継続）。route は `course-run` のまま、ユーザー視点では「画面遷移していない」

### 段 20-C で完成した G-02 / G-08 設問刷新

#### 新規ファイル

| パス | 役割 |
|---|---|
| `src/components/v11/games/G08TiltStimulus.tsx` | 新規 GE-08 v1.1.1：adapter（上）+ 下部左右 2 テストパッチ。各 cell が `ImageChoiceCell` + radio + 動的 aria-checked。adapter は disabled + dimOnDisabled=false で視覚維持タップ不可 |

#### 改訂ファイル

| パス | 主な変更 |
|---|---|
| `src/screens/v11/games/G02SideBySideTiltScreen.tsx` | `AnswerChoiceGroup` horizontal-2 撤去。出題方向（cw / ccw）を試行ごと rng で振り、guidance 文言「より{方向}に傾いているパッチを選んでください」を動的生成。aria-label / 採点側で askDirection==='ccw' のとき `effectiveCorrectSide` を反転して吸収（trial 構造は不変、staircase 不変） |
| `src/screens/v11/games/G08TiltAftereffectScreen.tsx` | `AnswerChoiceGroup` horizontal-2 撤去、`VerticalStackStimulus` → 新 `G08TiltStimulus` に切替。出題方向 ask + `gradeG08BySide` で side ベース採点（trial 構造の `correctSide` で正解側を表現、staircase 不変） |
| `src/components/v11/games/SideBySideStimulus.tsx` | `leftDataTargetId` / `rightDataTargetId` props 追加（既定 `g02-left` / `g02-right`、ResultOverlay の MarkBadge 配置探索用） |
| `src/components/v11/GamePlaySurface.tsx` | `stimulusInteractive?: boolean` props 追加。true で stimulus 領域の `accessibilityElementsHidden` を解除（G-02 / G-08 で必要） |
| `src/lib/v11/g08Trial.ts` | `G08TrialSpec` に `testLeft` / `testRight` / `correctSide` 追加。`buildG08Trial` 更新。`gradeG08BySide` 新規（旧 `gradeG08` 残置） |
| `src/lib/v11/g08Result.ts` | `buildG08CorrectSideLabel` / `buildG08UserSideLabel` 追加（side ベース、「下の左／下の右のパッチ」） |
| `src/lib/v11/resultMarks.ts` | `buildG08Marks` を side ベース（`correctSide` / `userAnswerSide` → `g08-test-left` / `g08-test-right`）と旧 direction ベース（後方互換）の両対応に拡張 |
| `src/screens/v11/games/G08ResultScreen.tsx` | `VerticalStackStimulus` → `G08TiltStimulus` に切替、SR ラベル side ベース化、marks も side ベース |

#### 改訂テストファイル

| パス | 改修 |
|---|---|
| `tests/v11/screens/games/G02SideBySideTiltScreen.test.tsx` | horizontal-2 系を撤去、g02-stimulus-left/right 直接タップ系に置換、guidance 動的化に追従（11 件） |
| `tests/v11/screens/games/G08TiltAftereffectScreen.test.tsx` | 同 G-08。adapter cell の disabled / opacity=1 維持確認も追加（16 件） |
| `tests/v11/screens/games/G08ResultScreen.test.tsx` | side ベース構造に全面改訂、g08-test-left/right targetId 確認、G08TiltStimulus 描画確認（20 件） |
| `tests/v11/lib/g08Trial.test.ts` | Sprint 20-C グループ追加：testLeft/testRight/correctSide / gradeG08BySide（+12 件） |
| `tests/v11/lib/resultMarks.test.ts` | side ベース呼び出し +4 件、旧 cw/ccw 互換 +1 件（+5 件） |

#### 動作

- **G-02**：60 秒間左右 2 ガボールパッチを直接タップ回答。出題方向（時計回り or 反時計回り）は試行ごとランダムで guidance に明示
- **G-08**：60 秒間 adapter（上）+ 下部左右 2 テストパッチ（±絶対角度の対称配置）を提示。下部 2 パッチをタップ回答、adapter は選択不能
- 両ゲームとも staircase 値・採点ロジック・閾値計算は v1.1 から不変

### Sprint 20 全体サマリ

- **目的達成**：F-07（控えめ枠）/ F-10（結果オーバーレイ統合）/ §7.2 G-02 / §7.8 G-08 設問刷新 すべての受け入れ基準クリア
- **テスト件数**：Sprint 19 完了 2188 件 → Sprint 20 完了 **2249 件**（+61 件）
- **typecheck / build**：すべて PASS（930kB）

### 次の Sprint 推奨

1. **Evaluator 評価依頼**（オーケストレーター作業）
2. v1.1 試作 → 取捨選択 → リリースフェーズへ移行

---

## §25 Sprint 21 — v1.1.2 全ゲームのボタン撤去とガボール直接選択統一

**作業日**：2026-04-30  
**対象**：spec-v11.md §13 Sprint 21 行 / F-07（v1.1.2）/ F-10（v1.1.2 補強）/ §7.3 G-03 / §7.4 G-04 / §7.5 G-05 / §7.6 G-06 / §7.10 G-10 / §7.11 G-11 / §7.9 G-09 / §7.12 G-12 / §7.13 G-13

### 起動方法（Sprint 20 から不変）

```bash
npm install                                    # 既に完了済み
npm run typecheck                              # 0 errors
npm test                                       # 168 suites / 2307 tests / 全 PASS
npm run build:web                              # PASS（937kB バンドル）
npm run web                                    # http://localhost:8083 で稼働
```

### 直接選択化された 6 ゲーム

| ゲーム | 旧 UI | 新 UI（v1.1.2） |
|---|---|---|
| G-03 周辺視野ハント | clock-8（時計 8 ボタン） | 円周 8 ガボールパッチを直接タップ（`g03-pos-{12\|1.5\|...}`） |
| G-04 コントラスト弁別 | horizontal-2（左/右が濃い） | 左右 2 ガボールパッチを直接タップ（`g04-{left\|right}`） |
| G-05 空間周波数弁別 | horizontal-2（左/右が細かい） | 左右 2 ガボールパッチを直接タップ（`g05-{left\|right}`） |
| G-06 ガウス窓サイズ弁別 | horizontal-2（左/右が大きい） | 左右 2 ガボールパッチを直接タップ（`g06-{left\|right}`） |
| G-10 テクスチャ分離 | grid-4（左上/右上/左下/右下） | 8×8 grid 上に 4 象限のクリッカブル領域を重畳（`g10-{tl\|tr\|bl\|br}`） |
| G-11 Vernier 整列判定 | horizontal-2（左/右にずれている） | **構造変更**：上 reference + 下に左右 2 テストパッチ（`g11-test-{left\|right}`、G-08 と統一） |

### ボタン UI 維持の 3 ゲーム（Designer 判断）

| ゲーム | 採用案 | 理由 |
|---|---|---|
| G-09 側方マスキング | **案 B** horizontal-2 維持 | Polat パラダイムの「target 1 個 + flanker 2 個」構造を保つため。target 直下に空間配置 |
| G-12 クラウディング | **案 B** horizontal-4 維持 | target の向きは抽象属性で刺激上で直接選べない。注視を逸らさない target 直下配置 |
| G-13 数字探し | **案 B** keypad-10 維持（5×2 配置） | 0〜9 の 10 数字を刺激上で直接表示するのは物理的に不可能 |

### Sprint 21 完了時テスト件数

- **Sprint 20 完了**：2282 件
- **Sprint 21 完了**：**2307 件**（+25 件 net）

### 動作

- **G-03**：60 秒間ずっと中央固視点 + 円周 8 ガボール提示。8 個のガボールうち 1 個（odd one）を直接タップで回答
- **G-04 / G-05 / G-06**：60 秒間左右 2 ガボールを直接タップ回答。設問文言：「より濃く見える / より細かい縞 / より大きく広がっている」
- **G-10**：8×8 grid（64 ガボール）の上に 4 象限のクリッカブル領域（透明背景 + 薄枠 + dataTargetId）を重畳。象限を直接タップで回答
- **G-11**：上 reference（disabled）+ 下に左右 2 テストパッチ。一方は reference と整列（offset=0、= 正解側）、もう一方は staircase 値分横ズレ。下部 2 パッチを直接タップ回答
- **G-09 / G-12 / G-13**：horizontal-2 / horizontal-4 / keypad-10 ボタン UI を維持しつつ、刺激領域直下に空間配置。`g09-{vertical|horizontal}` / `g12-{vertical|horizontal|diagonalRight|diagonalLeft}` / `g13-key-{0..9}` の data-target-id がボタンに付与され、◯/✕ 重畳が成立

### Sprint 21 全体サマリ

- **目的達成**：F-07（v1.1.2 直接選択原則）/ F-10（v1.1.2 操作対象上の重畳）/ §7.3〜§7.6 / §7.9〜§7.13 すべての受け入れ基準クリア
- staircase 値・採点ロジック・閾値計算ロジックは v1.1 から不変
- 永続化スキーマも不変
- メトリクスバーは引き続き表示しない（F-10 v1.1.1 継承）
- typecheck 0 errors、build:web PASS（937kB）、dev サーバー http://localhost:8083 稼働継続中

### 次の Sprint 推奨

1. **Evaluator 評価依頼**（オーケストレーター作業）
2. v1.1 試作 → 取捨選択 → リリースフェーズへの整理（13 G0XResultScreen.tsx の整理、`clock-8` / `grid-4` レイアウトファイルの整理など）

---

## Sprint 22 Stage 1 — v1.2 リブート（共通基盤・削除・データ層）

### 起動フロー（v1.2）

```
[アプリ起動]
  → loading（裏で v1/v1.1 永続化キー検出）
  → DataResetNotice（初回 v1.2 起動 + 旧データ検出時のみ、1 回限り）
  → Onboarding（onboardingCompleted=false のみ）
  → DistanceReminder（F-16、3 秒自動進行、最初から赤カウントダウン + tick 音）
  → CourseRunner（7 ゲーム順次：G-01 → G-03 → G-04 → G-05 → G-06 → G-07 → G-13）
    - 各ゲーム placeholder 5 秒（Stage 2 で本実装）
    - ゲーム間 interstitial 5 秒（ResultBadge + 「次へ」+ CountdownTimer）
  → CourseCooldown（F-15、10 秒、CountdownTimer xl + tick 音 + gameEnd 音）
  → PostSession（F-21 placeholder、Stage 3 で本実装）
    - 進捗 / バッジ / 設定の入口あり
    - 「もう一度」で distance-reminder へ戻れる（暫定）
```

### 廃止された動線

- **ホーム画面**（旧 F-04）：完全廃止、起動 = 即 F-16
- **ゲーム一覧画面**：完全廃止
- **単体プレイ**（旧 F-06）：完全廃止
- **F-18 `releaseEnabled` 機構**：完全廃止、7 ゲームをハードコード

### 削除されたゲーム

- G-02（左右並び傾き判別）
- G-08（残像方位弁別）
- G-09（側方マスキング）
- G-10（テクスチャ分離）
- G-11（Vernier 整列判定）
- G-12（クラウディング）

`gameRegistry` から完全に除外され、後続番号は再採番されない。

### 永続化キー prefix 変更

- v1.1 までの `gaboreye:v1.1:*` から **`gaboreye:v1.2:*`** に変更（spec §11）
- 起動時 F-17 拡張：v1 / v1.1 永続化キー検出 → 全消去 → DataResetNotice 表示 → 完了
- v1.1 → v1.2 マイグレーションコードは書かず「読み取り無視 → v1.2 キーで新規初期化」（spec §A-2）

### v1.2 paramRange（system.md §1.17 Designer 提案値）

| ゲーム | パラメータ | min（難） | max（易） | initial | step |
|---|---|---|---|---|---|
| G-01 | 回転速度（°/s） | 1 | 6 | 3 | 0.5 |
| G-03 | odd-one 角度差（°） | 1 | 11 | 6 | 1 |
| G-04 | コントラスト差 | 0.05 | 0.4 | 0.20 | 0.025 |
| G-05 | cpd 比 | 1.1× | 2.5× | 1.5× | 0.1 |
| G-06 | SD 比 | 1.1 | 2.0 | 1.5 | 0.1（v1.1 維持） |
| G-07 | 向きズレ許容角（°） | 3 | 15 | 8 | 1 |
| G-13 | 数字コントラスト | 0.02 | 0.15 | 0.05 | 0.01 |

### バッジ B-01〜B-12（v1.2 で 13 → 12）

旧 B-07「弁別の達人（G-02 依存）」を廃止、B-08 以降を再採番（spec §10）。

### 共通基盤新規コンポーネント

- `CountdownTimer`（CD-1）：F-07.1 統一カウントダウン UI（白→黄→赤、太字補強）
- `ResultBadge`（RB-1）：F-10 試行全体総合 ✅/❌（AAA 7:1）
- `SafeAreaWrapper`（SA-1）：NF-29/30、`mode="game"` で top inset 無視（フルスクリーン許容）
- `platform/audio.ts`：F-19 抽象、`playEvent('correct'|'wrong'|'tick3'|'tick2'|'tick1'|'gameEnd'|'badge')`
- `GaborPatch.tsx`：N=1.5 矩形クリッピング刷新（NF-27/28、角度自由化対応）

### Stage 1 完了時テスト件数

- **Sprint 21 完了時**：2307 件
- **Sprint 22 Stage 1 完了**：**1397 件 PASS / 1397 total**（旧ゲーム関連テスト 60+ 削除 + v1.2 用テスト +78 アサーション追加）
- **Sprint 22 Stage 1 ループバック修正後**：**1381 件 PASS / 1381 total**（dead export テスト除去・i18n 文言整理）
- **Sprint 22 Stage 2-A 完了**：**1454 件 PASS / 1454 total**（G-01 v1.2 / G-04 / G-05 / G-06 試行・採点ロジック・画面テスト +73 件）

### Sprint 22 Stage 2-A 実装範囲（v1.2 個別ゲーム本実装、3×3 系）

- **G-01 完全刷新**（コンセプト変更）：v1.1 の morphing 検出 → 3×3 グリッド + ランダム個数（1〜3）の回転パッチを複数選択。staircase は回転速度（°/s）。requestAnimationFrame 駆動、reduced-motion 時 5fps 階段化
- **G-03 確認のみ**：v1.1.2 で中央線方式撤去済み + F-10 統一仕様準拠済み。動作変更なし
- **G-04 / G-05 / G-06 共通 3×3 化**：3×3 oddball 構造で「違うパッチを複数選択」に統一。共通基盤 `grid3x3OddballTrial`（個数分布 35/40/25 抽選 + 部分点採点）+ 共通 UI `Grid3x3OddballStimulus`
  - G-04 staircase = コントラスト差（base 0.3 ± param）
  - G-05 staircase = cpd 比 r（base × r / ÷ r）
  - G-06 staircase = SD 比 r（base × r / ÷ r）
- **CourseRunner**：5 ゲームを実画面に差し替え（G-07 / G-13 は Stage 2-B 持ち越しのため Placeholder 維持）

### Sprint 22 Stage 2-A 新規ファイル

ロジック（5）：
- `src/lib/v11/g01v12Trial.ts`（G-01 v1.2）
- `src/lib/v11/grid3x3OddballTrial.ts`（共通基盤）
- `src/lib/v11/g04v12Trial.ts` / `g05v12Trial.ts` / `g06v12Trial.ts`

UI コンポーネント（2）：
- `src/components/v11/games/G01RotationGridStimulus.tsx`
- `src/components/v11/games/Grid3x3OddballStimulus.tsx`

画面（6）：
- `src/screens/v11/games/G04ContrastDiscriminationScreen.tsx` + `G04ResultScreen.tsx`
- `src/screens/v11/games/G05SpatialFrequencyScreen.tsx` + `G05ResultScreen.tsx`
- `src/screens/v11/games/G06GaussianSizeScreen.tsx` + `G06ResultScreen.tsx`

刷新：
- `src/screens/v11/games/G01ChangeDetectScreen.tsx` / `G01ResultScreen.tsx`（v1.2 化）
- `src/screens/v11/course/CourseRunnerScreen.tsx`（実ゲーム差し替え）
- `src/lib/v11/resultMarks.ts`（buildG01v12Marks / buildGrid3x3OddballMarks 追加）

### Sprint 22 Stage 2-B 完了

- **件数**：**1496 件 PASS / 1496 total**（Stage 2-A の 1454 から +42 件）
- **typecheck / build:web**：PASS（dist 出力 763 kB）

### Sprint 22 Stage 2-B 実装範囲（G-07 v1.2 + G-13 領域拡大 + ResultOverlay 完全 v1.2 化）

- **G-07 v1.2 完全刷新（22-F）**：
  - 4×4 グリッド維持、同じ向き個数 2〜5 ランダム（25/35/25/15）、ノイズは基準向きから ≥staircase 値離す
  - メッセージ「向きが同じものを選んで」（個数伏字、A11 確定）
  - 採点 TP+1 / FP-1 / FN 0 部分点（共通方針に統一）
  - staircase: min=3 / max=15 / initial=8 / step=1（Designer 提案準拠）
  - 新規ロジック `g07v12Trial.ts` + UI `Grid4x4OddballStimulus.tsx`
- **G-13 領域拡大（22-G）**：
  - 安全領域内で上 70% を刺激 / 下 30% を keypad に最大化（A4 確定）
  - 新規 `computeG13StimulusLayoutV12({ widthPx, heightPx })`：375x667 で刺激 343px 角、PC 横は最大 480px
  - keypad-10 ボタン 48〜80px（OPT-2 維持）
  - v1.1 の `computeG13StimulusLayout` は後方互換のため残置
- **F-10 ResultOverlay 完全 v1.2 化（22-I 残）**：
  - 旧 prop（`mode` / `onPlayAgain` / `onBackToList` / `onGoHome` / `onboardingCompletionMode`）完全削除
  - サマリパネル（result-overlay-summary-panel）撤去
  - 🕐 アイコン削除、`CountdownTimer (CD-1)` を採用（数字のみ + 色変化、点滅禁止）
  - 試行全体総合 ✅/❌（`ResultBadge / RB-1`）を刺激領域直下に 1 個追加
  - 6 ゲーム ResultScreen（G-01 / G-03 / G-04 / G-05 / G-06 / G-13）の `<ResultOverlay>` 呼び出しから旧 prop を全削除
- **CourseRunner**：G-07 / G-13 を Stage 2-A の placeholder から実画面に差し替え。**7 ゲーム順次プレイが完全動作**

### Sprint 22 Stage 2-B 新規ファイル

ロジック / UI（2）：
- `src/lib/v11/g07v12Trial.ts`（G-07 v1.2 trial 純関数）
- `src/components/v11/games/Grid4x4OddballStimulus.tsx`（4×4 oddball UI）

刷新（5）：
- `src/components/v11/ResultOverlay.tsx`（完全 v1.2 化）
- `src/screens/v11/games/G07EdgeHuntScreen.tsx`（v1.2 oddball へ書き換え）
- `src/screens/v11/games/G07ResultScreen.tsx`（v1.2 4×4 oddball + F-10 統一）
- `src/screens/v11/games/G13EmbeddedNumeralScreen.tsx`（70/30 領域拡大）
- `src/screens/v11/games/G13ResultScreen.tsx`（70/30 layout 共有）

更新（小幅）：
- `src/lib/v11/resultMarks.ts`（buildG07v12Marks 追加）
- `src/lib/v11/g13Trial.ts`（computeG13StimulusLayoutV12 追加）
- `src/screens/v11/course/CourseRunnerScreen.tsx`（G-07 / G-13 実画面差し替え）
- `src/screens/v11/games/G01-G06 ResultScreen.tsx`（旧 prop 撤去）

テスト（書換 / 追加）：
- `tests/v11/lib/g07v12Trial.test.ts`（新規 35 件）
- `tests/v11/components/v11/ResultOverlay.test.tsx`（v1.2 仕様で書換 25 件）
- `tests/v11/screens/games/G07EdgeHuntScreen.test.tsx`（v1.2 で書換 9 件）
- `tests/v11/screens/games/G07ResultScreen.test.tsx`（v1.2 で書換 11 件）
- `tests/v11/lib/resultMarksV12.test.ts`（buildG07v12Marks 追記 +4）
- `tests/v11/lib/g13Trial.test.ts`（computeG13StimulusLayoutV12 追記 +7）

### 次の Stage（Stage 3）

#### Stage 3 — F-21 事後画面・アイコン・永続化・Native
- F-21 連続プレイ事後画面（ワイドスコア + 7 ゲーム結果一覧 + 入口ボタン）
- CourseRunner からの実ゲーム永続化（SessionRecord / DailyStats / 連続日数 / バッジ評価）の本接続
- アプリアイコン全プラットフォーム差し替え（ガボール 45° 図柄）
- バッジ B-01〜B-12 の 7 ゲーム前提評価ロジック確定
- expo-audio / expo-haptics の Native 配線完全化
- 設定画面の音 / 振動トグル追加（F-14）
- G-13 staircase 値の Designer 提案値（initial 0.15 / step 0.025）への切替検討（履歴互換注意）


---

### Sprint 22 Stage 3 完了

- **件数**：**1570 件 PASS / 1570 total（129 suites）**（Stage 2-B の 1496 から +74 件 / +5 suites）
- **typecheck**：PASS
- **build:web**：PASS（dist 出力 795 kB、Stage 2-B の 763 kB から +32 kB：PostSession + sessionPersistence + native haptics shim）

### Sprint 22 Stage 3 実装範囲（F-21 / アイコン / Native audio / バッジ / 設定 / 永続化 / G-13 staircase）

- **F-21 連続プレイ事後画面（新設）**：`src/screens/v11/PostSessionScreen.tsx`
  - 上部ロゴ + ⚙ 設定 IconButton（56pt）
  - ワイドスコア（72px Bold tabular-nums + ／100）
  - ストリーク（🔥 + N 日連続）
  - セパレータ + section title「各ゲームの結果」
  - 7 ゲーム結果リスト（左ゲーム名 / 中央 ✅❌ / 右閾値、各行 72pt）
  - 入口ボタン 3 つ（📊 進捗 Primary / 🏅 バッジ Secondary / ⚙ 設定 Tertiary、各 64pt）
  - SafeAreaWrapper mode="default"
  - 「もう一度プレイ」ボタンは設けない（spec F-21 受け入れ：1 日 1 周）
- **セッション永続化（新設）**：`src/lib/v11/sessionPersistence.ts`
  - `finalizeCourseSession(input)`：SessionRecord 保存 + DailyStats 更新 + Streak 更新 + バッジ評価を一括
  - `computeWideScoreFromResults(results)`：今回セッションのワイドスコア純関数
- **CourseRunner 統合**：
  - `onCompleteWithResults?: (results) => void` prop を追加
  - 各実ゲームの `onComplete` で結果を捕捉（`extractCourseGameOutcome` 経由）
  - 7 ゲーム完走 + クールダウン後に `onCompleteWithResults` を呼ぶ
- **AppRouter 統合**：
  - `finalizeAndGoToPostSession` ハンドラを追加（永続化 + postsession 遷移）
  - postsession ルート：本実装 PostSessionScreen に切替（postSessionData あり時）
  - 旧 PostSessionPlaceholder は postSessionData 未設定時のフォールバック
- **G-13 staircase 値切替**：
  - paramRange を `{ min: 0.05, max: 0.30, initial: 0.15, step: 0.025 }` に変更（Designer 提案、system.md §1.17.10）
  - v1.2 起動時に staircase は全リセット（F-17）されるため履歴互換は気にしない
- **F-20 アプリアイコン全プラットフォーム差し替え**：
  - `scripts/generate-icons.py`（Pillow 使用）でマスター 1024×1024 から派生サイズ生成
  - `assets/icon.png`（iOS / 共通マスター）/ `adaptive-icon-foreground.png` / `adaptive-icon-background.png`（単色 #1A1D24）/ `splash-icon.png` / `pwa-512.png` / `pwa-192.png` / `favicon.png`
  - `assets/icons/app/icon-source.svg`（編集用 SVG マスター）
  - 図柄：ガボールパッチ 45°（左下 → 右上、時計回り）/ 暗背景 #1A1D24 / コントラスト 0.78 / ガウス窓
  - `app.json` 更新：`expo.icon` / `expo.splash.image` / `expo.android.adaptiveIcon` / `expo.android.icon` / `expo.ios.icon` / `expo.web.favicon`
- **F-19 Native audio・haptics 配線**：
  - `expo-haptics` 15.0.8 を依存追加（Expo SDK 54 互換）
  - `src/platform/audio.ts` に動的 require で Native ハプティクス配線
  - `Platform.OS=ios/android` のとき `expo-haptics.impactAsync(ImpactFeedbackStyle.Light/.Medium/.Heavy)` を呼ぶ
  - badge イベント：Heavy → 80ms 後に Medium（heavyThenMedium）
  - Web は従来通り `navigator.vibrate`、音は OscillatorNode 合成
  - **Native の音（mp3 再生）は本ステージでも未配線**（expo-audio / expo-av 導入は別スプリント、実機での音再生検証込みのため）。Native では音は no-op
- **設定画面の音/振動トグル**：
  - 既存の `SettingsScreen.tsx` で「効果音」「振動」が個別トグルで提供済み（A7 / F-19 確定）
  - audio.ts の `setSoundEnabled` / `setHapticsEnabled` と連動
- **バッジ B-01〜B-12 再評価ロジック**：
  - `src/lib/v11/badges.ts` は既に 12 種に再構成済み（Stage 1）
  - Stage 3 で `finalizeCourseSession` から `evaluateBadgesV11` を呼んで新規獲得を返す動線を本接続
  - 新規獲得時は `playEvent('badge')` を発火（音 + ハプティクス）

### Sprint 22 Stage 3 新規ファイル

ロジック（1）：
- `src/lib/v11/sessionPersistence.ts`（finalizeCourseSession + computeWideScoreFromResults）

画面（1）：
- `src/screens/v11/PostSessionScreen.tsx`（F-21）

スクリプト・アセット（9）：
- `scripts/generate-icons.py`（アイコン生成スクリプト）
- `assets/icon.png` / `assets/adaptive-icon-foreground.png` / `assets/adaptive-icon-background.png` / `assets/splash-icon.png` / `assets/pwa-512.png` / `assets/pwa-192.png` / `assets/favicon.png`
- `assets/icons/app/icon-source.svg`

テスト（4 ファイル / 76 アサーション）：
- `tests/v11/lib/sessionPersistence.test.ts`（17 件）
- `tests/v11/screens/PostSessionScreen.test.tsx`（19 件）
- `tests/v11/screens/course/CourseRunnerStage3.test.tsx`（2 件、統合）
- `tests/v11/platform/audioNativeHaptics.test.ts`（6 件、Native iOS）
- `tests/v11/assets/appIcons.test.ts`（30 件、F-20 アセット存在 + app.json 参照）
- 既存テスト 4 件（G-13 paramRange 変更で値更新）：staircaseV11 / g13Trial / G13EmbeddedNumeralScreen / sessionPersistence

更新（4）：
- `src/state/gameRegistry.ts`（G-13 paramRange 切替）
- `src/screens/v11/course/CourseRunnerScreen.tsx`（onCompleteWithResults + 結果捕捉）
- `src/navigation/v11/AppRouterV11.tsx`（PostSessionScreen 配線 + finalizeAndGoToPostSession）
- `src/platform/audio.ts`（Native expo-haptics 動的配線）
- `app.json`（アイコン参照）
- `package.json`（expo-haptics 追加）

### アイコン再生成方法

```
python3 scripts/generate-icons.py
```

すべての PNG が `assets/` 配下に書き出される（Pillow 12.x が必要）。
SVG マスターを編集する場合は `assets/icons/app/icon-source.svg` を直接編集後、
スクリプトで PNG を再生成する。

### Native audio・haptics 動作確認

| 環境 | 音 | ハプティクス | テスト |
|---|---|---|---|
| **Web（Chrome / Safari）** | OscillatorNode 合成（実音） | navigator.vibrate（モバイル Web のみ） | 自動（`tests/v11/platform/audio.test.ts`） |
| **iOS Expo Go** | expo-audio で `assets/audio/*.mp3` 再生（Sprint 23、要実機確認） | expo-haptics.impactAsync（実装済、要実機確認） | Native モック自動（`tests/v11/platform/audioNativeHaptics.test.ts`） |
| **Android Expo Go** | expo-audio で `assets/audio/*.mp3` 再生（Sprint 23、要実機確認） | expo-haptics.impactAsync（実装済、要実機確認） | 同上 |

---

## Sprint 23 — expo-audio 導入で Native 音 (mp3) 対応

Sprint 22 Stage 3 で残っていた Native 音再生未対応（no-op）を解消し、F-19 を
Web / iOS / Android すべてで完全実装にした。

### 採用パッケージ

- **`expo-audio: ~1.1.1`**（Expo SDK 54.0.34 対応、rapidreading2 で動作実績あり）
- `app.json` plugins に `"expo-audio"` を追加

### 音源 mp3（assets/audio/）

ffmpeg で sine 波合成。Web の OscillatorNode と**同じ周波数・長さ**で揃え、
プラットフォーム間の体感を統一。

| ファイル | 音 | サイズ |
|---|---|---|
| `correct.mp3` | C5 + E5（110ms + 130ms） | 3.7 KB |
| `wrong.mp3` | A3（200ms） | 3.7 KB |
| `tick.mp3` | 1200 Hz（70ms、tick3/tick2/tick1 共通、音量は EVENT_CONFIG で漸増） | 1.6 KB |
| `end.mp3` | A4 + C5（180ms + 240ms） | 5.9 KB |
| `badge.mp3` | C5 + E5 + G5（130 + 130 + 200ms） | 6.2 KB |

合計 ~21 KB。Web ビルドには含まれない（require は Native でのみ評価）。

### 音源再生成手順

```bash
cd assets/audio
ffmpeg -y -f lavfi -i "sine=frequency=523.25:duration=0.11" \
       -f lavfi -i "sine=frequency=659.25:duration=0.13" \
       -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1,volume=0.18" \
       -ar 44100 -ac 1 -b:a 96k correct.mp3
# 他 4 ファイルも同様（詳細は docs/sprints/sprint-23-self-review.md A-2 参照）
```

ffmpeg が必要（macOS なら `brew install ffmpeg`）。

### Native 実機確認の申し送り

Native 音は自動テストで配線（`createAudioPlayer` / `seekTo(0)` / `play()` /
`setAudioModeAsync({ playsInSilentMode: false, ... })`）まで検証済み。
ただし**実音再生の体感**は実機 Expo Go でのみ確認可能。確認すべき項目：

1. **5 種の音が実際に鳴ること**（iOS / Android Expo Go）
   - G-01 で正解 / 不正解時に correct.mp3 / wrong.mp3
   - F-07 / F-15 / F-16 のカウントダウン残り 3-2-1 秒で tick.mp3（音量漸増）
   - 60 秒ゲーム終了時に end.mp3
   - バッジ獲得時に badge.mp3（強+中の連打ハプティクスと同期）
2. **iOS サイレントスイッチ ON 時**：音が鳴らず、ハプティクスは継続発火（NF-33）
3. **Android システム音量 0**：音が鳴らない（OS 任せ）
4. **NF-31 音再生レイテンシ 100ms 以内**：タップ → 音まで体感遅延が無いこと
   （初回 1 発目だけ lazy 生成のため遅い可能性あり、必要なら起動時 prime を
   検討）

### Sprint 23 新規ファイル

アセット（5）：
- `assets/audio/correct.mp3` / `wrong.mp3` / `tick.mp3` / `end.mp3` / `badge.mp3`

ドキュメント（1）：
- `docs/sprints/sprint-23-self-review.md`

### Sprint 23 更新ファイル

- `package.json`（expo-audio ~1.1.1 追加）
- `app.json`（plugins に "expo-audio" 追加）
- `src/platform/audio.ts`（Native 音再生：`getNativePlayer` / `playNativeSound` /
  `configureAudioMode` / `loadNativeSource` を追加。`playEvent` の Native 分岐を
  no-op から expo-audio 呼び出しに変更。`_resetPlatformAudioForTest` も拡張）
- `tests/v11/platform/audio.test.ts`（+5 件、Native ソースキー集約検証）
- `tests/v11/platform/audioNativeHaptics.test.ts`（+10 件、expo-audio 配線検証）
- `docs/run.md`（Sprint 23 セクション追記、Native audio 状態更新）

### テスト件数

- Sprint 22 Stage 3 後：129 suites / **1570 tests**
- Sprint 23 後：129 suites / **1585 tests**（+15 件、新スイート追加なし）
- typecheck PASS / build:web PASS（bundle サイズは 796 kB で同一）

---

## Sprint v3.1-A — セッション制データ層＋ロジック層（S12/S14/S15/S16 のデータ・ロジック部）

> v3.1（`docs/spec.md`）への増分。スコープは **schema/migration/level/roundGen/gameMachine/
> セッションループのロジック/記録層**。UI（ゲーム開示描画・設定 UI・セッション要約画面）は次パス v3.1-B。

### 起動・確認コマンド（変更なし）

- `npm run typecheck` / `npm test` / `npm run build:web`（Web 静的本番ビルド）/ `npm start`（Expo Go）。
- v3 アプリは `App.tsx → AppRoot`。AppRoot のセッションループ全面配線は v3.1-B で行う（本パスは
  ロジック層のみ）。

### v3.1-A で実装した範囲

1. **レベル値集合の拡張（§4.1）**：`VALUE_SETS` を易→難順で拡張（count[1-6] / seconds[60..10] /
   gridSize[3-6] / rotationSpeed[7..1]）。`defaultVariableRanges()` は **v3.0 と同一の既定有効集合**
   （追加値 OFF・720 レベル）を返す。全集合は `fullVariableRanges()`（理論上限 6864）。`GridSize` 型を
   3|4 → 3|4|5|6 へ拡張。
2. **個数×サイズのクランプ（§4.7 / NF-28d）**：`clampCountToGrid(count, gridSize)` = `min(count,
   gridSize²−1)`（下限 1）。`generateRound` が生成時に適用し、静止パッチを必ず 1 つ以上残す。
   5x5/6x6 × count6 でも破綻しない。
3. **締切時判定（§4.3 / AS-24）**：`gameReducer` から**全問正解での即時締め切りを廃止**。締切は
   `TIMEOUT`（時間到達）のみ。`isAllCorrect` は締切時判定の補助として残置。`closedByAllCorrect` は
   後方互換のため残すが常に false（@deprecated）。`REVEAL_COUNTDOWN_SEC = 3`（締切後 3 秒開示）を追加。
4. **セッションループ（§4.6）**：`src/lib/v3/sessionMachine.ts`（純ロジック）。`startSession` /
   `completeRound`（ラウンドごと即昇降＝§4.4 applyResult・累積経過更新・集計）/ `shouldContinue` /
   `hasCompletedRounds`。**累積経過は各ラウンドの実プレイ秒数のみ算入（3 秒開示は除外）**。最後の
   ラウンドは制限時間を超えても完走。
5. **記録粒度＝セッション（§7.4-7.8）**：`GameRecord`→`SessionRecord` に置換。`PlayStats.totalGames`→
   `totalSessions`（+`totalRounds`）、`DailyStats.gameCount`→`sessionCount`（+`roundCount`）。
   `src/state/v3/sessionRecorder.ts`（記録＋日次/ストリーク/累計/バッジ）・`sessionFlow.ts`
   （`resolveCompletedRound` でラウンドごと LevelState 永続、`finalizeSession`/`abortSession` で
   セッション記録）。
6. **設定 `sessionMinutes`（§7.2 / AS-23）**：int 1..15・既定 5。`sanitizeSessionMinutes` /
   `setSessionMinutes`。梯子（総レベル数）には影響しない。
7. **migration（v3.0→v3.1 非リセット）**：名前空間 `gaboreye:v3:*` 据え置き。`sessionMinutes` 既定 5・
   `totalGames`→`totalSessions/totalRounds`・`gameCount`→`sessionCount/roundCount` を読み込み時に補完。
   `schemaVersion` を 3.1.0 へ更新。旧 `game:<uuid>` は無視（破棄せず放置）。v1〜v2 全消去（F-11）は維持。

### v3.1-A 新規ファイル

- `src/lib/v3/sessionMachine.ts`（セッション統括純ロジック）
- `src/state/v3/sessionRecorder.ts`（SessionRecord 記録＋集計＋バッジ）
- `src/state/v3/sessionFlow.ts`（ラウンド/セッションの I/O 配線）
- テスト：`tests/lib/v3/sessionMachine.test.ts`・`tests/state/v3/sessionFlow.test.ts`・
  `tests/state/v3/sessionRecorder.test.ts`

### v3.1-A 主な更新ファイル

- `src/lib/v3/{level,roundGen,gameMachine,gameView,statsAggregation}.ts`
- `src/state/v3/{schema,keys,repository,settings,migration,homeFlow,index}.ts`
  （`homeFlow.ts` は v3.0 互換シム＝1 ゲーム=1 ラウンド=1 セッションとしてセッション層上で動かす。
  v3.1-B で AppRoot をセッションループへ配線後に撤去予定）
- `src/screens/v3/{HistoryScreen,SettingsScreen}.tsx`（totalSessions 参照・grid 5x5/6x6 ラベル）
- `src/i18n/ja.ts`（grid_5/grid_6）

### 削除ファイル

- `src/state/v3/gameRecorder.ts` → `sessionRecorder.ts` に置換
- `tests/state/v3/gameRecorder.test.ts` → `sessionRecorder.test.ts` に置換

### v3.1-A の申し送り（v3.1-B で配線するもの）

- AppRoot/GameScreen を**セッションループ**へ全面配線（`startSession`→ラウンド反復→
  `resolveCompletedRound`→締切後 3 秒カウントダウン→次ラウンド or `finalizeSession`）。
- 締切後の **3 秒開示カウントダウン UI**（F-12 白→黄→赤、`REVEAL_COUNTDOWN_SEC`）。現状の
  `revealIntervalMs`（1.5 秒）は v3.0 互換で残置。
- **セッション要約画面**（F-08：ラウンド数/クリア・失敗数/現在レベル/今セッション最高/今日のストリーク）。
- 設定タブの **sessionMinutes 行**（S13）と **拡張値域チップ**（5x5/6x6 等）の UI。
- `homeFlow.ts` 互換シムの撤去。

### テスト件数

- v3.1-A 前：50 suites / **491 tests**
- v3.1-A 後：**52 suites / 537 tests**（+46 件、新スイート 2＝sessionMachine/sessionFlow、
  gameRecorder→sessionRecorder 置換）
- `npm run typecheck` PASS / `npm test` 全 PASS（赤 0）/ `npm run build:web` PASS


---

## v3.1-B：UI 配線（セッションループ・3 秒開示・セッション要約・設定 UI・5x5/6x6） — v3.1 完成

v3.1-A のセッション制データ／ロジック層を画面に**全面配線**し、v3.1 をリリース可能状態にした。

### 起動・到達手順（v3.1 セッション動線の確認）

```bash
npm install
npm run typecheck     # 型検査（緑）
npm test              # 全テスト（51 suites / 540 tests・赤 0）
npm run build:web     # Web 本番ビルド（dist/ 出力）
npm run web           # Web dev（Expo）。初回は免責同意 → 距離 → セッション自動開始
npm start             # Expo Go（Android/iOS 実機・Expo SDK 54）
```

短時間でセッション動線を通すには、設定タブ →「プレイ」→「1 回のプレイ時間」を **1 分**にして
ホームへ戻り「もう一度」。1 分（60 秒）で 2 ラウンド前後を反復し、セッション要約に到達する。

### v3.1 セッション動線（到達経路）

```
起動 →（初回）オンボ → 距離リマインド（3 秒自動進行）
  → ホームで現在レベルのセッション自動開始
  → ラウンド：n×n 格子を「時間」秒注視 → 締切（時間到達）でクリア/失敗判定（全問正解でも即時終了しない）
  → 締切後：✅/❌ 開示 + 刺激領域直下に総合クリア/失敗 + 3 秒開示カウントダウン（赤・Black 太字・点滅なし）
  → 0 で自動的に：累積 < sessionMinutes×60 → 更新後レベルで次ラウンド（GB-1 レベルピル変化で観察）
                  累積 ≥ sessionMinutes×60 → ホームのセッション要約
  → セッション要約：現在レベル(64px 主役)/今セッション最高/ラウンド数・クリア・失敗/今日のストリーク
  → 「もう一度」→ 距離リマインド → 新セッション（累計プレイ +1）
```

- **セッション残り時間**：ゲーム上部バー左に「あと {mm}:{ss}」（控えめ・段階色なし、GB-1）。
- **中断（F-07）**：プレイ中の ×／他タブで中断ダイアログ。OK で**未完の現ラウンドは破棄**、
  **完了済みラウンドのレベル変化は永続保持**（巻き戻さない、AS-30）。完了済みラウンドが 1 つ以上あれば
  `SessionRecord` 記録。要約表示中・距離リマインド中・3 秒開示中は自由遷移。
- **5x5/6x6 格子**：設定で個数/サイズの追加値（既定 OFF）を ON にすると出現。360px に収まりタップ確保
  （隙間 5px/4px、パッチ辺 ≈ 61px/51px、✅/❌・選択枠は比例縮小）。

### v3.1-B 新規ファイル

- `src/components/v3/SessionSummaryCard.tsx`（RC-1 → セッション要約、F-08）

### v3.1-B 主な更新ファイル

- `src/screens/v3/AppRoot.tsx`（**セッションループ全面配線**：startSession → ラウンド反復 →
  resolveCompletedRound → 3 秒開示後に次ラウンド or finalizeSession → セッション要約。中断は
  abortSession。`onResolveGame` → `onResolveRound`/`onFinalizeSession` へ）
- `src/screens/v3/GameScreen.tsx`（締切後 **3 秒開示カウントダウン**（CD-1 disclosure）+ セッション
  残り時間。`revealIntervalMs`(1.5s) 参照を撤去し `REVEAL_COUNTDOWN_SEC`(3s) へ）
- `src/screens/v3/SettingsScreen.tsx`（**sessionMinutes ステッパー**（SR-1a、「プレイ」グループ・
  範囲設定の前）。拡張全集合チップは `VALUE_SETS` 由来で既に表示）
- `src/components/v3/CountdownTimer.tsx`（`disclosure` variant：3 秒固定・全区間 danger・assertive）
- `src/components/v3/GameTopBar.tsx`（左にセッション残り時間「あと {mm}:{ss}」、`formatSessionRemaining`）
- `src/components/v3/GaborGrid.tsx`（`computeGap` を 5x5=5px / 6x6=4px に拡張、system §16.6）
- `src/lib/v3/gameMachine.ts`（`closedByAllCorrect` フィールド撤去＝締切は TIMEOUT 一本）
- `src/lib/v3/gameView.ts`（`revealIntervalMs`/`REVEAL_INTERVAL_MS`/`ALL_CORRECT_FEEDBACK_MS` 撤去）
- `src/state/v3/index.ts`（`homeFlow` export 撤去）
- `App.tsx`（`resolveCompletedGame` → `resolveCompletedRound`/`finalizeSession`/`abortSession`、
  セッション識別子 ref、`sessionMinutes` を AppRoot へ）
- `src/i18n/ja.ts`（`sessionV3.*`・`gameV3.session_remaining*`・`gameV3.disclosure_countdown`・
  `settingsV3.group_play`/`session_minutes*`・`abortV3.message` をセッション制へ）

### 撤去した v3.0 互換シム（S17）

- `src/state/v3/homeFlow.ts`（互換シム）＋ `tests/state/v3/homeFlow.test.ts`
- `gameMachine.closedByAllCorrect`（常に false の後方互換フィールド）
- `gameView.revealIntervalMs` / `REVEAL_INTERVAL_MS` / `ALL_CORRECT_FEEDBACK_MS`（1.5 秒開示）

> `HomeResultCard.tsx`（RC-1 v3.0 単発結果カード）は SessionSummaryCard へ置換され**アプリ未使用**だが、
> 自身のコンポーネントテストとともに残置（回帰 0・無害）。

### テスト件数

- v3.1-A 後：52 suites / **537 tests**
- v3.1-B 後：**51 suites / 540 tests**（赤 0）
  - 純増：SessionSummaryCard 3 件・CD-1 disclosure 1 件・GameTopBar セッション残り時間 3 件・
    GaborGrid 5x5/6x6 隙間/辺長 2 件・GameScreen 3 秒開示 1 件・sessionMinutes ステッパー 3 件・
    拡張チップ 2 件・AppRoot セッションループ/要約/中断・integration セッション通し 2 件 等。
  - スイート数は homeFlow.test 撤去（−1）と sessionMachine/sessionFlow 既存分で 51。
- `npm run typecheck` PASS / `npm test` 全 PASS（赤 0）/ `npm run build:web` PASS
