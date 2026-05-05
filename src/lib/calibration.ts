/**
 * 視聴距離・端末 dpi → ピクセル換算ロジック。
 *
 * spec.md §6.2 の式に従う：
 *   pixelsPerDegree = (distance_cm * tan(1°)) / pixel_size_cm
 *   ここで pixel_size_cm = 2.54 / dpi
 *
 * Sprint 1 では視聴距離 40cm 固定（spec.md §13 Sprint 1 完成定義）。
 * 視聴距離スライダー（30/40/50cm）は Sprint 4 で実装される。
 */

/**
 * 端末 DPI 既定値（spec.md §6.2）。
 * UA / プラットフォームから推定する 4 区分。
 */
export const DEFAULT_DPI: Record<DeviceType, number> = {
  iphone: 460,
  android: 400,
  tablet: 264,
  pc: 110,
};

export type DeviceType = 'iphone' | 'android' | 'tablet' | 'pc';

/** 視聴距離プリセット（spec.md §6.2、OPT-4） */
export type ViewingDistanceCm = 30 | 40 | 50;

/**
 * 1° の視野角がスクリーン上で何 cm に相当するか。
 * 小角近似：tan(1°) ≈ 0.01745。
 */
export function degToCm(distanceCm: number, deg: number): number {
  return distanceCm * Math.tan((deg * Math.PI) / 180);
}

/** dpi → 1px の物理サイズ（cm） */
export function pixelSizeCm(dpi: number): number {
  return 2.54 / dpi;
}

/**
 * 1° の視野角がスクリーン上で何ピクセルか。
 * pixelDensity（dpr）は CSS px と物理 px の比。dpi は物理 px 基準なので dpr で補正不要。
 *
 * 注意：本関数は CSS px（=React Native の dp）を返す。dpr 補正は描画レイヤで適用する。
 */
export function pixelsPerDegree(distanceCm: number, dpi: number): number {
  // 1° に相当する物理長（cm）
  const oneDegCm = degToCm(distanceCm, 1);
  // 1cm 中の物理ピクセル数 = dpi / 2.54
  // CSS px に揃えるため：dp = 物理px と仮定（RN/RN-Web の標準動作）
  // pixelsPerDegree = oneDegCm * (dpi / 2.54)
  return oneDegCm * (dpi / 2.54);
}

/**
 * cpd → 1 サイクルあたりのピクセル数。
 * spec.md §6.2 の式に従う：
 *   cyclesPerCm = cpd / oneDegCm  →  pixelsPerCycle = (1 / cpd) * pixelsPerDegree
 *
 * 例：dpi=110（PC）, distance=40cm, cpd=3
 *   oneDegCm ≈ 0.6981
 *   pixelsPerDegree ≈ 30.24
 *   pixelsPerCycle ≈ 10.08px / cycle
 */
export function pixelsPerCycle(
  distanceCm: number,
  dpi: number,
  cpd: number,
): number {
  return pixelsPerDegree(distanceCm, dpi) / cpd;
}

/**
 * 視野角 → ピクセル換算（簡略）。
 * 例：sigmaDeg=0.6 → sigmaPx を返す。
 */
export function degToPixels(
  distanceCm: number,
  dpi: number,
  deg: number,
): number {
  return pixelsPerDegree(distanceCm, dpi) * deg;
}

/**
 * パッチ全体の推奨描画サイズ（px）。
 * sigma の 4 倍を目安に矩形に収める（外側はガウス窓でほぼ 0）。
 * 上限は 480px（spec.md §10.2 の表示領域上限）。下限は 64px（タップ領域 OPT-2）。
 */
export function recommendedPatchSizePx(
  distanceCm: number,
  dpi: number,
  sigmaDeg: number,
): number {
  const sigmaPx = degToPixels(distanceCm, dpi, sigmaDeg);
  const raw = Math.ceil(sigmaPx * 6); // ±3σ で 99.7%
  return Math.max(64, Math.min(480, raw));
}

/**
 * デフォルトの視聴距離（40cm = 老眼読書距離中心、OPT-4 / spec.md §6.2）。
 */
export const DEFAULT_VIEWING_DISTANCE_CM: ViewingDistanceCm = 40;

/** 視聴距離の許可ノッチ（spec.md §6.2 / OPT-4） */
export const VIEWING_DISTANCE_OPTIONS: ReadonlyArray<ViewingDistanceCm> = [30, 40, 50];

/**
 * デバイス推定（最小、Platform.OS のみで分類）。
 * Sprint 4 の `estimateDeviceTypeAdvanced` から内部呼び出しされる。
 */
export function estimateDeviceType(platform: string): DeviceType {
  const p = platform.toLowerCase();
  if (p === 'ios') return 'iphone';
  if (p === 'android') return 'android';
  return 'pc';
}

/**
 * 端末タイプ自動推定（Sprint 4 完成版、spec.md §6.2）。
 *
 * 入力：
 *   - platform: 'ios' / 'android' / 'web' / 'windows' / 'macos' （RN の Platform.OS）
 *   - shortSide: Dimensions.get('window') の min(width, height)（CSS px / dp）
 *   - userAgent: Web 環境では navigator.userAgent、それ以外は空文字
 *
 * 規則（spec.md §6.2 の 4 区分）：
 *   - ios で shortSide >= 768 → tablet（iPad）
 *   - ios → iphone
 *   - android で shortSide >= 720 → tablet
 *   - android → android（スマホ）
 *   - web で UA が「iPad」「Android tablet」を含む or shortSide >= 900 → tablet
 *   - その他 web → pc
 *
 * UA 文字列は副情報。shortSide ベースの判定で十分カバーできる。
 */
export function estimateDeviceTypeAdvanced(
  platform: string,
  shortSide: number,
  userAgent: string,
): DeviceType {
  const p = platform.toLowerCase();
  const ua = userAgent.toLowerCase();
  if (p === 'ios') {
    return shortSide >= 768 ? 'tablet' : 'iphone';
  }
  if (p === 'android') {
    return shortSide >= 720 ? 'tablet' : 'android';
  }
  // Web / その他（macos / windows などのデスクトップ含む）
  if (ua.includes('ipad')) return 'tablet';
  if (ua.includes('iphone')) return 'iphone';
  if (ua.includes('android')) {
    // Android タブレットは UA に「mobile」が無い慣習
    if (!ua.includes('mobile') || shortSide >= 720) return 'tablet';
    return 'android';
  }
  // デスクトップ系 UA を含む or それらしき大画面はすべて pc 扱い
  return 'pc';
}

/** DeviceType → 既定 dpi のショートカット */
export function dpiForDevice(device: DeviceType): number {
  return DEFAULT_DPI[device];
}
