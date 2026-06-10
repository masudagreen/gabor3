/**
 * gameView.test.ts — v3 描画表示ロジック（F-12 / F-03、S5）。
 * カウントダウン色段階・aria-live・開示インターバルを検証する。
 */

import {
  countdownTier,
  countdownAriaLive,
  REVEAL_COUNTDOWN_SEC,
} from '../../../src/lib/v3/gameView';

describe('countdownTier (F-12)', () => {
  it('残り 6 秒以上は normal', () => {
    expect(countdownTier(40)).toBe('normal');
    expect(countdownTier(6)).toBe('normal');
  });
  it('残り 5 秒以下 4 秒までは warn', () => {
    expect(countdownTier(5)).toBe('warn');
    expect(countdownTier(4)).toBe('warn');
  });
  it('残り 3 秒以下は danger', () => {
    expect(countdownTier(3)).toBe('danger');
    expect(countdownTier(1)).toBe('danger');
    expect(countdownTier(0)).toBe('danger');
  });
});

describe('countdownAriaLive (system §6)', () => {
  it('6 秒以上は polite', () => {
    expect(countdownAriaLive(6)).toBe('polite');
    expect(countdownAriaLive(40)).toBe('polite');
  });
  it('5 秒以下は assertive', () => {
    expect(countdownAriaLive(5)).toBe('assertive');
    expect(countdownAriaLive(1)).toBe('assertive');
  });
});

describe('REVEAL_COUNTDOWN_SEC（v3.1 締切後 3 秒開示・§4.6 / AS-25）', () => {
  it('3 秒固定（確定値）', () => {
    expect(REVEAL_COUNTDOWN_SEC).toBe(3);
  });
});
