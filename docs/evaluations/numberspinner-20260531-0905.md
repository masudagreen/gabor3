# 評価レポート: NumberSpinner（設定画面の数値パラメータ UI）
日時: 2026-05-31 09:05
モード: impl（限定確認：設定の NumberSpinner のみ）
判定: ✅ 合格

## サマリー
ゲーム設定の m/r/a/b が NumberSpinner（ラベル ＋ [−][数値入力][＋] ＋ 単位）として正しく描画され、
スピン操作の刻み（a=0.1 / b=0.005）、直接入力・範囲外クランプ・不正入力リバート、min/max での
ボタン disabled、リロード後の値保持がすべて期待通り。360/375/1280px で横はみ出しゼロ、スピンボタンは
56pt（>=48pt）。コンソールエラー 0、ネットワーク 4xx/5xx 0。下部レイアウトの回帰なし。

## 基準別スコア
- NumberSpinner 表示（360/375/1280）: ✅ 合格（m/r/a/b すべて「ラベル＋[−][入力][＋]＋単位」形）
- 360px 行の収まり: ✅ 合格（document overflowX=0、各 spinbutton 行 overflow=0）
- スピンボタン 48pt 以上: ✅ 合格（実測 56×56px、全 8 ボタン）
- 難→易ヒント（a/b のみ）: ✅ 合格（a/b に「難しい（小）/易しい（大）」表示、m/r には非表示）
- スピン刻み: ✅ 合格（a: 6.0→6.1、b: 0.150→0.155）
- 端での disabled: ✅ 合格（a=max12 で ＋ disabled、b=min0.05 で − disabled、値は外れない）
- 直接入力: ✅ 合格（a に 9.3 入力→9.3 保存）
- 範囲外クランプ: ✅ 合格（a に 99 入力→max 12 にクランプ、表示 12.0）
- 不正文字リバート: ✅ 合格（a に abc 入力→元値 12.0 に復帰）
- 回帰（値保持）: ✅ 合格（リロード後 localStorage rotationSpeed=9.3 / sfChangeSpeed=0.15、UI も 9.3/0.150 表示）
- 回帰（下部レイアウト）: ✅ 合格（採点方式ラジオ・トグル・片眼セグメント・バージョン block 崩れなし）
- コンソールエラー: ✅ 合格（error 0 件）
- ネットワーク: ✅ 合格（4xx/5xx 0 件）

## 検証詳細（再現可能な操作ログ）
起動: `npm run build:web` → `npx serve -s dist -l 4173`。
到達: localStorage `gaboreye:v2:userProfile`（onboardingCompleted:true 等）を投入しリロード → 下タブ「設定」。
（注：ホームタブはゲームが自動起動するため、設定タブ遷移時に「プレイを中断しますか？」ダイアログが出る。
「中断する」を押して設定画面へ。これは仕様どおりの動線で、本評価の対象外。）

- 観点1: spinbutton 4 件すべて DOM 構造一致。スピンボタン実測 56×56px。a/b にのみヒント行あり。
  360px: `document.scrollWidth - innerWidth = 0`、各 spinbutton `scrollWidth - clientWidth = 0`。375px も同様。1280px も収まり良好。
- 観点2: a の ＋ で 6.0→6.1（aria-valuenow=6.1, 保存値 6.1）、− で 6.0 復帰。b の ＋ で 0.150→0.155。
  a を 12（max）にした状態で ＋ ボタンは `disabled` 属性付き・tabindex=-1・クリック不可。b を min(0.05) にすると − が disabled。
- 観点3: a に 9.3 → 9.3 保存。a に 99 → 12 にクランプ（表示 12.0）。a に abc → 12.0 にリバート（onChange 発火せず）。
  b に 0 → min 0.05 にクランプ（表示 0.050）。
- 観点4: a=9.3 設定後リロード → localStorage 保持を確認、設定画面 UI も 9.3/0.150 を表示。
  下部（フィードバック・片眼・その他・バージョン）レイアウト崩れなし。console error 0、network 4xx/5xx 0。

## 発見した問題
（合否を覆す問題なし）

### [Minor] 回転速度の単位「°/秒」が 360px で 2 行に折り返す
- 再現手順: 360px 幅で回転速度スピナーを表示。
- 実際の振る舞い: 単位ラベル「°/秒」が「°/」と「秒」の 2 行に折り返す（b の「hz/秒」も同様）。
- 影響: 機能・収まりに影響なし（行内に収まり、はみ出しゼロ）。あくまで見た目の細部。
- 該当箇所: src/components/v2/NumberSpinner.tsx の styles.unit / styles.field。
- 修正の方向性（任意）: unit に `flexShrink:0` + `whiteSpace:nowrap`（web）を付けるか、入力欄 minWidth(96) を
  わずかに下げると 1 行に収まりやすい。閾値内のため修正必須ではない。

### [Info] commit() の数値抽出が部分一致を許容
- `commit` は `raw.replace(/[^0-9.\-]/g, '')` 後に parseFloat するため、「ab9c」のような混在入力は 9 として
  採用される（純粋な非数値 "abc" は正しく NaN→リバート）。要件「不正文字は元に戻る」は純非数値で満たすが、
  混在ケースの扱いは寛容。実害は小さく、合否に影響しない。

## 良かった点
- snap()＋clamp() による step スナップで float 誤差なし（a/b の刻みが厳密、0.155 等が正確に表示）。
- role=spinbutton + aria-valuemin/max/now/valuetext を web に正しく付与。−/＋ も個別 button + aria-label。
- 範囲端でボタンを実際に `disabled` 化（クリック不能）しており、値が範囲外に出ない実装が堅牢。
- ヒント（難/易）を a/b に限定し m/r に出さない要件を正確に満たす。
- 編集中（focused）は外部 value 同期を抑止し、入力途中の値が勝手に上書きされない作り。
