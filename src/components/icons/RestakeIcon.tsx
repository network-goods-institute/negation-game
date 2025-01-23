import { cn } from "@/lib/cn";
import { Diamond } from "lucide-react";
import { ComponentProps } from "react";

export interface RestakeIconProps extends ComponentProps<typeof Diamond> {
  showPercentage?: boolean;
  percentage?: number;
}

export const RestakeIcon = ({
  className,
  showPercentage,
  percentage,
  ...props
}: RestakeIconProps) => (
  <div className="flex items-center translate-y-[5px]">
    <Diamond className={cn("size-5 stroke-1", className)} {...props} />
    {showPercentage && percentage && (
      <span className="ml-1">{percentage}%</span>
    )}
  </div>
);
