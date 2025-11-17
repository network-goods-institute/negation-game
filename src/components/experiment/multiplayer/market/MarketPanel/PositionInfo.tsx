"use client";
import React, { useState, useEffect } from 'react';
import { normalizeSecurityId, scaleToShares } from '@/utils/market/marketUtils';

type Props = {
  price: number;
  mine: number;
  total: number;
  entityId: string;
  docId: string | null;
};

export const PositionInfo: React.FC<Props> = ({ price, mine, total, entityId, docId }) => {
  const [delta24h, setDelta24h] = useState<number>(0);
  const [optimisticSharesDelta, setOptimisticSharesDelta] = useState<number>(0);

  // Fetch 24h price change for P/L calculation
  useEffect(() => {
    if (!docId || !entityId) return;

    let aborted = false;
    const fetchDelta = async () => {
      try {
        const norm = normalizeSecurityId(entityId);
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
          if (Number.isFinite(ts) && ts <= cutoff) {
            baseline = history[i];
            break;
          }
        }

        const pNow = Number(last.price);
        const pBase = Number(baseline.price);
        const d = Number.isFinite(pNow) && Number.isFinite(pBase) ? pNow - pBase : 0;

        if (!aborted) setDelta24h(d);
      } catch {}
    };

    fetchDelta();
    const onRefresh = () => { try { fetchDelta(); } catch {} };
    window.addEventListener('market:refresh', onRefresh as any);
    return () => {
      aborted = true;
      window.removeEventListener('market:refresh', onRefresh as any);
    };
  }, [docId, entityId]);

  // Listen for optimistic trade events
  useEffect(() => {
    const norm = normalizeSecurityId(entityId);

    const onOpt = (e: any) => {
      try {
        const detail = e?.detail || {};
        if (String(detail.securityId || '') !== String(norm)) return;
        const shares = scaleToShares(String(detail.deltaScaled || '0'));
        setOptimisticSharesDelta((d) => d + shares);
      } catch {}
    };

    const onRefresh = () => setOptimisticSharesDelta(0);

    window.addEventListener('market:optimisticTrade', onOpt as any);
    window.addEventListener('market:refresh', onRefresh as any);

    return () => {
      window.removeEventListener('market:optimisticTrade', onOpt as any);
      window.removeEventListener('market:refresh', onRefresh as any);
    };
  }, [entityId]);

  const currentShares = mine + optimisticSharesDelta;
  const currentValue = currentShares * price;
  const returnMoney = currentShares * delta24h;
  const returnPercent = currentValue > 0 ? (returnMoney / currentValue) * 100 : 0;

  const hasPosition = currentShares > 0;
  const totalOutstanding = total;
  const percentOwnership = totalOutstanding > 0 ? (currentShares / totalOutstanding) * 100 : 0;

  return (
    <div className="bg-white rounded-xl p-3 border border-stone-200/80 shadow-sm">
      <div className="flex items-center justify-between mb-2.5">
        <div className="text-[10px] font-semibold text-stone-500 uppercase tracking-[0.1em]">
          Your Position
        </div>
        {hasPosition && percentOwnership > 0.1 && (
          <div className="text-[10px] text-stone-500 tabular-nums font-medium">
            {percentOwnership.toFixed(1)}% of supply
          </div>
        )}
      </div>

      {hasPosition ? (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <div className="text-xs text-stone-500 font-medium">Shares</div>
            <div className="text-base font-bold text-stone-900 tabular-nums">
              {Math.round(currentShares).toLocaleString()}
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="text-xs text-stone-500 font-medium">Value</div>
            <div className="text-base font-bold text-stone-900 tabular-nums">
              ${Math.round(currentValue).toLocaleString()}
            </div>
          </div>

          <div className="flex items-baseline justify-between pt-2 border-t border-stone-100">
            <div className="text-xs text-stone-500 font-medium">P&L (24h)</div>
            <div className="flex items-baseline gap-1.5">
              <div
                className={`text-base font-bold tabular-nums ${
                  returnMoney > 0
                    ? 'text-emerald-600'
                    : returnMoney < 0
                    ? 'text-rose-600'
                    : 'text-stone-600'
                }`}
              >
                {returnMoney > 0 ? '+' : ''}${Math.round(returnMoney).toLocaleString()}
              </div>
              <div className={`text-xs font-semibold tabular-nums ${
                returnMoney > 0 ? 'text-emerald-600' : returnMoney < 0 ? 'text-rose-600' : 'text-stone-500'
              }`}>
                ({returnPercent > 0 ? '+' : ''}
                {returnPercent.toFixed(1)}%)
              </div>
            </div>
          </div>

          {totalOutstanding > 0 && (
            <div className="text-[10px] text-stone-400 pt-2 border-t border-stone-100">
              {Math.round(totalOutstanding).toLocaleString()} shares outstanding
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6">
          <div className="text-stone-400 text-sm font-medium">No position yet</div>
          <div className="text-xs text-stone-400 mt-1">
            {totalOutstanding > 0 &&
              `${Math.round(totalOutstanding).toLocaleString()} shares outstanding`}
          </div>
        </div>
      )}
    </div>
  );
};
