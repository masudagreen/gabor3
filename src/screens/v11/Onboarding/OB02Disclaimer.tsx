/**
 * S8-OB-02 免責同意画面（onboarding.md §3）。
 *
 * v1 の `DisclaimerSheet` を `mode="onboarding"` で流用。
 * 「ステップ 2 / 5」表示のみ追加。
 */
import React from 'react';
import { DisclaimerSheet } from '../../../components/DisclaimerSheet';

export type OB02DisclaimerProps = {
  onAgreed: (agreedAtIso: string) => void;
};

export const OB02Disclaimer: React.FC<OB02DisclaimerProps> = ({ onAgreed }) => {
  return (
    <DisclaimerSheet
      mode="onboarding"
      stepLabel="2 / 5"
      onAgree={() => onAgreed(new Date().toISOString())}
    />
  );
};
