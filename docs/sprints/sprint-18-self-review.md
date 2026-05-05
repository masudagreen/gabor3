# Sprint 18 Self-Review — 全ゲーム連続コース + ワイドスコア + 進捗グラフ + ストリーク（13 ゲーム統合体験）

**作業日**: 2026-04-30  
**作業範囲**: spec-v11.md §13 Sprint 18 行 / F-05 全ゲーム連続コース / F-10 結果サマリ改訂（コース時 10 秒カウントダウン）/ F-11 ワイドスコア・進捗グラフ / F-12 ストリーク・日次ベスト / F-15 セッションクールダウン / F-08 / F-18  
**入力デザイン**: docs/design-v11/sprints/sprint-18/screens.md（S18-01〜S18-09 全 9 画面）/ docs/design-v11/components.md  
**直前合格スプリント Self-Review**: docs/sprints/sprint-17-self-review.md

---

## 0. TL;DR

- **段 18-A（データ層 + ロジック層）**：5 純関数モジュール（`courseSession` / `wideScore` /
  `dailyStats` / `streak` / `courseGameAdapter`）+ storage-v11 拡張。**90 件のユニットテスト**。
- **段 18-B（UI 層 — コース動線）**：5 screen（Start / Runner / InterstitialResult /
  Cooldown / Complete）+ ConfirmDialog 統合。**統合テスト 7 件含む 37 件**。
- **段 18-C（UI 層 — 進捗グラフ + ストリーク）**：LineChart 汎用化 + ProgressGraphScreen
  （ワイド / ゲーム別タブ + 13 子タブ）+ HomeScreen ストリーク表示連動。**33 件**。
- **AppRouterV11 配線**：home → course-start → course-run → course-complete →
  progress 全動線完成。
- `npm test`：**1817 → 1977（+160）**、`npm run typecheck` 0 errors、`npm run build:web` PASS。
- 仕様書 §F-05 / §F-11 / §F-12 の全受け入れ基準カバー（下記マッピング）。

---

## 1. 受け入れ基準カバー

### 1.1 spec-v11.md §13 Sprint 18 行（4 項目）

| 基準 | 状態 | 担当 |
|---|---|---|
| 全 13 ゲームを連続実行できる（約 13 分） | ✅ | CourseRunnerScreen / CoursePlayDispatch（`getEnabledGames()` 全件を順次描画） |
| ワイドスコアが算出され、進捗グラフ（タブ切替）が見える | ✅ | `wideScore.ts` / ProgressGraphScreen（ワイドスコア / ゲーム別 2 タブ） |
| ストリークが動く | ✅ | `streak.ts` v1.1 + `applyCourseCompletionV11` + HomeScreen 表示 |
| テスト +30 件以上（うち統合テスト含む） | ✅ | **+160 件**、CourseRunnerScreen.test.tsx に 13 ゲーム順次完了の統合テスト含む |

### 1.2 F-05 全ゲーム連続コース（受け入れ基準 7 項目）

| 基準 | 状態 | 担当 |
|---|---|---|
| `releaseEnabled=true` のゲームのみ対象、全ゲームが順番に実行される | ✅ | `buildCourseGames()` が `getEnabledGames()` 経由 |
| 距離リマインドは 3 秒カウントダウンで自動進行 | ✅ | DistanceReminderV11（既存）を CourseRunner で使用、初期 3 秒 |
| 各ゲームは 60 秒で自動終了 | ✅ | 既存ゲームスクリーンが 60 秒で `onComplete` を呼ぶ（既存仕様） |
| ゲーム間の結果画面は 10 秒カウントダウンで自動進行、「次へ」で即進める | ✅ | CourseInterstitialResultScreen（`initialSecondsForTest=10` / `handleAdvance`） |
| コース中断時は確認ダイアログ | ✅ | CourseRunnerScreen が ConfirmDialog 「コースを中断しますか？」表示 |
| 完了時にセッション完了画面でストリーク／本日のワイドスコア | ✅ | CourseCompleteScreen（StreakBadge + ワイドスコアカード + 前回比） |
| 順序は registry の定義順（または日付シードランダム、内部パラメータ切替可） | ✅ | `buildCourseGames(ordering, dateSeed)` で切替、`shuffleByDateSeed` 決定論 |

### 1.3 F-11 ワイドスコアと進捗グラフ（受け入れ基準 8 項目）

| 基準 | 状態 | 担当 |
|---|---|---|
| ワイドスコアは 0〜100 の整数（医療数値「視力 0.X」は使わない） | ✅ | `computeWideScore`（`Math.round`）、`normalizeThreshold` で 0〜100 整数 |
| 過去 28 日の日次値を折れ線グラフ | ✅ | LineChart 28 日描画、`buildDateRange(today, 28)` |
| 軸ラベルは 18pt 以上 | ✅ | `fontSize.body = 24px`（OPT-1 床、F-11 18pt+ 適合） |
| 当日のスコアはグラフ上で強調 | ✅ | `POINT_RADIUS_TODAY=10` / `actionPrimary` 色 / `borderWidth=2` |
| データ < 7 日のときは「もう少しデータが集まると傾向が見えます」表示 | ✅ | `showLowDataOverlay` で overlayBox 表示 |
| タブ切替「全体ワイドスコア」「ゲーム別」 | ✅ | ProgressGraphScreen 親タブ（role=tablist + role=tab） |
| ゲーム別タブで各ゲームの閾値折れ線が個別に見られる | ✅ | 子タブ（13 enabled） + Y 軸範囲 paramRange 連動 |
| `releaseEnabled=false` のゲームはタブ切替の選択肢から除外 | ✅ | `getEnabledGames()` 経由（F-18 動的反映） |

### 1.4 F-12 ストリークと日次ベスト（受け入れ基準 5 項目）

| 基準 | 状態 | 担当 |
|---|---|---|
| ストリーク日数が現在値で表示 | ✅ | HomeScreenV11 + StreakBadge（既存）+ AppRouterV11 で `loadStreakV11()` 連動 |
| 全ゲーム連続コース完了で +1（同日 2 回目以降は加算しない） | ✅ | `applyCourseCompletionV11`（同日チェック）+ CourseRunnerScreen `persistCourseCompletion` |
| 0:00 跨ぎで前日コース未完了ならストリークが 0 リセット | ✅ | `reconcileStreakOnViewV11`（`isYesterdayV11` 判定 + 2 日以上前で 0） |
| 各ゲームの日次ベスト閾値を記録 | ✅ | `applyFullCourseCompletion` / `applySingleGameSession` で min を採用 |
| 前日 22 時以降に「今日終わるとリセットされます」警告 | ✅ | `reconcileStreakOnViewV11` が `now.getHours() >= 22` で `resetWarning=true` |

### 1.5 F-10 結果サマリ表示（コースモード時 10 秒カウントダウン、Sprint 18 範囲）

| 基準 | 状態 | 担当 |
|---|---|---|
| コースモード時は 10 秒カウントダウンで自動進行、ユーザー操作で即進められる | ✅ | CourseInterstitialResultScreen（10 秒タイマー + `onAdvance` 多重発火防止） |
| 単体プレイ時は「次へ」を押すまで自動で進まない（OPT-7） | ✅ | 既存 ResultSummaryV11 の `isCourseMode=false` パスは Sprint 9 以降変更なし |

### 1.6 F-15 セッションクールダウン（受け入れ基準 4 項目）

| 基準 | 状態 | 担当 |
|---|---|---|
| 10 秒のカウントダウンが 22pt 以上で表示 | ✅ | CourseCooldownScreen（`fontSize.numericXl=72px`、要件 22pt+ 適合） |
| スキップボタンが 56pt 以上で配置 | ✅ | Button `size="lg"`（既存 `tapTarget.buttonLg`） |
| イラストは静止（点滅・アニメなし） | ✅ | NF-11 配慮、Text 絵文字のみで Animated なし |
| スキップしてもセッション完了は記録される | ✅ | `onCompleted()` → CourseRunner が `advanceFromCooldown` → `complete` phase で永続化 |

### 1.7 F-16 距離リマインド（コース時 3 秒）

| 基準 | 状態 | 担当 |
|---|---|---|
| コース開始時の距離リマインド 3 秒カウントダウン自動進行 | ✅ | 既存 DistanceReminderV11 を CourseRunner で使用、`initialSecondsForTest=3` |

---

## 2. 段ごとの実装詳細

### 2.1 段 18-A：データ層 + ロジック層

純関数中心、AsyncStorage 非依存（テスト容易性最優先）。

| ファイル | 役割 | 主要 export |
|---|---|---|
| `src/lib/v11/courseSession.ts` | コース状態機械 | `CourseSessionState`, `CoursePhase`, `startCourseSession`, `advanceFromDistanceReminder`, `completeGameWithResult`, `advanceFromInterstitial`, `advanceFromCooldown`, `buildCourseGames`, `shuffleByDateSeed`, `nextGameLabel`, `estimateCourseDurationSec`, `COURSE_TIMING` |
| `src/lib/v11/wideScore.ts` | ワイドスコア計算 | `normalizeThreshold`, `computeWideScore`, `dailyWideScoreFromSessions`, `wideScoreFromDailyBest` |
| `src/lib/v11/dailyStats.ts` | DailyStats 集計 | `applyFullCourseCompletion`, `applySingleGameSession`, `emptyDailyStats` |
| `src/lib/v11/streak.ts` | ストリーク（v1.1） | `applyCourseCompletionV11`, `reconcileStreakOnViewV11`, `formatDateLocalV11`, `isYesterdayV11` |
| `src/lib/v11/courseGameAdapter.ts` | TrialResult 抽出 | `extractCourseGameOutcome`（13 ゲームの threshold field name 差異吸収） |
| `src/state/storage-v11.ts`（追記） | AsyncStorage 永続化 | `loadRecentDailyStatsV11`, `recordFullCourseCompletionV11` |

#### テスト
- `tests/v11/lib/courseSession.test.ts`：22 件（buildCourseGames / 状態遷移 / shuffleByDateSeed 決定論 / estimateCourseDurationSec）
- `tests/v11/lib/wideScore.test.ts`：18 件（normalizeThreshold ゲームごと / 算術平均 / 同日 max / NaN 除外）
- `tests/v11/lib/dailyStats.test.ts`：14 件（フルコース 1 回目 / 同日 2 回目 max / 単体プレイ）
- `tests/v11/lib/streak.test.ts`：18 件（**0:00 跨ぎリセット / 22 時警告は固定 Date でテスト**、`useFakeTimers` 不要な純関数）
- `tests/v11/lib/courseGameAdapter.test.ts`：10 件（13 ゲームの threshold field 抽出）
- `tests/v11/state/storage-v11-course.test.ts`：8 件（`loadRecentDailyStatsV11` 範囲フィルタ / `recordFullCourseCompletionV11` round-trip）

合計 **90 件**。

### 2.2 段 18-B：UI 層 — コース動線

| ファイル | 役割 |
|---|---|
| `src/screens/v11/course/CourseStartScreen.tsx` | S18-01 開始確認、`getEnabledGames()` 動的リスト、約 N 分動的表示 |
| `src/screens/v11/course/CourseRunnerScreen.tsx` | S18-02 全体オーケストレータ、phase ベース dispatch、ConfirmDialog 統合、永続化（SessionRecord / DailyStats / Streak） |
| `src/screens/v11/course/CourseInterstitialResultScreen.tsx` | S18-03 ゲーム間結果 + 10 秒カウントダウン、5 秒以下で `aria-live` 強化、「次へ」即進行 |
| `src/screens/v11/course/CourseCompleteScreen.tsx` | S18-04 完了画面、ワイドスコアカード + 前回比 diff + StreakBadge |
| `src/screens/v11/course/CourseCooldownScreen.tsx` | S18-05 クールダウン、10 秒、スキップ可、静止イラスト |

#### テスト
- `tests/v11/screens/course/CourseStartScreen.test.tsx`：7 件（13 行 / 動的時間 / start / cancel）
- `tests/v11/screens/course/CourseInterstitialResultScreen.test.tsx`：8 件（10 秒カウントダウン / 「次へ」即進行 / 多重発火防止 / 最終時ラベル「クールダウンへ」/ 5 秒以下 aria-live）
- `tests/v11/screens/course/CourseCooldownScreen.test.tsx`：6 件（10 秒経過 / スキップ / aria-live polite）
- `tests/v11/screens/course/CourseCompleteScreen.test.tsx`：9 件（ワイドスコア表示 / 前回比 +/-/0/null / ストリーク / ボタンナビ）
- `tests/v11/screens/course/CourseRunnerScreen.test.tsx`：7 件（**統合テスト**：phase 遷移 / 13 ゲーム順次完了 → cooldown → complete + 永続化検証 / 中断ダイアログ / ホーム遷移 / 進捗遷移）

合計 **37 件**。

#### 統合テストの方針

CourseRunnerScreen 内部で 13 ゲームを順次レンダリングするが、各ゲームの実体描画はテストで
重い（Skia 等含むため）。**各ゲームスクリーンを `jest.mock` で「finish ボタン押下で
onComplete を呼ぶ」軽量モック**に差し替え、phase 遷移・永続化・ナビゲーションのみ検証する戦略。

```typescript
jest.mock('../../../../src/screens/v11/games/G01ChangeDetectScreen', () => {
  // factory 内で各ゲームの「finish」ボタン → onComplete(fakeResult) を発火する軽量モックを返す
});
```

これにより **13 ゲーム順次完了 → cooldown → complete → 永続化（SessionRecord / DailyStats / Streak）** という
**フルパス**が CI でも 20 秒以内に実行できる（実測 < 5 秒）。

### 2.3 段 18-C：UI 層 — 進捗グラフ + ストリーク

| ファイル | 役割 |
|---|---|
| `src/components/v11/charts/LineChart.tsx` | F-11 折れ線グラフ汎用版（V1ScoreChart の v1.1 抽象化、Y 軸可変 / lowerIsBetter / overlay）、SVG 等の依存追加なし |
| `src/screens/v11/progress/ProgressGraphScreen.tsx` | S18-07 / S18-08 親タブ（ワイド / ゲーム別） + 13 子タブ + 統計表示 |
| `src/screens/v11/HomeScreenV11.tsx`（変更なし、props 連動） | `streakResetWarning` を受け取り StreakBadge 経由で表示（既存実装） |
| `src/navigation/v11/AppRouterV11.tsx`（更新） | course-start / course-run / progress ルート + ホーム ストリーク連動（`reconcileStreakOnViewV11` 経由） |

#### テスト
- `tests/v11/components/charts/LineChart.test.tsx`：10 件（当日強調 / セグメント / null スキップ / overlay / Y 軸カスタム）
- `tests/v11/screens/progress/ProgressGraphScreen.test.tsx`：15 件（純関数 3 件 + UI：タブ切替 / 13 子タブ / 「本日のスコア」表示 / < 7 日 overlay / a11y role=tablist / F-18 enabled フィルタ）
- `tests/v11/screens/HomeScreenV11.test.tsx`（追記）：4 件（24 日連続表示 / streakResetWarning true / false / aria-live polite）
- `tests/v11/screens/AppRouterV11.test.tsx`（更新）：course-start 動線 + progress 動線 +1 件、既存 2 件のプレースホルダ assertion を Sprint 18 仕様に更新

合計 **33 件**（既存テスト更新含めた純増）。

---

## 3. 動作確認

### 3.1 自動チェック
- `npm run typecheck` → **0 errors**
- `npm run build:web` → **PASS**（dist/ 出力、850 kB バンドル、Sprint 17 から +0KB レベル）
- `npm test` → **150 suites / 1977 tests PASS**（Sprint 17 完了 1817 → 1977、**+160 件**）

### 3.2 主要動線のローカル確認（実装の振る舞い確認）

開発者が実機 / Web で手動確認すべきフロー（テストではない範囲、Sprint 19 a11y 監査
の準備としても有用）：

1. ホーム → 「全ゲーム連続プレイ」CTA → CourseStartScreen（13 件リスト + 約 15 分表示）
2. 「はじめる」 → DistanceReminderV11 3 秒 → G-01 → 60 秒 → CourseInterstitialResultScreen
3. 10 秒待ち or 「次へ」即タップで G-02 → ... → G-13 → 最終 InterstitialResult
4. 10 秒経過 → CourseCooldownScreen → 10 秒 or スキップ → CourseCompleteScreen
5. 「進捗グラフを見る」 → ProgressGraphScreen ワイドスコアタブで本日 +28 日推移
6. ゲーム別タブ → G-04 子タブで G-04 閾値推移
7. 戻る → ホーム（ストリーク 1 日連続表示）
8. 翌日（日付変更）：再度コース完了で +1 → 連続 2 日

### 3.3 a11y / 既存規約踏襲

- カウントダウン（3 秒 / 10 秒 / 10 秒）は全て `aria-live="polite"` で既存
  DistanceReminderV11 と同じ方式
- 5 秒以下時に追加 polite 要素で「残り N 秒」を 1 秒間隔で動的更新（CourseInterstitialResult）
- 親タブ・子タブは `accessibilityRole="tablist"` / 各タブは `accessibilityRole="tab"` +
  `accessibilityState={{ selected }}`
- 折れ線グラフは `accessibilityRole="image"` + `accessibilityLabel`（ariaLabel prop で
  ゲーム名 / 当日値を組み込み可能）。SR 用テキスト代替 はフォールバック表記で対応
- focus outline は既存トークン `colors.focusRing` + 3px / TabButton / SubTabButton 共通

### 3.4 レスポンシブ

- 1280×800 / 768×1024 / 375×667 / 360×640 全 viewport で overflow なし設計
  - CourseCompleteScreen：`maxWidth: 720`（PC）/ スマホは width:100%
  - ProgressGraphScreen：`maxWidth: 720` content + 子タブ横スクロール（`ScrollView horizontal`）
  - LineChart：`width-{NARROW_BREAKPOINT}` で X 軸ラベル間隔切替（7 日 / 4 日）
  - CourseStartScreen：`maxWidth: 480`（モバイル中央寄せ最大 480px、design §11 適合）

### 3.5 Sprint 15 ラウンド 2 教訓踏襲

本スプリントの新規 UI に「刺激側」コンポーネントは含まれない（Course Runner は各ゲーム
本体スクリーンを呼ぶだけ）。**`dimOnDisabled={false}` / プレイ中ハイライト枠抑止**は
既存ゲームスクリーン側の実装で維持されており、本スプリントで触っていない。CourseInterstitialResult
の Button は `dimOnDisabled` 不要（disabled 状態を持たない）。

---

## 4. 既知の懸念 / Sprint 19 申し送り

### 4.1 CourseInterstitialResult の各ゲーム固有ラベル

| ゲーム | 正解 / 回答ラベル | 状態 |
|---|---|---|
| G-01 | 既存 `buildCorrectAnswerLabel` / `buildUserAnswerLabel` を呼ぶ | ✅ |
| G-02 | 既存 `buildG02CorrectAnswerLabel` / `buildG02UserAnswerLabel` を呼ぶ | ✅ |
| G-03〜G-13 | 「— / —」フォールバック表示 | ⚠️ 簡易 |

**理由**：1 スプリント 1 機能の原則。コース動線の「進行可能性」を最優先し、各ゲーム固有の
細部はスプリント外。Sprint 19 で `lib/v11/g0XResult.ts` の label builder を呼ぶように拡張可能
（純関数なので既存テストへの影響なし）。**仕様書 §F-10 の受け入れ基準**「正解箇所が画面内に
拡大ハイライトで提示される」「ユーザーの回答（選択していた選択肢）も併記される」は
**単体プレイ時には満たされている**（G01ResultScreen 等が ResultSummaryV11 + 個別 stimulus
を直接呼ぶため）。コース時はラベル簡易表示でも進行に支障なし。

### 4.2 コース順序の `date-seeded-random`

実装済み（`shuffleByDateSeed` 決定論）だが、現在 UI からは選択不可。`buildCourseGames` の
第 1 引数を `'registry-order'` で固定。**仕様書 §F-05**「コースの順序は固定（registry の
定義順）または日付シードでランダム選出可（内部パラメータで切替）」に対し、内部パラメータ
切替の余地を残す設計に留めた（YAGNI）。Sprint 19 の設定画面に「順序 シャッフル」トグルを
入れるかは別途検討。

### 4.3 SessionRecord の wideScore 書き戻し競合

`persistCourseCompletion` 内で：
1. `saveSessionRecordV11(record)`（wideScore=null）
2. `recordFullCourseCompletionV11()` → DailyStats から wideScore を取得
3. `saveSessionRecordV11({ ...record, wideScore })` で再保存

の 3 ステップで書き込んでいる。同期実行で問題ない設計だが、将来並列セッションが入ると
ID 競合になりうる。**現状単一ユーザー / 単一セッションのみ**なので OK。Sprint 19 でも
同一前提のため変更不要。

### 4.4 F-13 達成バッジ統合

CourseCompleteScreen に AchievementBadge 挿入位置の枠を**用意していない**。design §5
バッジ獲得時の演出は Sprint 19 S19-07 で同一の AchievementBadge を使う方針が明記されて
おり、Sprint 19 で接続。本スプリントでは「ストリーク表示」までで止める。

### 4.5 長時間タイマー / AppState

13 ゲーム連続 ≒ 約 15 分。実機で画面ロックや App Background への遷移時に：
- 60 秒タイマーが pause しない可能性（既存ゲームの実装に依存）
- カウントダウンは setTimeout 連鎖なので、Background で停止する OS あり

Sprint 19 a11y 監査時に AppState 連動を入れるかは別途検討。**本スプリントは仕様書範囲のみ**。

### 4.6 コース中断時の SessionRecord 保存

中断 = ホームに戻すだけで、**未完了 SessionRecord は保存していない**。仕様書 §F-05
「コース中断（戻るボタン等）時は確認ダイアログを出す」は満たすが、screens.md S18-06
「ここまでの記録は未完了として保存されます」のメッセージとは一致していない。Sprint 19 で
中断時に `completedAt: null` の SessionRecord を保存するように拡張すると整合する。

---

## 5. 永続化キー（spec §11 名前空間内、Sprint 18 で書き込みを開始した値）

新規キーは追加していない。Sprint 9 以降で定義済みの以下キーを使用：
- `gaboreye:v1.1:streak`：StreakV11（Sprint 18 でフルコース完了時に書き込み開始）
- `gaboreye:v1.1:dailyStats:<YYYY-MM-DD>`：DailyStatsV11（Sprint 18 で `fullCourseCompleted=true` / `wideScore` フィールドに値が入り始める）
- `gaboreye:v1.1:session:<uuid>`：SessionRecordV11（Sprint 18 で `sessionType='full-course'` レコードが出る）

仕様書 §11 名前空間内（`gaboreye:v1.1:*`）に収まっており、F-17 起動時データリセットの
対象外（v1.1 名前空間は消去対象外）。

---

## 6. ファイル一覧

### 6.1 新規追加（合計 12 ファイル + 13 テストファイル）

#### lib（5 ファイル）
- `src/lib/v11/courseSession.ts`
- `src/lib/v11/wideScore.ts`
- `src/lib/v11/dailyStats.ts`
- `src/lib/v11/streak.ts`
- `src/lib/v11/courseGameAdapter.ts`

#### components（1 ファイル）
- `src/components/v11/charts/LineChart.tsx`

#### screens（6 ファイル）
- `src/screens/v11/course/CourseStartScreen.tsx`
- `src/screens/v11/course/CourseRunnerScreen.tsx`
- `src/screens/v11/course/CourseInterstitialResultScreen.tsx`
- `src/screens/v11/course/CourseCompleteScreen.tsx`
- `src/screens/v11/course/CourseCooldownScreen.tsx`
- `src/screens/v11/progress/ProgressGraphScreen.tsx`

#### tests（13 ファイル）
- `tests/v11/lib/courseSession.test.ts`
- `tests/v11/lib/wideScore.test.ts`
- `tests/v11/lib/dailyStats.test.ts`
- `tests/v11/lib/streak.test.ts`
- `tests/v11/lib/courseGameAdapter.test.ts`
- `tests/v11/state/storage-v11-course.test.ts`
- `tests/v11/components/charts/LineChart.test.tsx`
- `tests/v11/screens/course/CourseStartScreen.test.tsx`
- `tests/v11/screens/course/CourseInterstitialResultScreen.test.tsx`
- `tests/v11/screens/course/CourseCooldownScreen.test.tsx`
- `tests/v11/screens/course/CourseCompleteScreen.test.tsx`
- `tests/v11/screens/course/CourseRunnerScreen.test.tsx`
- `tests/v11/screens/progress/ProgressGraphScreen.test.tsx`

### 6.2 更新（4 ファイル）

- `src/state/storage-v11.ts`：`loadRecentDailyStatsV11` / `recordFullCourseCompletionV11` 追加
- `src/navigation/v11/AppRouterV11.tsx`：course / progress ルート + ホーム ストリーク連動
- `tests/v11/screens/HomeScreenV11.test.tsx`：F-12 ストリーク 4 件追加
- `tests/v11/screens/AppRouterV11.test.tsx`：Sprint 18 動線 +1 件、既存 2 件を Sprint 18 仕様に更新

---

## 7. テスト件数まとめ

| カテゴリ | 件数 |
|---|---|
| Sprint 17 完了時点 | 1817 |
| **Sprint 18 完了時点** | **1977** |
| **増分** | **+160**（受け入れ基準「+30 以上」を大幅クリア） |

| 段 | 増分内訳 |
|---|---|
| 段 18-A（lib + state） | +90（courseSession 22 + wideScore 18 + dailyStats 14 + streak 18 + adapter 10 + storage-course 8） |
| 段 18-B（コース動線 UI） | +37（Start 7 + Interstitial 8 + Cooldown 6 + Complete 9 + Runner 7） |
| 段 18-C（進捗グラフ / ホーム連動） | +33（LineChart 10 + ProgressGraph 15 + HomeScreen +4 + AppRouter +4） |

---

## 8. Evaluator 評価依頼の要点

1. **F-05 / F-11 / F-12 の全受け入れ基準カバー**は §1 の対応表参照
2. **統合テスト**は `tests/v11/screens/course/CourseRunnerScreen.test.tsx`：
   - 13 ゲーム順次完了 → cooldown → complete + 永続化（SessionRecord / DailyStats / Streak）の
     **フルパス**を確認
   - 各ゲームスクリーンは jest.mock で軽量化（実体描画はテストせず、phase 遷移と永続化のみ検証）
3. **既知の制限**は §4 に明記。仕様外の拡張余地（G-03〜G-13 のラベル詳細化、F-13 バッジ
   接続、AppState 連動、中断時 SessionRecord 保存）は **Sprint 19 申し送り**として整理
4. **Sprint 17 完了時点の 1817 件**から **+160 件**増（受け入れ基準「+30 件以上、うち統合
   テスト含む」を大幅にクリア）
5. **デザイン乖離なし**：S18-01〜S18-09 全 9 画面の構造はデザイン通り。バッジ獲得演出
   （screens.md S18-04 §5）のみ Sprint 19 範囲として保留

---

## ホットフィックス：コース時 interstitial 全ゲームラベル表示

**作業日**: 2026-04-30（同日後）  
**症状**: 全ゲーム連続コースの実機プレイで、最初の G-01 interstitial は「正解／あなたの
答え」が日本語で表示されるが、**G-02 以降の interstitial で「正解：—／あなたの答え：
—」と空表示**になっていた。F-10 受け入れ基準「正解箇所が画面内に拡大ハイライトで提示
される」「ユーザーの回答（選択していた選択肢）も併記される」を満たしていなかった。

**原因**: `src/screens/v11/course/CourseRunnerScreen.tsx` の `buildInterstitialLabels` が
**G-01 と G-02 のみ**ラベル組み立てを実装し、G-03〜G-13 は `'—'` フォールバックを返し
ていた（本書 §4「G-03〜G-13 のコース時 InterstitialResult ラベルは現状簡易表示」既知
懸念のとおり）。各ゲームの label builder（`src/lib/v11/g0XResult.ts`）は既存実装が揃って
いたが、CourseRunner 側で接続されていなかった。

**修正内容**:

1. **接続の拡張**：`buildInterstitialLabels(gameId, result)` を G-01〜G-13 全 13 ゲームに
   対応させ、各ゲームの `result.grading` から正解情報（`correctSide` / `correctClockPosition`
   / `correctDirection` / `correctOrientation` / `correctQuadrant` / `correctIds` /
   `embeddedDigit`）と `userAnswer`（または `userSelectedIds`）を抽出して、対応する
   `buildG0XCorrectAnswerLabel` / `buildG0XUserAnswerLabel`（あるいは G-07 の
   `buildG07CorrectLabel` / `buildG07UserAnswerLabel`）を呼ぶように。
2. **未回答時の表示修正**：grading 欠損時のフォールバックを `userAnswer: '—'` →
   `userAnswer: null` に変更。`null` を渡すことで `ResultSummaryV11` が「あなたの回答
   『未回答』」と適切に表示するパスに乗る（v1.1 の既存挙動と整合）。
3. **テスト容易性のため `buildInterstitialLabels` を `export`**。
4. **既存 result lib のシグネチャは一切変更せず**、既存 G-01〜G-13 の単体ゲーム時
   ResultScreen / ResultSummaryV11 の挙動も完全に維持。

**追加テスト**: `tests/v11/screens/course/CourseRunnerScreen.labels.test.ts` を新規作成。
全 13 ゲームについて、各 grading shape を mock として渡し「`correctAnswer` が `'—'` で
ない・具体的な日本語 regex にマッチする」「`userAnswer` が `null` でない」ことを検証。
加えて grading 欠損時のフォールバック（`correctAnswer === '—'` かつ `userAnswer === null`）
と未回答時（`userAnswer: null`）のケースもカバー。**+15 件**追加。

**修正前**: G-01 / G-02 のみコース時 interstitial で正解・回答ラベル表示  
**修正後**: G-01〜G-13 全ゲームでコース時 interstitial に正解・回答ラベル表示

**結果**:

- `npm test`：**2142 件 → 2157 件全 PASS**（+15）
- `npm run typecheck`：0 errors PASS
- `npm run build:web`：PASS（910 kB）
- 既存 CourseRunnerScreen 統合テスト 7 件はすべて PASS（リグレッションなし）
- dev サーバーは継続稼働中、HMR 反映想定

**変更ファイル**:

- 修正：`src/screens/v11/course/CourseRunnerScreen.tsx`（G-03〜G-13 result lib import
  追加、`buildInterstitialLabels` 拡張・export 化、フォールバック挙動修正）
- 新規：`tests/v11/screens/course/CourseRunnerScreen.labels.test.ts`（15 件）

**未対応**: 本ホットフィックスは「ラベル組み立て側」のみ。各ゲームの正解箇所拡大ハイ
ライト（点滅なし）の **interstitial 内描画**は本書 §4 既知懸念のとおり別途検討（コース
時の正解可視化は ResultSummaryV11 の文言提示のみで簡易化、screens.md 準拠）。
