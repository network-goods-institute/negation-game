import { cn } from "@/lib/cn";
import { formatShortNumber } from "@/lib/formatShortNumber";
import { HTMLAttributes } from "react";

export interface PointStatsProps extends HTMLAttributes<HTMLDivElement> {
  favor: number;
  amountNegations: number;
  amountSupporters: number;
  cred: number;
}

export const PointStats = ({
  className,
  favor,
  amountNegations,
  amountSupporters,
  cred,
  ...props
}: PointStatsProps) => {
  return (
    <div
      className={cn(
        "w-full flex gap-xs items-center  text-xs text-muted-foreground mb-md",
        className
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
        ...(i > 0
          ? [
              <span className="text-xs" key={`divider-${i}`}>
                ·
              </span>,
            ]
          : []),

        <span key={`stat-${i}`} className="leading-none">
          <strong className="font-semibold">{value}</strong> {label}
        </span>,
      ])}
    </div>
  );
};
