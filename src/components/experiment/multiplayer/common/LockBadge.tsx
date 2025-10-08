import React from 'react';
import { Lock } from 'lucide-react';

interface LockBadgeProps {
  name?: string | null;
}

export const LockBadge: React.FC<LockBadgeProps> = ({ name }) => {
  return (
    <div
      data-testid="lock-badge"
      className="absolute -top-2 -right-2 z-20"
      title={name ? `Locked by ${name}` : 'Locked'}
      aria-label={name ? `Locked by ${name}` : 'Locked'}
    >
      <div className="h-6 w-6 rounded-full bg-rose-600 border-2 border-white text-white shadow flex items-center justify-center">
        <Lock className="h-3 w-3" />
      </div>
    </div>
  );
};

