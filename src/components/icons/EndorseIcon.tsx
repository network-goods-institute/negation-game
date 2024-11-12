import { cn } from "@/lib/cn";
import { ArrowBigUpIcon } from "lucide-react";
import { ComponentProps } from "react";

export interface EndorseIconProps
  extends ComponentProps<typeof ArrowBigUpIcon> {}

export const EndorseIcon = ({ className, ...props }: EndorseIconProps) => (
  <ArrowBigUpIcon className={cn("size-7 stroke-1", className)} {...props} />
);
