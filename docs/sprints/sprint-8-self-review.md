# Sprint 8 — バッジ 自己評価

> 対象：spec §7 S8 / F-09 バッジ部・§5（3 軸 11 バッジ）・§6.8 BadgeStatus。
> デザイン：`docs/design/sprints/sprint-8/screens.md`、`docs/design/components.md`（BG-1/BG-2）。

## 1. やったこと

定義 → 判定ロジック+テスト → 永続化 → 完了時配線 → 一覧 UI → 獲得演出の順で実装。

- **定義**（`src/lib/v2/badgeDefinitions.ts`）：B-01〜B-11 の id / 名称 / 軸 / 条件 / 未獲得ヒント。
  高難度閾値 a ≤ 3 / b ≤ 0.10（system §9.2）、高スコア 80 / 100、B-11 累計 5 を定数化。
- **判定ロジック**（`src/lib/v2/badges.ts`、純関数）：`evaluateBadges(ctx, current) → { next, newlyEarned }`。
  継続日数は `currentStreak` 注入、高難度は `paramsSnapshot` × 全問正答（`isSessionPerfectClear`）、
  高スコアは `sessionScore` と高スコア累計（B-11）。既獲得は `earnedAt` 保持・二重獲得しない。
- **永続化**（`src/state/badgeRecorder.ts`）：`recordBadgesForSession` が `loadAllBadgeStatuses` /
  `loadAllSessions`（B-11 累計）→ `evaluateBadges` → 新規分のみ `saveBadgeStatus`。
  `gaboreye:v2:badge:*` は既存 repository を使用（**スキーマ変更なし**）。
- **完了時配線**：`recordCompletedSession`（statsRecorder）が SessionRecord 永続化 + Streak 更新の後に
  `recordBadgesForSession` を呼び、戻り値に `badges` / `newlyEarnedBadges` を追加。
  `AppRoot.handleSessionComplete` が `newlyEarnedBadges` を `SessionResultCard` へ伝播。
- **一覧 UI**（F-09）：`BadgeGrid` + `BadgeCell` を `HistoryScreen` のプレースホルダに置換。
  獲得＝🏅 + 名称 + 獲得日、未獲得＝🔒 + ヒント、タップで条件全文展開。レスポンシブ 2/3 列。
- **獲得演出**（§5.4）：`BadgeAwardToast`（BG-2）を `SessionResultCard` 上層に重畳。
  拡大+フェードのみ・点滅なし・reduced-motion 静的・`aria-live` 読み上げ・`pointerEvents:none`。
- **S9 接続点**：`onShown` / `onBadgeShown` で音/ハプティクス発火点を用意（本スプリントは発火しない）。

## 2. 確認したこと（自己評価チェックリスト）

- [x] 受け入れ基準（§5.4 / F-09 バッジ部）を判定ロジック・UI で充足（§3 マッピング参照）
- [x] `npx tsc --noEmit` エラー 0
- [x] `npm run build:web` PASS（web bundle ≈ 614 kB）
- [x] `npm test`（Jest）全 PASS：**43 スイート / 402 件**（S7=341 → +61）
- [x] 主要動線：完了 → バッジ付与・保存・結果カード演出・履歴一覧表示を RNTL で検証
- [x] 空状態（全未獲得＝🔒+ヒント 11 セル）/ 獲得状態（フルカラー+獲得日）の振る舞い
- [x] デザイン乖離なし（BG-1/BG-2 の構造・トークンに準拠）
- [x] 既存スプリント回帰なし（全 402 件 PASS、S7 履歴・S6 結果カードの既存テスト緑）

## 3. 受け入れ基準マッピング

| 基準（§5.4 / F-09） | 実装 / テスト |
|---|---|
| 各バッジ獲得条件を満たすと付与 | `evaluateBadges` / `badges.test.ts`（B-01〜11 の獲得・非獲得境界） |
| 獲得時に短時間・点滅なしの演出を結果で 1 度 | `BadgeAwardToast`（拡大+フェード・reduced-motion 静的）/ AppRoot が新セッションでリセット |
| 履歴一覧で獲得/未獲得・未獲得にヒント | `BadgeGrid`/`BadgeCell` / `HistoryScreen.test.tsx`（全 11 セル・初期全未獲得） |
| 獲得時に音+ハプティクス（個別 OFF 可・S9） | `onShown`/`onBadgeShown` 発火点（実発火は S9） |
| 旧バッジ（ゲーム依存）は存在しない | 定義は §5 の 11 種のみ |

### バッジ別の境界テスト網羅（spec §5 / screens.md S8）

- 継続：B-01 連続 1 / B-02 3 / B-03 7 / B-04 14 / B-05 30（各 pass/fail 境界）
- 高難度：B-06 a≤3 & 全問正答 / B-07 b≤0.10 & 全問正答 / B-08 a≤3 & b≤0.10 & score≥80
- 高スコア：B-09 score≥80（79 不可）/ B-10 score=100（99 不可）/ B-11 累計 5 回目（4 回不可）+ 残り回数
- 二重獲得しない（earnedAt 保持）/ 複数同時獲得 / 低スコアで高スコアバッジ非付与

## 4. 既知の懸念・申し送り

- **音/ハプティクス未発火**：S9 で `onBadgeShown` に badge.mp3 + heavy/medium を配線する。
- Playwright スクリーンショットは本スプリントでは未取得（RNTL + build:web で代替検証）。
  見た目の最終確認は S10 仕上げで実機/各幅（360/375/1280）推奨。
- 未獲得セルのグレースケール表現は `opacity:0.85` + 🔒 + ヒント。色のみ非依存（NF-12）は充足だが、
  視覚的コントラストをさらに強めたい場合は S10 で彩度低減の余地あり（判定・a11y には影響しない）。

## 5. 成果物パス

- `src/lib/v2/badgeDefinitions.ts` / `src/lib/v2/badges.ts` / `src/lib/v2/badgeView.ts`
- `src/state/badgeRecorder.ts` / `src/state/statsRecorder.ts`（更新）
- `src/components/v2/BadgeCell.tsx` / `BadgeGrid.tsx` / `BadgeAwardToast.tsx` / `SessionResultCard.tsx`（更新）
- `src/screens/v2/HistoryScreen.tsx`（更新） / `src/screens/v2/AppRoot.tsx`（更新） / `src/i18n/ja.ts`（更新）
- テスト：`tests/lib/v2/badges.test.ts` / `badgeView.test.ts` / `tests/state/badgeRecorder.test.ts` /
  `tests/components/v2/BadgeCell.test.tsx` / `BadgeAwardToast.test.tsx` / `SessionResultCard.test.tsx`（拡張） /
  `tests/screens/v2/HistoryScreen.test.tsx`（拡張）
