import React, { ReactNode, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { FileText, MessageSquareQuote, ExternalLink } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { encodeId } from '@/lib/negation-game/encodeId';
import { useQuery } from '@tanstack/react-query';
import { fetchPoint } from '@/actions/fetchPoint';

interface SourceCitationProps {
    type: 'Rationale' | 'Endorsed Point' | 'Discourse Post';
    id: string | number;
    title?: string;
    rawContent?: string;
    htmlContent?: string;
    space: string | null;
    discourseUrl: string;
}

export const SourceCitation: React.FC<SourceCitationProps> = ({ type, id, title, rawContent, htmlContent, space, discourseUrl }) => {
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const isRationale = type === 'Rationale';
    const isPoint = type === 'Endorsed Point';
    const isDiscourse = type === 'Discourse Post';
    const numericId = (isRationale || isDiscourse) ? null : Number(id);

    const { data: pointData, isLoading: isLoadingPoint } = useQuery({
        queryKey: ['pointSourceDetails', numericId],
        queryFn: () => fetchPoint(numericId!),
        enabled: isPoint && numericId !== null,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    const fetchedTitle = pointData?.content;

    let href: string | undefined = undefined;
    let Icon = ExternalLink;
    let displayContent: string | ReactNode = `${type}: ${id}`;
    let tooltipSimpleText: string = `${type} ${id}`;

    if (isRationale) {
        if (space) {
            href = `/s/${space}/rationale/${id}`;
        }
        Icon = MessageSquareQuote;
        displayContent = title ? `"${title}"` : `Rationale ${id}`;
        tooltipSimpleText = `${type}: ${displayContent}`;
    } else if (isPoint) {
        try {
            const encodedPointId = encodeId(Number(id));
            href = space ? `/s/${space}/${encodedPointId}` : `/p/${encodedPointId}`;
        } catch (e) {
            href = space ? `/s/${space}/${id}` : `/p/${id}`;
        }
        Icon = FileText;
        const encodedPointIdForDisplay = href?.split('/').pop() || String(id);
        displayContent = fetchedTitle ? `"${fetchedTitle}"`
            : title ? `"${title}"`
                : `Point ${encodedPointIdForDisplay}`;
        tooltipSimpleText = fetchedTitle ? `${type}: "${fetchedTitle}"`
            : title ? `${type}: "${title}"`
                : `${type}: Point ${encodedPointIdForDisplay}`;
    } else if (isDiscourse) {
        if (discourseUrl) {
            const baseUrl = discourseUrl.endsWith('/') ? discourseUrl.slice(0, -1) : discourseUrl;
            href = `${baseUrl}/p/${id}`;
        }
        Icon = ExternalLink;
        displayContent = `Post ${id}`;
        tooltipSimpleText = "Click for content preview";
    }

    const previewDialogContent = rawContent || htmlContent || `(No content preview available for Post ${id})`;

    const tagBaseClasses = "inline-flex items-center gap-1 border border-dashed border-muted-foreground/30 px-1.5 py-0.5 text-xs rounded mx-0.5 align-middle";
    const tagHoverClasses = "text-muted-foreground hover:bg-muted/50 cursor-pointer";
    const tagDisabledClasses = "text-muted-foreground/70 cursor-default";

    const renderTagContent = () => {
        if (isDiscourse) {
            return (
                <span className={cn(tagBaseClasses, tagDisabledClasses, "mt-1 group")}>
                    <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DialogTrigger asChild>
                                    <button
                                        className="font-normal border-none bg-transparent p-0 hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm"
                                        onClick={(e) => { e.stopPropagation(); setIsPreviewOpen(true); }}
                                    >
                                        {displayContent}
                                    </button>
                                </DialogTrigger>
                            </TooltipTrigger>
                            <TooltipPrimitive.Portal>
                                <TooltipContent side="top">{tooltipSimpleText}</TooltipContent>
                            </TooltipPrimitive.Portal>
                        </Tooltip>
                    </TooltipProvider>
                    {href && (
                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={cn("ml-1 p-0.5 rounded", tagHoverClasses)}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Icon className="h-3 w-3" />
                                    </Link>
                                </TooltipTrigger>
                                <TooltipPrimitive.Portal>
                                    <TooltipContent side="top">View on forum</TooltipContent>
                                </TooltipPrimitive.Portal>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </span>
            );
        } else {
            return (
                <TooltipProvider delayDuration={300}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            {href ? (
                                <Link href={href} target="_blank" rel="noopener noreferrer" className={cn(tagBaseClasses, tagHoverClasses, "mt-1")}>
                                    <React.Fragment>
                                        <Icon className="h-3 w-3" />
                                        <span className="font-normal">{displayContent}</span>
                                    </React.Fragment>
                                </Link>
                            ) : (
                                <span className={cn(tagBaseClasses, tagDisabledClasses, "mt-1")}>
                                    <React.Fragment>
                                        <Icon className="h-3 w-3" />
                                        <span className="font-normal">{displayContent}</span>
                                    </React.Fragment>
                                </span>
                            )}
                        </TooltipTrigger>
                        <TooltipPrimitive.Portal>
                            <TooltipContent side="top">{tooltipSimpleText}</TooltipContent>
                        </TooltipPrimitive.Portal>
                    </Tooltip>
                </TooltipProvider>
            );
        }
    };

    return (
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            {renderTagContent()}
            <DialogContent className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[80vh] flex flex-col p-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <DialogTitle>Discourse Post {id} Preview</DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-grow overflow-y-auto px-6 py-4">
                    <div
                        className="prose prose-sm dark:prose-invert max-w-none [&_a]:text-primary [&_a:hover]:underline"
                        dangerouslySetInnerHTML={{ __html: previewDialogContent }}
                    />
                </ScrollArea>
                {href && (
                    <div className="px-6 pb-6 pt-4 border-t flex justify-end">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={href} target="_blank">View on Forum <ExternalLink className='ml-1.5 h-3 w-3' /></Link>
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}; 