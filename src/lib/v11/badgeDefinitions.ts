/**
 * badgeDefinitions — F-13 達成バッジ 13 種のメタデータ（spec-v11.md §10）。
 *
 * spec-v11.md §10 のバッジ仕様表をコードレベルの定数として表現する。各バッジの
 * ID / 名称 / 獲得条件文 / 進捗ヒント / アイコン（emoji 暫定）を保持する。
 *
 * 注：判定ロジック（純関数）は `badges.ts` を参照。本ファイルは「表示用メタ」だけ。
 *
 * `dependsOnGameIds` は F-13 / F-18 受け入れ基準「`releaseEnabled=false` の
 * ゲームに依存するバッジ条件は除外集合で評価」のためのメタ情報。たとえば B-06
 * は G-03 単独依存なので G-03 が disabled になると獲得不能（バッジ詳細モーダル
 * で「現在 G-03 は公開対象外のため取得できません」表示）。
 *
 * 一方 B-08 / B-09 / B-10 / B-13 は「enabled 全ゲーム」が条件なので、
 * disabled ゲームは集合から取り除かれて再評価される（=「9 ゲームに動作」ではなく
 * 「enabled 全ゲームで動作」を満たせば獲得）。
 */

import { GameIdV11 } from '../../state/gameIds-v11';

/** spec-v11.md §10 §11 のバッジ ID（B-01〜B-13、計 13 種） */
export type BadgeIdV11 =
  | 'B-01'
  | 'B-02'
  | 'B-03'
  | 'B-04'
  | 'B-05'
  | 'B-06'
  | 'B-07'
  | 'B-08'
  | 'B-09'
  | 'B-10'
  | 'B-11'
  | 'B-12'
  | 'B-13';

/** ALL_BADGE_IDS_V11：13 件、宣言順で UI 表示順。 */
export const ALL_BADGE_IDS_V11: ReadonlyArray<BadgeIdV11> = [
  'B-01',
  'B-02',
  'B-03',
  'B-04',
  'B-05',
  'B-06',
  'B-07',
  'B-08',
  'B-09',
  'B-10',
  'B-11',
  'B-12',
  'B-13',
];

/** バッジ定義（メタ情報のみ）。 */
export type BadgeDefinitionV11 = {
  badgeId: BadgeIdV11;
  /** 表示名（spec-v11.md §10） */
  name: string;
  /** 獲得条件の本文（spec-v11.md §10） */
  conditionText: string;
  /** 暫定アイコン（emoji）。SVG 差し替えはリリース直前のデザイン作業。 */
  emoji: string;
  /**
   * 「特定ゲーム単独依存」バッジに限り、依存ゲーム ID を列挙する。
   *
   * - B-06: ['G-03']（視野ハンター）
   * - B-07: ['G-02']（弁別の達人）
   *
   * それ以外（B-08, B-09, B-10, B-13）は「enabled 全ゲーム」依存だが、列挙はせず
   * 評価関数側で動的に getEnabledGames() を呼ぶ。`dependsOnGameIds` が指定されて
   * いる場合は「単独依存」を意味し、disabled になった瞬間に取得不可となる。
   */
  dependsOnGameIds?: ReadonlyArray<GameIdV11>;
};

export const BADGE_DEFINITIONS_V11: Record<BadgeIdV11, BadgeDefinitionV11> = {
  'B-01': {
    badgeId: 'B-01',
    name: 'はじめの一歩',
    conditionText: '初回フルコース完了',
    emoji: '🌱',
  },
  'B-02': {
    badgeId: 'B-02',
    name: '三日坊主突破',
    conditionText: '3 日連続フルコース完了',
    emoji: '🌿',
  },
  'B-03': {
    badgeId: 'B-03',
    name: '一週間の習慣',
    conditionText: '7 日連続フルコース完了',
    emoji: '📅',
  },
  'B-04': {
    badgeId: 'B-04',
    name: '一ヶ月の継続',
    conditionText: '30 日連続フルコース完了',
    emoji: '🏔',
  },
  'B-05': {
    badgeId: 'B-05',
    name: '100 試行',
    conditionText: '累計 100 試行達成（全ゲーム合算）',
    emoji: '💯',
  },
  'B-06': {
    badgeId: 'B-06',
    name: '視野ハンター',
    conditionText: 'G-03（周辺視野ハント）でワイドスコア 80 以上',
    emoji: '🎯',
    dependsOnGameIds: ['G-03'],
  },
  'B-07': {
    badgeId: 'B-07',
    name: '弁別の達人',
    conditionText: 'G-02（左右並び傾き判別）でワイドスコア 80 以上',
    emoji: '👁',
    dependsOnGameIds: ['G-02'],
  },
  'B-08': {
    badgeId: 'B-08',
    name: '全方位改善',
    conditionText: 'enabled 全ゲームで前週比スコア上昇',
    emoji: '📈',
  },
  'B-09': {
    badgeId: 'B-09',
    name: '探検家',
    conditionText: 'enabled 全ゲームを 1 回以上プレイ',
    emoji: '🗺',
  },
  'B-10': {
    badgeId: 'B-10',
    name: '全制覇',
    conditionText: 'enabled 全ゲームで 1 度はベスト更新',
    emoji: '🏆',
  },
  'B-11': {
    badgeId: 'B-11',
    name: '連続マスター',
    conditionText: 'フルコース 14 日連続完了',
    emoji: '🔥',
  },
  'B-12': {
    badgeId: 'B-12',
    name: '夜更かし返上',
    conditionText: '22 時前にフルコース完了 7 日連続',
    emoji: '🌙',
  },
  'B-13': {
    badgeId: 'B-13',
    name: 'コンプリート',
    conditionText: 'enabled 全ゲームでワイドスコア 80 以上',
    emoji: '🎖',
  },
};

/** 配列形式の全件アクセス（map / filter 等で使う）。 */
export function getAllBadgeDefinitions(): ReadonlyArray<BadgeDefinitionV11> {
  return ALL_BADGE_IDS_V11.map((id) => BADGE_DEFINITIONS_V11[id]);
}

/** badgeId → 定義を引く（無ければ undefined）。 */
export function getBadgeDefinition(
  badgeId: BadgeIdV11,
): BadgeDefinitionV11 | undefined {
  return BADGE_DEFINITIONS_V11[badgeId];
}
