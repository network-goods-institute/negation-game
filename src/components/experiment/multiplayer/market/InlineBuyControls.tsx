"use client";
import React, { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { normalizeSecurityId, sharesToScaled, dispatchMarketRefresh } from '@/utils/market/marketUtils';

type Props = {
  entityId: string;
  docId?: string;
  price: number; // expected 0..1 probability-like price
  className?: string;
  initialMine?: number;
  initialTotal?: number;
};

const PRESETS = [5, 10, 25, 100, 500];

export const InlineBuyControls: React.FC<Props> = ({ entityId, docId, price, className, initialMine, initialTotal }) => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(10);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [optimisticMine, setOptimisticMine] = useState<number | null>(null);
  const [optimisticTotal, setOptimisticTotal] = useState<number | null>(null);

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
    // NOTE: This formula is temporary and not correct. It is only a placeholder.
    // Connor's placeholder: payout if you win ≈ amount / P(point)
    return amount / p;
  }, [amount, price]);

  const estimatedGain = Math.max(0, estimatedPayout - amount);

  const onSubmit = async () => {
    try {
      if (submitting) return;
      setSubmitting(true);
      if (!resolvedDocId) {
        toast.error('Missing document id');
        setSubmitting(false);
        return;
      }
      const deltaScaled = sharesToScaled(estimatedShares);
      // optimistic update (local UI only)
      if (Number.isFinite(initialMine as any)) {
        setOptimisticMine((initialMine || 0) + estimatedShares);
      }
      if (Number.isFinite(initialTotal as any)) {
        setOptimisticTotal((initialTotal || 0) + estimatedShares);
      }
      const res = await fetch(`/api/market/${encodeURIComponent(resolvedDocId)}/buy-shares`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ securityId: normId, deltaScaled }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j?.error || 'Failed to buy');
        // rollback optimistic
        setOptimisticMine(null);
        setOptimisticTotal(null);
        setSubmitting(false);
        return;
      }
      toast.success(`Purchased ~${estimatedShares.toFixed(2)} shares`);
      try { dispatchMarketRefresh(); } catch {}
      setOpen(false);
      setSubmitting(false);
    } catch (e: any) {
      toast.error('Purchase failed');
      setOptimisticMine(null);
      setOptimisticTotal(null);
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
        style={{ pointerEvents: 'auto', position: 'relative', zIndex: 25 }}
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
      style={{ pointerEvents: 'auto', position: 'relative', zIndex: 25 }}
    >
      <div
        className="w-full max-w-full overflow-hidden rounded-md border border-stone-200 bg-white/95 backdrop-blur-sm shadow-sm p-2 space-y-2 text-[11px]"
        data-interactive="true"
      >
        <div className="flex items-center justify-between" data-interactive="true">
          <div className="text-stone-700">Price: ${price.toFixed(2)}</div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
            className="px-2 py-0.5 rounded border border-stone-300 text-stone-600 hover:bg-stone-50"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1" data-interactive="true">
          {PRESETS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={(e) => { e.stopPropagation(); setAmount(v); }}
              className={`text-[10px] px-2 py-0.5 rounded border ${(amount === v) ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'}`}
            >
              ${v}
            </button>
          ))}
        </div>

        <div className="min-w-0" data-interactive="true">
          <input
            type="range"
            min={1}
            max={500}
            step={1}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full h-[4px]"
          />
        </div>

        <div className="flex items-center gap-2 min-w-0" data-interactive="true">
          <button type="button" onClick={(e) => { e.stopPropagation(); setAmount(Math.max(1, amount - 5)); }} className="px-2 py-0.5 rounded border border-stone-300 text-stone-700 hover:bg-stone-50">-5</button>
          <input
            type="number"
            className="w-20 text-[11px] border rounded px-2 py-0.5"
            value={amount}
            min={1}
            max={500}
            onChange={(e) => setAmount(Math.max(1, Math.min(500, Number(e.target.value))))}
          />
          <button type="button" onClick={(e) => { e.stopPropagation(); setAmount(Math.min(500, amount + 5)); }} className="px-2 py-0.5 rounded border border-stone-300 text-stone-700 hover:bg-stone-50">+5</button>
        </div>

        <div className="text-[11px] text-stone-700" data-interactive="true">Estimated shares: {estimatedShares.toFixed(2)}</div>
        <div className="text-[11px] text-stone-700" data-interactive="true">Estimated payout: ${estimatedPayout.toFixed(2)}</div>
        <div className="text-[11px] text-stone-700" data-interactive="true">Estimated gain: ${estimatedGain.toFixed(2)}</div>
        {(initialMine != null || optimisticMine != null) && (
          <div className="text-[11px] text-stone-600" data-interactive="true">
            Your shares (after): {(optimisticMine ?? initialMine ?? 0).toFixed(2)}
          </div>
        )}
        {(initialTotal != null || optimisticTotal != null) && (
          <div className="text-[11px] text-stone-600" data-interactive="true">
            Total shares (after): {(optimisticTotal ?? initialTotal ?? 0).toFixed(2)}
          </div>
        )}

        <div className="flex gap-2 min-w-0" data-interactive="true">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSubmit(); }}
            disabled={submitting}
            className="flex-1 min-w-0 text-[11px] bg-stone-900 text-white rounded-md px-2.5 py-1 hover:bg-black transition whitespace-nowrap truncate disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Buying…' : `Buy $${amount} (Estimated payout ${estimatedPayout.toFixed(0)})`}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); if (!submitting) setOpen(false); }}
            disabled={submitting}
            className="text-[11px] bg-white border border-stone-300 text-stone-700 rounded-md px-2.5 py-1 hover:bg-stone-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};


