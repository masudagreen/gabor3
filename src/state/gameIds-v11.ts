/**
 * v1.1 ゲーム ID 定義（spec-v11.md §7、§16）。
 *
 * AsyncStorage に依存しない純粋型・定数モジュール。テスト等から
 * import する際に `@react-native-async-storage/async-storage` の mock 設定が
 * 不要になるため、`storage-v11.ts` から分離した。
 */

/** v1.1 で扱う 13 ゲームの ID（spec-v11.md §7） */
export type GameIdV11 =
  | 'G-01' // 変化察知（v1 改修）
  | 'G-02' // 左右並び傾き判別（v1 改修）
  | 'G-03' // 周辺視野ハント（v1 改修）
  | 'G-04' // コントラスト弁別
  | 'G-05' // 空間周波数弁別
  | 'G-06' // ガウス窓サイズ弁別
  | 'G-07' // ガボールエッジ検出
  | 'G-08' // 残像方位弁別
  | 'G-09' // 側方マスキング（Lateral Masking、Polat 系）
  | 'G-10' // テクスチャ分離（Texture Segmentation、Karni & Sagi）
  | 'G-11' // Vernier 整列判定
  | 'G-12' // クラウディング（Crowding）
  | 'G-13'; // 数字探し（Embedded Numeral）

/** 13 ゲーム ID の網羅リスト（順序は spec-v11.md §7 に従う） */
export const ALL_GAME_IDS_V11: readonly GameIdV11[] = [
  'G-01',
  'G-02',
  'G-03',
  'G-04',
  'G-05',
  'G-06',
  'G-07',
  'G-08',
  'G-09',
  'G-10',
  'G-11',
  'G-12',
  'G-13',
] as const;
