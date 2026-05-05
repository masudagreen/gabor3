/**
 * gameRegistry — F-08（spec-v11.md §F-08 / §9.1）。
 *
 * 全 13 ゲーム（G-01〜G-13）を中央定義する単一ソース。各ゲームの
 * ID / 表示名 / 系統 / 説明 / staircase パラメータ範囲 / `releaseEnabled` / `order` を保持する。
 *
 * F-18（リリース選定運用フラグ）に従い、`releaseEnabled=false` のゲームは
 * `getEnabledGames()` 経由で動的除外される。
 *
 * v1.1.4 取捨選択リリース：G-09/G-10/G-11/G-12 は `releaseEnabled=false` で
 * 公開対象から外す（実装は残置）。残り 9 ゲーム（G-01〜G-08, G-13）が公開対象。
 */

import { GameIdV11, ALL_GAME_IDS_V11 } from './gameIds-v11';

/** ゲームの系統分類（spec-v11.md §7） */
export type SystemCategory =
  | 'A:v1既存改修'
  | 'B:単一ガボール弁別'
  | 'C:ガボール相互作用';

/** staircase パラメータ範囲（spec-v11.md §9.1 / §7） */
export type ParamRange = {
  /** 易しい端（最小難度） */
  min: number;
  /** 難しい端（最大難度） */
  max: number;
  /** 初期値（中央〜難度寄り、spec-v11.md §F-09） */
  initial: number;
  /** 1 step の動き幅 */
  step: number;
};

/** spec-v11.md §9.1 `GameRegistry` のレコード */
export type GameDefinition = {
  gameId: GameIdV11;
  nameJa: string;
  systemCategory: SystemCategory;
  description: string;
  paramRange: ParamRange;
  releaseEnabled: boolean;
  /** ホーム一覧・連続コース表示順（昇順） */
  order: number;
};

/**
 * 全 13 ゲームの定義。spec-v11.md §7.1〜§7.13 に従う。
 *
 * v1.1.4：G-09/10/11/12 は `releaseEnabled=false`（公開対象外）。それ以外は
 * `true` で公開対象。リリース対象の動的取得は `getEnabledGames()` を経由する。
 */
export const GAME_REGISTRY: ReadonlyArray<GameDefinition> = [
  {
    gameId: 'G-01',
    nameJa: '変化察知',
    systemCategory: 'A:v1既存改修',
    description: 'わずかに角度が変化していくパッチを見つける',
    paramRange: { min: 1, max: 10, initial: 5, step: 1 }, // 最大角度差（°）
    releaseEnabled: true,
    order: 1,
  },
  {
    gameId: 'G-02',
    nameJa: '左右並び傾き判別',
    systemCategory: 'A:v1既存改修',
    description: 'どちらが時計回りか',
    paramRange: { min: 1, max: 10, initial: 6, step: 1 }, // 角度差（°）
    releaseEnabled: true,
    order: 2,
  },
  {
    gameId: 'G-03',
    nameJa: '周辺視野ハント',
    systemCategory: 'A:v1既存改修',
    description: '違う向きのパッチを 8 個から探す',
    // v1.1.4：「角度差を 1/4 に」（ユーザー要望）→ 5..45 を 1..11 に縮小、step=1
    paramRange: { min: 1, max: 11, initial: 6, step: 1 }, // odd one の向き差（°）
    releaseEnabled: true,
    order: 3,
  },
  {
    gameId: 'G-04',
    nameJa: 'コントラスト弁別',
    systemCategory: 'B:単一ガボール弁別',
    description: '左右どちらが濃いか',
    // v1.1.4：「違いを小さく」（ユーザー要望）→ 0.05..0.30 を 0.02..0.12 に縮小
    paramRange: { min: 0.02, max: 0.12, initial: 0.06, step: 0.01 }, // コントラスト差
    releaseEnabled: true,
    order: 4,
  },
  {
    gameId: 'G-05',
    nameJa: '空間周波数弁別',
    systemCategory: 'B:単一ガボール弁別',
    description: '左右どちらが細かい縞か',
    // v1.1.4：「違いを小さく」（ユーザー要望）→ 1.1..2.0 を 1.05..1.50 に縮小
    paramRange: { min: 1.05, max: 1.5, initial: 1.2, step: 0.05 }, // cpd 比
    releaseEnabled: true,
    order: 5,
  },
  {
    gameId: 'G-06',
    nameJa: 'ガウス窓サイズ弁別',
    systemCategory: 'B:単一ガボール弁別',
    description: '左右どちらが大きい範囲に広がるか',
    // v1.1.4：「違いを小さく」（ユーザー要望）→ 1.1..2.0 を 1.05..1.50 に縮小
    paramRange: { min: 1.05, max: 1.5, initial: 1.2, step: 0.05 }, // SD 比
    releaseEnabled: true,
    order: 6,
  },
  {
    gameId: 'G-07',
    nameJa: 'ガボールエッジ検出',
    systemCategory: 'B:単一ガボール弁別',
    description: '同方位の連続線を作るパッチを見つける',
    paramRange: { min: 2, max: 10, initial: 5, step: 1 }, // 向きズレ許容角（°）
    releaseEnabled: true,
    order: 7,
  },
  {
    gameId: 'G-08',
    nameJa: '残像方位弁別',
    systemCategory: 'B:単一ガボール弁別',
    description: 'テストパッチが時計回りか反時計回りか',
    paramRange: { min: 1, max: 10, initial: 5, step: 1 }, // テスト絶対角度（°）
    releaseEnabled: true,
    order: 8,
  },
  {
    gameId: 'G-09',
    nameJa: '側方マスキング',
    systemCategory: 'C:ガボール相互作用',
    description: '左右の妨害ガボールがある中で中央の向きを判別',
    paramRange: { min: 0.05, max: 0.2, initial: 0.1, step: 0.01 }, // target コントラスト
    // v1.1.4：「簡単すぎでガボール図形を注視しない」（ユーザー要望）→ リリース除外
    releaseEnabled: false,
    order: 9,
  },
  {
    gameId: 'G-10',
    nameJa: 'テクスチャ分離',
    systemCategory: 'C:ガボール相互作用',
    description: '異なる向きのパッチ集合がどの象限にあるか',
    paramRange: { min: 5, max: 90, initial: 30, step: 5 }, // 向き差（°）
    // v1.1.4：「簡単すぎでガボール図形を注視しない」（ユーザー要望）→ リリース除外
    releaseEnabled: false,
    order: 10,
  },
  {
    gameId: 'G-11',
    nameJa: 'Vernier 整列判定',
    systemCategory: 'C:ガボール相互作用',
    description: '上下のガボールのズレ方向を判定',
    paramRange: { min: 0.5, max: 5, initial: 2, step: 0.2 }, // ズレ量（arcmin）
    // v1.1.4：「簡単すぎでガボール図形を注視しない」（ユーザー要望）→ リリース除外
    releaseEnabled: false,
    order: 11,
  },
  {
    gameId: 'G-12',
    nameJa: 'クラウディング',
    systemCategory: 'C:ガボール相互作用',
    description: '周囲の妨害ガボール中の中央 target の向きを判定',
    paramRange: { min: 1.2, max: 4, initial: 2, step: 0.2 }, // target-flanker spacing 倍率
    // v1.1.4：「簡単すぎでガボール図形を注視しない」（ユーザー要望）→ リリース除外
    releaseEnabled: false,
    order: 12,
  },
  {
    gameId: 'G-13',
    nameJa: '数字探し',
    systemCategory: 'C:ガボール相互作用',
    description: 'ノイズに埋もれた数字を当てる',
    // v1.1.4：「数字を見にくく」（ユーザー要望）→ コントラスト range を厳しく
    paramRange: { min: 0.02, max: 0.15, initial: 0.05, step: 0.01 }, // 数字のコントラスト
    releaseEnabled: true,
    order: 13,
  },
];

/**
 * 全 13 ゲームを返す（順序保証なし、テスト等の網羅検証用）。disabled も含む。
 */
export function getAllGames(): ReadonlyArray<GameDefinition> {
  return GAME_REGISTRY;
}

/**
 * `releaseEnabled=true` のゲームのみを `order` 昇順で返す（F-18）。
 *
 * 全ての画面・コンポーネントは本関数を経由してゲーム一覧を取得すること。
 * `gameRegistry.filter(g => g.releaseEnabled)` を直接書かない（一元化）。
 */
export function getEnabledGames(): ReadonlyArray<GameDefinition> {
  return GAME_REGISTRY.filter((g) => g.releaseEnabled).sort(
    (a, b) => a.order - b.order,
  );
}

/**
 * gameId からゲーム定義を引く。見つからなければ undefined。
 */
export function getGameDefinition(
  gameId: GameIdV11,
): GameDefinition | undefined {
  return GAME_REGISTRY.find((g) => g.gameId === gameId);
}

/** enabled なゲーム数（F-04 ホーム CTA「約 N 分」の N 計算用） */
export function getEnabledGameCount(): number {
  return getEnabledGames().length;
}

/** ALL_GAME_IDS_V11 と GAME_REGISTRY が同期しているかの内部チェック用 */
export function _isRegistryCompleteForTests(): boolean {
  if (GAME_REGISTRY.length !== ALL_GAME_IDS_V11.length) return false;
  const ids = new Set(GAME_REGISTRY.map((g) => g.gameId));
  return ALL_GAME_IDS_V11.every((id) => ids.has(id));
}
