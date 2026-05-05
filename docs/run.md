# GaborEye 起動・開発手順

このドキュメントは Generator が各スプリント完了時に追記する、**動かすための単一情報源** です。

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
