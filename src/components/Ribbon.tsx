import { cn } from "@/lib/cn";
import { FC, HTMLAttributes } from "react";

export interface RibbonProps extends HTMLAttributes<HTMLDivElement> {
  foldSize?: number;
  cutoutSize?: number;
}

export const Ribbon: FC<RibbonProps> = ({
  foldSize = 4,
  cutoutSize = 12,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        "absolute p-2 bg-primary text-primary-foreground",
        `-right-[${foldSize}px]`,
        className
      )}
      style={{
        top: `calc(-1*${foldSize}px)`,
        borderLeft: `${foldSize}px solid #0005`,
        borderBottom: `${cutoutSize}px solid #0000`,
        clipPath: `polygon(
            ${foldSize}px 0,
            100% 0,
            100% calc(100% - ${cutoutSize}px),
            calc(50% + ${foldSize}px/2) 100%,
            ${foldSize}px calc(100% - ${cutoutSize}px),
            ${foldSize}px ${foldSize}px,
            0 ${foldSize}px
        )`,
      }}
      {...props}
    />
  );
};
