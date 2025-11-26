import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { buyShares, sellShares, buyAmount, sellAmount, closePosition } from '@/utils/market/marketContextMenu';

type Kind = 'node' | 'edge';

type Props = {
  open: boolean;
  x: number;
  y: number;
  onClose: () => void;
  kind: Kind;
  entityId: string;
  onDelete?: () => void;
  nodeRect?: DOMRect;
  nodeEl?: HTMLElement;
  edgeType?: string;
};

export const MarketContextMenu: React.FC<Props> = ({ open, x, y, onClose, kind, entityId, onDelete, nodeRect, nodeEl, edgeType }) => {
  const root = typeof document !== 'undefined' ? document.body : null;
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (menuRef.current && target && menuRef.current.contains(target)) return;
      onCloseRef.current?.();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current?.(); };
    window.addEventListener('pointerdown', onPointerDown, { capture: true } as any);
    window.addEventListener('keydown', onKey as any);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown as any, { capture: true } as any);
      window.removeEventListener('keydown', onKey as any);
    };
  }, [open]);

  const [buyAmt, setBuyAmt] = useState<string>('');
  const [sellAmt, setSellAmt] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: x, top: y });

  useEffect(() => {
    if (!open) return;
    let raf = 0;
    const update = () => {
      try {
        const rect = (nodeEl?.getBoundingClientRect?.() as DOMRect) || nodeRect || null;
        if (rect) {
          const left = rect.right + 8;
          const top = rect.top + rect.height / 2;
          setPos((prev) => (prev.left !== left || prev.top !== top ? { left, top } : prev));
        } else {
          setPos({ left: x, top: y });
        }
      } catch {
        setPos({ left: x, top: y });
      }
      raf = window.requestAnimationFrame(update);
    };
    raf = window.requestAnimationFrame(update);
    const onResize = () => update();
    window.addEventListener('resize', onResize);
    return () => {
      try { window.cancelAnimationFrame(raf); } catch { }
      window.removeEventListener('resize', onResize);
    };
  }, [open, nodeEl, nodeRect, x, y]);

  if (!open || !root) return null;

  const style = {
    position: 'fixed' as const,
    left: pos.left,
    top: pos.top,
    transform: 'translateY(-50%)',
    zIndex: 1000,
  };

  const marketEnabled = process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED === 'true';
  const showMarket = marketEnabled && (kind === 'node' || edgeType === 'support' || edgeType === 'negation');

  const menu = (
    <div
      ref={menuRef}
      style={style}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      {showMarket ? (
        <div className="bg-white border border-gray-200 shadow-lg rounded-md w-auto min-w-[240px] max-w-[280px] pointer-events-auto overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              <span className="text-xs font-medium text-gray-700">Market</span>
            </div>
            {onDelete && (
              <button
                className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
                onClick={() => { if (busy) return; onDelete(); onClose(); }}
                disabled={busy}
              >
                Delete
              </button>
            )}
          </div>

          <div className="p-3 space-y-3">
            <div className="space-y-1.5">
              <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Quick Actions</div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  className="px-2 py-1.5 rounded bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={async () => { if (busy) return; try { setBusy(true); await buyShares(entityId, 1); } finally { setBusy(false); onClose(); } }}
                  disabled={busy}
                >
                  +1
                </button>
                <button
                  className="px-2 py-1.5 rounded bg-rose-500 text-white text-xs font-medium hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={async () => { if (busy) return; try { setBusy(true); await sellShares(entityId, 1); } finally { setBusy(false); onClose(); } }}
                  disabled={busy}
                >
                  −1
                </button>
                <button
                  className="px-2 py-1.5 rounded bg-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={async () => { if (busy) return; try { setBusy(true); await closePosition(entityId); } finally { setBusy(false); onClose(); } }}
                  disabled={busy}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Buy (spend)</div>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  value={buyAmt}
                  onChange={(e) => setBuyAmt(e.target.value)}
                  placeholder="Spend amount"
                  className="flex-1 text-xs px-2 py-1.5 rounded border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 disabled:bg-gray-50"
                  disabled={busy}
                />
                <button
                  className="px-3 py-1.5 rounded bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={async () => { const n = Number(buyAmt); if (!Number.isFinite(n) || n === 0 || busy) return; try { setBusy(true); await buyAmount(entityId, n); } finally { setBusy(false); onClose(); setBuyAmt(''); } }}
                  disabled={busy}
                >
                  Buy
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Sell</div>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  value={sellAmt}
                  onChange={(e) => setSellAmt(e.target.value)}
                  placeholder="Amount"
                  className="flex-1 text-xs px-2 py-1.5 rounded border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 disabled:opacity-50 disabled:bg-gray-50"
                  disabled={busy}
                />
                <button
                  className="px-3 py-1.5 rounded bg-rose-500 text-white text-xs font-medium hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={async () => { const n = Number(sellAmt); if (!Number.isFinite(n) || n === 0 || busy) return; try { setBusy(true); await sellAmount(entityId, n); } finally { setBusy(false); onClose(); setSellAmt(''); } }}
                  disabled={busy}
                >
                  Sell
                </button>
              </div>
            </div>

            {busy && (
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-500 py-1">
                <div className="w-2.5 h-2.5 rounded-full border-2 border-gray-300 border-t-emerald-500 animate-spin" />
                <span>Processing...</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 shadow-md rounded-md min-w-[180px] pointer-events-auto overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
            <span className="text-xs font-medium text-gray-700">Actions</span>
          </div>
          <div className="p-2">
            {onDelete ? (
              <button
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-stone-100 text-red-600"
                onClick={() => { if (busy) return; onDelete(); onClose(); }}
                disabled={busy}
              >
                Delete
              </button>
            ) : (
              <div className="text-xs text-gray-500 px-2 py-1.5">No actions available</div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(menu, root);
};
