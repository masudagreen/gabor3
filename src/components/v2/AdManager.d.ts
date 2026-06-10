import React from 'react';

/**
 * AdManager の型宣言。
 *
 * 実装はプラットフォーム別に分割している（Metro が解決）：
 * - AdManager.native.tsx … iOS / Android（AdMob インタースティシャル）
 * - AdManager.web.tsx     … Web（広告なしのスタブ）
 *
 * TypeScript は `.native.tsx` / `.web.tsx` の拡張子を素の import から解決しないため、
 * 共通の型をこの宣言ファイルで提供する。
 */
export declare const AdManager: React.FC<{ children: React.ReactNode }>;
