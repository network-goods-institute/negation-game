"use client";

import { cn } from "@/lib/utils/cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SignalBarProps {
  credValue: number;
  className?: string;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
}

function getSignalBars(credValue: number): number {
  if (credValue <= 0) return 0;
  if (credValue < 1) return 1;
  const logValue = Math.log10(credValue);
  return Math.min(Math.max(Math.ceil(logValue), 1), 5);
}

function getInfluenceLevel(credValue: number): string {
  const bars = getSignalBars(credValue);
  switch (bars) {
    case 0: return "No influence";
    case 1: return "Very low influence";
    case 2: return "Low influence";
    case 3: return "Medium influence";
    case 4: return "High influence";
    case 5: return "Very high influence";
    default: return "No influence";
  }
}

export function SignalBar({ 
  credValue, 
  className,
  size = "md",
  showTooltip = true 
}: SignalBarProps) {
  const activeBars = getSignalBars(credValue);
  const maxBars = 5;
  const influenceLevel = getInfluenceLevel(credValue);
  
  const sizeClasses = {
    sm: "w-1.5 h-4 rounded-sm",
    md: "w-2 h-5 rounded-sm", 
    lg: "w-2.5 h-6 rounded-sm"
  };
  
  const gapClasses = {
    sm: "gap-1",
    md: "gap-1",
    lg: "gap-1.5"
  };

  const bars = Array.from({ length: maxBars }, (_, index) => {
    const isActive = index < activeBars;
    return (
      <div
        key={index}
        className={cn(
          sizeClasses[size],
          "transition-colors duration-200",
          isActive 
            ? "bg-green-500 dark:bg-green-400" 
            : "bg-gray-300 dark:bg-gray-600"
        )}
      />
    );
  });

  const signalBars = (
    <div className={cn(
      "flex items-end shrink-0 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border", 
      gapClasses[size], 
      className
    )}>
      {bars}
    </div>
  );

  if (!showTooltip) {
    return signalBars;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {signalBars}
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-sm">
          <p className="font-medium">Cred Influence: {influenceLevel}</p>
          <p className="text-muted-foreground">{credValue.toLocaleString()} cred</p>
          <p className="text-xs text-muted-foreground mt-1">
            {activeBars}/5 influence bars
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}