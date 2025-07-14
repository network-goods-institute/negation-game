"use client";

import React from "react";
import { NegateButton } from "@/components/buttons/NegateButton";
import { cn } from "@/lib/utils/cn";

interface MakeNegationButtonProps {
    onClick: () => void;
    size?: "sm" | "default" | "lg";
    className?: string;
}

export function MakeNegationButton({ onClick, size = "lg", className }: MakeNegationButtonProps) {
    return (
        <NegateButton
            onClick={onClick}
            variant="outline"
            buttonSize={size}
            iconSize={size}
            text="New Negation"
            className={cn(
                "font-medium flex-shrink-0",
                className
            )}
        />
    );
} 