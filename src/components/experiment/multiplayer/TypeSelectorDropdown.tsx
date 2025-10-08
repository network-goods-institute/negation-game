import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface TypeSelectorDropdownProps {
  open: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onSelect: (type: 'point' | 'statement') => void;
  currentType: 'point' | 'statement';
}

const typeOptions = [
  {
    type: 'point' as const,
    label: 'Point',
    icon: '●',
    description: 'Add a claim or argument',
    gradient: 'from-slate-500 to-slate-600',
    hoverGradient: 'hover:from-slate-600 hover:to-slate-700',
  },
  {
    type: 'statement' as const,
    label: 'Question',
    icon: '?',
    description: 'Pose a question',
    gradient: 'from-blue-500 to-blue-600',
    hoverGradient: 'hover:from-blue-600 hover:to-blue-700',
  },
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
    left: Math.max(8, Math.min(x, (typeof window !== 'undefined' ? window.innerWidth : 0) - 190)),
    top: Math.max(8, Math.min(y, (typeof window !== 'undefined' ? window.innerHeight : 0) - 100)),
    zIndex: 1000,
  };

  const menu = (
    <div
      ref={menuRef}
      style={style}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
      className="animate-in fade-in zoom-in-95 duration-200"
    >
      <div className="bg-white/95 backdrop-blur-xl border border-gray-200/50 shadow-2xl rounded-xl p-1.5 min-w-[180px]">
        {typeOptions.map((option, idx) => (
          <button
            key={option.type}
            className={`group w-full text-left px-2.5 py-2 rounded-lg transition-all duration-200 flex items-center gap-2.5 ${
              option.type === currentType
                ? 'bg-gray-100/80 shadow-sm'
                : 'hover:bg-gray-50/50 hover:shadow-sm'
            }`}
            onClick={() => {
              onSelect(option.type);
              onClose();
            }}
          >
            <div className={`flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br ${option.gradient} ${option.hoverGradient} shadow-sm flex items-center justify-center text-white font-bold text-sm transition-all duration-200 group-hover:scale-105`}>
              {option.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm">
                {option.label}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  return createPortal(menu, root);
};
