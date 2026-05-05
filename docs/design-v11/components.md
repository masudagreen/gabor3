# GaborEye v1.1 — コンポーネントカタログ

このドキュメントは v1.1（Sprint 8〜19）+ v1.1.1（Sprint 20）+ v1.1.2（Sprint 21）で追加・改訂される再利用可能コンポーネント群を定義します。
v1 の `docs/design/components.md` の §1〜§34 をベースに継承し、本書ではそこに**追加・置換・削除**するものだけを記述します。

> **v1.1.1 改訂サマリ（Sprint 20）**：
> - §3 `AnswerChoiceGroup`：選択中の枠を「黄色 4px」→「`color.selection.subtle` 2px」に。詳細は §3 参照
> - §4 `ImageChoiceCell`：選択中の枠を「黄色 4px」→「`color.selection.subtle` 2px、不透明度 55%」に。詳細は §4 参照
> - §5 `ClockChoiceLayout` / §6 `NumericKeypadChoice`：同様に控えめ枠に統一
> - §8 `ResultSummaryV11`：独立画面用途は撤去。新規 §23 `ResultOverlay`（GE-RESULT）に役割を移譲
> - §23 新規 `ResultOverlay`（GE-RESULT、最重要）：刺激画面に重畳する結果オーバーレイ（◯/✕ + 「次へ」ボタンのみ。**メトリクスバーは含めない**）
> - §24 新規 `MarkBadge`：◯ / ✕ アイコン単体コンポーネント（パッチ／領域中央に重畳）

> **v1.1.2 改訂サマリ（Sprint 21）**：全ゲームのボタン撤去とガボール直接選択統一。ImageChoiceCell の活用範囲を G-02 / G-08 から G-03 / G-04 / G-05 / G-06 / G-10 / G-11 へ拡張。Designer 判断で G-09 / G-12 / G-13 はボタン UI 維持（空間対応配置）。
> - §3 `AnswerChoiceGroup`：horizontal-2 / clock-8 / grid-4 / keypad-10 layout の利用先が縮小（Sprint 21 後の唯一利用は G-09 horizontal-2 / G-12 horizontal-4 / G-13 keypad-10）。clock-8 / grid-4 layout は実質未使用（API は将来用途のため残す）
> - §4 `ImageChoiceCell`：適用範囲を G-01 / G-02 / G-07 / G-08 / G-10 から **G-01 / G-02 / G-03 / G-04 / G-05 / G-06 / G-07 / G-08 / G-10 / G-11** に拡大。a11y で「ガボール領域 aria-hidden=true」規約を撤回
> - §15 各ゲーム固有刺激描画（GE-03 / GE-04 / GE-05 / GE-06 / GE-10 / GE-11）：ImageChoiceCell ラップ付きの構造に改訂
> - §25 ResultOverlay marks 生成ロジック：G-03 / G-04 / G-05 / G-06 / G-10 / G-11 を「ボタン上配置」から「パッチ／象限上配置」に改訂

> **継承するコンポーネント**：Button / IconButton / Card / ListItem / Modal / Sheet / Toggle / Slider / Checkbox / TextField / Tag / DistanceCalibrator / DisclaimerSheet / GaborPatch / FixationCross / V1ScoreChart / StreakBadge / AchievementBadge / DailyBest / EmptyState / LoadingState / ConfirmDialog / AbortConfirmDialog / AccessibilityHelpers
>
> **削除されるコンポーネント**：`GaborWithMask`（マスク提示廃止のため）
>
> **改訂されるコンポーネント**：`GaborGrid`（モーフィング 60 秒型）、`PeripheralLayout`（マスクなし化）、`ResultSummary`（13 ゲーム共通化）、`GameStatusBar`（試行数廃止）、`DistanceReminder`（3 秒自動進行）、`WeeklyGraph`（タブ構造変更）、`ClockAnswerButtons`（共通 AnswerChoiceGroup の特化型に統合）

---

## 0. v1.1 新規コンポーネント一覧

| ID | 名称 | カテゴリ |
|---|---|---|
| GS-1 | `GamePlaySurface` | 13 ゲーム共通レイアウトコンテナ |
| GD-1 | `GameStatusBarV11` | 上部バー（試行数廃止版） |
| AC-1 | `AnswerChoiceGroup` | 選択肢ボタン群（汎用） |
| AC-2 | `ImageChoiceCell` | 画像選択肢セル（グリッド型） |
| AC-3 | `ClockChoiceLayout` | 時計型 8 択（旧 ClockAnswerButtons の v1.1 版） |
| AC-4 | `NumericKeypadChoice` | 0〜9 数字選択肢（G-13 用） |
| MC-1 | `MetricCard` | 結果サマリの数値カード |
| RS-1 | `ResultSummaryV11` | 13 ゲーム共通結果サマリ |
| HM-1 | `HomeHeroCTA` | ホームのプライマリ CTA カード |
| HM-2 | `HomeNavGrid` | ホーム下部 2 列ナビ（進捗・バッジ） |
| TB-1 | `ProgressGraphTabs` | 進捗グラフ親タブ |
| TB-2 | `GameSubTabsScroll` | ゲーム別子タブ |
| DR-2 | `DistanceReminderV11` | 3 秒自動進行版 |
| RZ-1 | `DataResetNotice` | 起動時データリセット通知 |
| GE-01〜GE-13 | 各ゲーム固有刺激描画（注視領域コンポーネント） | ゲーム個別 |
| FT-1 | `SinglePlayPostFooter` | 単体プレイ後 3 択フッター（ResultOverlay 内蔵） |
| **GE-RESULT** | **`ResultOverlay`** | **刺激画面に重畳する結果オーバーレイ（◯/✕ + 「次へ」ボタンのみ。メトリクスバーは持たない）。v1.1.1 新規** |
| **MK-1** | **`MarkBadge`** | **◯ / ✕ / 薄 ◯ アイコン単体（ResultOverlay の子要素）。v1.1.1 新規** |

---

## 1. `GamePlaySurface`（GS-1、最重要）

13 ゲーム共通の OPT-12 骨格を強制するレイアウトコンテナ。

### API
```ts
type GamePlaySurfaceProps = {
  gameId: GameId;                       // "G-01" .. "G-13"
  gameNameJa: string;                   // 表示名（ステータスバー右に出ないが SR で読まれる）
  remainingSeconds: number;             // 60 → 0
  onAbort: () => void;                  // ✕ ボタン
  ariaInstruction: string;              // ゲーム説明（SR 用、aria-describedby）
  stimulusArea: ReactNode;              // 注視領域（GE-01〜GE-13 のいずれか）
  answerChoices: ReactNode;             // AnswerChoiceGroup or ImageChoiceCell集合 etc.
  guidanceText?: string;                // オプションのガイド文「左右で濃い方は？」
};
```

### 構造
```
<section aria-label={`${gameNameJa} プレイ画面`}>
  <GameStatusBarV11 remaining={remainingSeconds} onAbort={onAbort} />
  <div className="stimulus-frame" aria-hidden="true">
    {stimulusArea}
  </div>
  {guidanceText && <p className="guidance">{guidanceText}</p>}
  <div className="answer-area" role="radiogroup" aria-label="回答を選んでください">
    {answerChoices}
  </div>
  <p className="sr-only" id="game-instruction">{ariaInstruction}</p>
</section>
```

### a11y
- `radiogroup` + 子要素 `aria-checked` で選択状態を明示
- 60 秒経過で自動採点 → `RoleSummaryV11` に遷移、SR には `assertive` で「採点しました」を読み上げ

### 寸法（v1.1 system.md §1.1 参照）
- 上部バー 64px
- 中央 stimulus-frame：パディング 16px、内コンテンツ 280〜320px 角
- ガイド文（オプション）：`font.body` 24px、center align、margin-top 16px、margin-bottom 8px
- 下部 answer-area：パディング 16px 左右、24px 上、32px 下

---

## 2. `GameStatusBarV11`（GD-1、改訂）

v1 `GameStatusBar` から「試行数」を削除した版。

### API
```ts
type GameStatusBarV11Props = {
  remainingSeconds: number;
  onAbort: () => void;
};
```

### 仕様
- 高 64px、`color.bg.surface`
- 左：✕ IconButton lg（48pt タップ領域、`aria-label="ゲームを中断"`）
- 中央：「残り N 秒」`font.h2` 30px Bold tabular-nums、`aria-live="polite"`
- 右：何も置かない（v1 の試行数表記は廃止）
- 5 秒以下になったら数値の左に `clock` アイコン 24px を装飾追加（カラーは `palette.semantic.warning` 7A4300、ただしテキスト本体は `color.fg.primary` のまま、NF-12 遵守）

---

## 3. `AnswerChoiceGroup`（AC-1、最重要）

13 ゲーム共通の選択肢ボタン群。タップで選択／再タップで解除／別を押すと切替。確定ボタンなし。

### API
```ts
type ChoiceVariant = "text" | "image" | "icon" | "numeric";
type AnswerChoiceGroupProps = {
  choices: Array<{
    id: string;
    label: string;        // 表示テキスト or aria-label
    iconName?: IconName;
    imageNode?: ReactNode;  // 画像系（ガボールパッチ等）
  }>;
  variant: ChoiceVariant;
  selectedId: string | null;
  onSelect: (id: string | null) => void;  // null = 解除
  layout: "horizontal-2" | "horizontal-4" | "vertical-list" | "grid-2" | "grid-3" | "grid-4" | "clock-8" | "keypad-10";
  ariaLabelGroup: string;
};
```

### 仕様（v1.1.2 改訂：直接選択統一に伴う利用先縮小）

| layout | v1.1 用途ゲーム | v1.1.2（Sprint 21）後の用途 | 配置 |
|---|---|---|---|
| horizontal-2 | G-02, G-04, G-05, G-06, G-08, G-09, G-11 | **G-09 のみ**（Designer 判断、案 B：直接選択困難） | 横 2 列、各 flex-1 minWidth 96px |
| horizontal-4 | G-12 | **G-12 のみ**（Designer 判断、案 B：4 向き択は刺激上で直接化困難。target 直下に空間対応配置） | 横 4 列、スマホでは 2×2 グリッドに折り返し |
| grid-4 | G-10（4 象限） | **未使用**（G-10 は Sprint 21 で 8×8 grid を 4 象限クリッカブル化、案 A 採用。API は将来用途のため残す） | 2×2 グリッド |
| clock-8 | G-03 | **未使用**（G-03 は Sprint 21 で円周 8 ガボールを ImageChoiceCell ラップした直接選択化。API は将来用途のため残す） | 時計文字盤型（ClockChoiceLayout 経由） |
| keypad-10 | G-13 | **G-13 のみ**（Designer 判断、案 B：数字 0〜9 を刺激上で直接化困難。刺激画像直下に空間対応配置） | 数字キーパッド（5×2 = NumericKeypadChoice 経由） |
| vertical-list | （オンボーディング年齢層など補助） | 同左（変更なし） | 縦 1 列 |

> **v1.1.2 規範**：Sprint 21 以降、AnswerChoiceGroup を「補助テキスト選択肢」として呼び出すのは G-09 / G-12 / G-13 の 3 ゲームのみ。残り 10 ゲーム（G-01 / G-02 / G-03 / G-04 / G-05 / G-06 / G-07 / G-08 / G-10 / G-11）では `stimulusArea` 内のパッチ／象限を `ImageChoiceCell`（§4）でラップして直接選択させる。clock-8 / grid-4 layout は Sprint 21 時点で実質未使用となるが、API シグネチャと描画ロジックは削除せず将来用途のために残す（Designer 判断の変更余地、または別ゲーム追加時の再利用を考慮）。

### ボタン仕様（v1.1.1 改訂）
- 高さ：`tappable.recommended` 64px（lg）
- 文字：`font.body.lg` 26px Medium（OPT-1 床 +2px で強調）
- 角丸：`radius.lg` 16px
- デフォルト：背景 `color.action.secondary`、文字 `color.fg.primary`、枠 **1px** `color.selection.subtle.idle`
- **選択中（v1.1.1 改訂）**：背景同左、**枠 2px `color.selection.subtle`（中性グレー、不透明度 55%）**。文字を Bold に切替（追加識別軸）
- focus-visible：3px outline `color.focus.ring`、2px offset（選択枠とは別レイヤー、両立可能）
- pressed：`scale(0.98)` + 背景 -10%
- disabled：opacity 0.5

> **v1.1.1 改訂理由**：v1.1 では選択枠を「黄色 4px」としていたが、ガボール直接選択ゲーム（G-02 / G-08、Sprint 20 改訂）でパッチ自体に重ねられた場合、黄色 4px が縞模様の輝度コントラストに干渉してガボールが見えづらくなる。`color.selection.subtle`（中性グレー 55%）を使うことで、ガボール本体の縞輝度を阻害せず、かつ 3:1 以上のコントラストで「選択中」を視覚的に判別できる。

### 撤去された horizontal-2 用途（v1.1.2 Sprint 21 で更新）
- v1.1.1（Sprint 20）で G-02 / G-08 の horizontal-2「左／右」「時計回り／反時計回り」**テキスト 2 択ボタンは撤去**された
- **v1.1.2（Sprint 21）で追加撤去**：G-04 / G-05 / G-06 / G-11 の horizontal-2 もすべて撤去（ガボール直接選択へ）。これにより horizontal-2 layout の唯一の利用先は **G-09**（Designer 判断、案 B：Polat パラダイムの target 1 個構造を維持しつつボタンを target 直下に空間配置）のみとなる
- G-02 / G-04 / G-05 / G-06 / G-08 / G-11 では horizontal-2 を使わず、`stimulusArea` 内のパッチ自体を `ImageChoiceCell` で囲って直接選択させる（後述 §4）
- G-03 の clock-8 layout は v1.1.2 で撤去（円周 8 ガボールを ImageChoiceCell でラップした直接選択化）。clock-8 layout 自体は API 未使用となるが将来用途のため残す
- G-10 の grid-4 layout は v1.1.2 で撤去（8×8 grid 上を 4 象限クリッカブル化、案 A）。grid-4 layout 自体は API 未使用となるが将来用途のため残す

### a11y
- `role="radiogroup"`、`aria-label={ariaLabelGroup}`
- 子要素：`role="radio"`、`aria-checked={isSelected}`
- 矢印キーで隣接選択肢へ移動、Space / Enter でトグル

### 「現在の回答：◯◯」テキストは置かない
- v1.1 仕様 Q5 確定。選択中はボタン枠の控えめ装飾 + Bold 切替のみで判別。テキスト表示は不要

---

## 4. `ImageChoiceCell`（AC-2、v1.1.1 改訂、v1.1.2 で適用範囲拡大）

グリッド型ゲーム（G-01、G-07）+ v1.1.1 で追加されたガボール直接選択ゲーム（G-02、G-08）+ **v1.1.2（Sprint 21）で追加された全直接選択ゲーム（G-03、G-04、G-05、G-06、G-10、G-11）** でパッチ／象限自体を選択肢にするセル。

### v1.1.2 で追加された適用ゲーム
- **G-03**：円周上の 8 個のガボールパッチをそれぞれ `ImageChoiceCell` でラップ（radio）
- **G-04 / G-05 / G-06**：左右 2 ガボールを `ImageChoiceCell` でラップ（radio、G-02 と同パターン）
- **G-10**：8×8 grid 全体を 4 象限（4×4 セル単位）に分割、各象限を `ImageChoiceCell` でラップ（radio、内部にガボールセル群を含む）
- **G-11**：上 1 個（基準位置 reference、disabled）+ 下 2 個（テストパッチ、左右、ImageChoiceCell radio）の構造に変更（spec §7.11 案 A 採用、G-08 と同じパターン）

### API
```ts
type ImageChoiceCellProps = {
  id: string;
  isSelected: boolean;
  onToggle: () => void;
  ariaLabel: string;          // "縞模様 3 番目（左から 3 列目、上から 1 行目）"
  children: ReactNode;        // GaborPatch 等の描画ノード
  cellSizePx: number;         // 計算済みセルサイズ
  disabled?: boolean;         // v1.1.1 新規：G-08 の adapter のような選択不能パッチ用（タップ反応なし、枠も出ない）
};
```

### 仕様（v1.1.1 改訂）

| 状態 | 枠線幅 | 枠色 | 角丸 | 不透明度 |
|---|---|---|---|---|
| 未選択（idle） | **1px** | `color.selection.subtle.idle`（30% 不透明） | `radius.md` 12px | 100%（パッチは通常表示） |
| 選択中（selected） | **2px** | `color.selection.subtle`（55% 不透明） | `radius.md` 12px | 100%（パッチは通常表示） |
| pressed | 2px | `color.selection.subtle`（70% 不透明、押下時のみ濃く） | `radius.md` 12px | scale(0.98) |
| disabled（adapter 等） | 0px（枠なし） | — | — | パッチは通常表示、`pointer-events: none` |
| focus-visible | 3px outline `color.focus.ring`（青）、2px offset | — | — | 選択枠とは別レイヤー、両立可能 |

**規範**：
- セルサイズ：**最小 56px**（OPT-2、5×5 グリッドでも維持）。ただし選択不能（adapter）パッチは OPT-2 例外として 140×140px のような表示専用サイズで構わない（タップ対象ではないため）
- セル内側の余白：選択枠とパッチ本体の間に **2px 以上のクリアランス**を必ず確保。これは選択枠 2px の輪郭とパッチの縞模様が密着して干渉しないようにするため。`box-sizing: content-box` 相当で `padding: 4px` をセル内に入れる
- ガボール本体（縞模様）の最外周 1λ 分の輝度コントラストは枠で覆わない
- 枠は `outline` ではなく `box-shadow: inset 0 0 0 2px <color>` で実装（外形寸法を変えずに視覚的な枠を表現する）
- 選択中であってもパッチ本体の輝度・コントラストには一切手を加えない（ガボール視認性最優先）

> **v1.1.1 改訂理由**：v1.1 で「黄色 4px 枠」を採用したところ、グリッド系ゲーム（G-01、G-07）では問題なかったが、ガボール本体に近接する形でユーザーが選択するゲーム（特に Sprint 20 で新たに直接選択型に変わった G-02 / G-08）で「黄色枠の輝度がガボール縞の輝度差を奪ってしまう」フィードバックが発生した。中性グレー 55% 不透明度・線幅 2px に絞り込み、`box-shadow` の inset 形式で外形寸法を変えずに枠を描画することで、視認性を阻害しない。

### a11y（v1.1.2 で「ガボール aria-hidden=true」規約を撤回）
- `role="checkbox"` + `aria-checked`（複数選択可、**G-01 と G-07 のみ**）
- **radio（単数選択）の適用**：
  - G-02 / G-08（v1.1.1 新規）：左右 2 個のうち 1 個
  - G-03（v1.1.2 新規）：円周 8 個のうち 1 個
  - G-04 / G-05 / G-06（v1.1.2 新規）：左右 2 個のうち 1 個
  - G-10（v1.1.2 改訂）：4 象限のうち 1 つ（v1.1 では grid-4 ボタン経由だったが、v1.1.2 で grid 上の象限直接選択に）
  - G-11（v1.1.2 新規）：下に並ぶ 2 個のうち 1 個（spec §7.11 案 A、G-08 と同パターン）
- `disabled=true` の場合：`aria-disabled="true"` + tabindex から外す
- 選択枠が薄くなっても `aria-checked` で選択状態が SR に正確に伝わるため、視覚枠の控えめさは a11y を毀損しない

#### v1.1.2 a11y 規約改訂：ガボール本体の SR 到達可能化

v1.1（Sprint 8〜19）までは「ガボール領域は装飾扱いで `aria-hidden="true"`」を規範としていたが、**Sprint 21 で全ゲームをガボール直接選択化**するため、`ImageChoiceCell` でラップされたガボールは「装飾」ではなく「選択肢として SR に到達可能」とする。具体規約：

- ImageChoiceCell の outer 要素に `role="radio"` / `role="checkbox"` を付与し、`aria-label` で「左のガボール（より時計回りに傾いて見える側を選択肢として）」のように選択肢としての意味を集約
- ImageChoiceCell の内側にあるガボール描画ノード（`<canvas>` / SVG）は `aria-hidden="true"` のまま（装飾的な視覚要素）
- これにより SR ユーザーは「ImageChoiceCell」レベルで radio/checkbox の選択肢として認識でき、ガボール描画自体は装飾として読み飛ばされる
- guidance テキスト（「より時計回りに傾いて見えるパッチを選んでください」）は `aria-describedby` で `radiogroup` に関連付けする
- 各 ImageChoiceCell には `data-target-id` 属性を必須で付与する（ResultOverlay の ◯/✕ 配置用、§19 Generator 実装ガイド §23 配置ロジック参照）

> **ImageChoiceCell に切り替えた効果**：v1.1 旧仕様では SR は「下の選択肢ボタン群」を radiogroup として認識していたが、v1.1.2 では「ガボール領域そのもの」が radiogroup となる（ボタンが消えるため）。SR ユーザーがガボール領域に Tab で到達できなくなることを防ぐためにも、ImageChoiceCell に正しい role / aria-label を付けることは必須。

---

## 5. `ClockChoiceLayout`（AC-3）

8 ボタンを文字盤型に配置（旧 v1 ClockAnswerButtons を v1.1 用に整理）。

### API
```ts
type ClockChoiceLayoutProps = {
  selectedPosition: "12" | "1.5" | "3" | "4.5" | "6" | "7.5" | "9" | "10.5" | null;
  onSelect: (pos: string | null) => void;
  diameterPx: number;        // スマホ 320, PC 360
  ariaLabel: string;
};
```

### 仕様
- 各ボタン 72×72px（OPT-2 + ラベル 24px 収容）、`radius.circle`
- ラベル font.body 24px Medium tabular-nums
- 円周上絶対配置（v1 と同じ）
- 選択中（v1.1.1 改訂）：枠 2px `color.selection.subtle` + ラベル Bold 切替（円形 inset shadow 形式）

### v1 からの差分
- 試行ループの自動進行はなく、選択肢として 60 秒間ずっと押下可能
- highlightCorrect prop は削除（採点は ResultSummaryV11 が担当）

---

## 6. `NumericKeypadChoice`（AC-4）

G-13 用の 0〜9 ボタン配置。

### API
```ts
type NumericKeypadChoiceProps = {
  selectedDigit: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | null;
  onSelect: (d: number | null) => void;
};
```

### レイアウト
- 5×2 グリッド（横 5、縦 2）：`1 2 3 4 5 / 6 7 8 9 0`
- 各ボタン 64×64px（lg）、ラベル font.body.lg 26px Bold tabular-nums
- 選択中（v1.1.1 改訂）：枠 2px `color.selection.subtle` + 数字をやや拡大（1.05×、押下感の補助）

---

## 7. `MetricCard`（MC-1）

F-10 結果サマリの数値カード。

### API
```ts
type MetricCardProps = {
  label: string;                     // "今回の閾値"
  value: string;                     // "0.12"
  unit?: string;                     // "コントラスト差" など
  diff?: { sign: "+" | "-" | "0"; magnitude: string; direction: "improved" | "flat" | "worsened" };
};
```

### レイアウト
```
┌────────────────────┐
│ 今回の閾値          │ ← font.body 24px、color.fg.secondary
│                    │
│   0.12             │ ← font.h2 30px Bold tabular-nums
│ コントラスト差      │ ← font.body 24px、color.fg.muted
│                    │
│ +0.03 ↑ 改善       │ ← diff、font.body 24px Bold + 装飾矢印
└────────────────────┘
```

### 仕様
- Card variant=outlined、padding=md (24px)、minHeight 140px
- 値とラベルは縦中央寄せ
- diff の direction による装飾色（テキスト本体は `color.fg.primary` のまま、§1.4 制約遵守）：
  - improved: 矢印 `palette.semantic.success` + テキスト「改善」（または閾値が小さい方が良いゲームでは「-0.03 ↓ 改善」）
  - flat: 矢印水平 `color.fg.muted` + テキスト「同等」
  - worsened: 矢印 `palette.semantic.warning` + テキスト「やや低下」
- diff が undefined のとき：「初回測定」を `color.fg.muted` で表示

---

## 8. `ResultSummaryV11`（RS-1、v1.1.1 で撤去・再定義）

> **v1.1.1（Sprint 20）改訂**：本コンポーネントは独立画面用途では撤去された。ユーザーはもはや独立した結果画面に遷移しない（F-10 v1.1.1 改訂）。代わりに **§23 `ResultOverlay`（GE-RESULT）** が刺激画面に重畳する形で結果を開示する。
> 旧 v1.1 の `ResultSummaryV11` インスタンスを呼んでいた箇所（13 ゲームの単体プレイ画面 / コース動線）は、すべて `ResultOverlay` 呼び出しに差し替える（Generator 実装ガイド §19 に追記）。
> 本節は「v1.1 期に存在した API」として記録目的で保持する。新規実装では §23 を参照すること。
>
> **閾値メトリクスの引き継ぎ**：`ResultSummaryV11` が表示していた「今回の閾値」「前回比」「単位」メトリクスは **`ResultOverlay` には引き継がれない**（spec 再確定により ResultOverlay からメトリクスバーを撤去）。閾値の数値推移は **F-11 進捗グラフ** から参照する設計とする（components.md §10〜§13、F-11 関連参照）。

### 13 ゲーム共通の結果サマリ画面（v1.1 旧仕様、参考）

### API
```ts
type ResultSummaryV11Props = {
  gameId: GameId;
  gameNameJa: string;
  correctAnswerLabel: string;          // "右が濃い"
  userAnswerLabel: string | null;      // null = 未回答
  isCorrect: boolean;
  threshold: { value: string; unit: string };
  diff?: { sign: "+" | "-" | "0"; magnitude: string; direction: "improved" | "flat" | "worsened" };
  isCourseMode: boolean;               // true ならカウントダウン併記、false なら SinglePlayPostFooter 表示
  countdownSeconds?: number;           // 10 → 0（コース時のみ）
  badgeAwarded?: BadgeId | BadgeId[];  // 獲得バッジ（複数可、§8.4 順次表示）
  onNext?: () => void;                 // コース時のみ使用
  // 単体時 (isCourseMode=false) の 3 択ハンドラ（F-06 受け入れ基準）
  onBackToList?: () => void;           // 単体時：「ゲーム一覧へ戻る」
  onPlayAgain?: () => void;            // 単体時：「同じゲームをもう一度」
  onGoHome?: () => void;               // 単体時：「ホームへ」
  onboardingCompletionMode?: boolean;  // S8-OB-06 専用：「ホームへ」1 つだけ表示 + 完了通知バナー
};
```

### レイアウト構造
（system.md §1.3 参照）

- 上部：`{gameNameJa} の結果` h2 30px
- 大正解表示：「正解は『{correctAnswerLabel}』」h1 36px Bold + 黄色 4px 装飾
- 回答併記：「あなたの回答『{userAnswerLabel ?? "未回答"}』」font.body.lg 26px、不正解時は左にエラー装飾アイコン（`palette.semantic.error`、ただしテキスト本体は `color.fg.primary`）
- 2 列メトリクスカード（MetricCard ×2）
- バッジ獲得演出（badgeAwarded 時のみ 1.5 秒 scale、配置位置は MetricCard と footer の間。Sprint 19 S19-07 §8.1 / §8.3 参照）
- 下：
  - **コース時**（`isCourseMode=true`）：「次へ」Primary Button（lg、64px、ラベル 26px）+ 右上に CountdownDisplay md（30px 数字）併記
  - **単体時**（`isCourseMode=false`、通常）：`SinglePlayPostFooter`（FT-1、§22 参照）の 3 択ボタン群を表示
  - **オンボーディング体験完了時**（`onboardingCompletionMode=true`）：「ホームへ」Primary Button のみ表示 + 上部に完了通知バナー

### a11y
- `role="region"`、`aria-labelledby="result-title"`
- 結果は `aria-live="assertive"` で 1 度だけ読み上げ
- 「Game G-04 結果。正解は右が濃い。あなたの回答は左が濃い。今回の閾値は 0.12 コントラスト差。前回比 +0.03 改善。次へ」
- 単体時は自動進行しない（OPT-7）

---

## 9. `HomeHeroCTA`（HM-1）

F-04 ホームのプライマリ CTA カード。

### API
```ts
type HomeHeroCTAProps = {
  enabledGameCount: number;           // 動的「約 N 分」
  todayCompleted: boolean;            // 完了マーク表示
  onPress: () => void;
};
```

### レイアウト
```
┌──────────────────────────────────┐
│                                  │
│  全ゲーム連続プレイ                │ ← font.body.lg 26px Bold
│  （約 {n} 分）                    │ ← font.body 24px
│                                  │
│  ▶ はじめる                       │ ← 右下に矢印アイコン (32px)
│                                  │
└──────────────────────────────────┘
```

### 仕様
- 高 128px、padding 24px、`radius.lg`、`color.action.primary` 背景、`color.fg.onPrimary` 文字
- todayCompleted=true 時：背景は `color.action.primary` のまま、左上に「✓ 本日完了」装飾タグ（`palette.semantic.success` 装飾アイコン + onPrimary 色テキスト）
- pressed 時 scale(0.98) + 背景 hover 色
- 全カードが Pressable、ヒットテリア 100%

### a11y
- `role="button"`、`aria-label="全ゲーム連続プレイを始める。約 {n} 分"`

---

## 10. `HomeNavGrid`（HM-2）

ホーム下部の 2 列ナビゲーション。

### API
```ts
type HomeNavGridProps = {
  onPressProgress: () => void;
  onPressBadges: () => void;
  weeklyTrendHint?: string;             // "直近 28 日推移"
  badgeProgress?: { earned: number; total: number };  // "8 / 13"
};
```

### レイアウト
- 2 列カード、各 80px 高、card variant=outlined
- 左：「📊 進捗グラフ」title 26px、subtitle 「直近 28 日推移」font.body 24px
- 右：「🏅 バッジ」title 26px、subtitle 「{earned} / {total} 達成」font.body 24px
- それぞれ Pressable、focus-visible 3px outline

---

## 11. `ProgressGraphTabs`（TB-1）

進捗グラフ画面の親タブ。

### API
```ts
type ProgressGraphTabsProps = {
  active: "wide" | "perGame";
  onChange: (t: "wide" | "perGame") => void;
};
```

### 仕様
- 2 タブを横並び flex 等分
- 各タブ高 56px、`font.body.lg` 26px Medium
- アクティブ：下線 4px `color.brand.primary` + テキスト Bold
- 非アクティブ：色 `color.fg.secondary`、Bold なし
- focus-visible 3px outline
- `role="tablist"`、子に `role="tab"` `aria-selected`

---

## 12. `GameSubTabsScroll`（TB-2）

ゲーム別タブの中で 13 ゲームを横スクロール（スマホ）／グリッド（PC）表示。

### API
```ts
type GameSubTabsScrollProps = {
  enabledGames: Array<{ id: GameId; nameJa: string }>;  // releaseEnabled でフィルタ済み
  activeGameId: GameId;
  onChange: (id: GameId) => void;
};
```

### 仕様
- スマホ：横スクロール（overflow-x: auto、scroll-snap-type: x mandatory）
- PC：4 列グリッド（13 ゲームなら 4×4 で最終行 1 つ余る）
- 各タブ：高 48px、padding-x 16px、`font.body` 24px、tabular-nums で「G-04 コントラスト弁別」表示
- アクティブ：背景 `color.brand.primary` の薄塗（10% alpha）+ 下線 4px brand.primary
- スクロール時に左右にフェードグラデーションで「もっと続きがある」を示す

### F-18 反映
- enabledGames から既にフィルタ済みのリストを受け取る前提（disabled は配列に含まれない）

---

## 13. `DistanceReminderV11`（DR-2）

3 秒カウントダウンで自動進行する距離リマインド。

### API
```ts
type DistanceReminderV11Props = {
  distanceCm: 30 | 40 | 50;
  oneEyeGuidance?: "off" | "left" | "right" | "alternate";
  onCountdownComplete: () => void;
  onAbort: () => void;
};
```

### 仕様
- 上部 ✕ IconButton（緊急脱出のみ）
- 中央：「画面から {n}cm 離れてください」`font.h1` 36px Bold
- イラスト：distance-{n}.svg 静止
- 片眼ガイダンス（任意）：`font.h3` 26px + eye-cover.svg
- 中下：3 秒カウントダウン `font.numeric.xl` 72px tabular-nums
- 説明：「{n} 秒後に自動で開始」`font.body` 24px

### v1 からの削除
- 「準備ができました」Button → 削除
- 「距離を変える」tertiary → 削除（設定画面で変更）

### a11y
- カウントダウンは `aria-live="polite"`、1 秒ごとに「3 秒後に開始」「2 秒」「1 秒」と読み上げ
- 0 でフェード遷移（200ms、prefers-reduced-motion: reduce 時は 0ms）

---

## 14. `DataResetNotice`（RZ-1）

F-17 起動時データリセット通知（1 度だけ表示）。

### API
```ts
type DataResetNoticeProps = {
  onAcknowledge: () => void;
};
```

### レイアウト
- Modal ベース（v1 Modal を踏襲）
- title：「最新版へのアップデート」h3 26px
- 本文：「より良いトレーニングのため、過去のデータをリセットしました。新しい 13 ゲームをお楽しみください。」font.body 24px line-height 1.6
- 補足（小）：「※ 視聴距離・年齢層・免責同意は新たに設定し直していただきます」font.body 24px
- ボタン：「OK」Primary lg、64px 高（56pt+）

### a11y
- `role="dialog"`、`aria-modal="true"`、`aria-labelledby`
- 開時に OK ボタンへフォーカス
- 1 度確認後は localStorage の `gaboreye:v1.1:dataResetNoticeShown=true` を立てて以降表示しない（F-17 受け入れ基準）

---

## 15. ゲーム固有刺激描画（GE-01〜GE-13）

各ゲームの「注視領域」中身。`GamePlaySurface.stimulusArea` に渡される。

### GE-01 `MorphGridStimulus`（G-01 変化察知）
```ts
type MorphGridStimulusProps = {
  rows: 3 | 4 | 5;
  cols: 3 | 4 | 5;
  patches: Array<{
    id: string;
    initialOrientationDeg: number;
    targetOrientationDeg: number;     // モーフィング先（変化対象のみ initial と異なる）
    contrast: number;
    cpd: 1.5 | 3 | 6 | 9;
    sigmaDeg: number;
    isChanging: boolean;
    isSelected: boolean;
    onToggle: () => void;
  }>;
  durationMs: 60000;                  // 60 秒
  paused: boolean;
};
```
- 各セルは `ImageChoiceCell` × `GaborPatch`
- `prefers-reduced-motion: reduce` 時はモーフィングを 5 段階階段状に（v1 と同じ）
- セル間ギャップ space.4（16px）
- 全体辺長：スマホ `min(viewport.width-32, 360)`、PC 480px

### GE-02 `SideBySideStimulus`（G-02 左右並び傾き判別）
```ts
type SideBySideStimulusProps = {
  patchLeft: GaborPatchProps & { isClockwise: boolean };
  patchRight: GaborPatchProps & { isClockwise: boolean };
};
```
- 左右 2 ガボール、ギャップ space.6（32px）
- 中央に固視点 0.5°
- 60 秒間ずっと表示（v1 と異なり点滅・マスクなし）
- 各パッチ画像領域 120×120px（スマホ）、160×160px（PC）

### GE-03 `PeripheralStimulusV11`（G-03 周辺視野ハント、v1.1.2 改訂）
- 旧 v1 PeripheralLayout から `showMask` `presentationDurationMs` `onTimeoutToMask` を削除
- 中央固視点 + 円周 8 ガボール（離心角 8° 固定）を 60 秒間ずっと提示
- 8 ガボールのうち 1 個（odd one）が他と異なる向きを持つ
- **v1.1.2 改訂**：8 個のガボールパッチをそれぞれ `ImageChoiceCell` でラップし、radio として直接タップ選択可能にする。固視点（中央 +）は ImageChoiceCell でラップせず純粋な装飾（`aria-hidden="true"`、タップしても反応しない）
- 各 ImageChoiceCell の `data-target-id` は `g03-pos-12` / `g03-pos-1.5` / `g03-pos-3` / `g03-pos-4.5` / `g03-pos-6` / `g03-pos-7.5` / `g03-pos-9` / `g03-pos-10.5` の 8 種（時計位置で命名、ResultOverlay の ◯/✕ 配置用）
- 円周配置の半径は離心角 8° から換算（標準視聴距離 40cm × tan(8°) ≒ 5.6cm ≒ 約 110px @ 標準スマホ DPI）。ImageChoiceCell のセルサイズはガボール直径 + クリアランス（最小 56px、OPT-2 維持）
- 各 ImageChoiceCell の `aria-label` は時計位置とガボール向きを組み合わせ（例：「12 時の方向のガボール（縞の向き：垂直）」、向きはランダムに変わるため動的生成）

### GE-04 `ContrastDiscrimStimulus`（G-04 コントラスト弁別、v1.1.2 改訂）
- 左右 2 ガボール、向き・cpd 同一、コントラストのみ異なる
- レイアウトは GE-02 と同じ
- **v1.1.2 改訂**：左右 2 ガボールをそれぞれ `ImageChoiceCell` でラップし、radio として直接タップ選択可能にする（G-02 と同パターン）
- `data-target-id` は `g04-left` / `g04-right`
- `aria-label` は「左のガボール（より濃く見える側を選択肢として）」「右のガボール（同上）」

### GE-05 `SFDiscrimStimulus`（G-05 空間周波数弁別、v1.1.2 改訂）
- 左右 2 ガボール、コントラスト・向き同一、cpd のみ異なる
- レイアウトは GE-02 と同じ
- **v1.1.2 改訂**：左右 2 ガボールをそれぞれ `ImageChoiceCell` でラップし、radio として直接タップ選択可能にする
- `data-target-id` は `g05-left` / `g05-right`
- `aria-label` は「左のガボール（より細かい縞の側を選択肢として）」「右のガボール（同上）」

### GE-06 `WindowSizeStimulus`（G-06 ガウス窓サイズ弁別、v1.1.2 改訂）
- 左右 2 ガボール、cpd・コントラスト・向き同一、ガウス窓 SD のみ異なる
- レイアウトは GE-02 と同じ
- **v1.1.2 改訂**：左右 2 ガボールをそれぞれ `ImageChoiceCell` でラップし、radio として直接タップ選択可能にする
- `data-target-id` は `g06-left` / `g06-right`
- `aria-label` は「左のガボール（より大きく広がっている側を選択肢として）」「右のガボール（同上）」

### GE-07 `EdgeHuntStimulus`（G-07 エッジ検出）
- 4×4 = 16 ガボールを `ImageChoiceCell` グリッドで配置
- うち 3 個が同一線上に同向き、他はランダム向き
- 全体辺長：スマホ 320px、PC 480px

### GE-08 `TiltAftereffectStimulus`（G-08 残像方位弁別）
- 上下 2 ガボール
- 上：adapter（傾き 20° 固定、高コントラスト 0.6）
- 下：テストパッチ（staircase 値）
- 上下のギャップ space.6（32px）
- 各パッチ 140×140px（スマホ）、180×180px（PC）

### GE-09 `LateralMaskingStimulus`（G-09 側方マスキング）
- 横一列「flanker | target | flanker」3 ガボール
- target は中央、低コントラスト、staircase 連動向き
- flanker 2 個は両側、target 直径の N 倍距離（staircase 連動）、高コントラスト 0.5、垂直平行
- 各パッチ 80×80px（スマホ）、120×120px（PC）

### GE-10 `TextureSegmentationStimulus`（G-10 テクスチャ分離、v1.1.2 改訂、案 A 採用）
- 8×8 = 64 ガボールを敷き詰め
- 4 象限（左上/右上/左下/右下）のいずれかに 3×3 = 9 個の異向きパッチ
- 全体辺長：スマホ `min(viewport.width-32, 360)`、PC 480px
- 各パッチ 32〜40px（個別パッチは小サイズだが描画は確保。**個別パッチはタップ対象ではない**）
- **v1.1.2 改訂**：8×8 grid 全体を 4 象限（各 4×4 = 16 セル）に分割し、各象限を `ImageChoiceCell` でラップ（radio）。grid-4 ボタン UI は撤去（spec §7.10 案 A 採用）
- 4 象限のクリッカブル化：grid 全体を 2×2 の象限レイヤー上に乗せ、各象限が外側 ImageChoiceCell、内側に各象限の 4×4 = 16 個のガボール（描画のみ、タップ反応なし）を持つ構造
- 象限境界の視覚化：象限間の境界線は **1px の薄いダッシュ線**（`color.border.subtle`、ガボール本体の視認性を阻害しない最小限の表現）。選択中象限のみ ImageChoiceCell の 2px 中性グレー枠（inset shadow）で囲まれる
- `data-target-id` は `g10-tl`（top-left）/ `g10-tr`（top-right）/ `g10-bl`（bottom-left）/ `g10-br`（bottom-right）の 4 種
- 各 ImageChoiceCell の `aria-label` は「左上の象限（4×4 = 16 個のガボールパッチ群）」「右上の象限」「左下の象限」「右下の象限」
- 個別ガボールは `aria-hidden="true"` のまま（装飾扱い）。象限が選択肢の単位

### GE-11 `VernierStimulus`（G-11 Vernier 整列判定、v1.1.2 改訂、案 A 採用）
- **v1.1.2 改訂**：spec §7.11 案 A 採用により、構造を「上 1 個 reference + 下 2 個（左右、テストパッチ）」に変更（G-08 と統一）
- 上：reference ガボール（基準位置、disabled、垂直 90°、staircase 値の影響を受けない）、`disabled=true`（タップ反応なし、選択枠も出ない）
- 下：テストパッチ 2 個（左右、ImageChoiceCell radio）。一方が左ズレ、一方が右ズレ（staircase 値が ±arcmin のズレ量）
- 上下のギャップ：space.4（16px、近接配置）。下 2 個のテストパッチ間ギャップは space.6（32px）
- 各パッチ 100×100px（スマホ）、140×140px（PC）
- staircase 値・採点ロジック・閾値計算は不変（左右パッチ ±arcmin の対称配置で実現）
- `data-target-id` は `g11-test-left` / `g11-test-right`（reference には付けない、disabled なため）
- `aria-label` は「下のテストパッチ 左（reference に対する整列／ズレを判定）」「下のテストパッチ 右」

### GE-12 `CrowdingStimulus`（G-12 クラウディング）
- 中央 target ガボール + 周囲 4〜6 個の flanker
- target-flanker spacing が staircase 値（target 直径の倍率）
- 各パッチ 60×60px（spacing 確保のため小さめ）

### GE-13 `EmbeddedNumeralStimulus`（G-13 数字探し）
- ノイズ + 微小コントラストの数字（0〜9 のいずれか 1 つ）
- 全体 240×240px（スマホ）、320×320px（PC）
- ノイズはガボール由来（高コントラスト・ランダム向きのガボールを敷き詰めた背景に、低コントラストで数字輪郭をマスク）

---

## 16. 改訂される v1 コンポーネント

### 16.1 `GaborGrid` → `MorphGridStimulus`（GE-01 として再定義）
- v1 GaborGrid の `durationMs` を **60000 固定**
- 採点後の `highlightChangingIds` は ResultSummaryV11 の中で別表現（「正解は ◯◯」テキスト）に置き換わるため、本コンポーネント内ではハイライト不要

### 16.2 `PeripheralLayout` → `GE-03 PeripheralStimulusV11`
- マスク関連 prop（`showMask` / `presentationDurationMs` / `onTimeoutToMask`）削除
- 60 秒間ずっと提示する単純なレイアウトに

### 16.3 `ResultSummary` → `ResultSummaryV11` → `ResultOverlay`（v1.1.1 で再改訂）
- v1.1：13 ゲーム共通レイアウトに統一（§8 参照、独立画面として表示）
- **v1.1.1（Sprint 20）：独立画面用途を撤去し、`ResultOverlay`（§23）に責務を移譲。刺激画面に重畳する形で結果を開示**
- 結果開示は **◯/✕ アイコン + 「次へ」ボタン（コース時のみカウントダウン）のみ** に簡素化。閾値・前回比・単位のメトリクス表示は ResultOverlay には載せず、F-11 進捗グラフから参照する設計（spec 再確定）
- 旧 v1 の「結果画面遷移」は v1.1.1 で完全に廃止。Generator は `ResultSummaryV11` の独立画面実装を呼ばず `ResultOverlay` を使う

### 16.4 `GameStatusBar` → `GameStatusBarV11`
- `trialIndex` / `totalTrials` 削除（§2 参照）

### 16.5 `DistanceReminder` → `DistanceReminderV11`
- 「準備ができました」ボタン削除、3 秒自動進行（§13 参照）

### 16.6 `WeeklyGraph` → `ProgressGraphTabs` + `GameSubTabsScroll` の組合せ
- v1 の WeeklyGraph は廃止し、ProgressGraphTabs（親タブ）+ GameSubTabsScroll（子タブ、ゲーム別時のみ）に分割
- 折れ線グラフ本体は v1 V1ScoreChart を継承

### 16.7 `ClockAnswerButtons` → `ClockChoiceLayout`
- 名前変更 + AnswerChoiceGroup の特化型として整理（§5 参照）
- `highlightCorrect` 削除（採点は ResultSummaryV11 で）

---

## 17. 削除される v1 コンポーネント

- **`GaborWithMask`**：OPT-12 でマスク提示廃止。完全に使用されない
- **`PeripheralLayout` の `showMask` / `presentationDurationMs` 関連 API**：上記 16.2

---

## 18. アクセシビリティ・横断要件（v1 から継承、強化）

- 全インタラクティブ要素に `aria-label` または可視テキスト
- 選択状態は `aria-checked` / `aria-pressed`
- カウントダウンは `aria-live="polite"`（5 秒以下）／ `off`（6 秒以上）
- モーダル開時は最初のインタラクティブ要素にフォーカス
- 全ガボール領域は `aria-hidden="true"`（装飾扱い、SR には個別 `aria-describedby` で説明）

---

## 19. Generator 実装ガイド（v1 に追加、v1.1.1 で更新）

- `GamePlaySurface` を経由しないでゲーム画面を作らない（OPT-12 骨格を強制するため）
- `AnswerChoiceGroup` を経由せず生 button で選択肢を作らない（控えめ枠ハイライトと a11y 一貫性のため）
- `releaseEnabled` フラグを直接読まず、必ず `gameRegistry.getEnabledGames()` ヘルパー経由で取得する（一元化）
- `i18n.t()` を経由せずハードコード文言を書かない（将来の英語版に備えて）
- 単体プレイ後のフッターは生 Button を 3 つ並べず、`SinglePlayPostFooter`（§22）経由で `ResultOverlay`（§23）に組み込むこと
- **v1.1.1：独立した結果画面を作らない**。13 ゲームのプレイ画面（`GamePlaySurface`）の上に `ResultOverlay`（§23）を重畳する形で結果開示する
- **v1.1.1：`ResultSummaryV11` を新規呼び出ししない**（§8 で記録目的のみ残存。新規実装は §23 を使う）
- **v1.1.1：選択枠の色に黄色 `color.highlight.correct` を使わない**。`color.selection.subtle` を使う
- **v1.1.1：G-02 / G-08 で `AnswerChoiceGroup` の horizontal-2 を呼ばない**。`ImageChoiceCell` をパッチに直接ラップする（§4 参照）
- **v1.1.2：G-03 / G-04 / G-05 / G-06 / G-10 / G-11 でも `AnswerChoiceGroup` を呼ばない**。`ImageChoiceCell` を各パッチ（G-03）／象限（G-10）／テストパッチ（G-11）に直接ラップする（§4 / §15 GE-03 / GE-10 / GE-11 参照）
- **v1.1.2：G-09 / G-12 / G-13 では `AnswerChoiceGroup` を引き続き呼ぶ**。これは Designer 判断で「直接選択困難」と判定された 3 ゲーム。ボタン領域を刺激領域直下に空間対応配置する（spec §7.9 / §7.12 / §7.13、screens.md §7 / §10 / §11 参照）
- **v1.1.2：clock-8 / grid-4 layout を呼ばない**（G-03 / G-10 で直接選択化されたため。clock-8 / grid-4 layout は Sprint 21 時点で実質未使用）
- 各 `ImageChoiceCell` / horizontal-2 ボタン / horizontal-4 ボタン / キーパッドボタンには **`data-target-id="..."`** 属性を必須で付ける（`ResultOverlay` が ◯/✕ を配置するために参照）

---

## 20. （予約・将来拡張用）

このセクションは将来拡張用に予約。現状記述なし。

---

## 21. （予約・将来拡張用）

このセクションは将来拡張用に予約。現状記述なし。

---

## 22. `SinglePlayPostFooter`（FT-1、F-06 受け入れ基準）

単体プレイの結果サマリ末尾に配置する 3 択フッター。仕様 F-06 の受け入れ基準「単体プレイ後はゲーム一覧に戻る／同じゲームをもう一度／ホームへ の 3 択」を全 13 ゲーム共通で担保する。

### API

```ts
type SinglePlayPostFooterProps = {
  onBackToList: () => void;     // 「ゲーム一覧へ戻る」
  onPlayAgain: () => void;       // 「同じゲームをもう一度」
  onGoHome: () => void;           // 「ホームへ」
  gameNameJa?: string;            // SR aria-label 用、省略可
};
```

### レイアウト（スマホ縦 375）

```
┌─────────────────────────────────────┐
│   (ResultSummaryV11 の MetricCard ×2 / │
│    バッジ獲得演出までは既存)            │
│                                     │
│  ─────────────────────────────────  │ ← 区切り線
│                                     │
│  ┌─────────────────────────────────┐│
│  │   同じゲームをもう一度            ││ ← Primary lg, 64px
│  └─────────────────────────────────┘│   font.body.lg 26px Bold
│                                     │   color.action.primary 背景
│  ┌─────────────────────────────────┐│
│  │   ゲーム一覧へ戻る                ││ ← Secondary lg, 64px
│  └─────────────────────────────────┘│   font.body.lg 26px Medium
│                                     │   color.action.secondary 背景
│  ┌─────────────────────────────────┐│
│  │      ホームへ                     ││ ← Tertiary lg, 64px
│  └─────────────────────────────────┘│   font.body.lg 26px Medium
│                                     │   下線あり、背景 transparent
└─────────────────────────────────────┘
```

### レイアウト（PC 横 1280）

中央寄せ最大幅 480px、上記と同じ縦 3 列。スマホと PC で配置を変えない（読み上げ順序の一貫性確保）。

### CTA 順序の優先度

1. **同じゲームをもう一度**（Primary、最も主要な動線。再挑戦が連続学習の核）
2. **ゲーム一覧へ戻る**（Secondary、別ゲームを試したいユーザー向け）
3. **ホームへ**（Tertiary、現在のセッションを終了するユーザー向け）

> CVR 観点：単体プレイ後に「もう一度」を最上段にすることで再挑戦率を上げる。連続コースに誘導するならホームへ戻ってもらう必要があるが、本フッターは単体プレイの体験を完結させる位置づけのため、もう一度を優先。

### 仕様

- 各ボタン高 64px、margin-bottom space.3（8px）
- 左右パディング space.4（16px）
- 上部に区切り線（border-top 1px `color.border.default`）+ margin-top space.4（16px）
- 各ボタンは v1 Button をそのまま流用（variant="primary" / "secondary" / "tertiary"）

### a11y

- フッター全体 `role="group"`, `aria-label="単体プレイ後のアクション選択"`
- 各ボタン明示的な `aria-label`（gameNameJa 与えられる場合）：
  - 「{gameNameJa} をもう一度プレイする」
  - 「ゲーム一覧へ戻る」
  - 「ホームへ戻る」
- フッター表示時に「同じゲームをもう一度」へ自動フォーカス
- Tab 順：Primary → Secondary → Tertiary（DOM 順）
- focus-visible 3px outline `color.focus.ring`

### 状態

| 状態 | 表示 |
|---|---|
| 通常（単体プレイ後） | 3 ボタン全て表示 |
| バッジ獲得時 | フッターはバッジ獲得演出（§8）の下に表示。バッジ演出 1.5 秒中もボタンは押下可（演出は装飾） |
| `onBackToList` が undefined | フォールバック：そのボタンのみ非表示。残り 2 つだけ表示 |

### コース時は表示しない

`ResultSummaryV11` の `isCourseMode=true` のときは本フッターを表示しない（コース時は「次へ」Primary 1 つ + 自動進行カウントダウン）。

### オンボーディング体験完了時は表示しない

`ResultSummaryV11` の `onboardingCompletionMode=true`（S8-OB-06）のときは本フッターを表示せず、「ホームへ」1 つだけ表示 + 完了通知バナー（onboarding.md §8 参照）。

### 関連

- 仕様：`docs/spec-v11.md` F-06 受け入れ基準「単体プレイ後はゲーム一覧に戻る／同じゲームをもう一度／ホームへ の 3 択」
- 配置：各ゲームの結果サマリ画面（S9-03 / S10-03 / S11-03 / S12-03 / S13-03 / S14-03 / S14-06 / S15-03 / S15-06 / S16-03 / S16-06 / S17-03 / S17-06）の末尾
- 親コンポーネント：`ResultSummaryV11`（§8）の API `onBackToList` / `onPlayAgain` / `onGoHome` で本コンポーネントが内部呼び出しされる

### Generator 実装ノート

- v1.1.1（Sprint 20）以降は `ResultSummaryV11` の独立画面用途は撤去されているため、`SinglePlayPostFooter` は **§23 `ResultOverlay`** の `isCourseMode=false` 内で内部呼び出しされる
- 単体プレイ画面の親コンポーネント（例 `SingleGamePlayScreen`）が `onBackToList` / `onPlayAgain` / `onGoHome` の 3 ハンドラを `ResultOverlay` に渡す
- `onPlayAgain` は同じ gameId で `SingleGamePlayScreen` を再マウントする実装が想定（distance reminder → ミニ説明（既出のため省略可）→ 60 秒注視 → 結果オーバーレイ）

---

## 23. `ResultOverlay`（GE-RESULT、v1.1.1 新規・最重要）

Sprint 20 で導入。13 ゲーム共通で、60 秒経過後に刺激画面に**重畳表示**する結果オーバーレイ。独立画面遷移は廃止され、本コンポーネントが旧 `ResultSummaryV11` の責務を引き継ぐ。

> **構成（spec 再確定）**：本オーバーレイは **◯ / ✕ アイコンの重畳 + 「次へ」ボタン（およびコースモード時のカウントダウン）のみ** で構成される。閾値・前回比・単位といった追加メトリクスは表示しない（実機テストで刺激の視認を妨げるとのフィードバックのため撤去）。閾値の数値推移は **F-11 進捗グラフ** から参照する設計とする。

### API

```ts
type ResultMark = {
  targetId: string;          // 対象パッチ／領域の ID（GE-XX 内の各セルに付けた id と対応）
  kind: "correctChosen"      // 正解で選んだ → ◯
      | "correctMissed"      // 正解だが選ばれなかった（複数選択ゲームのみ）→ 薄 ◯
      | "wrongChosen";       // 不正解で選んだ → ✕
  // "wrongUnchosen"（不正解で選ばれなかった）は配列に含めない（何も表示しない）
};

type ResultOverlayProps = {
  gameId: GameId;
  gameNameJa: string;

  // ◯ / ✕ 配置情報
  marks: ResultMark[];

  // 全体結果（SR 読み上げ用）
  isCorrect: boolean;
  correctAnswerLabel: string;                               // SR 読み上げ用「右が濃い」など
  userAnswerLabel: string | null;                           // 「左が濃い」 / null（未回答）

  // 進行制御
  isCourseMode: boolean;                                    // true: コース、false: 単体
  countdownSeconds?: number;                                // 10→0、コース時のみ

  // バッジ
  badgeAwarded?: BadgeId | BadgeId[];

  // ハンドラ
  onNext?: () => void;                                      // コース時：次のゲームへ
  onBackToList?: () => void;                                // 単体時
  onPlayAgain?: () => void;                                 // 単体時
  onGoHome?: () => void;                                    // 単体時

  // 特殊
  onboardingCompletionMode?: boolean;                       // S8-OB-06 用、ホームへ 1 つ + 完了通知
};
```

> **撤去された props**：v1.1.1 spec 再確定により、`threshold` / `diff`（前回比）など閾値メトリクス系の props は ResultOverlay の API から撤去された。これらの値の参照は F-11 進捗グラフ側で行う。

### 構造（DOM）

```
<div role="region" aria-labelledby="result-overlay-title" aria-live="assertive">
  {/* 既存の GamePlaySurface はそのまま残し、本コンポーネントを上層に重畳 */}
  <div className="overlay-stimulus-layer">
    {/* 各 mark を targetId と対応づけて絶対配置 */}
    {marks.map(m => <MarkBadge ... />)}
  </div>
  <div className="overlay-action-bar">
    {/* 「次へ」ボタン + コース時はカウントダウン併記 */}
  </div>
  {!isCourseMode && (
    <SinglePlayPostFooter ... />
  )}
  {badgeAwarded && (
    <AchievementBadgeBurst ... />  // 1.5 秒、上層レイヤー
  )}
  <p id="result-overlay-title" className="sr-only">
    {gameNameJa} の結果。{correctIfText}。
  </p>
</div>
```

### レイアウト構造

#### 重畳レイヤー
- **z-index**：刺激領域（GamePlaySurface.stimulusArea）= 1、◯/✕ レイヤー = 10、アクションバー = 20、バッジ演出 = 30
- 刺激領域の各選択対象（`ImageChoiceCell`／象限／パッチ）の `data-target-id` 属性を本コンポーネントが読み取り、対応する位置に `MarkBadge` を絶対配置（`position: absolute; left/top` をセル中央に合わせる）

#### アクションバー（GE-RESULT 下段、唯一の操作領域）
- 位置：刺激領域の直下（`GamePlaySurface` の `answerChoices` 領域に重畳）。**メトリクスバーは存在しない**ため、刺激領域とアクションバーの間に他の UI 要素は入らない
- 高さ：80px（ボタン 64px + 上下 padding 8px）
- コース時：`<button>次へ ⏱ 8</button>`
  - ボタン本体：Primary lg、64px、`font.body.lg` 26px Bold、ラベル「次へ」
  - 右内側：CountdownDisplay md（30px tabular-nums）、ボタン背景上で読みやすいよう `color.fg.onPrimary`
  - コース時最終ゲームの場合：ラベル「クールダウンへ」+ カウントダウン
  - 「次：G-XX ◯◯」を 2 行目に 18px で表示してもよい（spec 任意、Designer 判断）
- 単体時：`<button>次へ</button>` 1 行、カウントダウンなし
  - 直下に `SinglePlayPostFooter`（FT-1）を縦に展開（同じゲームをもう一度／一覧へ／ホームへ）
- オンボーディング体験完了時（`onboardingCompletionMode=true`）：「ホームへ」1 つ + 上部完了通知バナー

### `MarkBadge` 配置ロジック

```ts
// 各 ImageChoiceCell / 象限ボタン / パッチに付けた data-target-id をクエリして中央座標を取得
const cell = stimulusContainer.querySelector(`[data-target-id="${m.targetId}"]`);
const rect = cell.getBoundingClientRect();
const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
// MarkBadge を center に絶対配置
```

- ◯/✕ アイコンサイズはセル直径（または短辺）の **35%**
- セル直径が 60px 未満（G-10 / G-12 等の小セル）の場合は最小 24px をクランプ
- セル直径が 200px を超える場合は最大 80px でクランプ

### a11y

- 結果オーバーレイ全体：`role="region"`, `aria-labelledby="result-overlay-title"`, `aria-live="assertive"`
- 60 秒経過直後（オーバーレイ出現と同時）に SR で 1 度だけ読み上げ：
  - 「{gameNameJa} 結果。正解は『{correctAnswerLabel}』。あなたの回答『{userAnswerLabel ?? '未回答'}』。{isCorrect ? '正解' : '不正解'}。次へ」
  - （閾値・前回比の数値は読み上げに含めない。F-11 進捗グラフで参照する設計）
- ◯/✕ アイコン個別：`aria-label="正解です"` / `aria-label="不正解です"` / `aria-label="正解ですが選ばれませんでした"`（薄 ◯）
- 「次へ」ボタンへ自動フォーカス（カウントダウンは継続、フォーカス時に Tab で `SinglePlayPostFooter` の各ボタンへ移動可）
- カウントダウンは `aria-live="polite"`、5 秒以下で 1 秒間隔読み上げ
- オーバーレイ表示中、刺激領域内の選択肢タップは無効（`pointer-events: none`、ただし ◯/✕ アイコン側は `pointer-events: auto` で SR フォーカス可）
- prefers-reduced-motion: reduce 時はフェードイン即時（200ms → 0）

### スタイル詳細

| 要素 | スタイル |
|---|---|
| オーバーレイ全体 | フェードイン 200ms（reduce 時 0）、`opacity: 0 → 1` |
| ◯/✕ レイヤー | `position: absolute; inset: 0; pointer-events: none;` の上に `MarkBadge` を子として配置 |
| アクションバー | `padding: 16px 16px 24px; background: color.bg.surface;` |
| カウントダウン併記 | ボタン内 flex-end 配置、ボタンラベル「次へ」と 16px 間隔 |

### 旧 ResultSummaryV11 との API 対応

| 旧 `ResultSummaryV11` Prop | 新 `ResultOverlay` 対応 |
|---|---|
| `correctAnswerLabel` | `correctAnswerLabel`（SR 読み上げのみ） |
| `userAnswerLabel` | `userAnswerLabel`（SR 読み上げのみ） |
| `isCorrect` | `isCorrect` + `marks[]` で個別パッチ単位の正誤を表現 |
| `threshold` | **撤去**（ResultOverlay には載せない。F-11 進捗グラフ側で参照） |
| `diff` | **撤去**（同上） |
| `isCourseMode` / `countdownSeconds` | 同名で継承 |
| `badgeAwarded` | 同名で継承 |
| 旧大正解表示「正解は『◯◯』」を h1 36px Bold で表示 | **撤去**。視覚提示は ◯/✕ オーバーレイで代替。SR 読み上げにのみ残す |

### 受け入れ基準カバレッジ

- [x] 60 秒経過後、独立した結果画面に遷移しない（F-10 v1.1.1）
- [x] 正解側に ◯、誤選択側に ✕ オーバーレイ（F-10 v1.1.1）
- [x] 偶然正解時は ◯ のみ、✕ なし（F-10 v1.1.1）
- [x] 複数選択ゲームで個別パッチに ◯/✕（F-10 v1.1.1）
- [x] ◯/✕ がガボール縞を完全には覆わない透過度（半透明背景 82%）
- [x] 結果オーバーレイは ◯/✕ + 「次へ」ボタン（およびコースモード時のカウントダウン）のみで構成され、刺激の視認を妨げる追加メトリクスは表示しない（F-10 v1.1.1 spec 再確定）
- [x] 単体時は「次へ」を押すまで自動進行しない（OPT-7）
- [x] コース時は同画面 10 秒カウントダウン、操作で即進行
- [x] 試行中（注視 60 秒）はオーバーレイ非表示（F-10 v1.1.1）
- [x] バッジ獲得演出 1.5 秒（F-13）
- [x] オーバーレイ中の選択肢タップは無効

---

## 24. `MarkBadge`（MK-1、v1.1.1 新規）

`ResultOverlay` の子コンポーネント。◯ / ✕ / 薄 ◯ アイコンを単体で描画する。

### API

```ts
type MarkBadgeProps = {
  kind: "correct" | "wrong" | "missed";  // ◯ / ✕ / 薄 ◯
  sizePx: number;                         // 親が計算したサイズ（24〜80px の範囲）
  ariaLabel: string;                      // "正解です" / "不正解です" / "正解ですが選ばれませんでした"
};
```

### 描画仕様

#### 共通
- 形状：円形背景 + 中央にアイコン
- 円形背景：`color.overlay.resultBg`（白 82% 半透明 / ダーク時黒 82% 半透明）、円直径 = sizePx
- 円形背景の縁：1px `color.border.subtle`（縞模様との境目を視覚的に区切る）
- アイコンサイズ：sizePx × 0.6（中央配置）
- 線幅：sizePx × 0.10（最小 2px、最大 6px）
- 角丸（ライン端）：丸（rounded）

#### `kind="correct"`（◯）
- アイコン：円形 outline（縦 + 横の両方の端点を結ぶ完全な円）
- アイコン色：`color.semantic.successFg`
- 不透明度：100%

#### `kind="wrong"`（✕）
- アイコン：右上から左下、左上から右下の 2 本の線（クロス）
- アイコン色：`color.semantic.dangerFg`
- 不透明度：100%

#### `kind="missed"`（薄 ◯、複数選択ゲームの「正解だが選ばれなかった」）
- アイコン：円形 outline（kind=correct と同じ形状）
- アイコン色：`color.semantic.successFg`
- **不透明度：50%**（取りこぼしを視覚的に区別）
- 円形背景の不透明度も 50% に下げる

### a11y
- `role="img"`, `aria-label={ariaLabel}`
- アイコン本体は SVG 描画。点滅・アニメーションなし（OPT-9）

### サイズ規範

| セル直径 | MarkBadge sizePx | 理由 |
|---|---|---|
| 56〜80px（G-10 / G-12 の小セル） | 24px（最小クランプ） | 縞模様を完全に覆わない最小サイズ |
| 80〜140px（G-01 / G-07 グリッド） | セル直径 × 0.35 | 一目で見える + 縞は両側に残る |
| 140〜200px（G-02 / G-08 / G-04〜G-06 / G-11 の大パッチ） | セル直径 × 0.35（49〜70px） | 大きく、視認性最優先 |
| 200〜480px（G-13 全体表示等） | 80px（最大クランプ） | これ以上大きくしても情報量は増えない |

### Generator 実装ノート

- SVG で描画する（`<svg>` + `<circle>` / `<line>`）
- アイコン本体に CSS transition は付けない（点滅・アニメ禁止）
- 親 ResultOverlay 全体のフェードイン 200ms に乗る形で出現すれば十分

---

## 25. （v1.1.1）13 ゲームの ResultOverlay marks 生成ロジック（v1.1.2 で全面改訂）

各ゲームで `marks: ResultMark[]` をどう作るかの規範。Generator が実装で参照する。

| ゲーム | v1.1.2 後の選択肢タイプ | marks 生成ロジック | ◯/✕ 重畳位置 |
|---|---|---|---|
| **G-01 変化察知**（複数選択） | 9〜25 個のセル（ImageChoiceCell） | 「変化していたパッチ」全件に `correctChosen` or `correctMissed`、「ユーザーが選んだが変化していなかったパッチ」に `wrongChosen` | 各セル中央 |
| **G-02 左右並び傾き判別**（v1.1.1 直接選択） | 左右 2 ガボール（`ImageChoiceCell` × 2） | 出題方向（時計回り or 反時計回り）に該当する側に `correctChosen`、誤選択側に `wrongChosen` | パッチ中央 |
| **G-03 周辺視野ハント**（v1.1.2 直接選択） | 円周 8 ガボール（`ImageChoiceCell` × 8） | 8 個のパッチを `data-target-id` で識別（`g03-pos-12` etc.）。odd one 位置に `correctChosen`、誤選択位置に `wrongChosen` | **円周上のガボールパッチ中央**（v1.1.1 では時計ボタン上だったが、v1.1.2 で直接選択化に伴いパッチ中央へ） |
| **G-04 コントラスト弁別** / G-05 / G-06（v1.1.2 直接選択） | 左右 2 ガボール（`ImageChoiceCell` × 2） | 高コントラスト／高 cpd／大 SD 側のパッチに `correctChosen`、誤選択側に `wrongChosen` | **パッチ中央**（v1.1.1 では horizontal-2 ボタン上だったが、v1.1.2 で直接選択化に伴いパッチ中央へ） |
| **G-07 エッジ検出**（複数選択） | 16 個のセル（ImageChoiceCell） | 「線を構成する 3 個」全件に `correctChosen` or `correctMissed`、「ユーザーが選んだが線でない 13 個」のうち選択されたものに `wrongChosen` | 各セル中央 |
| **G-08 残像方位弁別**（v1.1.1 直接選択） | 下部左右 2 テストパッチ（`ImageChoiceCell` × 2、adapter は disabled） | 出題方向に該当する下部パッチに `correctChosen`、誤選択側に `wrongChosen`。adapter（上）にはマークを置かない | パッチ中央 |
| **G-09 側方マスキング**（v1.1.2 ボタン維持、案 B） | horizontal-2 ボタン（`AnswerChoiceGroup`、target 直下に空間配置） | 正解側ボタン（縦寄り or 横寄り）に `correctChosen`、誤選択側に `wrongChosen` | **ボタン中央**（直接選択困難なゲーム例外） |
| **G-10 テクスチャ分離**（v1.1.2 直接選択、案 A） | 4 象限（`ImageChoiceCell` × 4、各象限が 4×4 = 16 ガボールを内包） | 正解象限に `correctChosen`、誤選択象限に `wrongChosen` | **象限の中央**（grid 上の象限領域中央。v1.1.1 では grid-4 ボタン中央だったが、v1.1.2 で象限直接化に伴い grid 上へ） |
| **G-11 Vernier 整列判定**（v1.1.2 直接選択、案 A） | 下部左右 2 テストパッチ（`ImageChoiceCell` × 2、reference は disabled） | 正解側のテストパッチ（reference に対するズレ方向）に `correctChosen`、誤選択側に `wrongChosen`。reference（上）にはマークを置かない | パッチ中央 |
| **G-12 クラウディング**（v1.1.2 ボタン維持、案 B） | horizontal-4 ボタン（`AnswerChoiceGroup`、target 直下に空間配置） | 正解向きアイコンボタンに `correctChosen`、誤選択アイコンに `wrongChosen` | **ボタン中央**（注視を target から逸らさない target 直下配置） |
| **G-13 数字探し**（v1.1.2 ボタン維持、案 B） | 0〜9 のキーパッド（`NumericKeypadChoice`、刺激画像直下に空間対応配置） | 正解数字キーに `correctChosen`、誤選択数字キーに `wrongChosen`。10 個全部にマークが乗ることはなく、最大 2 個（正解 + ユーザー誤選択 1 個） | **キーパッドのキー上** |

> **v1.1.2 規範**：◯ / ✕ は「ユーザーが操作した対象」の上に重畳されるべきで、刺激領域の任意の場所に飛び散らせない。これにより「自分が選んだ場所と結果が空間的に対応する」ユーザー体験を担保する。
> v1.1.1 で「G-03 / G-10 は刺激領域とボタン領域が空間的に分かれるゲーム」として例外扱いしていたが、**v1.1.2 で G-03 / G-10 は直接選択化された**ため例外でなくなった。残る例外は **G-09 / G-12 / G-13** の 3 ゲーム（Designer 判断でボタン UI を維持。ボタンを刺激領域直下に空間対応配置することで重畳の一貫性を保つ）。

### 単数選択ゲームの `correctMissed` 不使用ポリシー（v1.1.1 から継続）
- 単数選択ゲーム（G-02 / G-03 / G-04 / G-05 / G-06 / G-08 / G-09 / G-10 / G-11 / G-12 / G-13）では「正解で選ばれなかった」状態は実質「正解 = ◯」表示で十分なため、**`correctMissed`（薄 ◯）ではなく `correctChosen` 同等の通常 ◯ を採用**する
- `correctMissed`（薄 ◯）は複数選択ゲーム G-01 / G-07 のみで使用（取りこぼし表現）
