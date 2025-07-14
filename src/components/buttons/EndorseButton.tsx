"use client";

import { Button } from "@/components/ui/button";
import { EndorseIcon } from "@/components/icons/EndorseIcon";
import { cn } from "@/lib/utils/cn";
import { ComponentProps, forwardRef } from "react";

export interface EndorseButtonProps extends Omit<ComponentProps<typeof Button>, "children" | "onClick"> {
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  userCredAmount?: number;
  isActive?: boolean;
  showText?: boolean;
  text?: string;
  variant?: "ghost" | "outline" | "default";
  buttonSize?: "sm" | "default" | "lg";
  iconSize?: "sm" | "default" | "lg";
  isLoading?: boolean;
  ariaLabel?: string;
  "aria-expanded"?: boolean;
}

const iconSizeMap = {
  sm: "h-3 w-3",
  default: "size-7 stroke-1", 
  lg: "h-8 w-8"
};

const buttonSizeMap = {
  sm: "gap-1 px-2 text-xs",
  default: "py-1 pl-1 pr-4 -mb-2 gap-sm",
  lg: "gap-2 px-6"
};

export const EndorseButton = forwardRef<HTMLButtonElement, EndorseButtonProps>(({
  onClick,
  userCredAmount,
  isActive,
  showText = true,
  text = "Endorse",
  variant = "ghost",
  buttonSize = "default",
  iconSize = "default",
  isLoading = false,
  ariaLabel,
  "aria-expanded": ariaExpanded,
  className,
  disabled,
  ...props
}, ref) => {
  const hasUserAmount = typeof userCredAmount === "number" && userCredAmount > 0;
  const displayText = hasUserAmount ? `${userCredAmount} cred` : text;
  const isEndorsed = isActive || hasUserAmount;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isLoading && onClick) {
      onClick(e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && !isLoading && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  const computedAriaLabel = ariaLabel || (showText ? undefined : `${displayText} this point`);

  return (
    <Button
      ref={ref}
      variant={variant}
      size="icon"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled || isLoading}
      aria-label={computedAriaLabel}
      aria-pressed={isEndorsed}
      aria-expanded={ariaExpanded}
      role="button"
      tabIndex={0}
      className={cn(
        "rounded-full size-fit focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        buttonSizeMap[buttonSize],
        variant === "ghost" && "hover:bg-endorsed/30",
        variant === "outline" && "bg-background hover:bg-accent",
        isEndorsed && "text-endorsed",
        hasUserAmount && buttonSize === "default" && "pr-5",
        isLoading && "opacity-50 cursor-not-allowed",
        className
      )}
      {...props}
    >
      {isLoading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
      ) : (
        <EndorseIcon 
          className={cn(
            iconSizeMap[iconSize],
            isEndorsed && "fill-current"
          )}
        />
      )}
      {showText && (
        <span className="ml-0 whitespace-nowrap">
          {isLoading ? "Loading..." : displayText}
        </span>
      )}
    </Button>
  );
});

EndorseButton.displayName = "EndorseButton";