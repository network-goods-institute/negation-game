"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { PointIcon } from "@/components/icons/AppIcons";
import { cn } from "@/lib/utils/cn";

interface MakePointButtonProps {
    onClick: () => void;
    size?: "sm" | "default" | "lg";
    className?: string;
}

export function MakePointButton({ onClick, size = "lg", className }: MakePointButtonProps) {
    const sizeClasses = {
        sm: "gap-1 px-2 text-xs",
        default: "gap-2 px-6",
        lg: "gap-2 px-6"
    };

    const iconSizes = {
        sm: "h-3 w-3",
        default: "h-5 w-5",
        lg: "h-8 w-8"
    };

    return (
        <Button
            onClick={onClick}
            variant="outline"
            size={size}
            className={cn(
                "rounded-full flex items-center font-medium bg-background hover:bg-accent flex-shrink-0",
                sizeClasses[size],
                className
            )}
        >
            <PointIcon className={iconSizes[size]} />
            <span>Make Point</span>
        </Button>
    );
} 