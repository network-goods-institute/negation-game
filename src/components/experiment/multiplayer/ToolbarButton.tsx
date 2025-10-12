"use client";

import React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";

export interface ToolbarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode; // icon
}

export const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  label,
  shortcut,
  active,
  disabled,
  children,
  className,
  ...props
}) => {
  const btnClass = cn(
    "h-10 w-10 inline-flex items-center justify-center rounded-full border transition-colors",
    active
      ? "bg-blue-600 text-white border-blue-600"
      : "bg-white text-blue-700 border-blue-200 hover:bg-blue-50",
    disabled && "opacity-50 cursor-not-allowed hover:bg-white",
    className,
  );

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button className={btnClass} disabled={disabled} aria-label={label} {...props}>
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="z-[1100]">
        <div className="flex items-center gap-2">
          <span className="text-sm">{label}</span>
          {shortcut && (
            <span className="font-mono text-[10px] leading-none px-1.5 py-0.5 rounded border bg-stone-100 text-stone-700">
              {shortcut}
            </span>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

export default ToolbarButton;

