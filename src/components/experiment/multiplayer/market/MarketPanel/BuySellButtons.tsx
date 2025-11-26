"use client";
import React, { useMemo } from 'react';

type Props = {
  amount: number;
  price: number;
  mine: number;
  onTrade: (amount: number) => void;
  disabled: boolean;
  estimatedShares?: number | null;
  estimatedCost?: number | null;
  loadingShares?: boolean;
};

export const BuySellButtons: React.FC<Props> = ({ amount, price, mine, onTrade, disabled, estimatedShares, estimatedCost, loadingShares }) => {
  const isBuy = amount > 0;
  const isSell = amount < 0;
  const canSell = mine > 0;

  const hasPreview = estimatedShares != null && estimatedCost != null;
  const estSharesRaw = Math.abs(estimatedShares ?? 0);
  const estShares = isSell ? Math.min(estSharesRaw, Math.abs(mine)) : estSharesRaw;

  const displayCurrency = useMemo(() => {
    const c = estimatedCost;
    if (c == null || !Number.isFinite(c)) return null;
    if (isSell && estSharesRaw > 0) {
      const allowedShares = Math.min(estSharesRaw, Math.abs(mine));
      return Math.abs(c) * (allowedShares / estSharesRaw);
    }
    return Math.abs(c);
  }, [estimatedCost, isSell, estSharesRaw, mine]);

  const handleBuy = () => {
    if (amount <= 0 || disabled) return;
    onTrade(amount);
  };

  const handleSell = () => {
    if (amount >= 0 || disabled || !canSell) return;
    onTrade(amount);
  };

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {/* Sell button */}
      <button
        onClick={handleSell}
        disabled={disabled || !canSell || amount >= 0}
        className="group relative px-4 py-3.5 rounded-xl font-bold text-sm transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed bg-white border-2 border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700 disabled:border-stone-200"
      >
        <div className="flex flex-col items-center gap-0.5">
          <div className="text-base">Sell</div>
          {isSell && (
            <div className="text-[11px] font-semibold text-stone-500 tabular-nums">
              {loadingShares ? (
                <span className="inline-flex items-center gap-1">
                  <svg className="animate-spin h-3 w-3 text-stone-400" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  calculating...
                </span>
              ) : hasPreview && displayCurrency != null ? (
                <span>{Math.round(estShares)} shares → ${Math.round(displayCurrency)}</span>
              ) : null}
            </div>
          )}
        </div>
      </button>

      {/* Buy button */}
      <button
        onClick={handleBuy}
        disabled={disabled || amount <= 0}
        className="group relative px-4 py-3.5 rounded-xl font-bold text-sm transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 disabled:shadow-none"
      >
        <div className="flex flex-col items-center gap-0.5">
          <div className="text-base">Buy</div>
          {isBuy && (
            <div className="text-[11px] font-semibold text-emerald-50 tabular-nums">
              {loadingShares ? (
                <span className="inline-flex items-center gap-1">
                  <svg className="animate-spin h-3 w-3 text-emerald-200" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  calculating...
                </span>
              ) : hasPreview && displayCurrency != null ? (
                <span>{Math.round(estShares)} shares ← ${Math.round(displayCurrency)}</span>
              ) : null}
            </div>
          )}
        </div>
      </button>
    </div>
  );
};
