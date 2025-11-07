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
};

const PRESETS = [-50, -10, 10, 50];

export const InlineBuyControls: React.FC<Props> = ({ entityId, docId, price, className, initialMine, initialTotal, variant = 'default', initialOpen = false, onDismiss }) => {
  const [open, setOpen] = useState(initialOpen);
  const [amount, setAmount] = useState<number>(10);
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
    try {
      if (submitting) return;
      setSubmitting(true);

      await buyAmountClient(normId, amount); // triggers optimistic event + refresh
      toast.success(`Order placed`);
      setOpen(false);
      setSubmitting(false);
    } catch (e: any) {
      toast.error('Purchase failed');
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <div
        ref={boxRef}
        className={`mt-2 nodrag nopan ${className || ''}`}
        data-interactive="true"
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onDragStart={(e) => e.preventDefault()}
        style={{ pointerEvents: 'auto', position: 'relative', zIndex: 25, width: '320px', maxWidth: '320px' }}
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
    );
  }

  return (
    <div
      ref={boxRef}
      className={`mt-2 nodrag nopan ${className || ''}`}
      data-interactive="true"
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onDragStart={(e) => e.preventDefault()}
      style={{ pointerEvents: 'auto', position: 'relative', zIndex: 25, width: '320px', maxWidth: '320px' }}
    >
      <div
        className={`w-full min-w-0 overflow-hidden rounded-md p-2 space-y-2 text-[11px] subpixel-antialiased ${variant === 'objection' ? 'border border-amber-300 bg-amber-50 text-amber-900' : 'border border-stone-200 bg-white text-stone-800'}`}
        data-interactive="true"
      >
        <div className="w-full max-w-[320px] min-w-0 overflow-hidden">
          <InlinePriceHistory
            entityId={entityId}
            docId={resolvedDocId}
            currentPrice={price}
            variant={variant}
            className="w-full max-w-[320px] min-w-0"
            compact={true}
          />
        </div>
        <div className="flex items-center gap-1" data-interactive="true">
          {PRESETS.map((delta) => (
            <button
              key={delta}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const next = amount + delta;
                setAmount(Math.max(-1000, Math.min(1000, next)));
              }}
              className={`text-[10px] px-2 py-0.5 rounded border bg-white ${variant === 'objection' ? 'text-amber-800 border-amber-300 hover:bg-amber-50' : 'text-stone-700 border-stone-300 hover:bg-stone-50'}`}
            >
              {delta > 0 ? `+${delta}` : `${delta}`}
            </button>
          ))}
          <input
            type="number"
            className={`ml-1 flex-1 text-[11px] border rounded px-2 py-0.5 subpixel-antialiased ${variant === 'objection' ? 'border-amber-300' : ''}`}
            value={amount}
            min={-1000}
            max={1000}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (!Number.isFinite(val)) return;
              setAmount(Math.max(-1000, Math.min(1000, val)));
            }}
            placeholder="Amount"
          />
        </div>

        {(() => {
          // Bipolar log slider: [-100,100] with 0 -> 0; magnitude maps log between 1..1000
          const MIN_MAG = 1;
          const MAX_MAG = 1000;
          const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
          const amt = clamp(amount, -MAX_MAG, MAX_MAG);
          const mag = Math.abs(amt);
          let sliderVal = 0;
          if (mag >= MIN_MAG) {
            const t = Math.log(mag / MIN_MAG) / Math.log(MAX_MAG / MIN_MAG);
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
            const nextMag = MIN_MAG * Math.exp(Math.log(MAX_MAG / MIN_MAG) * t);
            setAmount(Math.round(sign * nextMag));
          };
          return (
            <input
              type="range"
              min={-100}
              max={100}
              value={sliderVal}
              onChange={(e) => onSlider(Number(e.target.value))}
              className="w-full h-[4px]"
            />
          );
        })()}

        <div className="flex gap-2 min-w-0" data-interactive="true">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSubmit(); }}
            disabled={submitting}
            className={`flex-1 min-w-0 text-[11px] rounded-md px-2.5 py-1 transition whitespace-nowrap truncate disabled:opacity-50 disabled:cursor-not-allowed ${variant === 'objection' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-stone-900 hover:bg-black text-white'}`}
          >
            {submitting ? 'Buying…' : `Buy $${amount} (Estimated payout $${estimatedPayout.toFixed(0)})`}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); if (!submitting) { setOpen(false); onDismiss?.(); } }}
            disabled={submitting}
            className={`text-[11px] bg-white rounded-md px-2.5 py-1 transition disabled:opacity-50 disabled:cursor-not-allowed ${variant === 'objection' ? 'border border-amber-300 text-amber-800 hover:bg-amber-50' : 'border border-stone-300 text-stone-700 hover:bg-stone-50'}`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};


