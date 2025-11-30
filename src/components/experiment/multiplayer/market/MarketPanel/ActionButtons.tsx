"use client";
import React from 'react';
import { Maximize2, Minimize2, Share2, X, RefreshCw } from 'lucide-react';

type Props = {
  expanded: boolean;
  onExpand: () => void;
  onShare: () => void;
  onClose: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
};

export const ActionButtons: React.FC<Props> = ({ expanded, onExpand, onShare, onClose, onRefresh, refreshing }) => {
  return (
    <div className="flex items-center gap-0.5">
      {/* Refresh */}
      <button
        onClick={onRefresh}
        disabled={!onRefresh || !!refreshing}
        className="p-1.5 rounded-md hover:bg-stone-100 transition-colors text-stone-600 hover:text-stone-900 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Refresh"
        title={refreshing ? 'Refreshing…' : 'Refresh'}
        aria-busy={refreshing ? true : undefined}
      >
        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
      </button>
      {/* Expand/Collapse */}
      <button
        onClick={onExpand}
        className="p-1.5 rounded-md hover:bg-stone-100 transition-colors text-stone-600 hover:text-stone-900"
        aria-label={expanded ? 'Collapse' : 'Expand'}
        title={expanded ? 'Collapse' : 'Expand'}
      >
        {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>

      {/* Share */}
      <button
        onClick={onShare}
        className="p-1.5 rounded-md hover:bg-stone-100 transition-colors text-stone-600 hover:text-stone-900"
        aria-label="Share"
        title="Share this market"
      >
        <Share2 size={16} />
      </button>

      {/* Close */}
      <button
        onClick={onClose}
        className="p-1.5 rounded-md hover:bg-stone-100 transition-colors text-stone-600 hover:text-stone-900"
        aria-label="Close"
        title="Close panel"
      >
        <X size={16} />
      </button>
    </div>
  );
};
