import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { buyAmount } from '@/utils/market/marketContextMenu';

type Props = {
  open: boolean;
  onClose: () => void;
  onExpand: () => void;
  entityId: string;
  x: number;
  y: number;
};

export const QuickBuyActions: React.FC<Props> = ({
  open,
  onClose,
  onExpand,
  entityId,
  x,
  y,
}) => {
  const root = typeof document !== 'undefined' ? document.body : null;
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (menuRef.current && target && menuRef.current.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('pointerdown', onPointerDown, { capture: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, { capture: true });
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || !root) return null;

  const handleBuy = async (amount: number) => {
    if (busy) return;
    try {
      setBusy(true);
      await buyAmount(entityId, amount);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const menu = (
    <div
      ref={menuRef}
      className="fixed bg-white border border-gray-200 shadow-lg rounded-lg overflow-hidden z-[9998]"
      style={{ left: x, top: y, minWidth: 200 }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
          <span className="text-xs font-medium text-gray-700">Quick Buy</span>
        </div>
      </div>

      <div className="p-2 space-y-1.5">
        <button
          className="w-full px-3 py-2 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => handleBuy(10)}
          disabled={busy}
        >
          Buy $10
        </button>
        <button
          className="w-full px-3 py-2 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => handleBuy(25)}
          disabled={busy}
        >
          Buy $25
        </button>
        <button
          className="w-full px-3 py-2 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => handleBuy(50)}
          disabled={busy}
        >
          Buy $50
        </button>

        <div className="pt-1.5 border-t border-gray-200">
          <button
            className="w-full px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
            onClick={() => {
              onExpand();
              onClose();
            }}
          >
            <span>More Options</span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>

      {busy && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 py-2 border-t border-gray-200">
          <div className="w-3 h-3 rounded-full border-2 border-gray-300 border-t-emerald-500 animate-spin" />
          <span>Processing...</span>
        </div>
      )}
    </div>
  );

  return createPortal(menu, root);
};
