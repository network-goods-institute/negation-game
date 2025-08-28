import React, { useEffect, useMemo, useRef } from 'react';
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
  const onCloseRef = useRef(onClose);
  const readyRef = useRef(false);
  const openedAtRef = useRef<number>(0);
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    readyRef.current = false;
    openedAtRef.current = Date.now();
    const enable = () => { readyRef.current = true; };
    const t = window.setTimeout(enable, 0);
    const onPointerDown = (e: PointerEvent) => {
      if (!readyRef.current || Date.now() - openedAtRef.current < 16) return;
      const target = e.target as Node | null;
      if (menuRef.current && target && menuRef.current.contains(target)) return;
      onCloseRef.current?.();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current?.(); };
    window.addEventListener('pointerdown', onPointerDown, { capture: true } as any);
    window.addEventListener('keydown', onKey as any);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('pointerdown', onPointerDown as any, { capture: true } as any);
      window.removeEventListener('keydown', onKey as any);
    };
  }, [open]);

  const style = useMemo(() => ({
    position: 'fixed' as const,
    left: Math.max(8, Math.min(x, (typeof window !== 'undefined' ? window.innerWidth : 0) - 180)),
    top: Math.max(8, Math.min(y, (typeof window !== 'undefined' ? window.innerHeight : 0) - 8)),
    zIndex: 1000,
  }), [x, y]);

  if (!open || !root) return null;

  const menu = (
    <div ref={menuRef} style={style} onClick={(e) => e.stopPropagation()} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}>
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