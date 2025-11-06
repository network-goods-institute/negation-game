import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { buyShares, sellShares, buyAmount, sellAmount, closePosition } from '@/utils/market/marketContextMenu';

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
  const [sellAmt, setSellAmt] = useState<string>('');
  const [busy, setBusy] = useState(false);

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
        className="bg-white h-full w-[400px] shadow-2xl flex flex-col animate-slide-in-right"
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
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Current Price
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {currentPrice != null ? currentPrice.toFixed(4) : '—'}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Quick Actions
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  className="px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={async () => {
                    if (busy) return;
                    try {
                      setBusy(true);
                      await buyShares(entityId, 1);
                    } finally {
                      setBusy(false);
                    }
                  }}
                  disabled={busy}
                >
                  +1
                </button>
                <button
                  className="px-3 py-2 rounded-lg bg-rose-500 text-white text-sm font-medium hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={async () => {
                    if (busy) return;
                    try {
                      setBusy(true);
                      await sellShares(entityId, 1);
                    } finally {
                      setBusy(false);
                    }
                  }}
                  disabled={busy}
                >
                  −1
                </button>
                <button
                  className="px-3 py-2 rounded-lg bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={async () => {
                    if (busy) return;
                    try {
                      setBusy(true);
                      await closePosition(entityId);
                    } finally {
                      setBusy(false);
                      onClose();
                    }
                  }}
                  disabled={busy}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Buy
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={buyAmt}
                  onChange={(e) => setBuyAmt(e.target.value)}
                  placeholder="Amount"
                  className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 disabled:bg-gray-50"
                  disabled={busy}
                />
                <button
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={async () => {
                    const n = Number(buyAmt);
                    if (!Number.isFinite(n) || n === 0 || busy) return;
                    try {
                      setBusy(true);
                      await buyAmount(entityId, n);
                    } finally {
                      setBusy(false);
                      setBuyAmt('');
                    }
                  }}
                  disabled={busy}
                >
                  Buy
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Sell
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={sellAmt}
                  onChange={(e) => setSellAmt(e.target.value)}
                  placeholder="Amount"
                  className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 disabled:opacity-50 disabled:bg-gray-50"
                  disabled={busy}
                />
                <button
                  className="px-4 py-2 rounded-lg bg-rose-500 text-white text-sm font-medium hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={async () => {
                    const n = Number(sellAmt);
                    if (!Number.isFinite(n) || n === 0 || busy) return;
                    try {
                      setBusy(true);
                      await sellAmount(entityId, n);
                    } finally {
                      setBusy(false);
                      setSellAmt('');
                    }
                  }}
                  disabled={busy}
                >
                  Sell
                </button>
              </div>
            </div>

            {busy && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-2">
                <div className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-emerald-500 animate-spin" />
                <span>Processing...</span>
              </div>
            )}

            {onDelete && (
              <div className="pt-4 border-t border-gray-200">
                <button
                  className="w-full px-4 py-2 rounded-lg bg-red-50 text-red-600 border border-red-200 text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                  onClick={() => {
                    if (busy) return;
                    onDelete();
                    onClose();
                  }}
                  disabled={busy}
                >
                  Delete {entityType === 'node' ? 'Node' : 'Edge'}
                </button>
              </div>
            )}
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
