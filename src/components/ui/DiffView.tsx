import React from "react";
import { computeLineDiff, DiffLine } from "@/utils/diff/lineDiff";
import { cn } from "@/lib/utils/cn";

interface DiffViewProps {
    original: string;
    updated: string;
    className?: string;
}

export function DiffView({ original, updated, className }: DiffViewProps) {
    const lines: DiffLine[] = React.useMemo(
        () => computeLineDiff(original || "", updated || ""),
        [original, updated]
    );

    return (
        <div className={cn("rounded-md border overflow-hidden text-sm font-mono", className)}>
            <div className="grid grid-cols-1">
                {lines.map((line, idx) => {
                    const base = "px-3 py-1 whitespace-pre-wrap";
                    if (line.type === "context")
                        return (
                            <div key={idx} className={cn(base, "bg-background")}>{line.text}</div>
                        );
                    if (line.type === "added")
                        return (
                            <div key={idx} className={cn(base, "bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300")}>
                                + {line.text}
                            </div>
                        );
                    return (
                        <div key={idx} className={cn(base, "bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300")}>- {line.text}</div>
                    );
                })}
            </div>
        </div>
    );
}


