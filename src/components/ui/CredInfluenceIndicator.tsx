"use client";

import { CoinsIcon } from "lucide-react";
import { SignalBar } from "@/components/ui/SignalBar";
import { cn } from "@/lib/utils/cn";

interface CredInfluenceIndicatorProps {
  credValue: number;
  className?: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  showSignalBar?: boolean;
}

export function CredInfluenceIndicator({
  credValue,
  className,
  size = "md",
  showIcon = true,
  showSignalBar = true
}: CredInfluenceIndicatorProps) {
  const sizeClasses = {
    sm: "text-xs gap-1",
    md: "text-sm gap-1.5", 
    lg: "text-base gap-2"
  };
  
  const iconSizeClasses = {
    sm: "size-3",
    md: "size-4",
    lg: "size-5"
  };

  return (
    <div className={cn("flex items-center", sizeClasses[size], className)}>
      {showIcon && (
        <CoinsIcon className={cn(iconSizeClasses[size], "text-amber-500")} />
      )}
      <span className="font-medium text-foreground">
        {credValue.toLocaleString()}
      </span>
      <span className="text-muted-foreground">cred</span>
      {showSignalBar && (
        <SignalBar 
          credValue={credValue} 
          size={size}
          className="ml-1 shrink-0"
          showTooltip={false}
        />
      )}
    </div>
  );
}