import { cn } from "@/lib/cn";
import { LucideProps, RefreshCwIcon } from "lucide-react";
import { FC } from "react";

export interface LoaderProps extends LucideProps {}

export const Loader: FC<LoaderProps> = ({ className, ...props }) => {
  return (
    <RefreshCwIcon
      className={cn(
        "absolute self-center my-auto top-0 bottom-0 text-primary animate-spin",
        className
      )}
      {...props}
    />
  );
};
