/**
 * feedback.test.ts — 音・ハプティクス発火決定の純関数（spec F-14、system §10）。
 *
 * 各イベント × 音 ON/OFF × 振動 ON/OFF × サイレント の組合せで、鳴らす音種・音量・
 * 振動種が仕様どおりかを検証する。
 */

import {
  decideFeedback,
  type FeedbackEvent,
  type FeedbackSettings,
} from '../../../src/lib/v2/feedback';

const ON: FeedbackSettings = { soundEnabled: true, hapticsEnabled: true };
const SOUND_OFF: FeedbackSettings = { soundEnabled: false, hapticsEnabled: true };
const HAPTIC_OFF: FeedbackSettings = { soundEnabled: true, hapticsEnabled: false };
const ALL_OFF: FeedbackSettings = {
  soundEnabled: false,
  hapticsEnabled: false,
};

describe('decideFeedback — イベント別の既定（音 ON / 振動 ON / 非サイレント）', () => {
  it('round-correct: correct 音 + light 振動', () => {
    const plan = decideFeedback({ type: 'round-correct' }, ON);
    expect(plan.sound).toEqual({ kind: 'correct', volume: 0.6 });
    expect(plan.haptic).toBe('light');
  });

  it('round-wrong: wrong 音 + medium 振動', () => {
    const plan = decideFeedback({ type: 'round-wrong' }, ON);
    expect(plan.sound).toEqual({ kind: 'wrong', volume: 0.6 });
    expect(plan.haptic).toBe('medium');
  });

  it('countdown-tick: tick 音のみ（ハプティクスなし）。残り秒で音量が増す', () => {
    expect(decideFeedback({ type: 'countdown-tick', remainingSec: 3 }, ON)).toEqual(
      { sound: { kind: 'tick', volume: 0.4 }, haptic: null },
    );
    expect(decideFeedback({ type: 'countdown-tick', remainingSec: 2 }, ON)).toEqual(
      { sound: { kind: 'tick', volume: 0.5 }, haptic: null },
    );
    expect(decideFeedback({ type: 'countdown-tick', remainingSec: 1 }, ON)).toEqual(
      { sound: { kind: 'tick', volume: 0.6 }, haptic: null },
    );
  });

  it('session-complete: end 音のみ（ハプティクスなし）', () => {
    const plan = decideFeedback({ type: 'session-complete' }, ON);
    expect(plan.sound).toEqual({ kind: 'end', volume: 0.5 });
    expect(plan.haptic).toBeNull();
  });

  it('badge-earned: badge 音 + badge 振動', () => {
    const plan = decideFeedback({ type: 'badge-earned' }, ON);
    expect(plan.sound).toEqual({ kind: 'badge', volume: 0.7 });
    expect(plan.haptic).toBe('badge');
  });
});

describe('decideFeedback — 音 OFF（振動 ON）', () => {
  const events: FeedbackEvent[] = [
    { type: 'round-correct' },
    { type: 'round-wrong' },
    { type: 'countdown-tick', remainingSec: 1 },
    { type: 'session-complete' },
    { type: 'badge-earned' },
  ];

  it.each(events)('音を一切鳴らさない: %o', (event) => {
    expect(decideFeedback(event, SOUND_OFF).sound).toBeNull();
  });

  it('振動は ON のまま発火（correct=light, wrong=medium, badge=badge）', () => {
    expect(decideFeedback({ type: 'round-correct' }, SOUND_OFF).haptic).toBe('light');
    expect(decideFeedback({ type: 'round-wrong' }, SOUND_OFF).haptic).toBe('medium');
    expect(decideFeedback({ type: 'badge-earned' }, SOUND_OFF).haptic).toBe('badge');
  });
});

describe('decideFeedback — 振動 OFF（音 ON）', () => {
  it('ハプティクスを一切発火しない', () => {
    expect(decideFeedback({ type: 'round-correct' }, HAPTIC_OFF).haptic).toBeNull();
    expect(decideFeedback({ type: 'round-wrong' }, HAPTIC_OFF).haptic).toBeNull();
    expect(decideFeedback({ type: 'badge-earned' }, HAPTIC_OFF).haptic).toBeNull();
  });

  it('音は ON のまま鳴る', () => {
    expect(decideFeedback({ type: 'round-correct' }, HAPTIC_OFF).sound).toEqual({
      kind: 'correct',
      volume: 0.6,
    });
  });
});

describe('decideFeedback — 両 OFF', () => {
  it('音も振動も発火しない', () => {
    const plan = decideFeedback({ type: 'round-correct' }, ALL_OFF);
    expect(plan.sound).toBeNull();
    expect(plan.haptic).toBeNull();
  });
});

describe('decideFeedback — サイレントモード尊重（NF-33）', () => {
  it('サイレント時は音を抑止しハプティクスは発火する', () => {
    const plan = decideFeedback({ type: 'round-correct' }, ON, true);
    expect(plan.sound).toBeNull();
    expect(plan.haptic).toBe('light');
  });

  it('サイレント + 振動 OFF は音も振動も出さない', () => {
    const plan = decideFeedback({ type: 'round-wrong' }, HAPTIC_OFF, true);
    expect(plan.sound).toBeNull();
    expect(plan.haptic).toBeNull();
  });

  it('サイレントでもティックは音なし（元々音のみのため完全無発火）', () => {
    const plan = decideFeedback(
      { type: 'countdown-tick', remainingSec: 2 },
      ON,
      true,
    );
    expect(plan.sound).toBeNull();
    expect(plan.haptic).toBeNull();
  });

  it('サイレントでもセッション完了は音なし（ハプティクスなしイベントは完全無発火）', () => {
    const plan = decideFeedback({ type: 'session-complete' }, ON, true);
    expect(plan.sound).toBeNull();
    expect(plan.haptic).toBeNull();
  });
});
