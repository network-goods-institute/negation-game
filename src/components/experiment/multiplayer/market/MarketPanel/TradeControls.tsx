"use client";
import React, { useMemo, useCallback } from 'react';

type Props = {
  amount: number;
  setAmount: (amount: number) => void;
  mine: number;
  price: number;
  disabled: boolean;
};

export const TradeControls: React.FC<Props> = ({ amount, setAmount, mine, price, disabled }) => {
  const MIN_AMT = 1;
  const SLIDER_MAX = 10000;
  const userHasShares = mine > 0;
  const maxSellValue = Math.max(1, Math.floor(mine * price));
  const sellRange = Math.max(maxSellValue, MIN_AMT * 2);

  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

  // Convert amount to slider value (logarithmic scale)
  const amountToSlider = useCallback(
    (amt: number) => {
      if (userHasShares) {
        // Bipolar slider: [-100, 100] left=sell (capped at holdings value), right=buy
        const sellMax = maxSellValue;
        const buyMax = SLIDER_MAX;
        if (amt < 0) {
          const clampedAmt = clamp(amt, -sellMax, 0);
          const mag = Math.abs(clampedAmt);
          if (mag < MIN_AMT) return 0;
          const t = Math.log(mag / MIN_AMT) / Math.log(sellRange / MIN_AMT);
          return Math.round(-t * 100);
        } else {
          const clampedAmt = clamp(amt, 0, buyMax);
          if (clampedAmt < MIN_AMT) return 0;
          const t = Math.log(clampedAmt / MIN_AMT) / Math.log(buyMax / MIN_AMT);
          return Math.round(t * 100);
        }
      } else {
        // Unipolar slider: [0, 100]
        const clampedAmt = clamp(amt, 0, SLIDER_MAX);
        if (clampedAmt < MIN_AMT) return 0;
        const t = Math.log(clampedAmt / MIN_AMT) / Math.log(SLIDER_MAX / MIN_AMT);
        return Math.round(t * 100);
      }
    },
    [userHasShares, maxSellValue, sellRange]
  );

  // Convert slider value to amount
  const sliderToAmount = useCallback(
    (val: number) => {
      if (userHasShares) {
        // Bipolar - sell side capped at holdings value
        const sellMax = maxSellValue;
        const buyMax = SLIDER_MAX;
        if (val < 0) {
          const t = Math.abs(val) / 100;
          if (t === 0) return 0;
          const nextMag = MIN_AMT * Math.exp(Math.log(sellRange / MIN_AMT) * t);
          const capped = Math.min(Math.round(nextMag), sellMax);
          return -capped;
        } else if (val > 0) {
          const t = val / 100;
          const nextMag = MIN_AMT * Math.exp(Math.log(buyMax / MIN_AMT) * t);
          return Math.round(nextMag);
        }
        return 0;
      } else {
        // Unipolar
        const t = val / 100;
        if (val === 0) return 0;
        const nextMag = MIN_AMT * Math.exp(Math.log(SLIDER_MAX / MIN_AMT) * t);
        return Math.round(nextMag);
      }
    },
    [userHasShares, maxSellValue, sellRange]
  );

  const sliderValue = useMemo(() => amountToSlider(amount), [amount, amountToSlider]);

  const handleSliderChange = (val: number) => {
    setAmount(sliderToAmount(val));
  };

  const handleInputChange = (val: number) => {
    if (!Number.isFinite(val)) return;
    const minVal = userHasShares ? -maxSellValue : 0;
    setAmount(clamp(val, minVal, SLIDER_MAX));
  };

  const incrementAmount = (delta: number) => {
    const minVal = userHasShares ? -maxSellValue : 0;
    setAmount(clamp(amount + delta, minVal, SLIDER_MAX));
  };

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-semibold text-stone-500 uppercase tracking-[0.1em]">
        Trade Amount
      </div>

      {/* Input with quick buttons */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-base font-bold pointer-events-none">
              $
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => handleInputChange(Number(e.target.value))}
              disabled={disabled}
              className="w-full text-xl font-bold text-stone-900 tabular-nums pl-8 pr-3 py-2.5 bg-white border-2 border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 disabled:opacity-50 disabled:bg-stone-50 transition-all"
            />
          </div>
        </div>

        {/* Quick amount buttons */}
        <div className="flex items-center gap-1.5 mt-2">
          {userHasShares && (
            <>
              <button
                onClick={() => incrementAmount(-50)}
                disabled={disabled}
                className="px-2.5 py-1 text-xs font-semibold bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700 rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                −$50
              </button>
              <button
                onClick={() => incrementAmount(-10)}
                disabled={disabled}
                className="px-2.5 py-1 text-xs font-semibold bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700 rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                −$10
              </button>
            </>
          )}
          <button
            onClick={() => incrementAmount(10)}
            disabled={disabled}
            className="px-2.5 py-1 text-xs font-semibold bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700 rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            +$10
          </button>
          <button
            onClick={() => incrementAmount(50)}
            disabled={disabled}
            className="px-2.5 py-1 text-xs font-semibold bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700 rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            +$50
          </button>
        </div>
      </div>

      {/* Slider */}
      <div className="pt-2">
        <input
          type="range"
          min={userHasShares ? -100 : 0}
          max={100}
          value={sliderValue}
          onChange={(e) => handleSliderChange(Number(e.target.value))}
          disabled={disabled}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
          style={{
            background: userHasShares
              ? sliderValue < 0
                ? `linear-gradient(to right, #e5e7eb 0%, #e5e7eb ${50 + (sliderValue / 2)}%, #ef4444 ${50 + (sliderValue / 2)}%, #ef4444 50%, #e5e7eb 50%, #e5e7eb 100%)`
                : sliderValue > 0
                  ? `linear-gradient(to right, #e5e7eb 0%, #e5e7eb 50%, #10b981 50%, #10b981 ${50 + (sliderValue / 2)}%, #e5e7eb ${50 + (sliderValue / 2)}%, #e5e7eb 100%)`
                  : `linear-gradient(to right, #e5e7eb 0%, #e5e7eb 100%)`
              : `linear-gradient(to right, #10b981 0%, #10b981 ${sliderValue}%, #e5e7eb ${sliderValue}%, #e5e7eb 100%)`,
          }}
        />
        {userHasShares && (
          <div className="flex justify-between text-xs text-stone-500 mt-1">
            <span>Sell</span>
            <span>Buy</span>
          </div>
        )}
      </div>
    </div>
  );
};
