# Sprint 1 自己レビュー — テスト基盤確認・旧コードクリーンアップ（v2.0）

実装日：2026-05-30
担当：Generator（sprint モード）
仕様：`docs/spec.md` §7 S1 / §0 改訂履歴 / §10 スコープ外
デザイン：`docs/design/sprints/sprint-1/screens.md`（UI なし、撤去/残置の境界定義）

> 注：本ファイルは v1.x 時代の「描画基盤と Game 2 最小骨格」の自己レビューを
> v2.0 リブートの S1 内容で上書きしたもの（スプリント番号を v2.0 で再利用）。

---

## 1. やったこと

v2.0 リブート（spec.md §0）に伴い、v1 / v1.1 / v1.2 の全ゲーム実装・旧ルーター・
旧データ層・旧テストを撤去し、v2.0 で再利用する描画/テーマ基盤だけを残した。
本実装（データ層・ゲームコア・タブ等）は S2 以降。本スプリントの目標は
「足場が緑」＝ `npm test` 緑 / `tsc --noEmit` 0 / `build:web` PASS。

### 1.1 撤去（v1.x 完全リタイア）
- **A. v11 ツリー**：`src/screens/v11/`・`src/components/v11/`・`src/components/v12/`・`src/lib/v11/`・`src/navigation/v11/`・`src/i18n/v11/`・`src/hooks/v11/`
- **B. v1 最初期ツリー**：`src/screens/*.tsx`（全 14 画面）・`src/screens/Onboarding/`・`src/navigation/AppRouter.tsx`
- **v1.x lib（流用基盤以外）**：game1/2/3・staircase・badges・streak・v1score・dailyBest・weeklyStats・gaborOrientations・keyboardShortcuts・motion・appState・audio・haptics
- **v1.x state**：`src/state/storage.ts`・`storage-v11.ts`・`gameIds-v11.ts`・`gameRegistry.ts`
- **v1.x components**：GaborPatch 以外の 28 個（Button / Toggle / DisclaimerSheet / GaborGrid / ClockAnswerButtons / V1ScoreChart / StreakBadge …）
- **`src/platform/audio.ts`**：F-14（S9）で別抽象を流用予定のため一旦撤去
- **テスト**：`tests/v11/`（78）・`tests/lib/`・`tests/screens/`・v1.x component テスト・`tests/staircase|storage|i18n/ja`

### 1.2 残した流用基盤（C 判定）
| ファイル | 理由 |
|---|---|
| `src/components/GaborPatch.tsx` | ガボール描画中核。NF-27/28 クリッピング品質を満たす。S3/S4 の n×n 格子・回転＋周波数変化の土台（**必須残置**） |
| `src/lib/gaborPixels.ts` | GaborPatch の RGBA→BMP 計算 |
| `src/lib/calibration.ts` | cpd→px・ppd・device 推定（視聴距離→表示サイズ） |
| `src/theme/`（tokens / ThemeProvider / focusStyle / index） | v2.0 確定済みデザイントークン。`DarkModePreference` を tokens.ts へ移設して theme を自己完結化（旧 state/storage 依存を切断） |
| `src/i18n/`（index / ja） | t / tArray / interpolate の i18n キー基盤（AS-20）。`ja.ts` は最小辞書（app / common）にリセット |

### 1.3 足場の置換
- `App.tsx`：旧 `AppRouterV11` 参照を撤去し、`SafeAreaProvider → ThemeProvider → 最小プレースホルダ画面`（GaborEye / v2.0 / 準備中）へ退避。流用基盤（theme / i18n）を実際に通電させて build を緑に保つ
- `tests/sanity.test.ts` に加え、流用基盤の疎通テスト（theme / calibration / gaborPixels / GaborPatch / ThemeProvider / focusStyle）を残置し、テスト件数 0 を回避

### 1.4 ハウスキーピング
- ルート直下の `build-*.apk`（66MB）と作業用 `*.png`（117 枚、いずれも **git 未追跡**）を誤コミットしないよう `.gitignore` に `/build-*.apk` / `/*.apk` / `/*.png` / `/*.jpg` / `/*.jpeg` を追記。**ファイルは削除していない**（ユーザー資産を保持）。`docs/` 配下の追跡済み QA スクショは対象外

---

## 2. 確認したこと（自己評価チェックリスト）

| 項目 | 結果 |
|---|---|
| `npx tsc --noEmit` | **エラー 0**（実行）|
| `npm test` | **7 スイート / 46 件 PASS**（実行）|
| `npm run build:web` | **PASS**。AppEntry ≈ **318 kB / 148 modules**（旧 778 kB から縮小、実行）|
| serve 動作確認 | `npx serve -s dist -l 4599` → **HTTP 200** / `<title>GaborEye</title>`（実行）|
| dangling import チェック | 削除モジュールへの import 残存なし（grep で確認）|
| 流用基盤の通電 | App.tsx が theme / i18n を実使用、build に含まれることを確認 |

### テスト件数の前後
| 時点 | テスト |
|---|---|
| S1 前（setup 調査時） | 1452 件中 1367 PASS / 85 FAIL（22 スイート失敗）|
| **S1 後** | **46 件 / 7 スイート、全 PASS**（失敗源の v1.x 依存テストを撤去した結果）|

> 件数は大幅減だが、これは「動かない v1.x 依存テストの撤去」によるもの。
> 残した 46 件はすべて v2.0 流用基盤を対象とし、緑。S2 以降で v2.0 機能テストが積み増される。

---

## 3. 受け入れ基準マッピング（spec §7 S1）

| 完成の定義 | 状態 |
|---|---|
| dev サーバー / ビルド / テストランナーが動く | OK（build:web PASS + serve 200、jest 緑、typecheck 0）|
| v1.x の旧ゲーム実装・旧データ層が整理される | OK（A/B 全撤去、§1.1）|
| v2.0 の足場が用意される | OK（最小エントリ + 流用基盤、§1.2/1.3）|
| `npm test` 緑 | OK（46/46）|
| `npx tsc --noEmit` エラー 0 | OK |
| `npm run build:web` PASS | OK |
| `docs/run.md` 更新 | OK（§0 を S1 完了状態に全面更新）|

---

## 4. 既知の懸念 / 申し送り

- **スキーマ変更なし**：S1 はコード撤去のみで、データモデル（spec §6）には触れていない。`gaboreye:v2:*` 永続化層は S2 で新規構築。F-11 の旧キー消去は S2/S6 で実装（旧 storage-v11 の消去ロジックは撤去したので S2 で書き起こす）
- **i18n `ja.ts` は最小辞書**：v1.x の home/settings/disclaimer 辞書は撤去済み。S2（設定）・S6（オンボ/免責）等で v2.0 デザインの文言を再投入する
- **`src/platform/audio.ts` 撤去**：F-14（S9）で `../rapidreading2/src/platform/audio.ts` 抽象の流用を想定（spec F-14）。S9 着手時に再導入
- **GaborPatch の props 互換性**：現行は単一パッチの静的描画 + transform 回転。v2.0 は「回転（a deg/sec）＋空間周波数変化（b hz/sec）の連続アニメーション」が必要（S3/S4）。連続変化時のパフォーマンス（BMP 再生成 vs transform）は S4 で iPhone 実機検証が必要。現状の transform 回転方式は回転変化に流用可能だが、cpd 連続変化は BMP 再計算が要るため、S4 で描画戦略（Skia 等）を要検討
- **テスト件数の谷**：S1 で 46 件まで減ったが、これは設計どおり（壊れた v1.x テストの撤去）。S2 以降で「テストは増やすもの」原則に復帰する
- **`tests/components/` 残置**：GaborPatch.test.tsx のみ。空ディレクトリではない
