import { cn } from "@/lib/cn";
import { formatShortNumber } from "@/lib/formatShortNumber";
import { motion } from "framer-motion";
import { ComponentPropsWithoutRef, forwardRef, MouseEventHandler } from "react";
import { Button } from "./ui/button";

import { CheckIcon, XIcon } from "lucide-react";

export interface PointCardProps
  extends ComponentPropsWithoutRef<typeof motion.div> {
  pointId: number;
  content: string;
  createdAt: number;
  totalCred: number;
  favor: number;
  amountSupporters: number;
  amountNegations: number;
  viewerContext?: {
    viewerCred?: number;
  };
  onEndorse?: MouseEventHandler<HTMLButtonElement>;
  onNegate?: MouseEventHandler<HTMLButtonElement>;
  leftSlot?: React.ReactNode;
  bottomSlot?: React.ReactNode;
}

export const PointCard = forwardRef<HTMLDivElement, PointCardProps>(
  (
    {
      pointId,
      content,
      createdAt,
      className,
      totalCred,
      favor,
      amountSupporters: amountSupporters,
      amountNegations,
      viewerContext,
      onEndorse,
      onNegate,
      ...props
    },
    ref
  ) => {
    const endorsedByViewer =
      viewerContext?.viewerCred !== undefined && viewerContext.viewerCred > 0;
    return (
      <motion.div
        ref={ref}
        layout
        className={cn(
          "@container/point flex flex-col bg-background gap-0 px-8 py-6 relative rounded-sm  shadow-sm",
          className
        )}
        {...props}
      >
        <p className="tracking-tight text-md @xs/point:text-md @sm/point:text-lg mb-xs -mt-0.5">
          {content}
        </p>

        <div className="w-full flex gap-xs items-center  text-xs text-muted-foreground mb-md">
          {[
            [favor, "favor"],
            [amountNegations, amountNegations === 1 ? "negation" : "negations"],
            [
              formatShortNumber(amountSupporters),
              amountSupporters === 1 ? "supporter" : "supporters",
            ],
            [formatShortNumber(totalCred), "cred"],
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

        <div className="flex gap-sm w-full text-muted-foreground">
          <Button
            variant="ghost"
            className="p-2 -ml-3 -mb-2 rounded-full size-fit"
            onClick={onNegate}
          >
            <XIcon className="size-5" />
          </Button>
          <Button
            className={cn(
              "p-2 rounded-full -mb-2 size-fit gap-sm",
              endorsedByViewer && "text-endorsed hover:bg-endorsed/90 pr-3"
            )}
            variant={"ghost"}
            onClick={onEndorse}
          >
            <CheckIcon className="size-5" />{" "}
            {endorsedByViewer && `${viewerContext.viewerCred} cred`}
          </Button>
        </div>
      </motion.div>
    );

    PointCard.displayName = "PointCard";
  }
);
