import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { buyAmount } from '@/utils/market/marketContextMenu';

type Props = {
  open: boolean;
  onClose: () => void;
  entityId: string;
  entityType: 'node' | 'edge';
  currentPrice?: number;
  onDelete?: () => void;
};

export const MarketSidePanel: React.FC<Props> = ({
  open,
  onClose,
  entityId,
  entityType,
  currentPrice,
  onDelete,
}) => {
  const root = typeof document !== 'undefined' ? document.body : null;
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [buyAmt, setBuyAmt] = useState<string>('');
  const [busy, setBusy] = useState(false);


  const MIN_AMT = 1;
  const MAX_AMT = 1000;
  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
  const amountNumber = useMemo(() => {
    const n = Number(buyAmt);
    return Number.isFinite(n) && n > 0 ? clamp(n, MIN_AMT, MAX_AMT) : 0;
  }, [buyAmt]);
  const amountToSlider = useCallback((amt: number) => {
    if (!amt || amt <= 0) return 0;
    const t = Math.log(amt / MIN_AMT) / Math.log(MAX_AMT / MIN_AMT);
    return Math.round(clamp(t * 100, 0, 100));
  }, []);
  const sliderToAmount = (val: number) => {
    const t = clamp(val, 0, 100) / 100;
    const amt = MIN_AMT * Math.exp(Math.log(MAX_AMT / MIN_AMT) * t);
    return Math.round(amt);
  };
  const [slider, setSlider] = useState<number>(amountToSlider(amountNumber));
  useEffect(() => { setSlider(amountToSlider(amountNumber)); }, [amountNumber, amountToSlider]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (panelRef.current && target && !panelRef.current.contains(target)) {
        onClose();
      }
    };
    window.addEventListener('pointerdown', onPointerDown, { capture: true });
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, { capture: true });
    };
  }, [open, onClose]);

  if (!open || !root) return null;

  const marketEnabled = process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED === 'true';

  const panel = (
    <div
      className="fixed inset-0 bg-black/20 z-[9999] flex items-center justify-end"
      style={{ pointerEvents: 'auto' }}
    >
      <div
        ref={panelRef}
        className="bg-white h-full w-[400px] shadow-2xl flex flex-col subpixel-antialiased"
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-sm font-semibold text-gray-800">Market Details</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {marketEnabled ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans subpixel-antialiased">
            {/* Bet amount */}
            <div className="rounded-lg p-4 space-y-3 bg-gray-50">
              <div className="text-base font-semibold text-gray-800">Bet amount</div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={buyAmt}
                    onChange={(e) => setBuyAmt(e.target.value)}
                    placeholder="Amount"
                    className="w-full text-lg px-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 disabled:bg-gray-50 subpixel-antialiased"
                    disabled={busy}
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</div>
                </div>
                {[-10, +10, +50].map((delta) => (
                  <button
                    key={delta}
                    className="px-3 py-2 rounded-md bg-gray-200 text-gray-800 text-sm font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => {
                      const n = Number(buyAmt) || 0;
                      const next = clamp(n + delta, MIN_AMT, MAX_AMT);
                      setBuyAmt(String(next));
                    }}
                    disabled={busy}
                  >
                    {delta > 0 ? `+${delta}` : `${delta}`}
                  </button>
                ))}
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={slider}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setSlider(v);
                  setBuyAmt(String(sliderToAmount(v)));
                }}
              />
            </div>

            {/* CTA */}
            <button
              className="w-full px-4 py-4 rounded-lg bg-emerald-500 text-white text-base font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={async () => {
                const n = Number(buyAmt);
                if (!Number.isFinite(n) || n <= 0 || busy) return;
                try {
                  setBusy(true);
                  await buyAmount(entityId, n);
                } finally {
                  setBusy(false);
                  setBuyAmt('');
                }
              }}
              disabled={busy || !(Number.isFinite(Number(buyAmt)) && Number(buyAmt) > 0)}
            >
              {(() => {
                const amount = Number(buyAmt) || 0;
                const p = Number(currentPrice || 0);
                const payoutIfWin = p > 0 ? (amount / p) : 0;
                const win = Math.max(0, payoutIfWin - amount);
                return `Buy to win $${win.toFixed(0)}`;
              })()}
            </button>

          </div>
        ) : (
          <div className="flex-1 p-4">
            <div className="text-sm text-gray-500">Market features are not enabled</div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(panel, root);
};
