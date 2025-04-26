import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { FileText, MessageSquareQuote } from 'lucide-react';
import { cn } from '@/lib/cn';
import { encodeId } from '@/lib/encodeId';
import { useQuery } from '@tanstack/react-query';
import { fetchPoint } from '@/actions/fetchPoint';

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
    const numericId = isRationale ? null : Number(id);

    const { data: pointData, isLoading: isLoadingPoint } = useQuery({
        queryKey: ['pointDetails', numericId],
        queryFn: () => fetchPoint(numericId!),
        enabled: !isRationale && numericId !== null, // Only fetch for valid numeric point IDs
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
        gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    });

    const fetchedTitle = pointData?.content;

    let displayId: string;
    let href: string | null = null;
    if (isRationale) {
        displayId = String(id); // Keep string ID as is for rationales
        if (space) {
            href = `/s/${space}/rationale/${displayId}`;
        }
    } else {
        displayId = String(id);
        try {
            const encodedPointId = encodeId(Number(id));
            displayId = encodedPointId;
            href = space ? `/s/${space}/${encodedPointId}` : `/p/${encodedPointId}`;
        } catch (e) {
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

    let tooltipContent: string;
    if (isRationale) {
        tooltipContent = tooltipSnippet ? `${typeText} ${displayId}: "${tooltipSnippet}"` : `${typeText} ${displayId}`;
    } else {
        const baseText = `${typeText} ${displayId}`;
        if (isLoadingPoint) {
            tooltipContent = `${baseText} (Loading...)`;
        } else if (fetchedTitle) {
            const truncatedFetchedTitle = fetchedTitle.length > MAX_TOOLTIP_SNIPPET_LENGTH
                ? fetchedTitle.substring(0, MAX_TOOLTIP_SNIPPET_LENGTH) + '…'
                : fetchedTitle;
            tooltipContent = `${baseText}: "${truncatedFetchedTitle}"`;
        } else if (tooltipSnippet) {
            tooltipContent = `${baseText}: "${tooltipSnippet}"`;
        } else {
            tooltipContent = baseText;
        }
    }

    const triggerAppearance = (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded mx-0.5 align-middle",
                "bg-secondary text-secondary-foreground",
                href ? "hover:bg-muted cursor-pointer" : "cursor-default text-muted-foreground/70",
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
                // Point: Show ID (keep this simple, tooltip has title)
                <span className="flex items-center gap-1 overflow-hidden">
                    <span className="flex-shrink-0">{typeText} {displayId}</span>
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