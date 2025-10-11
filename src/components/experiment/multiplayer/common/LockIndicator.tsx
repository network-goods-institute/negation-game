import React from 'react';

interface LockIndicatorProps {
  locked: boolean;
  lockOwner?: { name: string } | null;
  className?: string;
}

export const LockIndicator: React.FC<LockIndicatorProps> = ({
  locked,
  lockOwner,
  className = "absolute -top-1 -right-1 z-20"
}) => {
  if (!locked) return null;

  return (
    <div className={`pointer-events-none ${className}`} title={lockOwner ? `Locked by ${lockOwner.name}` : 'Locked'}>
      <div className="h-3 w-3 rounded-full bg-stone-400 border border-white text-white shadow-sm flex items-center justify-center">
        {/* inline icon to avoid extra imports here */}
        <svg viewBox="0 0 24 24" className="h-2 w-2" fill="currentColor">
          <path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2v-6a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 8V7a3 3 0 116 0v3H9z" />
        </svg>
      </div>
    </div>
  );
};
