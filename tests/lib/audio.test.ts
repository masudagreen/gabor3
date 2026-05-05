/**
 * audio.ts のテスト：soundEnabled ガードと Web Audio API 経由の発火確認。
 *
 * jest 環境では window/document/AudioContext が無いため、グローバルに mock を仕込んで
 * 発火パスを検証する。Platform.OS は test ファイル先頭で 'web' に上書きする。
 */
import { Platform } from 'react-native';
Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'web' });

import {
  playCorrect,
  playIncorrect,
  setSoundEnabled,
  _resetAudioForTest,
} from '../../src/lib/audio';

describe('audio: setSoundEnabled / playCorrect / playIncorrect', () => {
  let createOscillatorMock: jest.Mock;
  let createGainMock: jest.Mock;
  let oscStartMock: jest.Mock;
  let oscStopMock: jest.Mock;
  let resumeMock: jest.Mock;
  let originalAudioContext: typeof globalThis.AudioContext | undefined;

  beforeEach(() => {
    jest.useFakeTimers();
    _resetAudioForTest();
    oscStartMock = jest.fn();
    oscStopMock = jest.fn();
    resumeMock = jest.fn();
    createOscillatorMock = jest.fn(() => ({
      frequency: { value: 0 },
      type: 'sine',
      connect: jest.fn(),
      start: oscStartMock,
      stop: oscStopMock,
    }));
    createGainMock = jest.fn(() => ({
      gain: {
        setValueAtTime: jest.fn(),
        linearRampToValueAtTime: jest.fn(),
      },
      connect: jest.fn(),
    }));

    class FakeAudioContext {
      currentTime = 0;
      state: 'running' | 'suspended' = 'running';
      destination = {} as AudioDestinationNode;
      createOscillator = createOscillatorMock;
      createGain = createGainMock;
      resume = resumeMock;
    }
    originalAudioContext = (globalThis as unknown as { AudioContext?: typeof AudioContext }).AudioContext;
    (globalThis as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    (globalThis as unknown as { AudioContext: unknown }).AudioContext = originalAudioContext;
  });

  it('soundEnabled=true で playCorrect は AudioContext.createOscillator を呼ぶ', () => {
    setSoundEnabled(true);
    playCorrect();
    expect(createOscillatorMock).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(120);
    expect(createOscillatorMock).toHaveBeenCalledTimes(2);
  });

  it('soundEnabled=false なら playCorrect は何も呼ばない', () => {
    setSoundEnabled(false);
    playCorrect();
    jest.advanceTimersByTime(500);
    expect(createOscillatorMock).not.toHaveBeenCalled();
  });

  it('soundEnabled=false なら playIncorrect も無音', () => {
    setSoundEnabled(false);
    playIncorrect();
    expect(createOscillatorMock).not.toHaveBeenCalled();
  });

  it('AudioContext が存在しない環境でも例外を投げない', () => {
    (globalThis as unknown as { AudioContext: unknown }).AudioContext = undefined;
    _resetAudioForTest(); // 内部 _ctx をクリアして失敗パスを試させる
    setSoundEnabled(true);
    expect(() => playCorrect()).not.toThrow();
    expect(() => playIncorrect()).not.toThrow();
  });
});
