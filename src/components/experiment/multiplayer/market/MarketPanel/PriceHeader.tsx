"use client";
import React from "react";
import { usePriceHistory } from "@/hooks/market/usePriceHistory";

type Props = {
  price: number;
  entityId: string;
  docId: string | null;
};

export const PriceHeader: React.FC<Props> = ({ price, entityId, docId }) => {
  const { delta24h, loading } = usePriceHistory({
    docId,
    securityId: entityId,
  });

  const percentPrice = (price * 100).toFixed(1);
  const deltaPercent = delta24h !== null ? (delta24h * 100).toFixed(1) : null;
  const isPositive = !loading && delta24h !== null && delta24h > 0;
  const isNegative = !loading && delta24h !== null && delta24h < 0;
  const showNeutral = !loading && (deltaPercent === null || deltaPercent === "0.0");

  return (
    <div>
      <div className="text-[10px] text-stone-500 uppercase tracking-[0.1em] font-semibold mb-1.5">
        Probability
      </div>
      <div className="flex items-center gap-2.5">
        <div className="text-4xl font-bold bg-gradient-to-br from-stone-900 to-stone-700 bg-clip-text text-transparent tabular-nums tracking-tight">
          {percentPrice}%
        </div>
        <div
          className={`flex items-center gap-1 px-2 py-0.5 h-5 rounded-full text-xs font-bold tabular-nums leading-none ${
            loading
              ? "bg-stone-100 text-stone-500"
              : isPositive
              ? "bg-emerald-50 text-emerald-700"
              : isNegative
              ? "bg-rose-50 text-rose-700"
              : "bg-stone-50 text-stone-600"
          }`}
        >
          {loading ? (
            <span className="inline-flex items-center gap-1">
              <svg
                className="animate-spin h-3 w-3 text-stone-400"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              loading…
            </span>
          ) : (
            <>
              <span className="inline-block w-3 text-center">
                {isPositive ? "↑" : isNegative ? "↓" : ""}
              </span>
              <span>
                {isPositive ? "+" : ""}
                {showNeutral ? "0.0" : deltaPercent}%
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
