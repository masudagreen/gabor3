/**
 * staircaseV11 — F-09 受け入れ基準テスト（spec-v11.md §F-09 / §6.3）。
 */

import {
  applySessionResultV11,
  createStaircaseV11,
  estimateThresholdV11,
  resetStaircaseStateV11,
} from '../../../src/lib/v11/staircaseV11';
import { GAME_REGISTRY } from '../../../src/state/gameRegistry';

const FIXED_NOW = () => '2026-04-30T00:00:00.000Z';

describe('staircaseV11: F-09 セッション間 staircase', () => {
  describe('初期化', () => {
    it('G-04 の初期パラメータは gameRegistry の initial（0.06、v1.1.4 難化）', () => {
      const s = createStaircaseV11('G-04', FIXED_NOW);
      expect(s.gameId).toBe('G-04');
      expect(s.currentParam).toBeCloseTo(0.06, 5);
      expect(s.consecutiveCorrect).toBe(0);
      expect(s.recentResults).toEqual([]);
    });

    it('G-01 の初期パラメータは 5（gameRegistry の initial）', () => {
      const s = createStaircaseV11('G-01', FIXED_NOW);
      expect(s.currentParam).toBe(5);
    });

    it('G-13 の初期パラメータは 0.05（v1.1.4 難化）', () => {
      const s = createStaircaseV11('G-13', FIXED_NOW);
      expect(s.currentParam).toBeCloseTo(0.05, 5);
    });
  });

  describe('3 連続正解で次回パラメータが 1 step 難方向に動く', () => {
    it('G-01：1→2→3 連続正解でパラメータが 5 → 4 へ（step 1、min 方向）', () => {
      let s = createStaircaseV11('G-01', FIXED_NOW);
      s = applySessionResultV11(s, 'correct', FIXED_NOW);
      expect(s.currentParam).toBe(5); // 1 連続正解、まだ動かない
      expect(s.consecutiveCorrect).toBe(1);

      s = applySessionResultV11(s, 'correct', FIXED_NOW);
      expect(s.currentParam).toBe(5);
      expect(s.consecutiveCorrect).toBe(2);

      s = applySessionResultV11(s, 'correct', FIXED_NOW);
      expect(s.currentParam).toBe(4); // 5 - 1 = 4（難方向）
      expect(s.consecutiveCorrect).toBe(0); // リセット
    });

    it('G-04：3 連続正解で 0.06 → 0.05（step 0.01、v1.1.4 難化）', () => {
      let s = createStaircaseV11('G-04', FIXED_NOW);
      s = applySessionResultV11(s, 'correct', FIXED_NOW);
      s = applySessionResultV11(s, 'correct', FIXED_NOW);
      s = applySessionResultV11(s, 'correct', FIXED_NOW);
      expect(s.currentParam).toBeCloseTo(0.05, 5);
    });
  });

  describe('1 不正解で次回パラメータが 1 step 易方向に動く', () => {
    it('G-01：初手不正解で 5 → 6（max 方向）', () => {
      let s = createStaircaseV11('G-01', FIXED_NOW);
      s = applySessionResultV11(s, 'incorrect', FIXED_NOW);
      expect(s.currentParam).toBe(6);
      expect(s.consecutiveCorrect).toBe(0);
    });

    it('正解 2 回 → 不正解 1 回で連続カウントがリセットされ、易方向へ', () => {
      let s = createStaircaseV11('G-01', FIXED_NOW);
      s = applySessionResultV11(s, 'correct', FIXED_NOW);
      s = applySessionResultV11(s, 'correct', FIXED_NOW);
      s = applySessionResultV11(s, 'incorrect', FIXED_NOW);
      expect(s.currentParam).toBe(6);
      expect(s.consecutiveCorrect).toBe(0);
    });
  });

  describe('クランプ', () => {
    it('min を下回らない（G-01：難方向に降りまくっても 1 で止まる）', () => {
      let s = createStaircaseV11('G-01', FIXED_NOW);
      // 9 回難化（1 step ずつ） → 最終的に min=1 でクランプ
      for (let i = 0; i < 30; i += 1) {
        s = applySessionResultV11(s, 'correct', FIXED_NOW);
      }
      expect(s.currentParam).toBeGreaterThanOrEqual(1);
      expect(s.currentParam).toBe(1);
    });

    it('max を上回らない（G-01：易方向に上がりまくっても 10 で止まる）', () => {
      let s = createStaircaseV11('G-01', FIXED_NOW);
      for (let i = 0; i < 30; i += 1) {
        s = applySessionResultV11(s, 'incorrect', FIXED_NOW);
      }
      expect(s.currentParam).toBe(10);
    });
  });

  describe('閾値推定（直近 5 セッション平均）', () => {
    it('履歴 0 件なら fallback（指定なら gameRegistry の initial、v1.1.4 で 0.06）', () => {
      const s = createStaircaseV11('G-04', FIXED_NOW);
      expect(estimateThresholdV11(s)).toBeCloseTo(0.06, 5);
      expect(estimateThresholdV11(s, 0.99)).toBe(0.99);
    });

    it('履歴 3 件なら全件平均', () => {
      let s = createStaircaseV11('G-01', FIXED_NOW); // initial 5
      // 1 セッション目（5 でプレイ） correct → consecutive=1、recent=[5]
      s = applySessionResultV11(s, 'correct', FIXED_NOW);
      // 2 セッション目（5 でプレイ） incorrect → 6 へ、recent=[5,5]
      s = applySessionResultV11(s, 'incorrect', FIXED_NOW);
      // 3 セッション目（6 でプレイ） correct → consecutive=1、recent=[5,5,6]
      s = applySessionResultV11(s, 'correct', FIXED_NOW);
      expect(s.recentResults).toEqual([5, 5, 6]);
      // 平均 = (5 + 5 + 6) / 3 ≈ 5.333
      expect(estimateThresholdV11(s)).toBeCloseTo(5.333, 2);
    });

    it('履歴が 5 件を超えたら最新 5 件のみで平均', () => {
      // 8 セッション分のパラメータを recentResults に積み、最新 5 件のみ
      // 取られることを検証。直接 state を組み立てて純関数を検証する。
      const s = {
        gameId: 'G-04' as const,
        currentParam: 0.1,
        consecutiveCorrect: 0,
        recentResults: [0.3, 0.28, 0.26, 0.24, 0.22, 0.2, 0.18, 0.16],
        updatedAt: FIXED_NOW(),
      };
      // 最新 5 件 = [0.26, 0.24, 0.22, 0.20, 0.18, 0.16] の最後 5 = [0.24,0.22,0.20,0.18,0.16]
      const last5 = [0.24, 0.22, 0.2, 0.18, 0.16];
      const expected = last5.reduce((a, b) => a + b, 0) / 5;
      expect(estimateThresholdV11(s)).toBeCloseTo(expected, 5);
    });

    it('セッション適用で recentResults が 5 件を超えても最新 5 件に保たれる', () => {
      let s = createStaircaseV11('G-01', FIXED_NOW);
      // 6 回適用
      for (let i = 0; i < 6; i += 1) {
        s = applySessionResultV11(s, 'incorrect', FIXED_NOW);
      }
      expect(s.recentResults.length).toBe(5);
    });
  });

  describe('リセット', () => {
    it('resetStaircaseStateV11 で初期値に戻る', () => {
      let s = createStaircaseV11('G-01', FIXED_NOW);
      s = applySessionResultV11(s, 'incorrect', FIXED_NOW);
      s = applySessionResultV11(s, 'incorrect', FIXED_NOW);
      expect(s.currentParam).not.toBe(5);

      const reset = resetStaircaseStateV11(s, FIXED_NOW);
      expect(reset.currentParam).toBe(5);
      expect(reset.consecutiveCorrect).toBe(0);
      expect(reset.recentResults).toEqual([]);
    });
  });

  describe('全 13 ゲームで初期値が paramRange.initial に一致する', () => {
    it.each(GAME_REGISTRY.map((g) => g.gameId))(
      '%s の初期 currentParam は gameRegistry.initial と一致',
      (gameId) => {
        const def = GAME_REGISTRY.find((g) => g.gameId === gameId)!;
        const s = createStaircaseV11(gameId, FIXED_NOW);
        expect(s.currentParam).toBe(def.paramRange.initial);
      },
    );
  });
});
