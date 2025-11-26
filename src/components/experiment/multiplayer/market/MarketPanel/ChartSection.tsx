"use client";
import React from 'react';
import { InlinePriceHistory } from '../InlinePriceHistory';

type Props = {
  entityId: string;
  docId: string | null;
  price: number;
};

export const ChartSection: React.FC<Props> = ({ entityId, docId, price }) => {
  if (!docId) return null;

  return (
    <div className="bg-white rounded-xl p-3 border border-stone-200/80 shadow-sm">
      <InlinePriceHistory
        entityId={entityId}
        docId={docId}
        currentPrice={price}
        variant="default"
        compact={true}
      />
    </div>
  );
};
