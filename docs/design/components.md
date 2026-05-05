# GaborEye V1 — コンポーネントカタログ

`system.md` のトークンに従う再利用可能コンポーネント群です。各コンポーネントには **API（props）／状態／a11y 要件／使用例** を併記します。Generator はこの API シグネチャに従って実装してください。

---

## 0. 命名・分類

- **基本コンポーネント**：Button / IconButton / Card / ListItem / Modal / Sheet / Toggle / Slider / Checkbox / TextField / Tag
- **領域コンポーネント**：DistanceCalibrator / DistanceReminder / DisclaimerSheet
- **ゲーム描画コンポーネント**：GaborPatch / GaborGrid / GaborWithMask / PeripheralLayout / FixationCross
- **進捗系コンポーネント**：V1ScoreChart / WeeklyGraph / StreakBadge / AchievementBadge / DailyBest / ResultSummary / CountdownDisplay
- **状態系コンポーネント**：EmptyState / LoadingState / ConfirmDialog

---

## 1. Button

### 1.1 API
```ts
type ButtonProps = {
  variant: "primary" | "secondary" | "tertiary" | "destructive";
  size: "lg" | "md";        // lg=64px, md=56px（最低）
  label: string;             // 24px (=18pt) 以上、変更不可（OPT-1）
  iconLeading?: IconName;
  iconTrailing?: IconName;
  fullWidth?: boolean;       // スマホで 100%、PC で max-content
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
  ariaLabel?: string;        // 通常 label と同一、アイコンのみの時必須
  testId?: string;
};
```

### 1.2 仕様
| variant | 用途 | 背景 | 文字 | 枠 |
|---|---|---|---|---|
| primary | 主要 CTA（「3 分コースを始める」「同意する」） | `color.action.primary` | `color.fg.onPrimary` | なし |
| secondary | 補助（「もう一度」「キャンセル」） | `color.action.secondary` | `color.fg.primary` | `1px color.border.default` |
| tertiary | 弱い補助（「あとで」「スキップ」 ※ただしスキップは原則禁止） | 透明 | `color.brand.primary` | なし、下線 |
| destructive | 全データ削除など | `palette.semantic.error` | `color.fg.onPrimary` | なし |

### 1.3 寸法
| size | minHeight | padding-x | font | radius |
|---|---|---|---|---|
| lg | 64px | `space.5`（24） | `font.body.lg`（**26px** Medium） | `radius.lg` |
| md | 56px | `space.4`（16） | `font.body`（**24px** Medium、OPT-1 床） | `radius.md` |

> Round 3：font.body / font.body.lg を spec.md OPT-1（18pt = 24px）に合わせて引き上げ。これに伴い minHeight も lg=64 / md=56 に増やしてバランス維持。タップ領域 OPT-2（48pt）も同時に確保。

### 1.4 状態
- default / hover / pressed / disabled / focus-visible / loading
- focus: 3px outline `color.focus.ring` + 2px offset
- pressed: `transform: scale(0.98)`、背景 1 段濃く
- loading: ラベルを保持しつつ右側に小スピナー、操作不可

### 1.5 a11y
- ラベルは可視テキスト前提。アイコンのみ Button は禁止（IconButton を使うこと）
- `role="button"` 暗黙
- Enter / Space で起動

### 1.6 使用禁止
- 1 画面に primary を 2 個以上並べない（OPT-3）
- **24px（=18pt）未満のフォント・56px 未満の minHeight は不可**（OPT-1 / OPT-2）

---

## 2. IconButton

### 2.1 API
```ts
type IconButtonProps = {
  icon: IconName;
  ariaLabel: string;        // 必須
  size: "lg" | "md";        // lg=56pt 内 32px icon, md=48pt 内 24px icon
  variant: "ghost" | "filled";
  onPress: () => void;
};
```

### 2.2 用途
- 設定画面遷移、戻る、閉じる、情報（i）
- ヒットテリア（タップ領域）は `size` の数値、アイコン自体は中に置かれる

---

## 3. Card

### 3.1 API
```ts
type CardProps = {
  variant: "elevated" | "outlined" | "filled";
  padding?: "none" | "sm" | "md" | "lg";
  pressable?: boolean;       // タップ可能化
  onPress?: () => void;
  ariaLabel?: string;
};
```

### 3.2 仕様
| variant | 背景 | 枠 | 影 |
|---|---|---|---|
| elevated | `color.bg.surface` | なし | `elevation.2` |
| outlined | `color.bg.surface` | `1px color.border.default` | none |
| filled | `color.bg.canvas` | なし | none |

- pressable=true の場合、Card 全体がタップターゲット。最小 80px の高さを確保。
- 角丸 `radius.md`（12px）
- focus 時は外枠 3px の focus.ring

### 3.3 用途例
- 単体ゲーム選択カード（ホーム）
- 結果サマリの数値ブロック
- バッジ一覧の各バッジ

---

## 4. ListItem

### 4.1 API
```ts
type ListItemProps = {
  title: string;             // 24px（=18pt、OPT-1 床）
  subtitle?: string;         // 20px（caption 扱い、補足のみ）
  iconLeading?: IconName;
  trailing?: "chevron" | "toggle" | "checkmark" | "value" | "none";
  trailingValue?: string;    // trailing="value" 時の表示文字列
  toggleValue?: boolean;     // trailing="toggle" 時
  onPress?: () => void;
  onToggleChange?: (v: boolean) => void;
  destructive?: boolean;     // 赤系統
};
```

### 4.2 仕様
- minHeight **72px**（OPT-2、本文 24px + 補足 20px が収まる高さ）
- padding 16px x、16px y
- divider は下罫線 1px `color.border.default`
- title は **24px（=18pt、OPT-1 床）**、subtitle は **20px**（caption 扱い：補足のみ。設定画面の「ハプティクス」のような副情報限定）
- chevron はサイズ 24px、`color.fg.muted`

### 4.3 用途
- 設定画面の各項目
- 視聴距離プリセット選択（trailing="checkmark"）

---

## 5. Modal / Sheet / ConfirmDialog

### 5.1 Modal API
```ts
type ModalProps = {
  isOpen: boolean;
  title: string;             // h3 = 26px (=19.5pt)
  onRequestClose: () => void;
  primaryAction?: { label: string; onPress: () => void; destructive?: boolean };
  secondaryAction?: { label: string; onPress: () => void };
  dismissOnBackdrop?: boolean; // 既定 false（誤操作防止）
  children: ReactNode;        // 本文 (font.body = 24px)
};
```

### 5.2 仕様
- 中央配置、最大幅 480px、`radius.lg`、`elevation.4`
- 背景にオーバーレイ `rgba(0,0,0,0.5)`（ダーク時は同）
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby={titleId}`
- 開時：最初のインタラクティブ要素にフォーカス
- Esc / 背景タップで閉じる（dismissOnBackdrop=true 時のみ）
- 閉じた時：起動元要素にフォーカスを戻す

### 5.3 ConfirmDialog
- Modal を継承し、固定レイアウト：タイトル、本文、Cancel / Confirm の 2 ボタン
- 破壊的操作（全データ削除）では Confirm が destructive variant
- 全データ削除は **2 段階確認**：1 段目「全データ削除」ボタン → 2 段目「削除」と入力するチェック付き Modal
  - 入力欄付きの ConfirmDialog 派生：「削除」と入力した場合のみ Confirm が有効化

### 5.4 Sheet（下からせり出す）
- スマホ専用。PC では Modal にフォールバック
- `radius.xl` 上端のみ
- ハンドルバー（grab handle）48×4px を上端中央に配置
- スワイプダウンで閉じる（dismissible 時のみ）

---

## 6. Toggle（Switch）

```ts
type ToggleProps = {
  value: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
  disabled?: boolean;
};
```

- サイズ：48×28px、内部つまみ 24×24px
- ON 時：背景 `color.action.primary`、つまみ右
- OFF 時：背景 `palette.neutral.300`（light）、つまみ左
- 状態を ON / OFF テキストでも併記（ListItem 内で「効果音」「ON」のように trailing="value" を組合せ）。テキストは `font.body`（24px）以上で描画

---

## 7. Slider（DistanceCalibrator 専用ノッチ式）

ノッチ式（離散値）であり、フリーフォームの連続スライダーは使わない。

```ts
type SliderProps = {
  values: number[];                   // [30, 40, 50]
  selectedIndex: number;
  onChange: (idx: number) => void;
  labelOf: (v: number) => string;     // "30 cm" など
};
```

- 各ノッチ位置にラベル（**font.h3 = 26px** Medium）
- 現在値はノッチ上に大きい青丸（直径 32px）
- タップ／ドラッグ／矢印キーで切り替え
- 視覚的に「ノッチ間にしか止まらない」ことを示す（snap 仕様）

---

## 8. Checkbox

```ts
type CheckboxProps = {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  ariaLabel?: string;
  required?: boolean;
};
```

- サイズ 32×32px（OPT-2 を意識し他より大きめ）
- ラベルは **24px（=18pt、OPT-1 床）**、チェック箱との間 12px
- ラベル全体がタップ領域（minHeight 56px 確保）

---

## 9. TextField

```ts
type TextFieldProps = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  label: string;
  helperText?: string;
  error?: string;
  inputMode?: "text" | "numeric";
};
```

- 入力欄 minHeight 56px
- ラベルは入力欄の上、**24px Medium（=18pt、OPT-1 床）**
- 入力フォントサイズ **24px**（モバイルブラウザの自動ズーム回避閾値 16px を大きく上回る）

> 本プロダクトでは TextField はほぼ使わない（設定にテキスト入力なし）。例外：全データ削除確認の「削除」入力。

---

## 10. Tag

```ts
type TagProps = {
  label: string;
  variant: "neutral" | "success" | "warning" | "info";
  size: "sm" | "md";
};
```

- バッジ・状態タグ（「単体」「コース」「初回」など）
- `radius.pill`、padding 6px 14px
- 主要動線では `font.body`（24px）。装飾用途のみ `font.caption`（20px）も許容

---

## 11. DistanceCalibrator

視聴距離設定の合成コンポーネント（F-03 / OPT-4）。

```ts
type DistanceCalibratorProps = {
  value: 30 | 40 | 50;
  onChange: (v: 30 | 40 | 50) => void;
  showPreview?: boolean;       // ガボールサンプル表示
};
```

### 構成
- 上：「画面から ◯◯ cm 離れて使ってください」（**font.h3 26px** Medium）
- 中：人と画面のイラスト（distance-30/40/50cm.svg を value に応じて切替）
- 下：3 ノッチ Slider（30/40/50）
- showPreview 時：選択値で計算したガボールパッチ 1 枚を中央に提示（cpd=3, contrast=0.4 の代表値）
- 補助テキスト：「老眼の読書距離標準は 40cm です」（**font.body 24px**、画面の主要動線なので caption ではなく body を使用）

### a11y
- Slider のロール `slider`、`aria-valuenow`、`aria-valuemin=30`、`aria-valuemax=50`、`aria-valuetext="40 センチメートル"`

---

## 12. DistanceReminder

ゲーム／コース開始前に必ず挟む距離確認画面（OPT-10）。

```ts
type DistanceReminderProps = {
  distanceCm: 30 | 40 | 50;
  oneEyeGuidance?: "off" | "left" | "right" | "alternate";
  onProceed: () => void;
  onChangeDistance: () => void;  // タップで Calibrator へ
};
```

### レイアウト
- 上：「画面から **◯◯ cm** 離れてください」（**font.h1 = 36px**）
- 中：イラスト（人と画面、固定。アニメ無し）
- 中下：片眼ガイダンス ON 時のみ「**右目（または左目）を手で覆ってください**」（**font.h3 = 26px**）＋ eye-cover.svg
- 下：「準備ができました」プライマリボタン（lg、64px 高、ラベル font.body.lg = 26px）
- 下端：「距離を変える」tertiary（小さめだがラベルは **font.body 24px**、誤タップ低減のため画面端から離す）

### a11y
- 主要メッセージは `aria-live="polite"`（画面遷移直後の読み上げ）
- 自動進行なし（OPT-7）

---

## 13. DisclaimerSheet

免責事項表示（F-02）。

```ts
type DisclaimerSheetProps = {
  mode: "onboarding" | "review";   // onboarding 時のみ「同意する」必要
  onAgree?: () => void;             // mode=onboarding 必須
  onClose?: () => void;             // mode=review 必須
};
```

### 構成
- スクロール可能本文（spec.md §10.3 の文言全文、**font.body 24px** 行間 1.6）
- 警告対象者リストは赤系セマンティックトークンで強調（背景 `color.bg.disclaimer`、border-left 4px error 色）
- 下部：mode=onboarding なら「上記に同意します」Checkbox（必須）→ 「同意する」Button（チェック前は disabled）
- mode=review なら「閉じる」Button のみ
- スクロールが下端まで到達するまで「同意する」を有効化しない（強制読み）

---

## 14. GaborPatch（描画基盤コンポーネント）

`system.md §14` の API 規範に従う。1 枚のガボール刺激を描画する基本コンポーネント。

```ts
type GaborPatchProps = {
  cpd: 1.5 | 3 | 6 | 9;
  contrast: number;          // 0.15〜0.6
  orientationDeg: number;    // 0〜180
  phaseRad: number;          // 0〜2π
  sigmaDeg: number;          // 0.3〜1.0（ガウス窓 SD、視野角）
  sizePx: number;            // 描画キャンバス辺長
  pixelDensity: number;      // dpr 補正用
  viewingDistanceCm: 30 | 40 | 50;
  ariaLabel?: string;        // 既定「縞模様の刺激」
  testId?: string;
  // モーフィング用拡張（Game 1 で使用）
  morphTo?: { orientationDeg?: number; durationMs?: number };
  // 選択状態（Game 1 で使用）
  selected?: boolean;        // 選択中の枠表示
  highlighted?: boolean;     // 正解ハイライト時
  onPress?: () => void;      // Game 1 用
};
```

### 描画エンジン
- 既定は Canvas2D（実装容易）。NF-1（60fps）達成困難なら WebGL/Skia に切替えるが、API は同一。
- ピクセル走査ループはオフスクリーン Canvas にキャッシュし、`drawImage` で本体 Canvas に貼る
- `pixelDensity` を反映して dpr 倍の解像度で描画

### サイズ計算（疑似コード）
```
cyclesPerCm = cpd * (1 / (distanceCm * tan(1°)))   // 概算
// 実装は spec.md §6.2 の式に従う
sigmaPx = sigmaDeg * pixelsPerDegree(distanceCm, dpr)
```

### 状態
| 状態 | 視覚 |
|---|---|
| default | パッチのみ |
| selected | 黄色（`color.highlight.correct`）4px 枠 |
| highlighted | 黄色枠＋ 1.5 秒間 scale(1 → 1.18 → 1) |
| morphing | orientationDeg を線形補間で morphTo に推移 |

### a11y
- パッチ自体の SR ラベル：「縞模様 N 番目（角度 ◯◯ 度）」
- 装飾ガボール（マスク、Game 2/3 の通常パッチ）は `aria-hidden="true"`

---

## 15. GaborGrid（Game 1 用）

3×3〜5×5 のグリッドにガボールを並べるレイアウトコンポーネント。

```ts
type GaborGridProps = {
  rows: 3 | 4 | 5;
  cols: 3 | 4 | 5;
  patches: Array<{
    id: string;
    orientationDeg: number;
    contrast: number;
    cpd: 1.5 | 3 | 6 | 9;
    sigmaDeg: number;
    morphTargetOrientation?: number;
    isChanging: boolean;     // 変化対象パッチかどうか（採点用）
  }>;
  selectedIds: string[];
  onTogglePatch: (id: string) => void;
  highlightChangingIds?: string[];   // 採点後に正解ハイライト
  durationMs: number;                // 60000（モーフィング所要）
  paused: boolean;                   // 採点後など停止
};
```

- 各セル内は `GaborPatch` を 1 枚配置
- セル間ギャップ `space.4`（16px）。各セルのタップ領域は 48pt 以上
- セル全体がタップ可能、選択状態は黄色 4px 枠
- 採点後 `highlightChangingIds` で正解パッチを 1.5 秒拡大ハイライト

### レスポンシブ
- スマホ縦：grid 全体辺 = `min(viewport.width - 32, 360)`
- PC：grid 全体辺 = `min(viewport.width - 96, 480)`
- 5×5 でも各セルが 48pt 以上を保つよう、必要なら全体サイズを優先

---

## 16. GaborWithMask（Game 2 用）

提示 → マスク → 提示 → 回答 の状態機を内蔵。

```ts
type GaborWithMaskProps = {
  patchA: GaborPatchProps;
  patchB: GaborPatchProps;
  maskDurationMs: 200;
  patchADurationMs: 1000;
  patchBDurationMs: 1000;
  fixationDurationMs: 500;
  onPhaseChange: (phase: "fixation" | "patchA" | "mask" | "patchB" | "answer") => void;
  onComplete: () => void;
};
```

- 内部状態：`fixation → patchA → mask → patchB → answer`
- 各フェーズの遷移はタイマー駆動（マスクは正確に 200ms）
- マスクは `palette.gabor.mask`：高コントラスト 0.8 のランダム向きガボールを A・B と同位置に表示
- 全フェーズ通じてガボール領域の枠（`gabor.frame.padding=24`）は維持し、知覚位置を安定化
- a11y：`aria-live="polite"` で各フェーズを「縞模様 1 枚目です」「マスクです」等を読み上げ（過剰なら設定で抑制可）

---

## 17. PeripheralLayout（Game 3 用）

固視点中心の円周配置レイアウト。

```ts
type PeripheralLayoutProps = {
  fixation: { sizeDeg: 0.5; color: "auto" };  // auto = グレー上で黒
  eccentricityDeg: 6 | 8 | 10;                 // staircase 連動
  patches: Array<GaborPatchProps & { positionIndex: 0..7 }>; // 8 個
  showMask: boolean;
  presentationDurationMs: number;             // 300〜800
  onTimeoutToMask: () => void;
};
```

- 8 ポジションは時計の 12 / 1.5 / 3 / 4.5 / 6 / 7.5 / 9 / 10.5 時に対応
- 各位置は中心からの離心角（視野角 → ピクセル換算）に従う
- マスク提示時は全 8 位置を高コントラスト・ランダム向きガボールで覆う

---

## 18. FixationCross

固視点（十字）コンポーネント。サイズ 0.5° 視野角に応じた px 換算。

```ts
type FixationCrossProps = {
  sizeDeg: 0.5;
  color: "black" | "white" | "auto";
  ariaHidden?: true;
};
```

- 横線・縦線各 2px、長さは sizeDeg をピクセルに換算
- 「auto」はグレー背景上で常に黒固定（仕様統一のため）

---

## 19. ClockAnswerButtons（Game 3 回答 UI）

8 個の時計方向ボタンを文字盤型に配置。

```ts
type ClockAnswerButtonsProps = {
  positions: Array<"12" | "1.5" | "3" | "4.5" | "6" | "7.5" | "9" | "10.5">;
  disabled?: boolean;
  onSelect: (pos: string) => void;
  highlightCorrect?: string;        // 正解側を矢印で 0.8 秒提示
};
```

- 各ボタン **72×72px**（OPT-2 タップ領域確保＋ 24px ラベル収容のため）、`radius.circle`
- ラベルフォントサイズ **最小 24px（=18pt、OPT-1 床）**、weight Medium (600)、`tabular-nums`
  - 「1:30」「4:30」「7:30」「10:30」のような長いラベルでも 24px 維持。ボタン径 72px 内で収まる（実測：「10:30」を 24px Medium で描画して幅 ≒ 56px、両端 8px パディング込で 72px 内）
- レイアウト：CSS で計算位置に絶対配置（円周上）
- ラベルは数字（「12」「1:30」「3」「4:30」「6」「7:30」「9」「10:30」と表記）
- a11y：`aria-label="時計の N 時の方向"`
- スマホ縦では円の直径 = `min(viewport.width - 32, 320)`、PC では 360px 直径
  - スマホ 360px 幅では円直径 = 320px、各ボタン 72px が円周上に重ならず配置できる（隣接ボタン中心間の距離 = 320 × sin(22.5°) ≒ 122px、ボタン半径 36px × 2 = 72px なので余裕 50px）

### Round 3 注記
- 旧仕様の 56×56px / 16px ラベルは OPT-1 / OPT-2 違反だったため修正。Generator は本仕様の 72×72px / 24px ラベルで実装すること。

---

## 20. CountdownDisplay

カウントダウン表示（クールダウン F-16、ゲーム残り時間など）。

```ts
type CountdownDisplayProps = {
  totalSeconds: number;
  remainingSeconds: number;
  size: "lg" | "md";          // lg=display 72px, md=h2 30px
  showProgress?: boolean;     // 円形プログレス
  ariaLabelPrefix?: string;   // "残り" など
};
```

- 数字は `font.numeric.xl`（lg = 72px）または `font.h2`（md = 30px、tabular-nums）
- 円形プログレスは外周のみ、塗り `color.brand.primary`
- `aria-live="polite"`、1 秒ごとに更新（スパム回避のため 5 秒以下は polite、6 秒以上は off）
- **点滅・色フラッシュは禁止**（OPT-9 / NF-11）

---

## 21. ResultSummary

1 ゲーム終了後の結果サマリ画面。

```ts
type ResultSummaryProps = {
  gameId: "game1" | "game2" | "game3";
  metrics: {
    primary: { label: string; value: string; unit?: string };  // 例：閾値 4.2 度
    secondary?: { label: string; value: string }[];            // 正答率／試行数
  };
  diff?: { value: string; direction: "up" | "down" | "flat" }; // 前回比
  onNext: () => void;          // 次へボタン
  badgeAwarded?: BadgeId;      // 獲得バッジがあれば
};
```

### レイアウト
- 上部：ゲーム名（**font.h2 = 30px**）と「結果」見出し（**font.h3 = 26px**）
- 中央：primary メトリクス（**`font.numeric.l` = 48px**）＋ ラベル（font.body 24px）
- 中下：secondary メトリクスを 2 列で並べる、値は **font.h2 30px Bold**（数値強調のため、`metric-card .value`）、ラベルは font.body 24px
- diff：「前回より 0.3 度改善」をテキスト本体は `color.fg.primary` の **font.body.bold 24px**、矢印アイコンと装飾の色のみ `palette.semantic.success` で表示（§1.4 制約：success 色は装飾用）
- バッジ獲得時：1.5 秒の獲得演出（拡大、点滅なし）→ 演出後はバッジを画面上部にアイコン表示
- 下：「次へ」プライマリボタン（lg、64px 高、ラベル 26px）

### a11y
- 自動進行しない（OPT-7）
- SR：「Game 2 結果。閾値 4.2 度。前回より 0.3 度改善しました。次へボタン」

---

## 22. V1ScoreChart（折れ線グラフ）

```ts
type V1ScoreChartProps = {
  data: Array<{ date: string; score: number | null }>;  // 28 日分
  todayDate: string;
};
```

- X 軸：日付（M/D）、ラベルは 4 日おき
- Y 軸：0〜100、目盛 0/25/50/75/100
- 軸ラベルは **font.body 24px**（OPT-1 床、グラフ凡例は補助だが軸ラベルは主要情報のため body）
- 線：`color.score.line`、ストローク 3px
- 当日点：半径 10px、色 `color.score.point.today`
- データ欠損は線を切る
- 7 日未満：データを薄く（opacity 0.4）＋ 中央に「もう少しデータが集まると傾向が見えます」をオーバーレイ
- 0 日：「まずは 1 セッション完了させましょう」（CTA：3 分コースを始める）
- a11y：`role="img"`, `aria-label="V1 スコアの過去 28 日推移、現在 ◯◯ 点"`、テーブル代替を `aria-describedby` で読める
- 同一画面に「データ表示」ボタン → ListItem 形式で日次値を読み上げ可能（SR 用）

---

## 23. WeeklyGraph

V1ScoreChart のラッパー（タブで「グラフ」「日次ベスト」を切替）。

```ts
type WeeklyGraphProps = {
  scoreData: V1ScoreChartProps["data"];
  dailyBests: Array<{ date: string; game1: number | null; game2: number | null; game3: number | null }>;
  initialTab?: "score" | "best";
};
```

- タブは 2 つ（**56px 高**、`font.body.lg` = 26px）
- アクティブタブは下線 4px brand.primary

---

## 24. StreakBadge

ストリーク表示（F-13）。

```ts
type StreakBadgeProps = {
  currentStreak: number;
  longestStreak?: number;
  resetWarning?: boolean;       // 当日 22 時以降未完了時 true
};
```

- 炎アイコン（flame.svg）+ 数値（**`font.numeric.l` = 48px**）+「日連続」（font.body 24px）
- 炎アイコン色は `color.streak.flame`（light: `#7A3C00`, 8.49:1。dark: `#FFB266`, 10.09:1）。バッジ全体の背景に薄い装飾を入れる場合は `color.streak.flame.bg`（light: `#FFE9D6`, dark: `#3E2D0A`）を使用、本文テキストは `color.fg.primary` で描画
- resetWarning 時：警告色背景（`palette.semantic.warning` の薄塗り）＋「今日終わるとリセットされます」（font.body 24px、`color.fg.primary`）
- 0 日時：「コースを始めて、連続記録をスタート」
- a11y：「現在 23 日連続。最長 30 日」

---

## 25. AchievementBadge

達成バッジ表示（F-14）。

```ts
type AchievementBadgeProps = {
  badgeId: BadgeId;
  earned: boolean;
  earnedAt?: string;
  onPress?: () => void;          // 詳細表示
};
```

- 80×80px のバッジアイコン（badges/b-XX-*.svg）
- 未獲得：グレースケール＋ 半透明（opacity 0.5）
- 獲得：色付き、下に獲得日（`font.caption` 20px、装飾扱いの補助情報のため許容）
- 獲得演出：1.5 秒の scale-up（点滅なし）

### バッジ一覧グリッド
- スマホ：2 列、PC：4 列
- 各バッジはタップで詳細モーダル：名称・獲得条件・獲得日（または「未獲得：◯◯すると獲得」）

---

## 26. DailyBest

日次ベスト表示（F-13）。

```ts
type DailyBestProps = {
  date: string;
  game1Best?: number;            // 角度差（°）
  game2Best?: number;
  game3Best?: number;
};
```

- 各ゲームの今日のベスト閾値を 3 列カードで表示
- 値が無い場合は「—」表示

---

## 27. GameStatusBar（試行中の上部バー）

ゲーム中の状態表示（残り時間／試行数）を最小限に。

```ts
type GameStatusBarProps = {
  remainingSeconds: number;
  trialIndex?: number;
  totalTrials?: number;
  onAbort: () => void;            // ×ボタン → 中断確認
};
```

- 上部高さ **64px**（24px 数値が収まる高さに調整）
- 左：×アイコン（48pt タップ領域、IconButton lg）
- 中：残り秒（**`font.h2` = 30px** Bold tabular-nums。OPT-7 「タイムアウト表示は 22pt 以上」適合）
- 右：「N / M 試行」（**`font.body` = 24px**、Game 1 では非表示）
- 試行中の正誤は表示しない（spec.md §7.1〜§7.3）

---

## 28. ConfirmDialog（中断確認）

```ts
type AbortConfirmDialogProps = {
  isOpen: boolean;
  onContinue: () => void;
  onAbort: () => void;
};
```

- タイトル：「コースを中断しますか？」
- 本文：「ここまでの記録は未完了として保存されます」
- ボタン：「続ける（プライマリ）」「中断する（セカンダリ）」
  - 続けるをプライマリにすることで、誤タップで離脱しにくくする

---

## 29. EmptyState

```ts
type EmptyStateProps = {
  illustration?: IconName;
  title: string;
  description?: string;
  primaryAction?: { label: string; onPress: () => void };
};
```

- 中央配置、padding `space.7`
- title **font.h3 = 26px**、description **font.body = 24px**

---

## 30. LoadingState

- スピナー（24px、ストローク 3px、`color.brand.primary`、無限回転 1200ms linear）
- ラベル「読み込み中…」（**font.body = 24px**）
- 全画面ローディングは原則使わない（オフラインアプリのため）

---

## 31. AccessibilityHelpers（横断要件）

### Skip Link（Web のみ）
- Tab で最初に表示される「メインへ移動」リンク
- **font.body 24px**、focus 時のみ可視化

### LiveRegion
- カウントダウン・結果通知用の `aria-live` 領域
- 「polite」「assertive」を使い分け（assertive は結果ハイライト時のみ）

### KeyboardShortcuts（Web）
- Esc：モーダル閉じる、ゲーム中断確認
- Enter / Space：プライマリ操作
- Tab / Shift+Tab：標準
- 矢印キー：GaborGrid（Game 1）でセル間移動

---

## 32. 状態マトリクス（横断）

全インタラクティブ要素は以下の状態を必ず持ち、トークンに従って差別化：

| 状態 | 視覚処理 |
|---|---|
| default | トークン値そのまま |
| hover (PC) | 背景 -10〜+10% 輝度 |
| pressed | scale(0.98) + 背景 -20% |
| disabled | opacity 0.5、cursor not-allowed |
| focus-visible | 3px outline `color.focus.ring` + 2px offset |
| loading | spinner overlay、操作不可 |
| error | border `palette.semantic.error`、aria-invalid="true" |

---

## 33. 使用するアイコン一覧

```
home, settings, close, back, info-circle, eye, eye-cover-left, eye-cover-right,
chart-line, badge-medal, flame, check, check-circle, alert-triangle,
distance-30, distance-40, distance-50, clock, target-crosshair, refresh, trash,
play-arrow, pause, sun (light mode), moon (dark mode), system (system mode),
volume-on, volume-off, vibration-on, vibration-off, ear (片眼)
```

すべて 24px 基準で 16/20/24/32/48 の 5 サイズ。ストローク 2px、`currentColor` で塗り変更。

---

## 34. Generator 実装ガイド

- すべてのコンポーネントは TypeScript の strict モードで型完備
- ストーリーブック相当のテストコンポーネント表示は `src/playground/` ディレクトリに配置（任意）
- ガボール系コンポーネントは Vitest で「特定 props で正しい正弦波周期画素数になる」を unit test
- React Native + react-native-web 互換のため、`Pressable` をベースに `Button` を組む（Web では HTML `<button>` を出力）
