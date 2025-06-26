"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { EyeIcon, PlusIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface NewRationaleButtonProps {
    onClick: () => void;
    variant?: "default" | "outline" | "card";
    size?: "sm" | "md" | "lg";
    className?: string;
    disabled?: boolean;
    loading?: boolean;
}

export function NewRationaleButton({
    onClick,
    variant = "default",
    size = "md",
    className,
    disabled = false,
    loading = false
}: NewRationaleButtonProps) {
    const isDisabled = disabled || loading;

    if (variant === "card") {
        return (
            <div
                onClick={isDisabled ? undefined : onClick}
                className={cn(
                    "group relative overflow-hidden transition-all duration-200 hover:shadow-md border-2 hover:border-primary/50 cursor-pointer bg-card rounded-lg",
                    size === "sm" && "w-32 h-32",
                    size === "md" && "w-48 h-48",
                    size === "lg" && "w-64 h-64",
                    isDisabled && "opacity-50 cursor-not-allowed hover:shadow-none hover:border-border",
                    className
                )}
            >
                <div className="p-4 h-full flex flex-col items-center justify-center text-center space-y-3">
                    <div className="relative">
                        {loading ? (
                            <Loader2 className={cn(
                                "animate-spin text-muted-foreground",
                                size === "sm" && "w-6 h-6",
                                size === "md" && "w-8 h-8",
                                size === "lg" && "w-10 h-10"
                            )} />
                        ) : (
                            <>
                                <EyeIcon className={cn(
                                    "text-muted-foreground group-hover:text-primary transition-colors duration-200",
                                    size === "sm" && "w-6 h-6",
                                    size === "md" && "w-8 h-8",
                                    size === "lg" && "w-10 h-10"
                                )} />
                                <PlusIcon className={cn(
                                    "absolute -top-1 -right-1 text-muted-foreground group-hover:text-primary transition-colors duration-200",
                                    size === "sm" && "w-3 h-3",
                                    size === "md" && "w-4 h-4",
                                    size === "lg" && "w-5 h-5"
                                )} />
                            </>
                        )}
                    </div>
                    <div>
                        <h3 className={cn(
                            "font-bold text-foreground group-hover:text-primary transition-colors duration-200",
                            size === "sm" && "text-sm",
                            size === "md" && "text-base",
                            size === "lg" && "text-lg"
                        )}>
                            {loading ? "Creating..." : "Create Rationale"}
                        </h3>
                        <p className={cn(
                            "text-muted-foreground mt-1",
                            size === "sm" && "text-xs",
                            size === "md" && "text-sm",
                            size === "lg" && "text-base"
                        )}>
                            {loading ? "Please wait" : "Share your perspective"}
                        </p>
                    </div>
                </div>

                {!isDisabled && (
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                )}
            </div>
        );
    }

    const sizeClasses = {
        sm: "h-10 px-4 text-sm",
        md: "h-11 px-6 text-base",
        lg: "h-12 px-8 text-lg"
    };

    return (
        <Button
            onClick={onClick}
            variant={variant}
            disabled={isDisabled}
            className={cn(
                "rounded-full flex items-center gap-2 font-bold transition-all duration-200",
                sizeClasses[size],
                className
            )}
        >
            {loading ? (
                <>
                    <Loader2 className={cn(
                        "animate-spin",
                        size === "sm" && "h-4 w-4",
                        size === "md" && "h-4 w-4",
                        size === "lg" && "h-5 w-5"
                    )} />
                    <span>Creating...</span>
                </>
            ) : (
                <>
                    <span>Create Rationale</span>
                    <EyeIcon className={cn(
                        "transition-colors duration-200",
                        size === "sm" && "h-4 w-4",
                        size === "md" && "h-4 w-4",
                        size === "lg" && "h-5 w-5"
                    )} />
                </>
            )}
        </Button>
    );
} 