"use client";

import React from "react";
import { ActionButton } from "@/components/buttons/ActionButton";
import { PointIcon } from "@/components/icons/AppIcons";
import { cn } from "@/lib/utils/cn";

interface MakePointButtonProps {
    onClick: () => void;
    size?: "sm" | "default" | "lg";
    className?: string;
}

export function MakePointButton({ onClick, size = "lg", className }: MakePointButtonProps) {
    const iconSizes = {
        sm: "h-3 w-3",
        default: "h-5 w-5",
        lg: "h-8 w-8"
    };

    return (
        <ActionButton
            onClick={onClick}
            variant="outline"
            buttonSize={size}
            text="New Point"
            icon={<PointIcon className={iconSizes[size]} />}
            className={cn(
                "font-medium flex-shrink-0",
                className
            )}
        />
    );
} 