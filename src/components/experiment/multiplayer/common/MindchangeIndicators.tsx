import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MindchangeBreakdown, breakdownCache } from './MindchangeBreakdown';
import { isMindchangeEnabledClient } from '@/utils/featureFlags';

interface MindchangeIndicatorsProps {
  edgeId: string;
  edgeType?: string;
  mindchange?: {
    forward: { average: number; count: number };
    backward: { average: number; count: number };
    userValue?: { forward: number; backward: number };
  };
}

export const MindchangeIndicators: React.FC<MindchangeIndicatorsProps> = ({
  edgeId,
  edgeType,
  mindchange,
}) => {
  if (!isMindchangeEnabledClient()) return null;
  const rawForwardAvg = Math.round(Number(mindchange?.forward?.average ?? 0));
  const rawBackwardAvg = Math.round(Number(mindchange?.backward?.average ?? 0));

  const getCachedAvg = (dir: 'forward' | 'backward') => {
    const key = `${edgeId}:${dir}`;
    const cached = breakdownCache.get(key);
    if (!cached || !cached.data || cached.data.length === 0) return null;
    const sum = cached.data.reduce((a, b) => a + (Number(b.value) || 0), 0);
    return Math.round(sum / cached.data.length);
  };

  const displayForwardAvg = rawForwardAvg === 0 ? (getCachedAvg('forward') ?? 0) : rawForwardAvg;
  const displayBackwardAvg = rawBackwardAvg === 0 ? (getCachedAvg('backward') ?? 0) : rawBackwardAvg;
  const fmtSign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="absolute -left-14 top-1/2 -translate-y-1/2 rounded-full h-10 w-10 border-2 border-gray-200 bg-white shadow-lg flex items-center justify-center text-[11px] font-bold text-gray-700"
              style={{ pointerEvents: 'auto', position: 'absolute' }}
            >
              <span>{(rawBackwardAvg === 0 && getCachedAvg('backward') == null) ? '…' : `${fmtSign(displayBackwardAvg)}%`}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="z-[70]">
            <MindchangeBreakdown dir="backward" edgeId={edgeId} edgeType={edgeType} />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="absolute -right-14 top-1/2 -translate-y-1/2 rounded-full h-10 w-10 border-2 border-gray-200 bg-white shadow-lg flex items-center justify-center text-[11px] font-bold text-gray-700"
              style={{ pointerEvents: 'auto', position: 'absolute' }}
            >
              <span>{(rawForwardAvg === 0 && getCachedAvg('forward') == null) ? '…' : `${fmtSign(displayForwardAvg)}%`}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="z-[70]">
            <MindchangeBreakdown dir="forward" edgeId={edgeId} edgeType={edgeType} />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </>
  );
};
