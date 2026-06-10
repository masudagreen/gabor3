# Sprint 2 — レベルシステム中核（画面なし・状態モデル設計）

> 対象：spec §8 S2 / §4（レベルシステム）・F-04（レベル昇降ロジック）。
> **このスプリントは UI を作らない**（純ロジック層）。レベル番号 ⇄ 5 変数（mixed-radix オドメータ）の相互変換、デフォルト変化順の梯子生成、クリア/失敗からのレベル増減が純ロジックとして動く。
> 本書は「ロジックが満たすべき観察可能な状態」と「後続 UI（S5/S7）が参照する状態モデル」を固める。

---

## 1. レベル ⇄ 5 変数の相互変換（mixed-radix、spec §4.2）

- **変数と段数（spec §4.1）**：count(4) / seconds(5) / direction(2) / gridSize(2) / rotationSpeed(9)。
- **デフォルト変化順（最内側 → 最外側）**：count → seconds → direction → gridSize → rotationSpeed。
- **オドメータ規約**：レベル L（1 始まり）→ 0 始まりインデックス (L−1) を mixed-radix 展開。最内側（count）が radix 4 の最下位桁、最外側（rotationSpeed）が最上位桁。
  - 各変数は「易 → 難」順の値配列を持つ（count=[1,2,3,4], seconds=[40,35,30,25,20], direction=[一方向,振動], gridSize=[3x3,4x4], rotationSpeed=[6,5.5,5,4.5,4,3.5,3,2.5,2]）。桁の値 = 配列のインデックス。
- **総レベル数**：各段数の積（デフォルト 4×5×2×2×9 = **720**）。
- **境界例（spec §4.2、デフォルト梯子）**：
  - L1 = (count1, sec40, 一方向, 3x3, 速6)（全最易）
  - L2 = (count2, sec40, 一方向, 3x3, 速6)
  - L4 = (count4, sec40, …) → L5 = (count1, sec35, …)（count 桁上がり）
  - L20 = (count4, sec20, 一方向, 3x3, 速6) → L21 = (count1, sec40, 振動, 3x3, 速6)（seconds 桁上がり → direction 1 段）
  - L720 = (count4, sec20, 振動, 4x4, 速2)（全最難）

> これらは Generator が単体テストで多数検証する境界（L1/L2/L4/L5/L20/L21/L720、桁上がり連鎖）。本書はデザイン観点で「UI が表示するのはレベル番号と count（個数）だけ」を確認する（speed/direction の値は数値表示しない、F-03）。

---

## 2. レベル増減ロジック（spec §4.4、F-04）

観察可能な状態遷移（UI は S5 結果開示 / S7 ホーム結果が参照）：

```
[ゲーム結果確定]
  クリア → consecutiveFailures = 0
         → currentLevel = min(currentLevel + 1, 総レベル数)   ← levelDelta = +1（クランプ時 0）
         → highestLevel = max(highestLevel, クリアしたレベル)
  失敗   → consecutiveFailures += 1
         → if consecutiveFailures >= 2:
              currentLevel = max(currentLevel - 1, 1)         ← levelDelta = -1（L1 でクランプ時 0）
              consecutiveFailures = 0
            else:
              levelDelta = 0（変化なし）
  中断   → 何も変えない（levelDelta は存在しない、記録しない）
```

- **levelDelta（UI 告知用、`GameRecord.levelDelta` に記録）**：+1 / 0 / −1。クランプで実際に動かなかった場合は 0。
- **連続失敗カウントは永続**（`LevelState.consecutiveFailures`、アプリ再起動・日跨ぎで保持）。クリア or レベルダウン発火で 0 リセット。
- **クランプ**：上限（総レベル数）でクリアしても +1 されない（levelDelta=0）。L1 で失敗 2 連続でも −1 されない（levelDelta=0）。
- **UI への波及**：
  - 結果開示（S5）：その場の判定（クリア/失敗）を表示。
  - ホーム結果（S7）：`LD-1 LevelDeltaIndicator` で +1/±0/−1 を告知（color+矢印形+テキスト）。`LB-1 LevelBadge large` で増減反映後の currentLevel を表示。
  - 次ゲームの上部バー（S5/GB-1）：変化後 currentLevel を `LB-1 inline` で表示 → 「次ゲームのレベル表示変化」として F-04 受け入れ基準を満たす。

---

## 3. 状態モデル（後続 UI が参照、spec §7）
- `LevelState { currentLevel, consecutiveFailures, highestLevel }`（1 レコード）。
- ゲーム実行時メモリ：現在レベルの 5 変数（§1 で導出）、各パッチの「回転/静止」と「一方向/振動」、ユーザー選択状態、締め切り種別（全問正解 / 時間切れ）。これらは ✅/❌ 開示（S5）に使い、永続化は `GameRecord`（result/levelParams/levelDelta）のみ。

## 4. このスプリントの a11y/デザイン関与
- UI なし。ただし「レベル番号・個数・クリア/失敗の読み上げ」（system §6）に必要な状態（currentLevel, count, result）がこの層で確定することを確認。
- mockups 不要。Generator が L1/L20/L21/L720・桁上がり・増減・クランプ・連続失敗永続の単体テストを多数追加（spec §8 S2 完成の定義）。

## 5. 受け入れ基準カバレッジ（F-04 ロジック / §4）
- [x] クリアで +1（上限クランプ）/ 失敗 1 回目は変化なし / 2 連続失敗で −1（下限 L1 クランプ）
- [x] クリアで連続失敗リセット / 連続失敗は永続
- [x] 中断は影響しない
- [x] レベル ⇄ 5 変数の mixed-radix 変換・デフォルト梯子生成（UI 表示は番号と個数のみ）
</content>
