"use client";
import React from "react";
import { useViewport } from "@xyflow/react";
import { useAtom, useAtomValue } from "jotai";
import {
  marketOverlayStateAtom,
  marketOverlayZoomThresholdAtom,
  computeSide,
  isLocked,
  handleClickAuto,
  handleClickText,
  handleClickPrice,
  handleZoomChange
} from "@/atoms/marketOverlayAtom";
import { Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";

export const MarketModeControls: React.FC = () => {
  const { zoom } = useViewport();
  const [state, setState] = useAtom(marketOverlayStateAtom);
  const threshold = useAtomValue(marketOverlayZoomThresholdAtom);

  const side = computeSide(state);
  const locked = isLocked(state);

  // Handle zoom changes for AUTO states
  React.useEffect(() => {
    setState(prevState => handleZoomChange(prevState, zoom, threshold));
  }, [zoom, threshold, setState]);

  const clickAuto = () => setState(handleClickAuto(state, zoom, threshold));
  const clickText = () => setState(handleClickText(state));
  const clickPrice = () => setState(handleClickPrice(state));

  // Determine which mode is active
  const isAutoActive = state === "AUTO_TEXT" || state === "AUTO_PRICE";
  const isTextActive = state === "LOCK_TEXT";
  const isPriceActive = state === "LOCK_PRICE";

  const buttonClass = (active: boolean, position: 'left' | 'middle' | 'right') => cn(
    "h-8 px-2.5 inline-flex items-center justify-center border transition-colors text-xs font-medium",
    position === 'left' && "rounded-l-md",
    position === 'right' && "rounded-r-md border-l-0",
    position === 'middle' && "border-l-0",
    active
      ? "bg-blue-600 text-white border-blue-600 z-10 relative"
      : "bg-white text-blue-700 border-blue-200 hover:bg-blue-50"
  );

  return (
    <div className="inline-flex items-center gap-1.5">
      {/* Lock indicator */}
      {locked && (
        <Lock className="h-3 w-3 text-blue-500" />
      )}

      {/* Grouped buttons */}
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>
          <div className="inline-flex">
            <button
              onClick={clickAuto}
              className={buttonClass(isAutoActive, 'left')}
              aria-label="Auto mode"
            >
              A
            </button>
            <button
              onClick={clickText}
              className={buttonClass(isTextActive, 'middle')}
              aria-label="Text mode"
            >
              T
            </button>
            <button
              onClick={clickPrice}
              className={buttonClass(isPriceActive, 'right')}
              aria-label="Price mode"
            >
              %
            </button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="z-[1100]">
          <div className="text-xs">
            <div><strong>A</strong>: Auto (zoom-based)</div>
            <div><strong>T</strong>: Lock to text</div>
            <div><strong>%</strong>: Lock to price</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

