import React from 'react';

interface VoteGlowProps {
  opacity: number;
}

export const VoteGlow: React.FC<VoteGlowProps> = ({ opacity }) => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div
        className="absolute -inset-4 rounded-2xl bg-blue-500/30 blur-lg transition-opacity duration-300"
        style={{
          opacity,
          zIndex: -1,
        }}
      />
      <div
        className="absolute -inset-2 rounded-xl bg-blue-400/20 blur-md transition-opacity duration-300"
        style={{
          opacity: opacity * 1.2,
          zIndex: -1,
        }}
      />
    </div>
  );
};
