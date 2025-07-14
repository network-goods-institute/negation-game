"use client";

import { ActionButton, ActionButtonProps } from "./ActionButton";
import { DoubtIcon } from "@/components/icons/DoubtIcon";
import { cn } from "@/lib/utils/cn";
import { forwardRef } from "react";

export interface DoubtButtonProps extends Omit<ActionButtonProps, "icon" | "text" | "hoverColor" | "activeColor"> {
}

export const DoubtButton = forwardRef<HTMLButtonElement, DoubtButtonProps>(({
  userAmount,
  isActive,
  showText = true,
  className,
  ...props
}, ref) => {
  return (
    <ActionButton
      ref={ref}
      text="Doubt"
      userAmount={userAmount}
      isActive={isActive}
      showText={showText}
      hoverColor="hover:bg-amber-500/30"
      activeColor="text-amber-600"
      icon={
        <DoubtIcon 
          className={cn(
            "size-7 stroke-1",
            isActive && "fill-current"
          )}
        />
      }
      className={cn(
        "p-2 -mb-2 -ml-1",
        className
      )}
      {...props}
    />
  );
});

DoubtButton.displayName = "DoubtButton";