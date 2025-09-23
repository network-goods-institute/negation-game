import React from 'react';
import { EdgeLabelRenderer } from '@xyflow/react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface EdgeOverlayProps {
  cx: number;
  cy: number;
  isHovered: boolean;
  relevance: number;
  edgeId: string;
  edgeType?: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onUpdateRelevance: (relevance: number) => void;
  onAddObjection: () => void;
  onToggleEdgeType?: () => void;
  starColor?: string;
}

export const EdgeOverlay: React.FC<EdgeOverlayProps> = ({
  cx,
  cy,
  isHovered,
  relevance,
  edgeId,
  edgeType,
  onMouseEnter,
  onMouseLeave,
  onUpdateRelevance,
  onAddObjection,
  onToggleEdgeType,
  starColor = 'text-stone-600'
}) => {
  return (
    <EdgeLabelRenderer>
      <div
        style={{
          position: 'absolute',
          transform: `translate(-50%, -50%) translate(${cx}px, ${cy + 18}px)`,
          zIndex: 1000,
          pointerEvents: 'all'
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="flex items-center justify-center gap-3 bg-white/95 backdrop-blur-sm border rounded-md shadow px-2 py-1">
          {(edgeType === "support" || edgeType === "negation") && onToggleEdgeType && (
            <div className="flex items-center gap-2 text-[11px] select-none relative z-10">
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleEdgeType();
                }}
                className="rounded-md px-3 py-1.5 text-[11px] font-medium bg-stone-100 text-stone-800 border border-stone-300 hover:bg-stone-200 relative z-0"
                title={edgeType === "support" ? "Switch to negation" : "Switch to support"}
              >
                {edgeType === "support" ? "SUPPORTS" : "NEGATES"}
              </button>
              <TooltipProvider>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Tooltip key={`rel-${i}`}>
                      <TooltipTrigger asChild>
                        <button
                          title={`Set relevance to ${i}`}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateRelevance(i);
                          }}
                        >
                          <span className={i <= relevance ? starColor : 'text-stone-300'}>
                            {edgeType === "support" ? "+" : "−"}
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Relevance: {i}/5
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </TooltipProvider>
            </div>
          )}
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              onAddObjection();
            }}
            className="rounded-full min-h-8 min-w-8 px-3 py-1 text-[11px] font-medium bg-stone-800 text-white relative z-0"
            title="Add mitigation to this relation"
          >
            Mitigate
          </button>
        </div>
      </div>
    </EdgeLabelRenderer>
  );
};