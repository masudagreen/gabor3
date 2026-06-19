/**
 * timeFormat.ts — v3.1 改訂：プレイ時間（パッチを見ている時間）の表示整形。
 *
 * セッション要約の「セッション時間」と履歴の「累計ゲーム時間」で共有する。
 * いずれも**パッチを見ている時間**（各ラウンドの実プレイ秒数の合計、3 秒開示は含めない）を
 * 人間可読な文字列に整形する。単位語（時間/分/秒）はロケール辞書 `common.duration_*`
 * から取得するため、端末言語に追従する（splitDuration は i18n 非依存の純関数のまま）。
 */

import { t } from '../../i18n';

export type DurationParts = {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
};

/** 秒（>=0）を 時/分/秒 に分解する。負値・小数は 0 方向に丸める。 */
export function splitDuration(totalSec: number): DurationParts {
  const s = Math.max(0, Math.floor(totalSec || 0));
  return {
    hours: Math.floor(s / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    totalSeconds: s,
  };
}

/**
 * セッション 1 回分のプレイ時間（パッチを見ている時間）を整形する。
 * 1 分未満は「S秒」、1 分以上は「M分S秒」、1 時間以上は「H時間M分」（秒は省略）。
 * 単位語はロケールに追従（en なら "4m 32s" 等）。
 */
export function formatSessionDuration(totalSec: number): string {
  const { hours, minutes, seconds } = splitDuration(totalSec);
  if (hours > 0) return t('common.duration_hm', { h: hours, m: minutes });
  if (minutes > 0) return t('common.duration_ms', { m: minutes, s: seconds });
  return t('common.duration_s', { s: seconds });
}

/**
 * 累計ゲーム時間（全セッションのパッチ視認時間合計）を整形する。
 * 1 時間以上「H時間M分」/ 1 分以上「M分」/ それ未満「S秒」。単位語はロケールに追従。
 */
export function formatCumulativeDuration(totalSec: number): string {
  const { hours, minutes, seconds } = splitDuration(totalSec);
  if (hours > 0) return t('common.duration_hm', { h: hours, m: minutes });
  if (minutes > 0) return t('common.duration_m', { m: minutes });
  return t('common.duration_s', { s: seconds });
}
