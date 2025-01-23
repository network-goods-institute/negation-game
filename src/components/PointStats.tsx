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
  favor,
  amountNegations,
  amountSupporters,
  cred,
  divider = "·",
  ...props
}: PointStatsProps) => {
  return (
    <div
      className={cn(
        "w-full flex gap-xs items-center text-xs text-muted-foreground",
        className,
      )}
      {...props}
    >
      {[
        [favor, "favor"],
        [amountNegations, amountNegations === 1 ? "negation" : "negations"],
        [
          formatShortNumber(amountSupporters),
          amountSupporters === 1 ? "supporter" : "supporters",
        ],
        [formatShortNumber(cred), "cred"],
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
