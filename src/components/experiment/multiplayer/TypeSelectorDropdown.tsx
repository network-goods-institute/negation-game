import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface TypeSelectorDropdownProps {
  open: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onSelect: (type: 'point' | 'statement' | 'objection') => void;
  currentType: 'point' | 'statement' | 'objection';
}

const typeOptions = [
  { type: 'point' as const, label: 'Point', color: 'bg-green-50 hover:bg-green-100 text-green-800', dot: 'bg-green-500' },
  { type: 'statement' as const, label: 'Statement', color: 'bg-blue-50 hover:bg-blue-100 text-blue-800', dot: 'bg-blue-500' },
  { type: 'objection' as const, label: 'Objection', color: 'bg-red-50 hover:bg-red-100 text-red-800', dot: 'bg-red-500' },
];

export const TypeSelectorDropdown: React.FC<TypeSelectorDropdownProps> = ({ 
  open, 
  x, 
  y, 
  onClose, 
  onSelect, 
  currentType 
}) => {
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
    
    const onKey = (e: KeyboardEvent) => { 
      if (e.key === 'Escape') onCloseRef.current?.(); 
    };
    
    window.addEventListener('pointerdown', onPointerDown, { capture: true } as any);
    window.addEventListener('keydown', onKey as any);
    
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('pointerdown', onPointerDown as any, { capture: true } as any);
      window.removeEventListener('keydown', onKey as any);
    };
  }, [open]);

  if (!open || !root) return null;

  const style = {
    position: 'fixed' as const,
    left: Math.max(8, Math.min(x, (typeof window !== 'undefined' ? window.innerWidth : 0) - 140)),
    top: Math.max(8, Math.min(y, (typeof window !== 'undefined' ? window.innerHeight : 0) - 120)),
    zIndex: 1000,
  };

  const menu = (
    <div 
      ref={menuRef} 
      style={style} 
      onClick={(e) => e.stopPropagation()} 
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      <div className="bg-white border border-gray-200 shadow-xl rounded-xl py-2 min-w-[140px] backdrop-blur-sm">
        {typeOptions.map((option) => (
          <button
            key={option.type}
            className={`w-full text-left px-4 py-3 text-sm font-medium transition-all duration-150 flex items-center gap-3 rounded-lg mx-1 ${
              option.type === currentType 
                ? `${option.color} ring-1 ring-gray-300` 
                : `text-gray-700 hover:bg-gray-50`
            }`}
            onClick={() => {
              onSelect(option.type);
              onClose();
            }}
          >
            <div className={`w-2 h-2 rounded-full ${option.dot}`} />
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );

  return createPortal(menu, root);
};