"use client";

import { Button } from "@/components/ui/button";
import { EditIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ComponentProps, forwardRef } from "react";

export interface EditButtonProps extends Omit<ComponentProps<typeof Button>, "children" | "onClick"> {
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  canEdit?: boolean;
  showText?: boolean;
  text?: string;
  variant?: "ghost" | "outline" | "default";
  buttonSize?: "sm" | "default" | "lg";
  iconSize?: "sm" | "default" | "lg";
  ariaLabel?: string;
}

const iconSizeMap = {
  sm: "h-3 w-3",
  default: "size-5", 
  lg: "h-6 w-6"
};

const buttonSizeMap = {
  sm: "gap-1 px-2 text-xs",
  default: "p-1 -mb-2 rounded-full size-fit hover:bg-muted",
  lg: "gap-2 px-4"
};

export const EditButton = forwardRef<HTMLButtonElement, EditButtonProps>(({
  onClick,
  canEdit = true,
  showText = false,
  text = "Edit",
  variant = "ghost",
  buttonSize = "default",
  iconSize = "default",
  ariaLabel,
  className,
  disabled,
  ...props
}, ref) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (canEdit && onClick) {
      onClick();
    }
  };

  const computedAriaLabel = ariaLabel || (showText ? undefined : `${text} this point`);

  if (!canEdit) {
    return null;
  }

  return (
    <Button
      ref={ref}
      variant={variant}
      onClick={handleClick}
      disabled={disabled || !canEdit}
      aria-label={computedAriaLabel}
      role="button"
      tabIndex={0}
      data-action-button="true"
      className={cn(
        buttonSizeMap[buttonSize],
        "text-muted-foreground hover:text-foreground",
        className
      )}
      {...props}
    >
      <EditIcon className={cn(iconSizeMap[iconSize], "translate-y-[2.5px]")} />
      {showText && (
        <span className="ml-1 whitespace-nowrap">
          {text}
        </span>
      )}
    </Button>
  );
});

EditButton.displayName = "EditButton";