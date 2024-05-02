import { Badge, BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { FC } from "react";

export interface PledgeBadgeProps extends BadgeProps {
  pledged: number;
}

export const PledgeBadge: FC<PledgeBadgeProps> = ({
  pledged,
  className,
  ...props
}) => (
  <Badge
    {...props}
    className={cn(
      "px-xs py-3xs leading-none rounded-md hover:bg-primary-ally bg-primary-ally",
      className
    )}
  >
    ⧩{pledged}
  </Badge>
);
