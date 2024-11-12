import { cn } from "@/lib/cn";
import { ArrowBigDownIcon } from "lucide-react";
import { ComponentProps } from "react";

export interface NegateIconProps
  extends ComponentProps<typeof ArrowBigDownIcon> {}

export const NegateIcon = ({ className, ...props }: NegateIconProps) => (
  <ArrowBigDownIcon className={cn("size-7 stroke-1", className)} {...props} />
);
