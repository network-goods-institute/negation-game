import React from 'react';
import { InlinePriceHistory } from '../market/InlinePriceHistory';
import { isMarketEnabled } from '@/utils/market/marketUtils';
import { useMarketData } from '@/hooks/market/useMarketData';
import { normalizeSecurityId } from '@/utils/market/marketUtils';
import { scaleToShares } from '@/utils/market/marketUtils';

type InlineMarketDisplayProps = {
  id: string;
  data: any;
  selected?: boolean;
  hidden?: boolean;
  showPrice?: boolean;
  offsetLeft?: string; // e.g., '-left-4'
  variant?: 'default' | 'objection';
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
  variant = 'default',
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
    <div className={`absolute -top-4 ${offsetLeft} pointer-events-none z-10 p-2`}>
      <InlinePriceHistory
        entityId={id}
        docId={typeof window !== 'undefined' ? (window.location.pathname.split('/').pop() || '') : ''}
        currentPrice={priceValue}
        variant={variant}
      />
      <PositionAndReturn id={id} price={priceValue} mine={mine} variant={variant} />
    </div>
  );
};

export const InlineMarketPending: React.FC<{
  id: string;
  selected?: boolean;
  hidden?: boolean;
  showPrice?: boolean;
  hasPrice?: boolean;
  offsetLeft?: string;
  variant?: 'default' | 'objection';
}> = ({ id, selected, hidden, showPrice, hasPrice, offsetLeft = '-left-4', variant = 'default' }) => {
  const marketEnabled = isMarketEnabled();
  const showPending = Boolean(selected && marketEnabled && !hidden && !showPrice && !hasPrice);
  if (!showPending) return null;
  return (
    <div className={`absolute -top-10 ${offsetLeft} pointer-events-none z-20 p-2`}>
      <div className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded shadow-sm ${variant === 'objection' ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-white/95 text-stone-700 border border-stone-200'}`}>
        <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-stone-300 border-t-stone-600 animate-spin" />
        <span>Preparing market…</span>
      </div>
    </div>
  );
};

const PositionAndReturn: React.FC<{ id: string; price: number; mine?: number | null; variant?: 'default' | 'objection' }> = ({ id, price, mine, variant = 'default' }) => {
  const [ret, setRet] = React.useState<number>(0);
  const [optimisticSharesDelta, setOptimisticSharesDelta] = React.useState<number>(0);
  const docId = React.useMemo(() => {
    try { return window.location.pathname.split('/').pop() || ''; } catch { return ''; }
  }, []);
  React.useEffect(() => {
    let aborted = false;
    const norm = normalizeSecurityId(id);
    const fetchDelta = async () => {
      try {
        const res = await fetch(`/api/market/${encodeURIComponent(docId)}/price-history`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ securityId: norm, limit: 100, includeBaseline: true }),
        });
        if (!res.ok) return;
        const arr = await res.json();
        const history: Array<{ timestamp: string; price: number }> = Array.isArray(arr) ? arr : [];
        if (history.length === 0) return;
        const last = history[history.length - 1];
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        let baseline = history[0];
        for (let i = history.length - 1; i >= 0; i--) {
          const ts = Date.parse(history[i].timestamp);
          if (Number.isFinite(ts) && ts <= cutoff) { baseline = history[i]; break; }
        }
        const pNow = Number(last.price);
        const pBase = Number(baseline.price);
        const delta = (Number.isFinite(pNow) && Number.isFinite(pBase)) ? (pNow - pBase) : 0;
        if (!aborted) setRet(delta);
      } catch { }
    };
    if (docId) fetchDelta();
    return () => { aborted = true; };
  }, [docId, id]);

  React.useEffect(() => {
    const norm = normalizeSecurityId(id);
    const onOpt = (e: any) => {
      try {
        const detail = e?.detail || {};
        if (String(detail.securityId || '') !== String(norm)) return;
        const shares = scaleToShares(String(detail.deltaScaled || "0"));
        setOptimisticSharesDelta((d) => d + shares);
      } catch { }
    };
    const onRefresh = () => setOptimisticSharesDelta(0);
    window.addEventListener('market:optimisticTrade', onOpt as any);
    window.addEventListener('market:refresh', onRefresh as any);
    return () => {
      window.removeEventListener('market:optimisticTrade', onOpt as any);
      window.removeEventListener('market:refresh', onRefresh as any);
    };
  }, [id]);

  const m = Number.isFinite(mine as any) ? Number(mine) : 0;
  const p = Number.isFinite(price as any) ? Number(price) : 0;
  const positionMoney = (m + optimisticSharesDelta) * p;
  const returnMoney = (m + optimisticSharesDelta) * ret;
  const posSign = positionMoney > 0 ? '+' : positionMoney < 0 ? '−' : '';
  const retSign = returnMoney > 0 ? '+' : returnMoney < 0 ? '−' : '';

  return (
    <div className={`mt-1 w-max max-w-full pointer-events-none font-sans text-[12px] tabular-nums leading-tight px-1 rounded-sm ${variant === 'objection' ? 'bg-amber-50 text-amber-900' : 'bg-white/90 text-stone-800'}`}>
      <span className="mr-2">{posSign}${Math.round(Math.abs(positionMoney))}</span>
      <span className={returnMoney >= 0 ? (variant === 'objection' ? 'text-amber-700' : 'text-emerald-600') : 'text-rose-600'}>
        {retSign}${Math.round(Math.abs(returnMoney))}
      </span>
    </div>
  );
};
