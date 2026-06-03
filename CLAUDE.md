# プロジェクト運用ルール — 多段サブエージェント開発ワークフロー v2

このプロジェクトは、4 つのサブエージェント（**planner / designer / generator / evaluator**）を組み合わせた多段ワークフローで開発を進めます。メインの Claude セッションは **オーケストレーター** として振る舞い、ワークフローを駆動してください。

> **本書の位置づけ**：オーケストレーター（=メイン Claude セッション）の運用ルールを定義します。各サブエージェントの個別仕様は `.claude/agents/<name>.md` を参照。

---

## 0. ワークフロー全体像

```
[Phase 0: 仕様策定]
   user idea (length-agnostic)
        │
        ▼
   planner ──▶ docs/questions.md  (質問リスト、初回のみ)
        │
        ▼
   オーケストレーターが代理で人間に質問
        │
        ▼
   人間の回答を planner に伝達
        │
        ▼
   planner ──▶ docs/spec.md
        │
        ▼
   人間レビュー（仕様書の承認、=機能・スプリント計画の凍結）

[Phase 1: バッチ設計 + テスト基盤（並行）]

   ┌──────────────────────────┐    ┌──────────────────────────┐
   │ designer(batch)          │    │ generator(setup)         │
   │ docs/design/* 全機能分    │    │ test runner / build /    │
   │                          │    │ docs/run.md 雛形          │
   └──────────┬───────────────┘    └──────────┬───────────────┘
              ▼                                ▼
   planner(feasibility-review)          (完了して待機)
   仕様の受け入れ基準が全カバー？
              │
              ▼ (NG: designer に修正依頼してループ / OK)
   evaluator(design-qa)
   a11y / レスポンシブ / モックアップ実体
              │
              ▼ (NG: designer に修正依頼してループ / OK)
   人間レビュー（デザイン凍結）

[Phase 2: スプリントループ — Generator のみ]
   for sprint N in spec.sprints:
       generator(N) ──▶ src/...   docs/sprints/sprint-N-self-review.md
            │           （必要に応じデータ/ロジック/UI 3 PR 分割）
            ▼
       evaluator(impl) ──▶ 合格 or 修正指示
            │
            ▼ (合格)
       次スプリントへ

[Phase 3: 完了報告]
```

---

## 1. オーケストレーター（メイン Claude セッション）の役割

ユーザーからの依頼を受け、本ワークフロー全体を駆動する。各サブエージェントは `Agent` ツールで `subagent_type` を指定して呼び出す。

### 1.1 Step 0: 起動判定

- 「新規プロダクトを作って」系（長さ問わず） → 本ワークフロー開始
- 既存プロダクトの追加機能 → `docs/spec.md` を読み、追加スプリントとしてループ末尾に挿入（Planner で仕様書だけ更新→以降は通常ループ）

### 1.2 Step 1: 仕様策定（Phase 0）

#### 1.2.1 Planner 質疑フェーズ
`subagent_type: "planner"` を `mode: "questions"` で呼ぶ。

**Planner への指示**：
- ユーザーの入力（1 行〜長文の仕様書まで）を受け取り、**仕様書を書く前に**不明確な点・暗黙の前提を `docs/questions.md` に箇条書きで列挙する
- 質問は「ユーザーが観察できる挙動」に関するものに限定（技術選定は後続フェーズ）
- 質問数は 5〜15 件目安、優先度（must / nice-to-have）を付記

**オーケストレーターの責務**：
1. Planner が `questions.md` を出したら、それを読んでユーザーに代理質問する
   - 1 件ずつ順に聞いてもよいし、まとめて提示してもよい（質問数とユーザー指向に応じて）
   - ユーザーが「任せる」と答えた質問は Planner が合理的仮定を置く
2. ユーザーの回答を `docs/questions.md` の各質問の下に追記する（または別ファイル `docs/answers.md` に整理）
3. Planner を再度呼ぶ（`mode: "spec"`）。回答を入力に含める

#### 1.2.2 Planner 仕様書作成フェーズ
`subagent_type: "planner"` を `mode: "spec"` で呼ぶ。

**Planner への指示**：
- `docs/questions.md` の Q&A を踏まえて `docs/spec.md` を作成
- 質問しなかった暗黙の前提は冒頭「想定」セクションに明示

#### 1.2.3 人間レビュー（仕様凍結）
オーケストレーターはユーザーに以下を提示し、明示的承認を取る：
- ビジョンと機能一覧
- スプリント計画（順序と依存）
- 非機能要件
- スコープ外

承認 = **仕様凍結**。以降の仕様変更は Planner を再度呼んで spec.md を更新する。

### 1.3 Step 2: バッチ設計 + テスト基盤（Phase 1、並行）

オーケストレーターは Designer と Generator を**同時並行**で起動する（`Agent` ツールの並列呼び出し）。

#### 1.3.1 Designer バッチ設計呼び出し
```
subagent_type: "designer"
mode: "batch"
prompt: "全機能 / 全スプリントのデザインを一括で作れ。
出力: docs/design/system.md, docs/design/components.md,
      docs/design/sprints/sprint-1/screens.md ... sprint-N/screens.md"
```

#### 1.3.2 Generator テスト基盤呼び出し（並行）
```
subagent_type: "generator"
mode: "setup"
prompt: "テスト基盤・ビルド・dev サーバーを立ち上げよ。
出力: package.json, vite.config.ts, vitest.config.ts, src/main.tsx (Hello World), docs/run.md 雛形"
```

両者の完了を待ってから次のフェーズへ。

#### 1.3.3 Planner 実現性レビュー
Designer がバッチ設計を返したら、`subagent_type: "planner"` を `mode: "review-design"` で呼ぶ。

**Planner への指示**：
- 仕様書 `docs/spec.md` の各機能の受け入れ基準が、Designer のデザイン成果物で**全カバー**されているか
- 不足があれば具体的に指摘（「機能 X の受け入れ基準 Y に対応する画面/状態が screens.md に無い」）
- 余分なものは指摘しない（Designer 判断のクリエイティブ余地を残す）

NG → Designer に修正依頼（`mode: "amendment"`、Planner 指摘リストを渡す）→ 再度 Planner レビュー。OK まで反復。

#### 1.3.4 Evaluator デザイン QA レビュー
Planner OK が出たら、`subagent_type: "evaluator"` を `mode: "design-qa"` で呼ぶ。

**Evaluator への指示**：
- 全スプリント分のデザイン成果物（system.md / components.md / 全 screens.md / mockups）を一括レビュー
- 重点：a11y（aria-label、コントラスト、focus、キーボード動線）、レスポンシブ（360 / 375 / 1280）、モックアップ実体（screens.md と一致しているか）、トークン整合性
- 仕様書受け入れ基準は Planner が見ているのでスキップ（重複排除）

NG → Designer に修正依頼（`mode: "amendment"`）→ 再度 Evaluator レビュー。OK まで反復。

> **重要**：このフェーズの Evaluator 呼び出しは **1 回（NG なら 2〜3 回）で完了**。スプリントごとに毎回 Designer↔Evaluator を回さない。

#### 1.3.5 人間レビュー（デザイン凍結）
Planner OK + Evaluator OK の両方を取った成果物をユーザーに提示。承認 = **デザイン凍結**。

### 1.4 Step 3: スプリントループ（Phase 2、Generator のみ）

各スプリント N に対して、オーケストレーター自身が以下を実行：

#### 3-A. Generator 呼び出し
```
subagent_type: "generator"
mode: "sprint"
prompt: "Sprint N: <機能名> を実装せよ。デザインは docs/design/sprints/sprint-N/。
実装規模が大きい場合（>10 ファイル想定）は データ層 → ロジック層 → UI 層 に分割可"
```
Generator は実装 + self-review.md を書いて返す。**Evaluator は呼ばない**。

#### 3-B. Generator 評価（オーケストレーターが実行）
```
subagent_type: "evaluator"
mode: "impl"
prompt: "実装評価モード / Sprint N / 起動: docs/run.md / 自己評価: ..."
```
合格まで `3-A → 3-B` を反復。

#### 3-C. Designer 例外呼び出し（amendment、稀）
スプリント実装中に**設計の本質的不備**が判明したら、オーケストレーターは：
1. ユーザーに状況を共有
2. ユーザー承認を得たうえで `subagent_type: "designer"` を `mode: "amendment"` で呼ぶ
3. 該当スプリントのデザインを更新
4. Generator に再実装依頼

これは**例外フロー**。通常スプリントでは発生しない想定。

### 1.5 エスカレーション基準

オーケストレーターは以下のとき**自動進行を止め、ユーザーに判断を仰ぐ**：

| 状況 | 判断 |
|---|---|
| Planner が `questions.md` で 16 件以上の質問を出す | 仕様の解像度が低すぎる。ユーザーに「もう少し詳細を」と求めるか、Planner に「優先度 must だけに絞れ」と再指示 |
| Planner レビューでデザインが 3 ラウンド連続 NG | 仕様とデザインの相性問題。ユーザーに見せて再考 |
| Evaluator デザイン QA が 3 ラウンド連続 NG | デザイン品質基準が高すぎる、あるいは Designer の力量不足の可能性。ユーザーに状況共有 |
| Generator がストリームタイムアウトを 2 回 | **オーケストレーター自身が実装に降りる**。Generator は再起動しない。残り作業を直接 Edit / Write で完成 |
| Evaluator 実装評価が同一 Critical を 3 回連続検出 | アーキテクチャ問題。設計から見直す（amendment フロー） |
| スキーマ変更が必要と Generator が判断 | 即座にユーザー承認を取る |
| 6 ラウンド超でも合格しない | デフォルトの上限。ユーザーに状況共有 |

### 1.6 Step 4: 完了報告（Phase 3）

全スプリント合格後、ユーザーに：
- 完成スプリント数 / 機能数
- 起動方法（`docs/run.md` 要約）
- 既知の制約 / 申し送り
- テスト合計件数

### 1.7 オーケストレーターの守るべき原則

- **下流の判断を上書きしない**：Evaluator NG なら必ず修正させる。「マイナーだから次に」と先送りしない
- **仕様書がソース・オブ・トゥルース**：仕様変更は Planner を再度呼ぶ。直接 spec.md を編集しない
- **質疑応答の代理は丁寧に**：`questions.md` の質問をユーザーに渡すとき、ユーザーが答えやすい順序・粒度に整える。15 件を一度に列挙せず、優先度高から順に
- **デザイン凍結後の変更は amendment 経由**：スプリントごとに Designer を呼ばない
- **タイムアウトしたらすぐ Generator を再起動しない**：原因（実装規模が大きすぎ等）を見極める。2 回目で自分で書く
- **Evaluator の `Agent` ツール権限がある場合**：Evaluator が独自テストを書いて回せると評価品質が上がる

---

## 2. ファイル / ディレクトリ規約

```
docs/
├─ questions.md                              # Planner 質疑（人間回答も同ファイルに追記）
├─ spec.md                                   # Planner 出力
├─ design/
│  ├─ system.md                              # Designer batch 出力
│  ├─ components.md                          # Designer batch 出力
│  └─ sprints/
│     └─ sprint-N/
│        ├─ screens.md                        # Designer batch 出力
│        └─ mockups/                          # Designer batch 出力（任意）
├─ sprints/
│  └─ sprint-N-self-review.md                # Generator sprint モード出力
├─ evaluations/
│  ├─ design-qa-<timestamp>.md               # Evaluator design-qa 評価
│  └─ sprint-N-impl-<timestamp>.md           # Evaluator impl 評価
├─ design-review-<N>.md                       # Planner 実現性レビュー（任意、必要に応じ）
└─ run.md                                    # Generator 起動方法（毎スプリント追記）

src/, app/, ...                              # Generator が選んだスタックに従う
tests/                                       # Vitest 等のテスト
```

---

## 3. 守るべき原則（プロジェクト全体）

- **責任分離を崩さない**：
  - Planner は技術詳細・ビジュアルに踏み込まない
  - Designer は実装に踏み込まない
  - Generator は仕様外を増やさない、デザインを勝手に変えない
  - Evaluator は閾値で判断する
  - オーケストレーターは下流の判断を上書きしない
- **仕様書がソース・オブ・トゥルース**：仕様変更は Planner を再度呼ぶ
- **デザインはバッチ凍結**：Phase 1 後の変更は amendment フロー経由で、ユーザー承認を取る
- **データモデル凍結**：仕様書承認時にスキーマも凍結。後の変更はユーザー再承認必須
- **1 スプリント 1 機能**
- **テストは増やすもの**：各スプリントで `npm test` の件数が増える設計に
- **タイムアウト = 設計が大きすぎるサイン**：Generator がタイムアウトしたら、エージェント再起動より「実装単位を割る」または「オーケストレーターが直接書く」を選ぶ

---

## 4. 環境（プロジェクトに合わせて変更）

- Node.js: `.tool-versions` でバージョン固定（asdf 推奨）
- MCP: `playwright` を `.mcp.json` で project スコープ登録（Evaluator が利用）
- 初回: `npx playwright install chromium`
- 推奨スタック（無指定時のデフォルト）: Vite + React + TypeScript + Vitest + Playwright

---

## 5. Testing & Verification

- マルチファイル変更後は **フルテストを必ず走らせてからタスク完了を宣言する**
- UI / ビジュアル変更は可能な限り Playwright（または Puppeteer）でスクリーンショットを取って検証する
- クロスプラットフォーム変更は **Web と Android（Expo Go）の両方** で動作確認する
- UI タスクを完了とマークする前に、変更ファイルを以下の観点で監査する：
  - Web 専用 API（`document` / `window` / DOM 操作）が native ビルドに混入していないか
  - `Image` の `transform` プロパティ等、native でメモ化が効かないパターンがないか
  - 検出した懸念点はユーザーが Android で実機確認する**前に**列挙する

---

## 6. Expo / React Native 制約

- このプロジェクトは **Expo SDK 54 をターゲット**とする（**SDK 55 以降にアップグレードしない**：Android Expo Go との互換性が壊れる）
- **EAS Build より Expo Go ワークフローを優先**する（EAS のログインは bash ツールの stdin 経由では失敗する。サービスアカウントトークンが必要なケース以外は Expo Go で進める）
- macOS で dev サーバーが `EMFILE` エラーを出したら、dev サーバー再起動ではなく **静的本番ビルドを serve する** フォールバックに切り替える

---

## 7. Git & GitHub

- 個人リポジトリは **SSH エイリアス `github-green` を使用**する（`masudagreen-radiko` ではない。誤って後者を使うと push が失敗する）
- 既定ブランチは **`main`**

---

## 8. Skill & Config 配置

- カスタム Skill は **`.claude-personal/skills/` に配置**する（`.claude/skills/` ではない）
- プロジェクト固有設定で迷ったら、配置先を確認してからファイル作成すること
