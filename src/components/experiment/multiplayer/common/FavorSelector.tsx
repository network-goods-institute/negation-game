import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type FavorLevel = 1 | 2 | 3 | 4 | 5;

interface FavorSelectorProps {
  value: number;
  onSelect: (level: FavorLevel) => void;
  max?: number;
  activeClassName?: string;
  inactiveClassName?: string;
  symbol?: string;
  tooltipLabel?: string;
}

export const FavorSelector: React.FC<FavorSelectorProps> = ({
  value,
  onSelect,
  max = 5,
  activeClassName = 'text-amber-500',
  inactiveClassName = 'text-stone-300',
  symbol = '★',
  tooltipLabel = 'Favor',
}) => {
  const handleSelect = (level: number) => {
    const bounded = Math.min(Math.max(level, 1), max) as FavorLevel;
    onSelect(bounded);
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {Array.from({ length: max }).map((_, index) => {
          const level = (index + 1) as FavorLevel;
          const isActive = level <= value;

          return (
            <Tooltip key={level}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="favor-button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleSelect(level);
                  }}
                  data-interactive="true"
                  aria-label={`${tooltipLabel} ${level}`}
                >
                  <span className={`favor-button__icon ${isActive ? activeClassName : inactiveClassName}`}>{symbol}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {tooltipLabel}: {level}/{max}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};

export default FavorSelector;
