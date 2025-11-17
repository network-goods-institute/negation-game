"use client";
import React, { useMemo, useCallback } from 'react';

type Props = {
  amount: number;
  setAmount: (amount: number) => void;
  mine: number;
  disabled: boolean;
};

export const TradeControls: React.FC<Props> = ({ amount, setAmount, mine, disabled }) => {
  const MIN_AMT = 1;
  const MAX_AMT = 1000;
  const maxNegative = -mine;
  const userHasShares = mine > 0;

  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

  // Convert amount to slider value (logarithmic scale)
  const amountToSlider = useCallback(
    (amt: number) => {
      if (userHasShares) {
        // Bipolar slider: [-100, 100] left=sell, right=buy
        const clampedAmt = clamp(amt, maxNegative, MAX_AMT);
        const mag = Math.abs(clampedAmt);
        if (mag < MIN_AMT) return 0;
        const maxMag = clampedAmt < 0 ? Math.abs(maxNegative) : MAX_AMT;
        const t = Math.log(mag / MIN_AMT) / Math.log(maxMag / MIN_AMT);
        return Math.round((clampedAmt < 0 ? -1 : 1) * t * 100);
      } else {
        // Unipolar slider: [0, 100]
        const clampedAmt = clamp(amt, 0, MAX_AMT);
        if (clampedAmt < MIN_AMT) return 0;
        const t = Math.log(clampedAmt / MIN_AMT) / Math.log(MAX_AMT / MIN_AMT);
        return Math.round(t * 100);
      }
    },
    [userHasShares, maxNegative]
  );

  // Convert slider value to amount
  const sliderToAmount = useCallback(
    (val: number) => {
      if (userHasShares) {
        // Bipolar
        const sign = val < 0 ? -1 : val > 0 ? 1 : 0;
        const t = Math.abs(val) / 100;
        if (sign === 0) return 0;
        const maxMag = sign < 0 ? Math.abs(maxNegative) : MAX_AMT;
        const nextMag = MIN_AMT * Math.exp(Math.log(maxMag / MIN_AMT) * t);
        return Math.round(sign * nextMag);
      } else {
        // Unipolar
        const t = val / 100;
        if (val === 0) return 0;
        const nextMag = MIN_AMT * Math.exp(Math.log(MAX_AMT / MIN_AMT) * t);
        return Math.round(nextMag);
      }
    },
    [userHasShares, maxNegative]
  );

  const sliderValue = useMemo(() => amountToSlider(amount), [amount, amountToSlider]);

  const handleSliderChange = (val: number) => {
    setAmount(sliderToAmount(val));
  };

  const handleInputChange = (val: number) => {
    if (!Number.isFinite(val)) return;
    const min = userHasShares ? maxNegative : 0;
    setAmount(clamp(val, min, MAX_AMT));
  };

  const incrementAmount = (delta: number) => {
    const min = userHasShares ? maxNegative : 0;
    setAmount(clamp(amount + delta, min, MAX_AMT));
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
                disabled={disabled || amount <= maxNegative}
                className="px-2.5 py-1 text-xs font-semibold bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700 rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                −$50
              </button>
              <button
                onClick={() => incrementAmount(-10)}
                disabled={disabled || amount <= maxNegative}
                className="px-2.5 py-1 text-xs font-semibold bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700 rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                −$10
              </button>
            </>
          )}
          <button
            onClick={() => incrementAmount(10)}
            disabled={disabled || amount >= MAX_AMT}
            className="px-2.5 py-1 text-xs font-semibold bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700 rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            +$10
          </button>
          <button
            onClick={() => incrementAmount(50)}
            disabled={disabled || amount >= MAX_AMT}
            className="px-2.5 py-1 text-xs font-semibold bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700 rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            +$50
          </button>
          {userHasShares && (
            <button
              onClick={() => setAmount(-mine)}
              disabled={disabled}
              className="px-2.5 py-1 text-xs font-semibold bg-rose-50 border border-rose-200 hover:border-rose-300 hover:bg-rose-100 text-rose-700 rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
            >
              Sell All
            </button>
          )}
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
