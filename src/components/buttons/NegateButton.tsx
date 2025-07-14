"use client";

import { Button } from "@/components/ui/button";
import { NegateIcon } from "@/components/icons/NegateIcon";
import { cn } from "@/lib/utils/cn";
import { ComponentProps, forwardRef } from "react";

export interface NegateButtonProps extends Omit<ComponentProps<typeof Button>, "children" | "onClick"> {
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  userCredAmount?: number;
  isActive?: boolean;
  showText?: boolean;
  text?: string;
  variant?: "ghost" | "outline" | "default";
  buttonSize?: "sm" | "default" | "lg";
  iconSize?: "sm" | "default" | "lg";
  showSuccess?: boolean;
  successDuration?: number;
  isLoading?: boolean;
  ariaLabel?: string;
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

export const NegateButton = forwardRef<HTMLButtonElement, NegateButtonProps>(({
  onClick,
  userCredAmount,
  isActive,
  showText = true,
  text = "Negate",
  variant = "ghost",
  buttonSize = "default",
  iconSize = "default",
  showSuccess = false,
  successDuration = 1500,
  isLoading = false,
  ariaLabel,
  className,
  disabled,
  ...props
}, ref) => {
  const hasUserAmount = typeof userCredAmount === "number" && userCredAmount > 0;
  const displayText = hasUserAmount ? `${userCredAmount} cred` : text;
  const isNegated = isActive || hasUserAmount;

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
      aria-pressed={isNegated}
      role="button"
      tabIndex={0}
      className={cn(
        "rounded-full size-fit focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        buttonSizeMap[buttonSize],
        variant === "ghost" && "hover:bg-negated/30",
        variant === "outline" && "bg-background hover:bg-accent",
        hasUserAmount && buttonSize === "default" && "pr-5",
        isNegated && "text-negated",
        isLoading && "opacity-50 cursor-not-allowed",
        className
      )}
      {...props}
    >
      {isLoading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
      ) : (
        <NegateIcon 
          className={cn(iconSizeMap[iconSize])}
          showSuccess={showSuccess}
          successDuration={successDuration}
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

NegateButton.displayName = "NegateButton";