import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EdgeRelevanceStarsProps {
  relevance: number;
  edgeType?: string;
  starColor?: string;
  onUpdateRelevance: (relevance: number) => void;
  onConnectionAwareClick: (e: React.MouseEvent, normalAction: () => void) => void;
}

export const EdgeRelevanceStars: React.FC<EdgeRelevanceStarsProps> = ({
  relevance,
  edgeType,
  starColor = 'text-stone-600',
  onUpdateRelevance,
  onConnectionAwareClick,
}) => {
  const isSupportEdge = edgeType === "support";
  const isNegationEdge = edgeType === "negation";

  if (edgeType === "support" || edgeType === "negation") {
    return (
      <TooltipProvider>
        <div className="flex items-center gap-0.5 px-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Tooltip key={`rel-${i}`}>
              <TooltipTrigger asChild>
                <button
                  title={`Set relevance to ${i}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => onConnectionAwareClick(e, () => { e.stopPropagation(); onUpdateRelevance(i); })}
                  type="button"
                  data-interactive="true"
                  className="transition-transform hover:scale-110 active:scale-95"
                >
                  <span className={`text-base font-bold transition-all ${i <= relevance ? starColor : 'text-gray-300'}`}>
                    {isSupportEdge ? "+" : isNegationEdge ? "-" : "★"}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs z-[70]">Relevance: {i}/5</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-center gap-2.5 text-xs select-none relative">
      <span className="text-xs font-semibold text-gray-700">Relevance:</span>
      <TooltipProvider>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Tooltip key={`star-${i}`}>
              <TooltipTrigger asChild>
                <button
                  title={`Set relevance to ${i}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => onConnectionAwareClick(e, () => { e.stopPropagation(); onUpdateRelevance(i); })}
                  type="button"
                  data-interactive="true"
                  className="transition-transform hover:scale-125 active:scale-95"
                >
                  <span className={`text-base transition-all ${i <= relevance ? starColor + ' drop-shadow-sm' : 'text-gray-300'}`}>★</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs z-[70]">
                Relevance: {i}/5
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
};
