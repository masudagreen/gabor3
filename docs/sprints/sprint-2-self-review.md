# Sprint 2 自己レビュー — データ層・設定（F-13・F-11・データモデル §6）（v2.0）

> 対象：spec.md S2 / F-13（設定タブ）・F-11（起動時データリセット）・§6（データモデル）。
> デザイン：`docs/design/sprints/sprint-2/screens.md`・`docs/design/system.md §9.1`・`docs/design/components.md`（SR-1/FT-1/FT-2/FT-3/DG-1/RZ-1）。
> 注：本ファイルは v1.x（旧プロジェクト）の同名レビューを v2.0 内容で上書きしたもの。

## やったこと

### 1. データモデル §6（`gaboreye:v2:*` 名前空間）
- `src/state/schema.ts`：UserProfile / Settings / RoundRecord / SessionRecord / DailyStats / Streak / PlayStats / BadgeStatus の型を §6 のフィールド・型どおりに定義。列挙（ScoringMode/DarkMode/OneEyeGuidance/BadgeId）と `PARAM_SPECS`（n/m/r/a/b の min/max/step/default＝system §9.1）と既定値ファクトリを同居。
- §6.2 注記の「漸進難化モード用の拡張余地」を Settings に任意フィールド（`progressiveModeEnabled` / `progressionState`）として残置（v2.0 では未実装・未表示）。**凍結スキーマの必須フィールドは変更していない**（任意追加のみ）。
- `src/state/store.ts`（AsyncStorage JSON 低レベル）＋ `src/state/repository.ts`（型付き load/save）。単一レコード（固定キー）とコレクション（session/dailyStats/badge、プレフィックス走査）の両方に対応。破損 JSON・未保存は既定値にフォールバック。

### 2. F-11 起動時データリセット
- `src/state/migration.ts`：`runStartupMigration()` が旧名前空間（`gaboreye:v1:*` / `gaboreye:v1.1:*` / `gaboreye:v1.2:*`）を検出・`multiRemove` で消去し、v2 中核レコードを未保存なら既定で初期化（`ensureV2Initialized`）。
- 通知の 1 度化：`resetNoticeShown` フラグ（`gaboreye:v2:resetNoticeShown`）。`shouldShowNotice = 消去あり ∧ 未通知`。`acknowledgeResetNotice()` で OK 押下時にフラグ確定。冪等（旧キーが無ければ消去しない）。
- 通知 UI＝`DataResetNotice`（RZ-1）。表示制御は App.tsx が `shouldShowNotice` で行う（実際の起動フロー組込み詳細は S6 領分だが、S2 で配線済み）。

### 3. F-13 設定タブ
- `src/screens/v2/SettingsScreen.tsx`：screens.md S2-1 のグループ順（ゲーム設定 / 採点方式 / 表示・視聴 / フィードバック / その他）で全項目を配置。各変更で即時保存。
  - n＝SegmentedControl（3/4/5）、m/r/a/b＝Slider（範囲・step・既定は §9.1）、a/b は「難しい(小)/易しい(大)」併記。
  - 採点方式①②③＝縦リスト 3 ラジオ（各行 56pt、ラベル+説明 caption）。**既定②（auto-confirm）**＝screens.md 注記の Designer 提案を採用。
  - 視聴距離 30/40/50（既定 40、UserProfile に保存）、ダークモード OS連動/明/暗、音/振動 個別トグル（ON/OFF テキスト併記）、片眼 なし/左/右/交互。
  - 免責再閲覧（入口のみ、押下ハンドラは任意 prop＝S6 で配線）、全データ削除（行タップ→ConfirmDialog→「削除する」の 2 段階）、バージョン `v2.0.0`＋免責同意日時。
- `src/state/settings.ts`：範囲外不可を担保する純関数 setter（`clampToSpec` は小数 step 0.05 の浮動小数誤差も丸めで吸収）＋ `updateSettings`（load→変換→save）。
- `src/state/dataReset.ts`：全データ削除（v2 全消去→既定再初期化）。リセット通知フラグは保持し、削除後に旧データ消去通知が誤発火しないようにした。

### 4. 起動配線（App.tsx）
- S1 のプレースホルダを置換：マイグレーション実行 → darkMode を ThemeProvider に反映 → SettingsScreen 表示 → 必要時のみ DataResetNotice。ボトムタブは S5 のため未統合（暫定単体表示）。

## 確認したこと（自己評価チェックリスト）
- [x] 受け入れ基準を満たすことをテストで確認（下表マッピング）
- [x] `npx tsc --noEmit`：エラー 0
- [x] `npm run build:web`：PASS（App.tsx 込みでバンドル成功 ≈ 393 kB）
- [x] `npm test`：**13 スイート / 100 件 PASS**（S1=46 → +54）
- [x] 主要動線をテストで操作：格子サイズ/採点方式/視聴距離/トグル変更→永続化、全データ削除 2 段階→既定復帰、ダークモード変更→親通知
- [x] 空/ロード/エラー状態：未保存→既定値、ロード中はタイトルのみ、破損 JSON→既定フォールバック、範囲外→クランプ
- [x] デザイン乖離なし：components.md の SR-1/FT-1/FT-2/FT-3/DG-1/RZ-1 とトークン（fontSize/spacing/radius/tapTarget）に準拠、56pt 高さ・ON/OFF 一目判別・難→易ラベル
- [x] 既存スプリント回帰なし：S1 残置テスト（theme/calibration/gaborPixels/GaborPatch/ThemeProvider/focusStyle/sanity）全 PASS
- [x] `docs/run.md` に §0-S2 追記済み

## 受け入れ基準マッピング

### F-13（設定タブ）
| 受け入れ基準 | 実装 | テスト |
|---|---|---|
| n/m/r/a/b 設定可・反映 | SettingsScreen + settings setter | settings.test / SettingsScreen.test |
| 範囲外不可 | `clampToSpec` / `setGridSize` スナップ | settings.test（クランプ・小数 step） |
| 採点方式①②③ | 縦ラジオ + `setScoringMode` | settings.test（列挙）/ SettingsScreen.test |
| 視聴距離 30/40/50（既定40）即保存 | UserProfile.viewingDistanceCm | SettingsScreen.test |
| ダークモード OS連動/明/暗 | `setDarkMode` + ThemeProvider 反映 | settings.test / SettingsScreen.test |
| 音/振動 個別トグル・一目判別 | Toggle（ON/OFF 併記、NF-12） | settingsControls.test / SettingsScreen.test |
| 片眼 off/左/右/交互 | `setOneEyeGuidance` | settings.test |
| 免責再閲覧 | onReadDisclaimer 入口（S6 配線） | — |
| 全データ削除 2 段階 | 行→ConfirmDialog→削除 | SettingsScreen.test |
| 各行 56pt 以上 | SettingRow minHeight=56 | （視認・トークン） |
| v2.0.x + 同意日時 | バージョンブロック | SettingsScreen.test（v2.0.0） |

### F-11（起動時データリセット）
| 受け入れ基準 | 実装 | テスト |
|---|---|---|
| 旧名前空間キー全消去 | `selectLegacyKeys` + `removeKeys` | migration.test |
| v2 で初期化 | `ensureV2Initialized` | migration.test |
| 消去完了通知（1 度だけ） | `shouldShowNotice` + フラグ | migration.test（2 回目は出さない） |
| OK 56pt 以上 | DataResetNotice OK=64pt | （トークン） |
| 2 回目以降出さない | `wasResetNoticeShown` | migration.test |
| 端末ローカルのみ | AsyncStorage のみ使用 | （構成） |

## 既知の懸念・申し送り
- **免責再閲覧の遷移先（DisclaimerPanel）は未実装**。S2 は入口（任意 prop）まで。spec 上 DisclaimerPanel/オンボは S6 領分のため、S6 で `onReadDisclaimer` を配線する。
- **ボトムタブ未統合**：S2 は SettingsScreen 単体表示。S5（NV-1 BottomTabBar・中断ダイアログ）で 3 タブに組込む。DataResetNotice の起動フロー上の表示順（オンボより前）も S6 で最終確定。
- **Slider は −/＋ステッパ式**を採用（`@react-native-community/slider` 等の追加依存を避け、Web の Tab/Enter キーボード操作と RN タップを両立するため）。連続ドラッグ UI ではないが、step 単位の確実な操作・範囲クランプ・a11y（role=adjustable + aria-value）は満たす。ドラッグ式が望ましければ S10 仕上げで再検討可。
- **darkMode 即時反映**は App.tsx が `onSettingsChange` で受けて `ThemeProvider preference` を更新する設計。S5/S6 でルートが置き換わる際は同じ配線を引き継ぐ必要がある。
- dev サーバー直起動の代わりに `build:web` で検証（CLAUDE.md §6 EMFILE フォールバック方針）。バンドル成功＝起動経路の import 健全性を担保。
