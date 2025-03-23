import { cn } from "@/lib/cn";
import { ArrowBigDownIcon, CheckCircle2Icon } from "lucide-react";
import { ComponentProps, useState, useEffect } from "react";

export interface NegateIconProps
  extends ComponentProps<typeof ArrowBigDownIcon> {
  showSuccess?: boolean;
  successDuration?: number;
}

export const NegateIcon = ({
  className,
  showSuccess = false,
  successDuration = 1500,
  ...props
}: NegateIconProps) => {
  const [isShowingSuccess, setIsShowingSuccess] = useState(showSuccess);

  useEffect(() => {
    if (showSuccess) {
      setIsShowingSuccess(true);
      const timer = setTimeout(() => {
        setIsShowingSuccess(false);
      }, successDuration);

      return () => clearTimeout(timer);
    }
  }, [showSuccess, successDuration]);

  if (isShowingSuccess) {
    return (
      <CheckCircle2Icon
        className={cn(
          "size-7 stroke-1 text-green-500 animate-in zoom-in-50 duration-300",
          className
        )}
        {...props}
      />
    );
  }

  return (
    <ArrowBigDownIcon className={cn("size-7 stroke-1", className)} {...props} />
  );
};
