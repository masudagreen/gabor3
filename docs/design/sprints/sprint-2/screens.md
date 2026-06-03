# Sprint 2 — データ層・設定タブ・データリセット（画面設計）

> 対象：spec §7 S2 / F-13（設定タブ）・F-11（起動時データリセット）・データモデル §6。
> 関連コンポーネント：`SR-1 SettingRow` `FT-1 Toggle` `FT-2 Slider` `FT-3 SegmentedControl` `DG-1 ConfirmDialog` `RZ-1 DataResetNotice` `SA-1 SafeAreaWrapper` `NV-1 BottomTabBar`。

---

## 画面 S2-1：設定タブ（F-13）

セーフエリア準拠（`SafeAreaWrapper mode="default"`、NF-30）。下部に `BottomTabBar`（設定タブがアクティブ）。コンテンツは縦スクロール、PC は最大幅 720px 中央寄せ。

### レイアウト（スマホ縦 375）
```
┌─────────────────────────────────┐ ← セーフエリア
│  設定                            │ ← 画面タイトル font.h1 36px
│                                  │
│  ── ゲーム設定 ──                │ ← グループ見出し font.h3 26px
│  格子サイズ（n×n）   [3][4][5]   │ ← SegmentedControl（既定 4）
│  1 ラウンドの秒数   ───●─── 20秒 │ ← Slider 10–60 step5（既定 20）
│  ラウンド数         ──●──── 5    │ ← Slider 3–10 step1（既定 5）
│  回転速度           ──●──── 6°/秒│ ← Slider 2–12 step1（既定 6）
│   難しい(小)        易しい(大)   │   端ラベル 18pt
│  周波数変化速度     ─●───0.15hz/秒│ ← Slider 0.05–0.40 step0.05（既定0.15）
│   難しい(小)        易しい(大)   │
│                                  │
│  ── 採点方式 ──                  │
│  ○ 自動採点（確定なし）          │ ← 縦リスト 3 ラジオ（各 56pt）
│  ● 自動採点（確定ボタンあり）    │   各行に短い説明 caption
│  ○ 全問正解で次へ                │
│                                  │
│  ── 表示・視聴 ──                │
│  視聴距離         [30][40][50]cm │ ← SegmentedControl（既定 40）
│  ダークモード   [OS連動][明][暗] │ ← SegmentedControl（既定 OS連動）
│                                  │
│  ── フィードバック ──            │
│  効果音               [ ON  ◯]  │ ← Toggle（ON/OFF テキスト併記）
│  振動                 [ OFF ◯]  │ ← Toggle
│  片眼ガイダンス [なし][左][右][交互]│ ← SegmentedControl（既定 なし）
│                                  │
│  ── その他 ──                    │
│  免責事項を読む               ›  │ ← SettingRow（ナビ）→ DisclaimerPanel
│  全データ削除                 ›  │ ← SettingRow（danger 文字色）2 段階
│                                  │
│  バージョン  v2.0.0              │ ← caption 20px
│  免責同意 2026-05-30 12:00       │ ← caption（disclaimerAgreedAt）
├─────────────────────────────────┤
│  [ホーム]  [履歴]  [● 設定]      │ ← BottomTabBar
└─────────────────────────────────┘
```

### パラメータ可動範囲・初期値（system §9.1 を採用）
| 項目 | UI | 範囲 | 既定 | step | 永続化（§6.2 Settings） |
|---|---|---|---|---|---|
| n 格子サイズ | SegmentedControl | 3/4/5 | 4 | — | gridSize |
| m 秒数 | Slider | 10–60 | 20 | 5 | roundSeconds |
| r ラウンド数 | Slider | 3–10 | 5 | 1 | roundCount |
| a 回転速度 | Slider | 2–12 °/sec | 6 | 1 | rotationSpeed |
| b 周波数変化 | Slider | 0.05–0.40 hz/sec | 0.15 | 0.05 | sfChangeSpeed |
| 採点方式 | 縦ラジオ | ①②③ | ②（確定あり）※ | — | scoringMode |
| 視聴距離 | SegmentedControl | 30/40/50 | 40 | — | viewingDistanceCm（UserProfile） |
| ダークモード | SegmentedControl | OS連動/明/暗 | OS連動 | — | darkMode |
| 効果音 | Toggle | ON/OFF | ON | — | soundEnabled |
| 振動 | Toggle | ON/OFF | ON | — | hapticsEnabled |
| 片眼 | SegmentedControl | なし/左/右/交互 | なし | — | oneEyeGuidance |

> ※ 採点方式の既定は Designer 提案 ②（自動採点・確定ボタンあり）。理由：①は「確定なしで時間切れ採点」で初心者が締切感をつかみにくく、③は全問正解強制で難しい設定だと進まない。②が最も中庸で「待ってもよし／早く締めてもよし」。spec は既定を断定していないため Generator 調整可。

### 状態遷移
- 各コントロール変更 → 即座に `Settings`/`UserProfile` に保存（spec F-13「即座に保存」）。トースト不要。
- スライダー変更はドラッグ中はプレビュー、離した時に確定保存（または逐次保存、Generator 判断）。
- 「免責事項を読む」→ `DisclaimerPanel`（閲覧のみ、同意ボタンなし）をモーダル/別画面で表示 → 閉じる。
- 「全データ削除」→ タップ（1 段階目）→ `DG-1 ConfirmDialog`（削除確認、2 段階目）→「削除する」で全 `gaboreye:v2:*` を空に → 設定はデフォルトへ → 完了後ホームへ。「キャンセル」で何もしない。

### 状態：エンプティ/ロード/エラー
- 初回（設定未保存）：全項目が上表の既定値。
- ロード：永続化読込中は短時間スケルトン or 既定値で即表示（NF-3 起動 3 秒以内）。
- 範囲外入力不可（クランプ）。エラー状態は実質発生しない。

### a11y
- タイトル `h1` を Skip link の着地点。
- 各 SettingRow は `aria-labelledby`、Toggle=`role="switch"`、Slider=`role="slider"`（←/→ で step）、SegmentedControl=`role="radiogroup"`。
- 採点方式ラジオは `role="radiogroup"`、各 56pt。
- 全データ削除ダイアログはフォーカストラップ、初期フォーカス「キャンセル」。

### レスポンシブ
- 360/375：1 カラム。スライダーは行内フル幅、ラベルは上。
- 1280：最大 720px 中央寄せ、2 カラムにせず 1 カラム維持（可読性優先）。

---

## 画面 S2-2：起動時データリセット通知（F-11）

`RZ-1 DataResetNotice`。起動時に旧名前空間（`gaboreye:v1:*` / `v1.1:*` / `v1.2:*`）を検出・消去し `gaboreye:v2:*` 初期化した**初回のみ 1 度**表示。

```
┌──────────────────────────┐ ← scrim
│  ┌────────────────────┐  │
│  │ 最新版へのアップデート│  │ ← font.h2 30px
│  │                      │  │
│  │ 最新版への           │  │ ← font.body 24px
│  │ アップデートのため、  │  │
│  │ 過去データを          │  │
│  │ リセットしました      │  │
│  │  ┌────────────────┐  │  │
│  │  │      OK         │  │  │ ← Button primary lg 64px
│  │  └────────────────┘  │  │
│  └────────────────────┘  │
└──────────────────────────┘
```
- 表示は旧データ検出時のみ。2 回目以降の起動では出さない（spec F-11）。
- OK で閉じ、起動フロー（S6：オンボ or 距離リマインド）へ。
- a11y：`role="dialog"`、OK に初期フォーカス、OK は 56pt 以上。

> 表示タイミングはオンボーディング（S6）より前。S2 ではデータ層・消去ロジックと通知コンポーネントを用意し、S6 で起動フローに組み込む。

---

## 受け入れ基準カバレッジ（F-13/F-11）
- [x] n/m/r/a/b を設定でき範囲外不可（範囲・初期値 system §9.1）
- [x] 採点方式①②③選択
- [x] 視聴距離 30/40/50（既定 40）即保存
- [x] ダークモード OS連動/明/暗
- [x] 音/振動 個別トグル・ON/OFF 一目判別（テキスト併記）
- [x] 片眼ガイダンス off/左/右/交互
- [x] 免責再閲覧
- [x] 全データ削除 2 段階確認
- [x] 各行 56pt 以上
- [x] バージョン v2.0.x + 免責同意日時
- [x] 旧名前空間消去 → v2 初期化 → 1 度だけ通知（OK 56pt+）
