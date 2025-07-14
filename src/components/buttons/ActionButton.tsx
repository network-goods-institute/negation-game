"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { ComponentProps, forwardRef, ReactNode } from "react";

export interface ActionButtonProps extends Omit<ComponentProps<typeof Button>, "children" | "onClick"> {
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  userAmount?: number;
  isActive?: boolean;
  showText?: boolean;
  text?: string;
  activeText?: string;
  variant?: "ghost" | "outline" | "default";
  buttonSize?: "sm" | "default" | "lg";
  hoverColor?: string;
  activeColor?: string;
  icon: ReactNode;
  children?: ReactNode;
  isLoading?: boolean;
  requiresAuth?: boolean;
  ariaLabel?: string;
  ariaPressed?: boolean;
  ariaExpanded?: boolean;
}

const buttonSizeMap = {
  sm: "gap-1 px-2 text-xs",
  default: "p-1 gap-sm",
  lg: "gap-2 px-6"
};

export const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(({
  onClick,
  userAmount,
  isActive,
  showText = true,
  text = "Action",
  activeText,
  variant = "ghost",
  buttonSize = "default",
  hoverColor = "hover:bg-muted/30",
  activeColor,
  icon,
  children,
  isLoading = false,
  requiresAuth = true,
  ariaLabel,
  ariaPressed,
  ariaExpanded,
  className,
  disabled,
  ...props
}, ref) => {
  const hasUserAmount = typeof userAmount === "number" && userAmount > 0;
  const isActionActive = isActive || hasUserAmount;
  
  let displayText = text;
  if (hasUserAmount) {
    displayText = `${userAmount} cred`;
  } else if (isActive && activeText) {
    displayText = activeText;
  }

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

  const computedAriaLabel = ariaLabel || (showText ? undefined : displayText);

  return (
    <Button
      ref={ref}
      variant={variant}
      size="icon"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled || isLoading}
      aria-label={computedAriaLabel}
      aria-pressed={ariaPressed}
      aria-expanded={ariaExpanded}
      role="button"
      tabIndex={0}
      className={cn(
        "rounded-full size-fit focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        buttonSizeMap[buttonSize],
        variant === "ghost" && hoverColor,
        variant === "outline" && "bg-background hover:bg-accent",
        isActionActive && activeColor,
        hasUserAmount && buttonSize === "default" && "pr-3",
        isLoading && "opacity-50 cursor-not-allowed",
        className
      )}
      {...props}
    >
      {isLoading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
      ) : (
        icon
      )}
      {showText && (
        <span className="whitespace-nowrap">
          {isLoading ? "Loading..." : displayText}
        </span>
      )}
      {children}
    </Button>
  );
});

ActionButton.displayName = "ActionButton";