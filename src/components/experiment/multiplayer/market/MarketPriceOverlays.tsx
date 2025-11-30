"use client";
import React from 'react';

interface MarketPriceZoomOverlayProps {
  price: number;
  mine?: number;
  className?: string;
}

/**
 * Overlay shown when zoomed out, displays price in the center of the node
 */
export const MarketPriceZoomOverlay: React.FC<MarketPriceZoomOverlayProps> = ({
  price,
  mine,
  className = "",
}) => {
  return (
    <div className={`absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10 ${className}`}>
      <div className="text-[12px] font-semibold px-3 py-1 rounded-md bg-white/90 border border-stone-200 text-stone-800 shadow-sm flex items-center gap-2 min-w-[140px] justify-center">
        <span>Price: {price.toFixed(2)}</span>
        {mine !== undefined && mine > 0 && (
          <span className="text-[11px] font-normal text-stone-600">Your shares: {mine.toFixed(2)}</span>
        )}
      </div>
    </div>
  );
};

interface MarketPriceHoverTooltipProps {
  price: number;
  mine?: number;
  total?: number;
  className?: string;
}

/**
 * Tooltip shown on hover, displays detailed price information above the node
 */
export const MarketPriceHoverTooltip: React.FC<MarketPriceHoverTooltipProps> = ({
  price,
  mine,
  total,
  className = "",
}) => {
  return (
    <div className={`absolute left-1/2 -top-1.5 -translate-x-1/2 -translate-y-full pointer-events-none select-none z-20 ${className}`}>
      <div className="text-[11px] px-3 py-1 rounded-md bg-white/95 border border-stone-200 text-stone-800 shadow-sm min-w-[200px] text-center flex items-center justify-center gap-3">
        <span className="font-semibold">Price: {price.toFixed(4)}</span>
        {Number.isFinite(total as number) && (total as number) !== 0 && (
          <span className="text-stone-600">Total: {(total as number).toFixed(2)}</span>
        )}
        {Number.isFinite(mine as number) && (mine as number) !== 0 && (
          <span className="text-stone-600">Your: {(mine as number).toFixed(2)}</span>
        )}
      </div>
    </div>
  );
};
