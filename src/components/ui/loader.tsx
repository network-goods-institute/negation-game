import { cn } from "@/lib/cn";
import { LucideProps, RefreshCwIcon } from "lucide-react";
import { FC } from "react";

export interface LoaderProps extends LucideProps {}

export const Loader: FC<LoaderProps> = ({ className, ...props }) => {
  return (
    <RefreshCwIcon
      className={cn("size-6 text-primary animate-spin", className)}
      {...props}
    />
  );
};
