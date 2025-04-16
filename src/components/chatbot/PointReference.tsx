import React from 'react';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import * as TooltipPrimitive from "@radix-ui/react-tooltip"; // Import Radix primitive
import { FileText, MessageSquareQuote } from 'lucide-react'; // Point and Rationale icons
import { cn } from '@/lib/cn';

interface PointReferenceProps {
    id: number | string; // Can be number (Point) or string (Rationale)
    snippet?: string;
    space: string | null;
}

export const PointReference: React.FC<PointReferenceProps> = ({ id, snippet, space }) => {
    const isRationale = typeof id === 'string';
    const typeText = isRationale ? 'Rationale' : 'Point';
    const Icon = isRationale ? MessageSquareQuote : FileText;

    let href: string | null = null;
    if (isRationale) {
        if (space) {
            href = `/s/${space}/rationale/${id}`;
        } else {
            console.warn("PointReference: Missing space prop for Rationale link", { id });
        }
    } else {
        href = `/s/${space}/${id}`;
    }

    const tooltipContent = snippet ? `${typeText} ${id}: "${snippet}"` : `${typeText} ${id}`;

    const triggerAppearance = (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded mx-0.5 align-middle",
                "bg-secondary text-secondary-foreground",
                href ? "hover:bg-muted cursor-pointer" : "cursor-default text-muted-foreground/70"
            )}
            onClick={(e) => {
                if (href) {
                    e.preventDefault();
                    window.open(href, '_blank', 'noopener,noreferrer');
                } else {
                    e.preventDefault();
                }
            }}
            tabIndex={href ? 0 : -1}
            role={href ? "link" : undefined}
        >
            <Icon className="h-3 w-3 flex-shrink-0" />
            {isRationale ? (
                <span className="truncate max-w-[150px]">{snippet || `Rationale ${id}`}</span>
            ) : (
                <span className="flex items-center gap-1 overflow-hidden">
                    <span className="flex-shrink-0">{typeText} {id}</span>
                    {snippet && <span className="text-muted-foreground/80 truncate">: "{snippet}"</span>}
                </span>
            )}
        </span>
    );

    return (
        <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild>
                    {triggerAppearance}
                </TooltipTrigger>
                <TooltipPrimitive.Portal>
                    <TooltipContent side="top">
                        {tooltipContent}
                    </TooltipContent>
                </TooltipPrimitive.Portal>
            </Tooltip>
        </TooltipProvider>
    );
}; 