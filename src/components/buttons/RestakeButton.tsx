"use client";

import { ActionButton, ActionButtonProps } from "./ActionButton";
import { RestakeIcon } from "@/components/icons/RestakeIcon";
import { cn } from "@/lib/utils/cn";
import { forwardRef } from "react";

export interface RestakeButtonProps extends Omit<ActionButtonProps, "icon" | "text" | "hoverColor" | "activeColor"> {
  percentage?: number;
  showPercentage?: boolean;
}

export const RestakeButton = forwardRef<HTMLButtonElement, RestakeButtonProps>(({
  percentage,
  showPercentage = true,
  userAmount,
  isActive,
  showText = true,
  className,
  ...props
}, ref) => {
  const hasPercentage = typeof percentage === "number" && percentage > 0;
  const displayText = hasPercentage && showPercentage ? `${percentage}%` : "Restake";

  return (
    <ActionButton
      ref={ref}
      text={displayText}
      userAmount={userAmount}
      isActive={isActive}
      showText={showText}
      hoverColor="hover:bg-purple-500/30"
      activeColor="text-endorsed"
      icon={
        <RestakeIcon 
          className={cn(
            "size-7 stroke-1",
            isActive && "fill-current"
          )}
        />
      }
      className={cn(
        "p-2 -mb-2",
        className
      )}
      {...props}
    />
  );
});

RestakeButton.displayName = "RestakeButton";