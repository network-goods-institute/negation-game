import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

interface MenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface ContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  onClose: () => void;
  items: MenuItem[];
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ open, x, y, onClose, items }) => {
  const root = typeof document !== 'undefined' ? document.body : null;

  useEffect(() => {
    if (!open) return;
    const onGlobalClick = () => onClose();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('click', onGlobalClick);
    window.addEventListener('keydown', onKey as any);
    return () => {
      window.removeEventListener('click', onGlobalClick as any);
      window.removeEventListener('keydown', onKey as any);
    };
  }, [open, onClose]);

  const style = useMemo(() => ({
    position: 'fixed' as const,
    left: Math.max(8, Math.min(x, (typeof window !== 'undefined' ? window.innerWidth : 0) - 180)),
    top: Math.max(8, Math.min(y, (typeof window !== 'undefined' ? window.innerHeight : 0) - 8)),
    zIndex: 1000,
  }), [x, y]);

  if (!open || !root) return null;

  const menu = (
    <div style={style} onClick={(e) => e.stopPropagation()} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}>
      <div className="bg-white border shadow-md rounded-md py-1 min-w-[160px]">
        {items.map((it, idx) => (
          <button
            key={idx}
            className={`w-full text-left px-3 py-1.5 text-sm hover:bg-stone-100 ${it.danger ? 'text-red-600' : 'text-stone-800'}`}
            onClick={() => { it.onClick(); onClose(); }}
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );

  return createPortal(menu, root);
};