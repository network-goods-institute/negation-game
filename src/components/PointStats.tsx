import { cn } from "@/lib/cn";
import { formatShortNumber } from "@/lib/formatShortNumber";
import { HTMLAttributes } from "react";

export interface PointStatsProps extends HTMLAttributes<HTMLDivElement> {
  favor: number;
  amountNegations: number;
  amountSupporters: number;
  cred: number;
  divider?: string;
}

export const PointStats = ({
  className,
  favor = 0,
  amountNegations = 0,
  amountSupporters = 0,
  cred = 0,
  divider = "·",
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
        [formatShortNumber(safeCred), "cred"],
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
    </div>
  );
};
