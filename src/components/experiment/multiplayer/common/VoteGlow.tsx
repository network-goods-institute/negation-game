import React from 'react';

interface VoteGlowProps {
  voteCount: number;
}

export const VoteGlow: React.FC<VoteGlowProps> = ({ voteCount }) => {
  const intensity = Math.min(1, 0.4 + voteCount * 0.15);

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: -1 }}>
      <svg className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] overflow-visible">
        <defs>
          <pattern
            id={`vote-hatch-${voteCount}`}
            patternUnits="userSpaceOnUse"
            width="5"
            height="5"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="5" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          rx="10"
          fill={`url(#vote-hatch-${voteCount})`}
          className="text-stone-400 transition-opacity duration-300"
          style={{ opacity: intensity }}
        />
      </svg>
    </div>
  );
};
