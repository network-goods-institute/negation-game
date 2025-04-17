import React from 'react';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import * as TooltipPrimitive from "@radix-ui/react-tooltip"; // Import Radix primitive
import { FileText, MessageSquareQuote } from 'lucide-react'; // Point and Rationale icons
import { cn } from '@/lib/cn';
import { encodeId } from '@/lib/encodeId'; // Correct import path

interface PointReferenceProps {
    id: number | string; // Can be number (Point) or string (Rationale)
    snippet?: string;
    space: string | null;
}

const MAX_SNIPPET_LENGTH = 100;
const MAX_TOOLTIP_SNIPPET_LENGTH = 300;

export const PointReference: React.FC<PointReferenceProps> = ({ id, snippet, space }) => {

    const isRationale = typeof id === 'string';
    const typeText = isRationale ? 'Rationale' : 'Point';
    const Icon = isRationale ? MessageSquareQuote : FileText;

    let displayId: string;
    let href: string | null = null;
    if (isRationale) {
        displayId = String(id); // Keep string ID as is for rationales
        if (space) {
            href = `/s/${space}/rationale/${displayId}`;
        } else {
            console.warn("PointReference: Missing space prop for Rationale link", { id });
        }
    } else {
        displayId = String(id);
        try {
            const encodedPointId = encodeId(Number(id));
            displayId = encodedPointId;
            // Use space in the link if available
            href = space ? `/s/${space}/${encodedPointId}` : `/p/${encodedPointId}`;
        } catch (e) {
            console.error(`PointReference: Failed to encode point ID ${id}`, e);
            displayId = String(id);
            href = space ? `/s/${space}/${id}` : `/p/${id}`;
        }
    }

    const displaySnippet = snippet
        ? snippet.substring(0, MAX_SNIPPET_LENGTH) + (snippet.length > MAX_SNIPPET_LENGTH ? '…' : '')
        : undefined;

    const tooltipSnippet = snippet && snippet.length > MAX_TOOLTIP_SNIPPET_LENGTH
        ? snippet.substring(0, MAX_TOOLTIP_SNIPPET_LENGTH) + '…'
        : snippet;

    const tooltipContent = tooltipSnippet ? `${typeText} ${displayId}: "${tooltipSnippet}"` : `${typeText} ${displayId}`;

    const triggerAppearance = (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded mx-0.5 align-middle",
                "bg-secondary text-secondary-foreground",
                href ? "hover:bg-muted cursor-pointer" : "cursor-default text-muted-foreground/70",
                // Add overflow handling classes
                "max-w-full overflow-hidden"
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
                // Rationale: Show title/snippet (truncated)
                <span className="truncate">{displaySnippet || `Rationale ${displayId}`}</span>
            ) : (
                // Point: Show ID and snippet (potentially placeholder)
                <span className="flex items-center gap-1 overflow-hidden">
                    <span className="flex-shrink-0">{typeText} {displayId}</span>
                    {displaySnippet && <span className="text-muted-foreground/80 truncate">: "{displaySnippet}"</span>}
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
                    <TooltipContent side="top" className="max-w-xs break-words"> {/* Allow tooltip content to wrap */}
                        {tooltipContent}
                    </TooltipContent>
                </TooltipPrimitive.Portal>
            </Tooltip>
        </TooltipProvider>
    );
}; 