"use client";
import React, { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { normalizeSecurityId } from '@/utils/market/marketUtils';
import { buyAmount as buyAmountClient } from '@/utils/market/marketContextMenu';
import { InlinePriceHistory } from './InlinePriceHistory';

type Props = {
  entityId: string;
  docId?: string;
  price: number; // expected 0..1 probability-like price
  className?: string;
  initialMine?: number;
  initialTotal?: number;
  variant?: 'default' | 'objection';
  initialOpen?: boolean;
  onDismiss?: () => void;
  showPriceHistory?: boolean; // Show inline price history chart (default true for edges, false for nodes)
};

const PRESETS = [10, 50];

export const InlineBuyControls: React.FC<Props> = ({ entityId, docId, price, className, initialMine, initialTotal, variant = 'default', initialOpen = false, onDismiss, showPriceHistory = true }) => {
  const [open, setOpen] = useState(initialOpen);
  const [amount, setAmount] = useState<number>(50);
  const userShares = Number(initialMine || 0);
  const userHasShares = userShares > 0;
  const maxNegative = -Math.floor(userShares);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const resolvedDocId = useMemo(() => {
    if (docId && docId.length > 0) return docId;
    try { return window.location.pathname.split('/').pop() || ''; } catch { return ''; }
  }, [docId]);

  const normId = useMemo(() => normalizeSecurityId(entityId), [entityId]);

  // No fixed width caching; rely on layout w-full and overflow control to match node width dynamically

  const estimatedShares = useMemo(() => {
    const p = Number(price);
    if (!Number.isFinite(p) || p <= 0) return 0;
    return amount / p;
  }, [amount, price]);

  const estimatedPayout = useMemo(() => {
    const p = Number(price);
    if (!Number.isFinite(p) || p <= 0) return 0;
    return amount / p;
  }, [amount, price]);

  const onSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      toast.info('Order placed ✅');
      setOpen(false);
      onDismiss?.();
      const result = await buyAmountClient(normId, amount) as any;
      const success = result !== false;
      if (success) {
        toast.success('Order complete 🎉');
      } else {
        toast.error('Order failed');
      }
    } catch (e: any) {
      const msg = String(e?.message || 'Order failed');
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <div
        ref={boxRef}
        className={`mt-2 nodrag nopan ${className || ''} animate-in fade-in-0 zoom-in-95`}
        data-interactive="true"
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onDragStart={(e) => e.preventDefault()}
        style={{ pointerEvents: 'auto', position: 'relative', zIndex: 25, maxWidth: '100%' }}
      >
        <div
          className="-m-4 p-4"
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          style={{ cursor: 'pointer' }}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setOpen(true); }}
            role="button"
            className="w-full text-sm bg-emerald-600 text-white rounded-md px-3 py-1.5 hover:bg-emerald-700 transition"
          >
            Buy
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={boxRef}
      className={`mt-2 nodrag nopan ${className || ''} animate-in fade-in-0 zoom-in-95`}
      data-interactive="true"
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onDragStart={(e) => e.preventDefault()}
      style={{ pointerEvents: 'auto', position: 'relative', zIndex: 25, maxWidth: '100%' }}
    >
      <div
        className={`relative w-full min-w-0 overflow-visible rounded-md p-2 space-y-2 text-[11px] subpixel-antialiased ${variant === 'objection' ? 'border border-amber-300 bg-amber-50 text-amber-900' : 'border border-stone-200 bg-white text-stone-800'}`}
        data-interactive="true"
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); if (!submitting) { setOpen(false); onDismiss?.(); } }}
          disabled={submitting}
          className="absolute -top-2 -right-2 w-7 h-7 flex items-center justify-center text-stone-600 hover:text-stone-900 bg-white border border-stone-300 hover:bg-stone-100 rounded-full transition disabled:opacity-50 shadow-sm"
          aria-label="Close"
        >
          <span className="text-[14px] leading-none">×</span>
        </button>
        {showPriceHistory && (
          <div className="w-full min-w-0 overflow-hidden">
            <InlinePriceHistory
              entityId={entityId}
              docId={resolvedDocId}
              currentPrice={price}
              variant={variant}
              className="w-full min-w-0"
              compact={true}
            />
          </div>
        )}
        <div className="flex items-center gap-1" data-interactive="true">
          <div className="ml-1 relative flex-1">
            <input
              type="number"
              className={`w-full text-[11px] border rounded pl-24 pr-24 py-0.5 subpixel-antialiased ${variant === 'objection' ? 'border-amber-300' : ''}`}
              value={amount}
              min={maxNegative}
              max={1000}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (!Number.isFinite(val)) return;
                setAmount(Math.max(maxNegative, Math.min(1000, val)));
              }}
              placeholder="Amount"
            />
            <div className="absolute left-1 top-1/2 -translate-y-1/2 flex gap-1">
              <button
                type="button"
                aria-label="Decrement by 50"
                onClick={(e) => { e.stopPropagation(); const next = amount - 50; setAmount(Math.max(maxNegative, next)); }}
                className="h-5 px-1 rounded border text-[10px] bg-white hover:bg-stone-50"
                disabled={amount <= maxNegative}
              >
                −50
              </button>
              <button
                type="button"
                aria-label="Decrement by 10"
                onClick={(e) => { e.stopPropagation(); const next = amount - 10; setAmount(Math.max(maxNegative, next)); }}
                className="h-5 px-1 rounded border text-[10px] bg-white hover:bg-stone-50"
                disabled={amount <= maxNegative}
              >
                −10
              </button>
            </div>
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
              <button
                type="button"
                aria-label="Increment by 10"
                onClick={(e) => { e.stopPropagation(); const next = amount + 10; setAmount(Math.min(1000, next)); }}
                className="h-5 px-1 rounded border text-[10px] bg-white hover:bg-stone-50"
                disabled={amount >= 1000}
              >
                +10
              </button>
              <button
                type="button"
                aria-label="Increment by 50"
                onClick={(e) => { e.stopPropagation(); const next = amount + 50; setAmount(Math.min(1000, next)); }}
                className="h-5 px-1 rounded border text-[10px] bg-white hover:bg-stone-50"
                disabled={amount >= 1000}
              >
                +50
              </button>
            </div>
          </div>
        </div>

        {(() => {
          const MIN_MAG = 1;
          const MAX_MAG = 1000;
          const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

          if (userHasShares) {
            // Bipolar log slider: [-100,100] with 0 -> 0; magnitude maps log between 1..maxNegative (negative) and 1..1000 (positive)
            const amt = clamp(amount, maxNegative, MAX_MAG);
            const mag = Math.abs(amt);
            let sliderVal = 0;
            if (mag >= MIN_MAG) {
              const maxMag = amt < 0 ? Math.abs(maxNegative) : MAX_MAG;
              const t = Math.log(mag / MIN_MAG) / Math.log(maxMag / MIN_MAG);
              sliderVal = Math.round((amt < 0 ? -1 : 1) * t * 100);
            } else if (mag > 0) {
              sliderVal = 0;
            }
            const onSlider = (v: number) => {
              const sign = v < 0 ? -1 : v > 0 ? 1 : 0;
              const t = Math.abs(v) / 100;
              if (sign === 0) {
                setAmount(0);
                return;
              }
              const maxMag = sign < 0 ? Math.abs(maxNegative) : MAX_MAG;
              const nextMag = MIN_MAG * Math.exp(Math.log(maxMag / MIN_MAG) * t);
              setAmount(Math.round(sign * nextMag));
            };
            return (
              <input
                type="range"
                min={-100}
                max={100}
                value={sliderVal}
                onChange={(e) => onSlider(Number(e.target.value))}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerMove={(e) => e.stopPropagation()}
                className="w-full h-[4px] accent-emerald-600"
              />
            );
          } else {
            // Unipolar log slider: [0,100] mapping to 0..1000
            const amt = clamp(amount, 0, MAX_MAG);
            let sliderVal = 0;
            if (amt >= MIN_MAG) {
              const t = Math.log(amt / MIN_MAG) / Math.log(MAX_MAG / MIN_MAG);
              sliderVal = Math.round(t * 100);
            }
            const onSlider = (v: number) => {
              const t = v / 100;
              if (v === 0) {
                setAmount(0);
                return;
              }
              const nextMag = MIN_MAG * Math.exp(Math.log(MAX_MAG / MIN_MAG) * t);
              setAmount(Math.round(nextMag));
            };
            return (
              <input
                type="range"
                min={0}
                max={100}
                value={sliderVal}
                onChange={(e) => onSlider(Number(e.target.value))}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerMove={(e) => e.stopPropagation()}
                className="w-full h-[4px] accent-emerald-600"
              />
            );
          }
        })()}

        {(() => {
          // Calculate position info
          const currentShares = Number(initialMine || 0);
          const currentPosition = currentShares * price;
          const newShares = currentShares + estimatedShares;
          const newPosition = newShares * price;
          const gain = newPosition - currentPosition;
          const totalOutstanding = Number(initialTotal || 0);

          return (
            <div className="text-[11px] text-stone-700 space-y-1" data-interactive="true">
              {currentShares > 0 && (
                <div>
                  ${Math.round(currentPosition)} your position ({Math.round(currentShares)} shares) {gain >= 0 ? (
                    <span className="text-emerald-600">+${Math.round(gain)} gain</span>
                  ) : (
                    <span className="text-rose-600">-${Math.round(Math.abs(gain))} loss</span>
                  )} {totalOutstanding > 0 && <span className="text-stone-500">• {Math.round(totalOutstanding)} shares outstanding</span>}
                </div>
              )}
              {currentShares === 0 && totalOutstanding > 0 && (
                <div className="text-stone-500">{Math.round(totalOutstanding)} shares outstanding</div>
              )}
            </div>
          );
        })()}

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSubmit(); }}
          disabled={submitting}
          className="relative z-20 w-full text-sm bg-emerald-600 text-white rounded-md px-3 py-1.5 hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Buying…' : `Buy ($${estimatedPayout.toFixed(0)})`}
        </button>
      </div>
    </div>
  );
};

