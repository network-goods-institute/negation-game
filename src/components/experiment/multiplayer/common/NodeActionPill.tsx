import React from 'react';

interface NodeActionPillProps {
  label: string;
  visible: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  colorClass?: string; // e.g., 'bg-blue-700'
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

// A shared pill that animates as if emerging from beneath the node.
// No timers; visibility/hover are controlled by the parent.
export const NodeActionPill: React.FC<NodeActionPillProps> = ({
  label,
  visible,
  onClick,
  colorClass = 'bg-stone-800',
  onMouseEnter,
  onMouseLeave,
}) => {
  const leaveTimerRef = React.useRef<number | null>(null);

  const handleEnter = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    onMouseEnter?.();
  };

  const handleLeave = () => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = window.setTimeout(() => {
      onMouseLeave?.();
      leaveTimerRef.current = null;
    }, 140);
  };

  return (
    <div
      className={`absolute left-1/2 -translate-x-1/2 bottom-[-56px] transition-transform duration-300 ease-out ${visible ? 'translate-y-0' : '-translate-y-2'}`}
      style={{ zIndex: visible ? 30 : 0 }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {/* Bridge surfaces do not intercept clicks to underlying stars */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-6 h-6 w-[200px] pointer-events-none" />
      <div className="absolute left-1/2 -translate-x-1/2 top-full h-3 w-[200px] pointer-events-none" />
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => { e.stopPropagation(); onClick(e); }}
        className={`${colorClass} rounded-full min-h-8 min-w-8 px-3 py-1 text-[11px] md:text-[12px] whitespace-nowrap font-medium text-white shadow-sm ${visible ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        aria-label={label}
      >
        {label}
      </button>
    </div>
  );
};
