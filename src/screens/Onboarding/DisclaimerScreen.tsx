/**
 * DisclaimerScreen — オンボーディング 1-2（screens.md S4-02 / spec.md F-02 / §10.3）。
 *
 * DisclaimerSheet の onboarding mode を薄くラップし、
 * 「同意する」押下時に同意日時の永続化（updateUserProfile）を実施する責務を持つ。
 */

import React from 'react';
import { DisclaimerSheet } from '../../components/DisclaimerSheet';

export type DisclaimerScreenProps = {
  /** 同意成功後に呼ばれる（永続化は親で実施 or onAgree 内部で実施） */
  onAgreed: (agreedAtIso: string) => void;
  onBack: () => void;
};

export const DisclaimerScreen: React.FC<DisclaimerScreenProps> = ({
  onAgreed,
  onBack,
}) => {
  const handleAgree = React.useCallback(() => {
    onAgreed(new Date().toISOString());
  }, [onAgreed]);

  return (
    <DisclaimerSheet
      mode="onboarding"
      onAgree={handleAgree}
      onBack={onBack}
      stepLabel="2 / 7"
    />
  );
};
