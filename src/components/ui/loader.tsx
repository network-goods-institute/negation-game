import { cn } from "@/lib/utils/cn"
import { LucideProps, RefreshCwIcon } from "lucide-react";
import { FC } from "react";

export interface LoaderProps extends LucideProps { }

export const Loader: FC<LoaderProps> = ({ className, ...props }) => {
  return (
    <RefreshCwIcon
      data-testid="loading-spinner"
      className={cn("size-6 text-primary animate-spin", className)}
      {...props}
    />
  );
};
