# Sprint 6 Self-Review — ストリーク・バッジ・継続要素

## 実装ファイル一覧

### 新規（データ層）
- `src/state/storage.ts` — `Streak`（load/save/createDefault）/ `BadgeStatus`（loadBadgeStatuses/saveBadgeStatuses/createDefaultBadgeStatuses）/ `BadgeId` 型 / `ALL_BADGE_IDS` / `getTotalTrialCount`（B-05 用、TrialRecord と SessionRecord.trialCount 両方を集計）/ `KEY_STREAK` / `KEY_BADGES` を `clearAllStorage` に追加

### 新規（ロジック層）
- `src/lib/streak.ts` — `applyCourseCompletion`（コース完了時の +1 / 同日 2 回目スキップ / 連続途切れ後の再開）/ `reconcileStreakOnView`（0:00 跨ぎ判定 / 22 時以降警告）/ `isYesterday`（純関数、月跨ぎ・年跨ぎ対応）
- `src/lib/badges.ts` — 8 バッジ定義 `BADGE_META` / `checkBadgeCondition` / `evaluateBadges`（既獲得は再発火しない）/ `checkAllImprovingStatus`（B-08 の過去 7 日 vs 前 7 日比較）/ `buildBadgeHint`（screens.md S6-03 §4 表に従う）
- `src/lib/dailyBest.ts` — `getTodayBest` / `getRecent7DaysBest`（DailyStats からの読み出し薄ラッパ）

### 新規（UI 層）
- `src/components/StreakBadge.tsx` — components.md §24、炎色 light=#7A3C00（8.49:1）/ dark=#FFB266（10.09:1）、resetWarning 時は警告色背景 + role="status" + aria-live="polite"
- `src/components/AchievementBadge.tsx` — components.md §25、80px アイコン、未獲得は opacity 0.5、a11y ラベル「バッジ：N。獲得済」/「未獲得。獲得条件は ...」
- `src/components/BadgeDetailModal.tsx` — screens.md S6-02 / S6-03、Modal API、120px 大アイコン、獲得済み：説明 + 獲得日付、未獲得：獲得条件 + ヒント、B-08：3 ゲーム別状態（↓改善中 / → 横ばい／悪化 / ─ データ不足）+ 「3 ゲーム中 N ゲームが先週比で改善中」
- `src/screens/BadgeListScreen.tsx` — screens.md S6-01、2 列（< 600px）/ 4 列（≥ 600px）グリッド、「獲得 N / 8」、タップで詳細モーダル
- `src/screens/DailyBestScreen.tsx` — screens.md S6-05 / S6-06、今日のベスト 3 カード + 過去 7 日テーブル

### 変更
- `src/screens/HomeScreen.tsx` — `StreakBadge` を本実装で配置、`onOpenBadges` / `onOpenDailyBest` を追加、tertiary 行を 3 ボタンに（進捗 / バッジ / 日次ベスト）。プレースホルダ `StreakBadgePlaceholder` を撤去
- `src/screens/SessionCompleteScreen.tsx` — `streakAfter` を実値受け取り、`newlyEarnedBadges` 配列を受け取り **1.5 秒の獲得演出**（scale 0.6 → 1.05 → 1.0、点滅なし、aria-live="assertive"）。複数バッジは 1.5 秒ずつ順次表示
- `src/screens/CourseScreen.tsx` — コース完了時に `applyCourseCompletion` で Streak を更新、`evaluateBadges` で全 8 バッジを判定、`appendTrials` で TrialRecord スタブを記録（B-05 用）
- `src/navigation/AppRouter.tsx` — `badges` / `dailyBest` ルート追加、ホーム表示時に `reconcileStreakOnView` を実行（0:00 跨ぎ判定）、Streak と resetWarning を HomeScreen に渡す、単体プレイ完了でも TrialRecord append + バッジ判定（B-05 / B-06 / B-07 が単体経由で発火しうる）
- `src/components/V1ScoreChart.tsx` — **Sprint 5 Major-1**：Y 軸ラベル幅を 48px に拡張、numberOfLines=1 強制で「100」折り返し回避。**Major-2**：スマホ幅（< 480px）で X 軸ラベルを 7 日刻みに、PC 横は 4 日刻みに自動切替
- `src/components/WeeklyGraph.tsx` — **Sprint 5 minor**：タブ Pressable に `aria-selected={active}` を直接付与（Web SR 互換）

### テスト（新規 + 拡張）
- `tests/lib/streak.test.ts`（新規 11 件）：isYesterday 月跨ぎ・年跨ぎ / applyCourseCompletion 4 ケース（初回・連続・同日 2 回目・途切れ後）/ reconcileStreakOnView 5 ケース（未記録・今日完了・昨日完了 21 時 / 22 時・2 日以上前）
- `tests/lib/badges.test.ts`（新規 14 件）：B-01〜B-08 各バッジの獲得・未獲得 / B-08 improvingCount 3 種類 / 既獲得は再発火しない / 複数同時獲得 / buildBadgeHint 4 種 / BADGE_META 整合性
- `tests/components/StreakBadge.test.tsx`（新規 4 件）：0 日 / N 日 / resetWarning=true / resetWarning=false
- `tests/components/AchievementBadge.test.tsx`（新規 3 件）：earned 状態 / 未獲得 + ヒント / タップ
- `tests/components/BadgeDetailModal.test.tsx`（新規 4 件）：獲得済み描画 / B-03 ヒント / B-08 3 ゲーム状態と「3 ゲーム中 2 ゲーム改善中」/ B-08 データ不足
- `tests/screens/BadgeListScreen.test.tsx`（新規 2 件）：0/8 描画 / 1/8 + 獲得済アクセシブルラベル
- `tests/storage.test.ts` 拡張（+8 件）：Streak round-trip / clearAllStorage / BadgeStatus デフォルト 8 種類 / round-trip / TrialRecord append + getTotalTrialCount / 後方互換（SessionRecord.trialCount 集計）
- `tests/screens/HomeScreen.test.tsx` 拡張（+2 件）：onOpenBadges / onOpenDailyBest / streak props
- `tests/components/V1ScoreChart.test.tsx` 拡張（+2 件）：Y ラベル width=48 / numberOfLines=1 / X ラベル numberOfLines=1

## テスト件数

- before: 190（Sprint 5 完了時点）
- after: **242**（+52 件）
- Test Suites: 35 passed
- 失敗: 0

## コマンド結果

- `npm test`：**242 件 PASS / 35 suites**（所要 約 1.7 秒）
- `npm run typecheck`：エラー 0
- `npm run build:web`：成功（dist/ に 642 kB の AppEntry が出力）

## 受け入れ基準カバレッジ（screens.md S6-01〜S6-06 + spec.md §9.3）

| 基準 | 状態 | 備考 |
|---|---|---|
| F-13 ストリーク現在値表示 | OK | StreakBadge（48px 数値 + 24px ラベル）、ホーム配置 |
| F-13 コース完了で +1（同日 2 回目以降は加算しない） | OK | `applyCourseCompletion` テスト 4 件、`lastCompletedDate === today` で incremented=false |
| F-13 0:00 跨ぎで前日コース未完了ならリセット | OK | `reconcileStreakOnView`、2 日以上前で currentStreak=0、longestStreak は保持 |
| F-13 各ゲームの日次ベスト閾値を記録 | OK | DailyStats（Sprint 5 で実装）+ DailyBestScreen で表示 |
| F-13 22 時以降未完了警告 | OK | `streakResetWarning` を AppRouter から HomeScreen に伝達、role="status" + aria-live="polite" |
| F-14 8 種類のバッジが定義通り獲得 | OK | B-01〜B-08 すべて `checkBadgeCondition` テスト網羅 |
| F-14 獲得時 1.5 秒演出（点滅なし） | OK | SessionCompleteScreen の `BadgeCelebrationCard`、Animated.sequence で scale 0.6 → 1.05 → 1.0、合計 800ms + 静止 700ms = 1.5 秒、点滅なし（OPT-9） |
| F-14 バッジ一覧（獲得 / 未獲得） | OK | BadgeListScreen、2 列（スマホ）/ 4 列（PC） |
| F-14 未獲得バッジの獲得条件ヒント | OK | `buildBadgeHint` で B-02〜B-08 の進捗可視化、screens.md S6-03 §4 表に準拠 |
| 24px 以上のフォント | OK | 数値 48px / 本文 24px / 見出し 26px〜30px、caption（補助情報）は 20px で components.md §25 許容 |
| 48〜64px 以上のタップ領域 | OK | バッジカードは minHeight 180px、Button.lg は 64px |
| ライト/ダーク両対応 | OK | StreakBadge 炎色は `palette.light.streakFlameFg` / `palette.dark.streakFlameFg` で切替、すべて useColorScheme 経由 |
| Sprint 1〜5 リグレッションなし | OK | 既存 190 テストすべて引き続き PASS、追加 52 件 |

## Sprint 5 申し送り Major 修正状況

| 項目 | 状態 |
|---|---|
| Major-1 V1ScoreChart Y 軸ラベル幅 | **修正完了**：`Y_LABEL_WIDTH = 48` 定数化、`numberOfLines={1}` 強制、テスト追加 |
| Major-2 V1ScoreChart X 軸日付密度 | **修正完了**：`NARROW_BREAKPOINT = 480` 未満で 7 日刻み、以上で 4 日刻みに自動切替 |
| Sprint 5 Minor WeeklyGraph aria-selected | **修正完了**：Pressable に `aria-selected={active}` を直接付与 |

## リグレッション確認

- Sprint 1〜5 の既存テスト（190 件）すべて引き続き PASS
- `tests/screens/HomeScreen.test.tsx`：既存 5 件 + 新規 2 件、全 7 件 PASS
- `tests/components/V1ScoreChart.test.tsx`：既存 5 件 + 新規 2 件、全 7 件 PASS
- `tests/storage.test.ts`：既存 14 件 + 新規 8 件、全 22 件 PASS
- ホーム → コース → セッション完了 動線：StreakBadge は実値で +1、バッジ獲得時のみ演出表示
- ホーム → 単体プレイ → 結果サマリ：B-05 / B-06 / B-07 が単体プレイ経由でも発火（テスト容易性のため evaluator は呼ばずバッジは保存のみ、次回ホーム遷移で表示）

## 既知の制約 / 申し送り

- **TrialRecord は試行ごと詳細ではなくサマリ件数スタブ**：1 試行ごとの `responseTimeMs` / `isCorrect` 詳細は記録していない（B-05 累計試行数の判定には影響しないため許容、将来拡張）
- **バッジアイコンは絵文字暫定**：components.md §25 の「badges/b-XX-*.svg」は Sprint 7 以降で SVG イラストに差し替え予定。a11y ラベルは正しく機能する
- **バッジ獲得演出の効果音／ハプティクス**：設定 ON 時のチャイム（OPT-9 / NF-11 配慮、点滅なしは満たす）は Sprint 7 設定画面と合わせて実装
- **B-01「はじめの一歩」の発火タイミング**：仕様上「初回コース完了」なので、コース完了時の `evaluateBadges` で同時に発火する（オンボーディング完了時には発火しない）。screens.md §9 と整合
- **同日 2 回目のコース完了**：ストリークは加算しないが、DailyStats.sessionCount や TrialRecord は更新する（B-05 などには寄与）
- **B-06 / B-07 詳細モーダルからのゲーム遷移**：`onPlayGame` 経由で `reminder` 画面に遷移、距離リマインドを必ず通る動線
- **設定画面の本実装は Sprint 7**：本スプリントでは設定アイコンは Stub のまま
- **PC 横レイアウトの 4 列グリッド**：BadgeListScreen は ≥ 600px で 4 列。1280px までスクロール不要に収まる
- **「ストリーク警告」の更新タイミング**：22 時を跨いだ瞬間の通知は出さず、ホーム画面遷移時にのみ `reconcileStreakOnView` を実行（screens.md S6-04 「画面遷移時のみ」と整合）
