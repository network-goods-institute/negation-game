import React from 'react';

interface NodeActionPillProps {
  label: string;
  visible: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  colorClass?: string; // e.g., 'bg-blue-700'
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onForceHide?: () => void;
}

// A shared pill that animates as if emerging from beneath the node.
// No timers; visibility/hover are controlled by the parent.
export const NodeActionPill: React.FC<NodeActionPillProps> = ({
  label,
  visible,
  onClick,
  colorClass = 'bg-stone-900',
  onMouseEnter,
  onMouseLeave,
  onForceHide,
}) => {
  const leaveTimerRef = React.useRef<number | null>(null);
  const interactable = visible;

  const handleEnter = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    onMouseEnter?.();
  };

  const handleLeave = () => {
    if (!interactable) return;
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = window.setTimeout(() => {
      onMouseLeave?.();
      leaveTimerRef.current = null;
    }, 140);
  };

  return (
    <div
      className={`absolute left-1/2 -translate-x-1/2 bottom-[-56px] flex h-[72px] w-[200px] items-end justify-center transition-transform duration-300 ease-out ${visible ? 'translate-y-0' : '-translate-y-2'}`}
      style={{ zIndex: visible ? 1000 : 0, pointerEvents: interactable ? 'auto' : 'none' }}
    >
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.stopPropagation();
          onClick(e);
          onMouseLeave?.();
          onForceHide?.();
        }}
        onMouseEnter={interactable ? handleEnter : undefined}
        onMouseLeave={interactable ? handleLeave : undefined}
        className={`${colorClass} rounded-full min-h-8 min-w-8 px-3 py-1 text-[11px] md:text-[12px] whitespace-nowrap font-medium text-white shadow-sm transition-all duration-200 ${visible ? 'opacity-100' : 'opacity-0'} ${visible ? '' : 'translate-y-1'} ${interactable ? 'hover:-translate-y-0.5' : ''}`}
        style={{ pointerEvents: interactable ? 'auto' : 'none' }}
        aria-label={label}
      >
        {label}
      </button>
    </div>
  );
};
