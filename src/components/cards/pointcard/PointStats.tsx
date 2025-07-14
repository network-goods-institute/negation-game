import { cn } from "@/lib/utils/cn";
import { formatShortNumber } from "@/lib/utils/formatShortNumber";
import { HTMLAttributes } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface PointStatsProps extends HTMLAttributes<HTMLDivElement> {
  favor: number;
  amountNegations: number;
  amountSupporters: number;
  cred: number;
  divider?: string;
  showSignalBars?: boolean;
  allCredValues?: number[];
}

export const PointStats = ({
  className,
  favor = 0,
  amountNegations = 0,
  amountSupporters = 0,
  cred = 0,
  divider = "·",
  showSignalBars = false,
  allCredValues,
  ...props
}: PointStatsProps) => {
  const safeNumberValue = (value: any) => {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  const safeFavor = safeNumberValue(favor);
  const safeNegations = safeNumberValue(amountNegations);
  const safeSupporters = safeNumberValue(amountSupporters);
  const safeCred = safeNumberValue(cred);

  const getSignalBars = (credValue: number): number => {
    if (credValue <= 0) return 0;

    if (allCredValues && allCredValues.length > 0) {
      const validCredValues = allCredValues.filter(v => v > 0);
      if (validCredValues.length === 0) return credValue > 0 ? 1 : 0;

      const minCred = Math.min(...validCredValues);
      const maxCred = Math.max(...validCredValues);

      if (minCred === maxCred) return credValue > 0 ? 3 : 0;

      const normalized = (credValue - minCred) / (maxCred - minCred);
      return Math.max(1, Math.min(5, Math.round(1 + normalized * 4)));
    }

    if (credValue < 1) return 1;
    const logValue = Math.log10(credValue);
    return Math.min(Math.max(Math.ceil(logValue), 1), 5);
  };

  const getInfluenceLevel = (credValue: number): string => {
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
  };

  const activeBars = getSignalBars(safeCred);
  const maxBars = 5;
  const influenceLevel = getInfluenceLevel(safeCred);

  return (
    <div
      className={cn(
        "w-full flex gap-xs items-center text-xs text-muted-foreground",
        className,
      )}
      {...props}
    >
      {[
        [safeFavor, "favor"],
        [safeNegations, safeNegations === 1 ? "negation" : "negations"],
        [
          formatShortNumber(safeSupporters),
          safeSupporters === 1 ? "supporter" : "supporters",
        ],
      ].flatMap(([value, label], i) => [
        ...(i > 0 && divider
          ? [<span key={`divider-${i}`}>{divider}</span>]
          : []),

        <span
          key={`stat-${i}`}
          className={cn(
            "leading-none flex gap-y-0 gap-x-1  justify-center flex-wrap",
            label === "favor" && "font-bold",
          )}
        >
          <span>{value}</span>
          <span>{label}</span>
        </span>,
      ])}

      {/* Cred */}
      {divider && <span>{divider}</span>}
      <span className="leading-none flex gap-y-0 gap-x-1 justify-center flex-wrap">
        <span>{formatShortNumber(safeCred)}</span>
        <span>cred</span>
      </span>

      {/* Signal bars positioned to the right */}
      {showSignalBars && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-0.5 ml-2">
              {Array.from({ length: maxBars }, (_, index) => {
                const isActive = index < activeBars;
                return (
                  <div
                    key={index}
                    className={cn(
                      "w-1 h-2.5 transition-colors duration-200",
                      isActive
                        ? "bg-endorsed"
                        : "bg-gray-300 dark:bg-gray-600"
                    )}
                  />
                );
              })}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <p className="font-medium">Cred Influence: {influenceLevel}</p>
              <p className="text-muted-foreground">{safeCred.toLocaleString()} cred</p>
              <p className="text-xs text-muted-foreground mt-1">
                {activeBars}/5 influence bars
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};
