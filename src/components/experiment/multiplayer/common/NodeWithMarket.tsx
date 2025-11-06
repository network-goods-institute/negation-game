import React from 'react';
import { InlinePriceHistory } from '../market/InlinePriceHistory';
import { isMarketEnabled } from '@/utils/market/marketUtils';
import { useMarketData } from '@/hooks/market/useMarketData';

type InlineMarketDisplayProps = {
  id: string;
  data: any;
  selected?: boolean;
  hidden?: boolean;
  showPrice?: boolean;
  offsetLeft?: string; // e.g., '-left-4'
};

/**
 * Component that renders inline market price history
 * Returns the display component and helper values
 */
export const useInlineMarketDisplay = ({
  id,
  data,
  selected,
  hidden,
  showPrice,
}: Omit<InlineMarketDisplayProps, 'offsetLeft'>) => {
  const marketEnabled = isMarketEnabled();
  const { price: priceValue, hasPrice, mine, total } = useMarketData(data);
  const showInlineMarket = selected && marketEnabled && hasPrice && !showPrice && !hidden;

  return {
    showInlineMarket,
    priceValue,
    mine,
    total,
    hasPrice,
    marketEnabled,
  };
};

export const InlineMarketDisplay: React.FC<InlineMarketDisplayProps> = ({
  id,
  data,
  selected,
  hidden,
  showPrice,
  offsetLeft = '-left-4',
}) => {
  const { showInlineMarket, priceValue, mine, total } = useInlineMarketDisplay({
    id,
    data,
    selected,
    hidden,
    showPrice,
  });

  if (!showInlineMarket) return null;

  return (
    <div className={`absolute -top-6 ${offsetLeft} pointer-events-none z-10 p-2`}>
      <div className="mb-1 text-[10px] text-stone-700 bg-white/90 border border-stone-200 rounded px-1 py-0.5 w-full pointer-events-none">
        Your shares: {Number.isFinite(mine as any) ? (Number(mine).toFixed(2)) : '0.00'} • Total: {Number.isFinite(total as any) ? (Number(total).toFixed(2)) : '0.00'}
      </div>
      <InlinePriceHistory
        entityId={id}
        docId={typeof window !== 'undefined' ? (window.location.pathname.split('/').pop() || '') : ''}
        currentPrice={priceValue}
      />
    </div>
  );
};
