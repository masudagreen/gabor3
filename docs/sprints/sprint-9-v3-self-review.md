# Sprint S9（v3.0）セルフレビュー — バッジ（レベル化、3 軸 11 種）

> v3.0 リブートの S9。旧 v2.0 S9（音・ハプティクス）の自己評価は
> `sprint-9-self-review.md` に残置（上書きしない）。本ファイルが v3 S9 の記録。

対象：spec §6（B-01〜B-11）・F-09 バッジ部・§7.8 BadgeStatus・§4（レベル/難度）。
凍結データモデル §7.8 を厳守。仕様外バッジ追加なし（11 種限定）。

---

## 1. やったこと（成果物）

### データ/ロジック層（純関数 + 配線）
- **`src/lib/v3/badgeDefinitions.ts`（新規）**：3 軸 11 種の宣言メタ（id/軸/名称/条件/ヒント）+ 閾値定数。
- **`src/lib/v3/badges.ts`（新規）**：付与判定の純ロジック（`evaluateBadges` / `meetsBadgeCondition` / `isMasterLevel` / 割合しきい値関数）。
- **`src/lib/v3/badgeView.ts`（新規）**：一覧表示モデル（`buildBadgeRows` / `groupBadgeRowsByAxis` / `resolveBadgeNames`）。
- **`src/state/v3/gameRecorder.ts`（更新）**：`recordCompletedGame` の stats 更新後にバッジ判定を配線。`CompletedGameInput` に `highestLevel`/`ranges`/`order` 追加、戻り値に `badges`/`newlyEarnedBadges` 追加。新規獲得分のみ永続化。
- **`src/state/v3/homeFlow.ts`（更新）**：`resolveCompletedGame` から gameRecorder へ `highestLevel`（applyResult 後）・`ranges`・`order` を伝搬。

### UI 層
- **`src/components/v3/BadgeCell.tsx`（新規・BG-1）**：獲得＝🏅フルカラー+獲得日、未獲得＝🔒グレースケール+ヒント。タップで条件全文展開。role=button/aria-expanded、aria-label「{名称}、{獲得済み/未獲得：ヒント}」。
- **`src/components/v3/BadgeGrid.tsx`（新規・BG-2）**：3 軸見出し（継続日数/高難度到達/高レベル到達）付きグリッド。スマホ 2 列 / 広幅(≥600) 3 列。各軸 role=list。
- **`src/components/v3/BadgeAwardToast.tsx`（新規）**：新規獲得時 1 度の演出（拡大+フェード、点滅なし、reduced-motion 静的）。`onShown` フック（S10 音/ハプティクス発火点）。aria-live polite 読み上げ。
- **`src/screens/v3/HistoryScreen.tsx`（更新）**：testID `history-badges` のプレースホルダ EmptyState を BadgeGrid に差し替え。`loadAllBadgeStatuses` を追加読込み。
- **`src/components/v3/HomeResultCard.tsx`（更新）**：`newlyEarnedBadges`/`onBadgeShown` props を追加し BadgeAwardToast を結果カード上層に配置。
- **`src/screens/v3/AppRoot.tsx`・`App.tsx`（更新）**：`ResolveGame`/`LastResult` に `newlyEarnedBadges` を通し、結果カードへ渡す。
- **`src/i18n/ja.ts`（更新）**：`badge.axis_streak/difficulty/level` の 3 軸見出しキー追加（既存 `badge.*` 表示キーは再利用）。

---

## 2. §6 各バッジの条件と閾値仮置き根拠（AS-21）

| ID | 軸 | 判定入力 | 条件 | 閾値根拠 |
|---|---|---|---|---|
| B-01 | 継続 | Streak.currentStreak | ≥1（初回完了） | 完了＝クリア/失敗いずれか。streak は完了で 1 になる |
| B-02〜05 | 継続 | currentStreak | ≥3 / ≥7 / ≥14 / ≥30 | spec §6.1 の日数そのまま（絶対値） |
| B-06 | 高難度 | levelParams.direction + result=clear | 振動レベルをクリア | spec §6.2。振動＝難の質的条件、割合化不要 |
| B-07 | 高難度 | levelParams.rotationSpeed + clear | rotationSpeed ≤ 3 をクリア | system §9.3：値集合 9 段の下位 1/3（3,2.5,2）。回転速度は絶対値で難度が一定（AS-12）なので割合化せず固定 |
| B-08 | 高難度 | levelParams 全体 + clear | 個数4 ∧ 4x4 ∧ 振動 ∧ rotationSpeed ≤ 2.5 をクリア | system §9.3 の「最難寄りが揃う」。各変数の最難寄り絶対値の AND |
| B-09 | 高レベル | LevelState.highestLevel | ≥ 10 | spec §6.3「二桁」＝観察可能な絶対指標 |
| B-10 | 高レベル | highestLevel / totalLevels | ≥ ⌈総レベル数 × 50%⌉ | system §9.3。**割合ベース**（デフォルト 720 → 360）。範囲設定で総数が変わっても「中盤」を保つ |
| B-11 | 高レベル | highestLevel / totalLevels | ≥ ⌈総レベル数 × 85%⌉ | system §9.3。**割合ベース**（デフォルト 720 → 612） |

**絶対値 vs 割合の判断**：
- 回転速度（B-07/B-08）は deg/sec の絶対値で難度の意味が一定（速度 6=最易・2=最難、AS-12）。範囲を絞っても「遅い域＝物理的にゆっくり」は不変なので絶対値で固定。
- レベル番号（B-10/B-11）は変化順・範囲設定で同じ番号でも中身が変わる。「中盤/終盤」という観察可能性を保つため割合ベース（system §9.3 の指示通り）。`Math.ceil` で総数が小さくても 1 段は確保。
- B-09 の「二桁」だけは番号でも絶対値（「10 に達する」は観察可能で直感的）。

---

## 3. 付与判定の正しさ

- **高難度はクリアのみ対象**（spec §6.2）：`meetsBadgeCondition` で `result === 'clear'` を AND。失敗で振動レベルを引いても B-06 は付かない（テストで確認）。
- **高レベルは highestLevel で判定**：applyResult 後の `LevelState.highestLevel`（クリアした最高レベル）を gameRecorder→evaluateBadges に渡す。今回 fail でも過去の highestLevel が条件を満たせば獲得し得る（高レベルは「到達済み」の状態判定）。
- **継続は更新後 streak**：`recordCompletedGame` は updateStreak の**後**にバッジ判定するため、当日完了で currentStreak=1 → B-01 が即付与される。
- **二重獲得しない**：既 earned は earnedAt 保持・newlyEarned に出ない・再保存しない（v2 と同じ規律）。
- **境界テスト**（tests/lib/v3/badges.test.ts）：3 日ちょうど/2 日、速度 3/3.5、最高 10/9、中盤 360/359、終盤 612/611、総 100 での割合追従、最難域の各変数欠落、clear/fail 切替などを網羅。

---

## 4. 撤去した v2 と申し送り

### 撤去（v3 が代替）
- 削除：`src/lib/v2/badges.ts` / `badgeView.ts` / `badgeDefinitions.ts`（スコア・周波数 b 依存の旧 11 種）。
- 削除：`src/state/badgeRecorder.ts`（v2 セッションスコア基準の付与配線）。
- 削除：`src/components/v2/BadgeCell.tsx` / `BadgeGrid.tsx` / `BadgeAwardToast.tsx`（v2 badgeView 依存）。
- 削除テスト：`tests/lib/v2/badges.test.ts` / `badgeView.test.ts` / `tests/state/badgeRecorder.test.ts` / `tests/components/v2/BadgeCell.test.tsx` / `BadgeAwardToast.test.tsx`。
- 置換テスト：`tests/a11y/webAriaComponents.test.tsx` の BadgeCell を v3 版へ（同一の role=button/aria-expanded カバレッジを維持）。
- `src/state/statsRecorder.ts`：バッジ付与ステップを除去（`recordBadgesForSession` 呼び出し・`badges`/`newlyEarnedBadges` 戻り値を削除）。

### 申し送り（残置・要注意）
- **v2 SettingsScreen 系は残置**：`src/screens/v2/SettingsScreen.tsx` が依存する `state/repository`（v2）・`state/settings`・`state/migration`・`state/schema`（v2 の `BadgeId`/`BadgeStatus` も含む）は撤去していない。v3 アプリは設定タブに TabPlaceholderScreen を出しており v2 SettingsScreen をレンダリングしないが、後続スプリントで v3 設定タブ（F-13）を本実装する際にまとめて整理する想定。
- **v2 statsRecorder/sessionRecorder は孤立 dead コード**：v3 アプリからは未参照（homeFlow/gameRecorder が v3 経路）。バッジ撤去で v2 採点系から badge 依存が切れたため、後続で v2 採点系一括撤去が可能。今 S9 では「バッジに限定」して撤去スコープを絞った。
- **v3 schema の `BadgeId`/`BadgeStatus`** は §7.8 凍結データモデルに一致（変更なし）。`state/v3/repository.ts` の `loadAllBadgeStatuses`/`saveBadgeStatus` は S3 既存をそのまま利用。

---

## 5. 音/ハプティクスの S10 フック

- `BadgeAwardToast` は音/振動を**直接鳴らさない**（責務分離）。表示開始時に `onShown(badgeIds)` を 1 度だけ呼ぶ。
- `HomeResultCard` は `onBadgeShown` prop で上流へ中継。S10 で `onBadgeShown` に `playEvent('badge')` + ハプティクス（heavy+medium、system §10.1）を結線するだけでよい。
- F-14 受け入れ基準「バッジ獲得時に音とハプティクス」は S10 で完成。S9 はトースト表示 + フック用意まで。

---

## 6. native 懸念監査

- 新規 badge 系ファイルに Web 専用 API（`document`/`window`/`localStorage`/`navigator`）の混入なし（grep 確認済み）。
- `BadgeAwardToast` の `transform: [{ scale }]` は **Animated.View**（Image ではない）上の `Animated.Value`。`useNativeDriver: Platform.OS !== 'web'`。v2 BadgeAwardToast と同一パターンで native 実績あり。
- `AccessibilityInfo.announceForAccessibility` / `isReduceMotionEnabled` はクロスプラットフォーム API。
- 絵文字アイコン（🏅/🔒/🔥）はフォント依存だが既存画面で使用済み。

---

## 7. Playwright 視覚検証（localStorage seed）

`temp-images/` に保存（dist を `serve` + playwright-core 1.59.1 / chromium）：
- `s9-history-badges-mobile375.png`：履歴タブ全体（グラフ + StatTile + バッジ「継続日数」軸の獲得セル）。
- `s9-history-badges-grid-1280.png`：PC 3 列グリッド。獲得（🏅+獲得日）/未獲得（🔒+ヒント）混在、軸見出し「継続日数」「高難度到達」を確認。
- `s9-history-level-axis-375.png`：スマホ 2 列、「高レベル到達」軸見出し、B-09 獲得 / 熟達者・頂を目指して 未獲得（中盤/終盤ヒント）を確認。

seed：levelState(L12/highest12)・streak(4)・playStats(18)・dailyStats 5 日・badge B-01/B-02/B-06/B-09 earned。NF-12（色＋鍵アイコン形＋ヒントテキスト）・3 軸グルーピング・レスポンシブ（2 列/3 列）を実機相当で確認。
獲得トーストの視覚はゲーム完走を要するため e2e ではなくコンポーネントテスト（名称表示・aria-live・onShown 発火）で担保。

---

## 8. 受け入れ基準マッピング（§6.4 / F-09 バッジ部）

| 受け入れ基準 | 対応 |
|---|---|
| 各バッジ獲得条件で付与（高難度=levelParams / 高レベル=highestLevel / 継続=streak） | `evaluateBadges` + gameRecorder 配線。tests/lib/v3/badges.test.ts / gameRecorder.test.ts |
| 獲得時に短時間・点滅なし演出をホーム結果で 1 度 | BadgeAwardToast（拡大+フェード、点滅なし、結果カード 1 回表示につき 1 度）。homeComponents.test.tsx |
| 履歴のバッジ一覧で獲得/未獲得確認・未獲得にヒント | HistoryScreen → BadgeGrid。HistoryScreen.test.tsx / badgeComponents.test.tsx |
| 獲得時に音+ハプティクス（個別 OFF 可） | S10 へフック（onBadgeShown）。S9 はフック用意まで |
| 旧バッジ（スコア依存・b 依存）は存在しない | v2 badge 全削除。badgeView.test.ts で旧名称非存在を検証 |
| 3 軸（継続/高難度到達/高レベル到達）11 種で再定義 | badgeDefinitions.ts。groupBadgeRowsByAxis で 5/3/3 |
| F-09：色のみ非依存（NF-12） | 🏅/🔒（形）+ 名称/ヒント（テキスト）+ 色。Playwright 視覚確認 |
| a11y：role=list / role=button / aria-label | BadgeGrid(list) / BadgeCell(button+expanded) / aria-live(toast) |

---

## 9. テスト件数・検証結果

- **追加テスト**：
  - `tests/lib/v3/badges.test.ts`（+16）
  - `tests/lib/v3/badgeView.test.ts`（+8）
  - `tests/components/v3/badgeComponents.test.tsx`（+9）
  - gameRecorder.test.ts バッジ節（+4）
  - homeComponents.test.tsx トースト節（+2）
  - HistoryScreen.test.tsx バッジ節 差し替え（+2 純増）
- **削除テスト**：v2 badge 系 5 ファイル（badges/badgeView/badgeRecorder/v2 BadgeCell/v2 BadgeAwardToast）。
- 最終：**56 suites / 585 tests PASS**（赤 0）。S8 後より純増。
- `npm run typecheck` PASS。`npm run build:web` PASS（dist 出力、bundle 1.13 MB）。
