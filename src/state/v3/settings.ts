/**
 * settings.ts — v3.0 F-13 設定ロジック（範囲設定 / 変化順 / 継承項目）。
 *
 * 純関数の setter（範囲の妥当化・変化順の検証・列挙妥当化）と、Settings を
 * AsyncStorage へ即時反映する永続化ラッパを提供する。範囲・変化順の変更時は
 * spec §4.5 に従い現在レベルを新総レベル数にクランプし連続失敗を 0 リセットする
 * （lib/v3/level の clampLevelState を配線）。
 *
 * 設計方針：
 * - 各変数の有効値部分集合は §4.1 値集合の部分集合かつ易→難順を保つよう正規化する。
 * - 各変数は最低 1 値必須（全無効にはできない）。空集合を渡されたら現状維持/フル補完。
 * - 不正な列挙値・不正な変化順は無視（現状維持）する。
 */

import {
  VALUE_SETS,
  DEFAULT_VARIABLE_ORDER,
  defaultVariableRanges,
  totalLevels,
  clampLevelState,
  type VariableKey,
  type VariableRanges,
  type Direction,
  type GridSize,
  type LevelState,
} from '../../lib/v3/level';
import type { ViewingDistanceCm } from '../../lib/calibration';
import {
  DARK_MODES,
  ONE_EYE_GUIDANCE_OPTIONS,
  VIEWING_DISTANCE_OPTIONS,
  SESSION_MINUTES_MIN,
  SESSION_MINUTES_MAX,
  DEFAULT_SESSION_MINUTES,
  Settings,
  DarkMode,
  OneEyeGuidance,
  defaultSettings,
} from './schema';
import { loadSettings, saveSettings, loadLevelState, saveLevelState } from './repository';

const VARIABLE_KEYS: readonly VariableKey[] = [
  'count',
  'seconds',
  'direction',
  'gridSize',
  'rotationSpeed',
] as const;

// ---------------------------------------------------------------------------
// 範囲（VariableRanges）の妥当化（純関数）
// ---------------------------------------------------------------------------

/**
 * 1 変数の有効値部分集合を「§4.1 値集合に含まれる値のみ・易→難順・重複なし」に正規化する。
 * 結果が空になる場合は null を返す（呼び出し側で「最低 1 値必須」のフォールバックを行う）。
 */
function normalizeAxis<T>(
  requested: readonly T[],
  valueSet: readonly T[],
): T[] | null {
  // valueSet の並び（易→難）を保ちつつ、requested に含まれる値のみ残す。
  const requestedSet = new Set<unknown>(requested);
  const normalized = valueSet.filter((v) => requestedSet.has(v));
  return normalized.length > 0 ? normalized : null;
}

/**
 * VariableRanges を正規化する（破損・部分集合の修復）。
 * 各変数：§4.1 値集合の部分集合・易→難順・最低 1 値。空集合はフル範囲で補完する。
 */
export function sanitizeVariableRanges(
  ranges: Partial<VariableRanges> | null | undefined,
): VariableRanges {
  const full = defaultVariableRanges();
  const src = ranges ?? {};
  return {
    count: normalizeAxis(src.count ?? full.count, VALUE_SETS.count) ?? [...full.count],
    seconds:
      normalizeAxis(src.seconds ?? full.seconds, VALUE_SETS.seconds) ??
      [...full.seconds],
    direction:
      (normalizeAxis(
        src.direction ?? full.direction,
        VALUE_SETS.direction,
      ) as Direction[] | null) ?? [...full.direction],
    gridSize:
      (normalizeAxis(
        src.gridSize ?? full.gridSize,
        VALUE_SETS.gridSize,
      ) as GridSize[] | null) ?? [...full.gridSize],
    rotationSpeed:
      normalizeAxis(
        src.rotationSpeed ?? full.rotationSpeed,
        VALUE_SETS.rotationSpeed,
      ) ?? [...full.rotationSpeed],
  };
}

/**
 * variableOrder を「5 変数キーの順列」に正規化する。
 * 不正（欠落・重複・未知キー）なら DEFAULT_VARIABLE_ORDER を返す。
 */
export function sanitizeVariableOrder(
  order: readonly VariableKey[] | null | undefined,
): VariableKey[] {
  if (!order || order.length !== VARIABLE_KEYS.length) {
    return [...DEFAULT_VARIABLE_ORDER];
  }
  const seen = new Set<VariableKey>();
  for (const key of order) {
    if (!VARIABLE_KEYS.includes(key) || seen.has(key)) {
      return [...DEFAULT_VARIABLE_ORDER];
    }
    seen.add(key);
  }
  return [...order];
}

/**
 * セッション時間（分）を 1〜15 の整数にクランプする（spec §7.2 / AS-23）。
 * 不正値（非整数・範囲外・NaN）は既定 5 に丸める。
 */
export function sanitizeSessionMinutes(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_SESSION_MINUTES;
  }
  const rounded = Math.round(value);
  return Math.min(Math.max(rounded, SESSION_MINUTES_MIN), SESSION_MINUTES_MAX);
}

/** Settings 全体を妥当化する（load 時の破損修復・部分マージ後の正規化）。 */
export function sanitizeSettings(settings: Settings): Settings {
  return {
    sessionMinutes: sanitizeSessionMinutes(settings.sessionMinutes),
    variableRanges: sanitizeVariableRanges(settings.variableRanges),
    variableOrder: sanitizeVariableOrder(settings.variableOrder),
    darkMode: DARK_MODES.includes(settings.darkMode)
      ? settings.darkMode
      : 'system',
    soundEnabled:
      typeof settings.soundEnabled === 'boolean' ? settings.soundEnabled : true,
    hapticsEnabled:
      typeof settings.hapticsEnabled === 'boolean'
        ? settings.hapticsEnabled
        : true,
    oneEyeGuidance: ONE_EYE_GUIDANCE_OPTIONS.includes(settings.oneEyeGuidance)
      ? settings.oneEyeGuidance
      : 'off',
  };
}

// ---------------------------------------------------------------------------
// 範囲・変化順の個別 setter（純関数：現在の Settings → 新しい Settings）
// ---------------------------------------------------------------------------

/**
 * 1 変数の有効値部分集合を設定する（F-13）。
 * §4.1 値集合外の値は除外し、易→難順に正規化する。
 * 結果が空（最低 1 値必須に違反）なら**現状維持**（変更を無視）する。
 */
export function setVariableRange<K extends VariableKey>(
  settings: Settings,
  key: K,
  values: readonly VariableRanges[K][number][],
): Settings {
  const normalized = normalizeAxis(
    values as readonly unknown[],
    VALUE_SETS[key] as readonly unknown[],
  );
  if (normalized == null) {
    // 全無効は不可（F-13）。現状維持。
    return settings;
  }
  return {
    ...settings,
    variableRanges: {
      ...settings.variableRanges,
      [key]: normalized,
    } as VariableRanges,
  };
}

/** 変化順を設定する（F-13）。5 変数の順列でなければ現状維持。 */
export function setVariableOrder(
  settings: Settings,
  order: readonly VariableKey[],
): Settings {
  const sanitized = sanitizeVariableOrder(order);
  // sanitizeVariableOrder は不正時 DEFAULT を返すため、不正な並べ替えは
  // 「デフォルトに戻す」扱いになる。明示的に拒否したい場合は呼び出し側が判定する。
  return { ...settings, variableOrder: sanitized };
}

/** 変化順をデフォルトに戻す（F-13「デフォルトに戻す」）。 */
export function resetVariableOrder(settings: Settings): Settings {
  return { ...settings, variableOrder: [...DEFAULT_VARIABLE_ORDER] };
}

// ---------------------------------------------------------------------------
// 継承項目の setter（純関数）
// ---------------------------------------------------------------------------

/**
 * セッション時間（分）を設定する（F-13・§7.2）。1〜15 にクランプ（不正値は既定 5）。
 * レベルの梯子には影響しない全プレイ共通設定（AS-23）。永続化は updateSettings で行う。
 */
export function setSessionMinutes(settings: Settings, minutes: number): Settings {
  return { ...settings, sessionMinutes: sanitizeSessionMinutes(minutes) };
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

/** 視聴距離の妥当化（30/40/50 のいずれか。UserProfile 側に保存）。 */
export function normalizeViewingDistance(value: number): ViewingDistanceCm {
  return nearestOption(value, VIEWING_DISTANCE_OPTIONS) as ViewingDistanceCm;
}

// ---------------------------------------------------------------------------
// 総レベル数プレビュー（F-13 UI「現在の設定：{N} レベル」）
// ---------------------------------------------------------------------------

/** 現在の Settings から総レベル数を計算する（spec §4.2、UI プレビュー用）。 */
export function settingsTotalLevels(settings: Settings): number {
  return totalLevels(settings.variableRanges, settings.variableOrder);
}

// ---------------------------------------------------------------------------
// 永続化ラッパ（load → 変更 → save。F-13「即座に保存」）
// ---------------------------------------------------------------------------

/**
 * 現在の Settings を読み、updater で変換し、即保存して返す。
 * 範囲・変化順を変えないトグル系（音/振動/ダークモード/片眼ガイダンス）に使う。
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

/** updateLevelSettings の戻り値。 */
export type LevelSettingsUpdate = {
  settings: Settings;
  levelState: LevelState;
  /** クランプにより現在レベルが変わったか（UI トースト「{clamped} に調整」用）。 */
  clamped: boolean;
};

/**
 * 範囲・変化順を変更する（F-13 / spec §4.5）。
 *
 * 梯子（総レベル数・各レベルの中身）が変わるため、変更後に：
 * - 現在レベルを新しい有効範囲にクランプ（新上限超過なら新上限へ丸め）
 * - 連続失敗カウントを 0 リセット
 * - highestLevel も新上限でクランプ
 * を行い、Settings と LevelState の両方を即保存する。
 *
 * @param updater 範囲/変化順を変える純関数 setter（setVariableRange / setVariableOrder 等）。
 */
export async function updateLevelSettings(
  updater: (current: Settings) => Settings,
): Promise<LevelSettingsUpdate> {
  const currentSettings = await loadSettings();
  const nextSettings = updater(currentSettings);
  await saveSettings(nextSettings);

  const prevLevelState = await loadLevelState();
  const nextLevelState = clampLevelState(
    prevLevelState,
    nextSettings.variableRanges,
    nextSettings.variableOrder,
  );
  await saveLevelState(nextLevelState);

  return {
    settings: nextSettings,
    levelState: nextLevelState,
    clamped: nextLevelState.currentLevel !== prevLevelState.currentLevel,
  };
}
