# Sprint 4 Self-Review — オンボーディング + 免責 + キャリブレーション完成版

> **注**：本 Sprint は Generator がストリームタイムアウトを起こしたが、実装本体・テスト・typecheck・build はすべて完了済み。本 self-review はオーケストレーターが直接実装内容を確認のうえ作成（CLAUDE.md「タイムアウト時はオーケストレーターが直接書く」原則）。

## Sprint 4 の目標
- 初回起動から 90 秒以内にゲーム 1 試行が完了する
- 視聴距離 30/40/50cm で cpd（実描画サイズ）が変わる
- 免責同意の永続化
- 70 代以上申告時の警告表示

## 含む機能
- F-01 オンボーディング（90 秒以内、7 画面）
- F-02 免責事項表示
- F-03 視聴距離キャリブレーション完成版

## 実装ファイル一覧

### 新規（13 ファイル）
| パス | 役割 |
|---|---|
| `src/components/DisclaimerSheet.tsx` | 免責表示（再利用可能）。components.md §13 |
| `src/components/DistanceCalibrator.tsx` | 30/40/50cm スライダー。components.md §11 |
| `src/components/AgeWarningModal.tsx` | 70s+ 選択時警告。spec A-9 |
| `src/components/StepIndicator.tsx` | オンボ進捗表示（1/7 等） |
| `src/components/Checkbox.tsx` | 同意チェックボックス（Disclaimer 用） |
| `src/screens/Onboarding/WelcomeScreen.tsx` | S4-01 ようこそ |
| `src/screens/Onboarding/DisclaimerScreen.tsx` | S4-02 免責同意 |
| `src/screens/Onboarding/AgeGroupScreen.tsx` | S4-03 年齢層申告 + 70s+ 警告 |
| `src/screens/Onboarding/CalibrationScreen.tsx` | S4-04/S4-05 視聴距離設定 |
| `src/screens/Onboarding/MiniTutorialScreen.tsx` | S4-06 ミニチュートリアル説明 |
| `src/screens/Onboarding/ExperienceScreen.tsx` | Game 1 流用の 20 秒練習試行（オンボ時短のための工夫） |
| `src/screens/Onboarding/OnboardingDoneScreen.tsx` | S4-07 準備完了 |
| `src/screens/Onboarding/OnboardingFlow.tsx` | 7 画面フロー制御 |

### 変更（3 ファイル）
| パス | 内容 |
|---|---|
| `src/lib/calibration.ts` | 端末タイプ自動推定（Dimensions + PixelRatio）、UserProfile 反映 |
| `src/state/storage.ts` | UserProfile（disclaimerAgreedAt / ageGroup / viewingDistanceCm / deviceTypeEstimated / createdAt / onboardingCompleted）の load/save |
| `src/navigation/AppRouter.tsx` | 起動時 UserProfile load、onboardingCompleted=false なら Onboarding へ |

### 新規テスト（9 ファイル）
| パス | テスト件数 |
|---|---|
| `tests/components/DisclaimerSheet.test.tsx` | 6 |
| `tests/components/DistanceCalibrator.test.tsx` | 5 |
| `tests/components/AgeWarningModal.test.tsx` | 3 |
| `tests/components/Checkbox.test.tsx` | 3 |
| `tests/screens/Onboarding/AgeGroupScreen.test.tsx` | 5 |
| `tests/screens/Onboarding/CalibrationScreen.test.tsx` | 4 |
| `tests/screens/Onboarding/DisclaimerScreen.test.tsx` | 3 |
| `tests/calibration.test.ts`（拡張） | +10（合計 18） |
| `tests/storage.test.ts`（拡張） | +5（合計 11） |

## テスト件数推移
- Sprint 3 完了時：96 件
- Sprint 4 完了時：**140 件**（**+44 件**、要求 +7 件以上を大きく超過）
- 全 24 スイート PASS

## 検証結果
| コマンド | 結果 |
|---|---|
| `npm test` | 24 スイート / **140 件 PASS** / 0 FAIL |
| `npm run typecheck` | エラー 0 |
| `npm run build:web` | 成功（dist/ 出力） |

## 受け入れ基準カバレッジ（screens.md S4-01〜S4-10）
- ✅ 初回起動でオンボが起動する（AppRouter で onboardingCompleted フラグを参照）
- ✅ 90 秒以内にゲーム 1 試行が完了：7 画面の操作ステップは（タップ 7〜8 回）。Welcome→Disclaimer（同意 + 続ける）→AgeGroup→Calibration→MiniTutorial→Experience（20 秒最易試行）→Done。Experience が 20 秒なので残り 70 秒で 6 画面を通過すれば良く、画面あたり 11 秒以下で十分達成可能
- ✅ 免責同意なしには次へ進めない（DisclaimerScreen のチェックボックス必須）
- ✅ 70s+ 選択時に警告モーダル（AgeWarningModal、続ける/戻る 2 択）
- ✅ 視聴距離 30/40/50cm の 3 段階スライダー、デフォルト 40cm
- ✅ 距離変更でガボール表示サイズが変わる（calibration.ts が UserProfile.viewingDistanceCm を読む）
- ✅ オンボ完了後は再起動でも直接ホームへ（onboardingCompleted=true 永続化）
- ✅ 24px 以上のフォント、48-64px 以上のタップ領域維持（既存トークン適用）
- ✅ Sprint 1/2/3 のリグレッションなし（既存 96 件すべて引き続き PASS）

## 設計上の判断
1. **ExperienceScreen の追加**：screens.md には MiniTutorial の中で 1 試行を完結させる構成だったが、実装上は説明（MiniTutorialScreen）と練習試行（ExperienceScreen）に分離する方が責任分離・テスト容易性が高いと判断。観察可能な挙動（90 秒以内ゲーム 1 試行）は維持。Generator の合理的判断と認める。
2. **練習試行は staircase 更新しない**：オンボ Experience は固定 3×3 / 同時変化 1 / 角度差 8°（最易）で staircase に影響を与えない。本番セッション開始時に staircase が初期値で始まるよう保証。
3. **端末タイプ自動推定**：iOS / Android / タブレット / PC を `Dimensions.get('window')` の幅と `Platform.OS` で推定。dpi 計算は `PixelRatio.get()` 経由。
4. **AppRouter の起動時ロード**：useState の初期値関数で UserProfile を非同期 load し、ロード中はスプラッシュ的な空画面を出す（一時的）。Sprint 7 で適切なローディング UI を追加可能。

## 既知の制約・申し送り
1. **設定画面からの再アクセス**：DisclaimerSheet は再利用可能な作りだが、設定画面の本実装は Sprint 7。本 Sprint では再利用できるようコンポーネント側のみ準備。
2. **多言語化**：spec のとおり日本語のみ。文言は集中管理されているので Sprint 7+ で多言語化容易。
3. **オンボーディング再開**：途中で × を押した場合の「途中離脱→次回も最初から or 続きから？」は未定義。現状は最初から（onboardingCompleted=false なので）。
4. **CalibrationScreen の cpd プレビュー**：components.md §11 で言及された「現在値に応じた cpd プレビュー」は未実装（任意）。Sprint 5 以降で UX 強化の余地あり。
5. **70s+ 申告後の警告再表示**：本 Sprint では初回申告時のみ。設定画面で年齢層を変更する機能は Sprint 7。
6. **Generator タイムアウトの教訓**：Sprint 4 は 13 新規 + 3 変更 + 9 テストファイル = **計 25 ファイル**で、CLAUDE.md の「>10 ファイルなら 3 PR 分割」基準を超えていた。Sprint 5 以降の規模が同等になる場合は事前にデータ層 → ロジック層 → UI 層に分割するか、オンボーディング 7 画面のような大粒度はサブスプリント化する。

## 動作確認手順（Web）
```bash
npm install
# AsyncStorage を空にしてオンボから始めたい場合
# ブラウザの開発ツール → Application → Local Storage → 全削除
npm run web
# http://localhost:8081 を開く
# 初回：オンボーディング 7 画面が表示される
# 同意 → 年齢層 → 距離設定 → ミニ説明 → 練習試行（20秒）→ 完了 → ホーム
# 2 回目以降：直接ホーム表示
```

## 次工程
Evaluator（mode: impl）で Sprint 4 の評価を依頼してください。
