# Sprint 5 Self-Review — 結果表示・スコア・グラフ・クールダウン

## 実装ファイル一覧

### 新規
- `src/lib/v1score.ts` — V1 スコア算出（spec.md §9.1）+ 前回比 diff（ScoreDiff / ThresholdDiff）
- `src/lib/weeklyStats.ts` — 28 日チャートデータ生成 / ISO 週開始日 / 4 週集計 / summarize
- `src/components/V1ScoreChart.tsx` — 折れ線グラフ（components.md §22）+ V1ScoreTable（SR 代替）
- `src/components/WeeklyGraph.tsx` — タブ切替（components.md §23）
- `src/screens/CooldownScreen.tsx` — 10 秒クールダウン（screens.md S5-02 / spec.md F-16）
- `src/screens/ProgressScreen.tsx` — 進捗グラフ画面（screens.md S5-04 〜 S5-06）
- `tests/lib/v1score.test.ts` — V1 スコア正規化・前回比（17 件）
- `tests/lib/weeklyStats.test.ts` — チャート集計・ISO 週・4 週集計（10 件）
- `tests/components/ResultSummary.test.tsx` — 単体／コース／未挑戦分岐（7 件）
- `tests/components/V1ScoreChart.test.tsx` — empty / 当日強調 / overlay / a11y / table（5 件）
- `tests/screens/CooldownScreen.test.tsx` — 10 秒タイマー / スキップ / カウントダウン更新 / aria-live（4 件）

### 変更
- `src/state/storage.ts` — DailyStats 追加（upsert / loadAll、ベスト閾値は min、V1 スコアは max）+ KEY_DAILY_STATS を clearAllStorage に追加
- `src/components/ResultSummary.tsx` — diff / unattempted / sessionType / カウントダウン自動進行を追加（components.md §21、screens.md §3 / §3.1）
- `src/screens/CourseScreen.tsx` — V1 スコア計算、DailyStats upsert、cooldown フェーズ、ResultSummary に diff/sessionType=course を渡す
- `src/screens/SessionCompleteScreen.tsx` — V1 スコアカード、前回比、進捗グラフ導線
- `src/screens/HomeScreen.tsx` — todayV1Score、進捗グラフボタン enabled
- `src/navigation/AppRouter.tsx` — progress ルート追加、DailyStats を再読み込みしホームに反映、単体プレイで DailyStats upsert + diff 計算
- `tests/storage.test.ts` — DailyStats round-trip（4 件）

## テスト件数
- before: 140
- after: **190**（+50 件）

## コマンド結果
- `npm test`：**190 件 PASS / 29 suites**（失敗 0、所要 約 1.6 秒）
- `npm run typecheck`：エラー 0
- `npm run build:web`：成功（dist/ に 609 kB の AppEntry が出力）

## 受け入れ基準カバレッジ

| 基準 | 状態 | 備考 |
|---|---|---|
| F-11 試行終了時に正解箇所が 1.5 秒拡大ハイライト | OK（既存） | Sprint 1〜3 の Game1/2/3 で実装済み、リグレッションなし |
| F-11 ゲーム終了サマリに「今回の閾値」「前回からの変化」22pt 以上 | OK | ResultSummary diff（fontSize.bodyLg=26px）、primary numericL=48px |
| F-11 サマリは「次へ」を押すまで自動進行しない（OPT-7） | OK | sessionType="single" でカウントダウン非描画、自動進行なし |
| F-11 単体／コースモードでの自動進行差分 | OK | コースのみ 10 秒カウントダウン、screens.md §3.1 準拠 |
| F-11 未挑戦時：閾値・正答率・前回比を非表示、「未挑戦」ラベルで置換 | OK | unattempted 分岐、テスト済み |
| F-12 V1 スコア 0〜100 整数 | OK | computeV1Score は Math.round で整数化 |
| F-12 過去 4 週間（28 日）折れ線 | OK | buildLast28DaysChart + V1ScoreChart |
| F-12 軸ラベル 18pt 以上 | OK | Y/X 軸とも fontSize.body=24px |
| F-12 当日強調 | OK | 半径 10px（他 6px）+ actionPrimary 色、テスト済み |
| F-12 7 日未満時のメッセージ | OK | showLowDataOverlay=true で overlay 描画 |
| F-12 0 日時のメッセージ | OK | empty state + CTA「3 分コースを始める」 |
| F-16 10 秒カウントダウン 22pt 以上 | OK | numericXl=72px |
| F-16 スキップボタン 56pt 以上 | OK | Button size="lg"（minHeight 64px） |
| F-16 イラストは静止 | OK | 静的 emoji、アニメーションなし |
| F-16 スキップしてもセッション完了は記録 | OK | コース完了時に persistSession 済み、cooldown はその後のため影響なし |
| データモデル §12.1 DailyStats / TrialRecord | OK | DailyStats round-trip テスト、TrialRecord は Sprint 1 から |

## 既知の制約 / 申し送り

- **TrialRecord 個別ログの append**：CourseScreen / Game N Screen からの append は Sprint 5 では追加せず、SessionRecord レベルでの集計で V1 スコア計算を完結させた。spec.md §12.1 の TrialRecord は型・round-trip だけ存在（appendTrials 関数）。試行ごとログ取り回しは Sprint 6（バッジ：累計試行数 B-05）で着手予定。
- **ストリーク値**：SessionCompleteScreen の `streakAfter` は依然 1 固定。Sprint 6 で本実装。
- **バッジ獲得演出**：F-14 / B-01〜B-08 は Sprint 6。本スプリントでは未対応（screens.md §3 のバッジ獲得演出は Sprint 6 と整合）。
- **Game 1 単体プレイの未挑戦時**：DailyStats upsert はスキップ（staircase だけ up、ベストは更新しない）。
- **PC 横の summary 配置**：screens.md S5-04 の「PC 横ではグラフ右に統計縦並び」は本スプリントでは実装せず、横スクロール ScrollView に集約。スマホ縦・PC 横の最小レスポンシブは満たすが、PC 専用レイアウトは未対応（受け入れ基準外）。
- **「表で見る」モーダル**：V1ScoreTable コンポーネントは作成したが、進捗画面からの Modal 呼び出しは Sprint 7 a11y 仕上げで対応予定。
- **イラスト素材**：CooldownScreen のイラストは `🌄` emoji を暫定使用。`cooldown-far.svg` などの正式素材は Designer 側未配置のため Sprint 7 で差し替え。
- **同日複数セッションのコース完了判定**：DailyStats.courseCompleted は一度 true になると変わらない（spec.md §13 ストリーク仕様と整合）。

## リグレッション確認

- Sprint 1〜4 の既存テスト（140 件）すべて引き続き PASS
- Game1 / Game2 / Game3 / Onboarding / Calibration / Staircase / 既存 storage テスト 全て PASS
- ホーム → 単体プレイ → 結果サマリ → ホーム動線：未挑戦時の表示が「未挑戦」カードに切り替わる以外、既存動線は変化なし
- ホーム → コース → Game1〜3 → クールダウン → セッション完了 動線：V1 スコアと前回比が画面に表示される（Sprint 4 までは「Sprint 5 で実装」プレースホルダだった）
