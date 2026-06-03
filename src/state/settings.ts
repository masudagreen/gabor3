/**
 * settings.ts — F-13 設定ロジック（範囲制約・採点方式・継承項目）。
 *
 * 純関数の setter（clamp / 列挙妥当化）と、Settings を AsyncStorage へ即時反映する
 * 永続化ラッパを提供する。範囲外の値はクランプし、不正な列挙値は無視（現状維持）する。
 */

import {
  PARAM_SPECS,
  GRID_SIZE_OPTIONS,
  SCORING_MODES,
  DARK_MODES,
  ONE_EYE_GUIDANCE_OPTIONS,
  VIEWING_DISTANCE_OPTIONS,
  Settings,
  ScoringMode,
  DarkMode,
  OneEyeGuidance,
  SettingsParamSpec,
} from './schema';
import type { ViewingDistanceCm } from '../lib/calibration';
import { loadSettings, saveSettings } from './repository';

// ---------------------------------------------------------------------------
// 範囲制約（純関数）
// ---------------------------------------------------------------------------

/**
 * 値を [min, max] にクランプし、step 格子に丸める（min を基点）。
 * 浮動小数の step（b=0.05）でも誤差が出ないよう丸めを正規化する。
 */
export function clampToSpec(value: number, spec: SettingsParamSpec): number {
  const clamped = Math.min(Math.max(value, spec.min), spec.max);
  const steps = Math.round((clamped - spec.min) / spec.step);
  const snapped = spec.min + steps * spec.step;
  // step が小数のとき (0.05 等) の浮動小数誤差を抑える
  const decimals = decimalPlaces(spec.step);
  const rounded = Number(snapped.toFixed(decimals));
  return Math.min(Math.max(rounded, spec.min), spec.max);
}

function decimalPlaces(n: number): number {
  if (Number.isInteger(n)) return 0;
  const s = n.toString();
  const i = s.indexOf('.');
  return i < 0 ? 0 : s.length - i - 1;
}

// ---------------------------------------------------------------------------
// 個別 setter（純関数：現在の Settings を受け取り新しい Settings を返す）
// ---------------------------------------------------------------------------

export function setGridSize(settings: Settings, n: number): Settings {
  // n は離散 3 値。許容外なら最も近い選択肢にスナップ
  const nearest = nearestOption(n, GRID_SIZE_OPTIONS);
  return { ...settings, gridSize: nearest };
}

export function setRoundSeconds(settings: Settings, m: number): Settings {
  return { ...settings, roundSeconds: clampToSpec(m, PARAM_SPECS.roundSeconds) };
}

export function setRoundCount(settings: Settings, r: number): Settings {
  return { ...settings, roundCount: clampToSpec(r, PARAM_SPECS.roundCount) };
}

export function setRotationSpeed(settings: Settings, a: number): Settings {
  return {
    ...settings,
    rotationSpeed: clampToSpec(a, PARAM_SPECS.rotationSpeed),
  };
}

export function setSfChangeSpeed(settings: Settings, b: number): Settings {
  return {
    ...settings,
    sfChangeSpeed: clampToSpec(b, PARAM_SPECS.sfChangeSpeed),
  };
}

export function setScoringMode(settings: Settings, mode: ScoringMode): Settings {
  if (!SCORING_MODES.includes(mode)) return settings;
  return { ...settings, scoringMode: mode };
}

export function setDarkMode(settings: Settings, mode: DarkMode): Settings {
  if (!DARK_MODES.includes(mode)) return settings;
  return { ...settings, darkMode: mode };
}

export function setSoundEnabled(settings: Settings, enabled: boolean): Settings {
  return { ...settings, soundEnabled: enabled };
}

export function setHapticsEnabled(
  settings: Settings,
  enabled: boolean,
): Settings {
  return { ...settings, hapticsEnabled: enabled };
}

export function setOneEyeGuidance(
  settings: Settings,
  guidance: OneEyeGuidance,
): Settings {
  if (!ONE_EYE_GUIDANCE_OPTIONS.includes(guidance)) return settings;
  return { ...settings, oneEyeGuidance: guidance };
}

function nearestOption(value: number, options: readonly number[]): number {
  let best = options[0];
  let bestDist = Math.abs(value - best);
  for (const opt of options) {
    const d = Math.abs(value - opt);
    if (d < bestDist) {
      best = opt;
      bestDist = d;
    }
  }
  return best;
}

/** 視聴距離の妥当化（30/40/50 のいずれか） */
export function normalizeViewingDistance(value: number): ViewingDistanceCm {
  return nearestOption(value, VIEWING_DISTANCE_OPTIONS) as ViewingDistanceCm;
}

// ---------------------------------------------------------------------------
// 永続化ラッパ（load → 変更 → save を 1 関数で。F-13「即座に保存」）
// ---------------------------------------------------------------------------

/**
 * 現在の Settings を読み、updater で変換し、即保存して返す。
 * updater は本ファイルの純関数 setter を想定。
 */
export async function updateSettings(
  updater: (current: Settings) => Settings,
): Promise<Settings> {
  const current = await loadSettings();
  const next = updater(current);
  await saveSettings(next);
  return next;
}
