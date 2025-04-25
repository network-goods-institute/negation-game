"use client";

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchPoint } from '@/actions/fetchPoint';
import { fetchViewpoint } from '@/actions/fetchViewpoint';
import { DiscourseMessage } from '@/types/chat';
import { encodeId } from '@/lib/encodeId';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FileText, MessageSquareQuote, ExternalLink, BookText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MessageSource {
    type: string; // 'Rationale', 'Endorsed Point', 'Discourse Post'
    id: string | number;
}

interface DetailedSourceListProps {
    sources: MessageSource[];
    space: string | null;
    discourseUrl: string;
    storedMessages: DiscourseMessage[];
}

interface SourceListItemProps {
    source: MessageSource;
    space: string | null;
    discourseUrl: string;
    storedMessages: DiscourseMessage[];
}

const SourceListItem: React.FC<SourceListItemProps> = ({ source, space, storedMessages, discourseUrl }) => {
    const isRationale = source.type === 'Rationale';
    const isPoint = source.type === 'Endorsed Point';
    const isDiscourse = source.type === 'Discourse Post';

    const numericId = isPoint ? Number(source.id) : null;
    const stringId = isRationale ? String(source.id) : null;
    const discourseId = isDiscourse ? String(source.id) : null;

    const { data: pointData, isLoading: isLoadingPoint, error: pointError } = useQuery({
        queryKey: ['pointSourceDetails', numericId],
        queryFn: () => fetchPoint(numericId!),
        enabled: isPoint && numericId !== null,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    const { data: rationaleData, isLoading: isLoadingRationale, error: rationaleError } = useQuery({
        queryKey: ['rationaleSourceDetails', stringId],
        queryFn: () => fetchViewpoint(stringId!),
        enabled: isRationale && stringId !== null,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    const discourseMessage = isDiscourse
        ? storedMessages.find((m: DiscourseMessage) => String(m.id) === discourseId)
        : null;

    let title: string | undefined = undefined;
    let snippet: string | undefined = undefined;
    let href: string | undefined = undefined;
    let Icon = BookText;
    let displayId = String(source.id);
    let isLoading = false;

    if (isPoint) {
        Icon = FileText;
        isLoading = isLoadingPoint;
        title = pointData?.content;
        snippet = pointData?.content;
        try {
            const encodedIdStr = encodeId(Number(source.id));
            displayId = encodedIdStr;
            href = space ? `/s/${space}/${encodedIdStr}` : `/p/${encodedIdStr}`;
        } catch (e) {
            displayId = String(source.id);
            href = space ? `/s/${space}/${source.id}` : `/p/${source.id}`;
        }
    } else if (isRationale) {
        Icon = MessageSquareQuote;
        isLoading = isLoadingRationale;
        title = rationaleData?.title;
        snippet = rationaleData?.description;
        displayId = String(source.id);
        if (space) {
            href = `/s/${space}/rationale/${displayId}`;
        }
    } else if (isDiscourse) {
        Icon = ExternalLink;
        displayId = String(source.id);
        const postTitle = discourseMessage?.topic_title || `Post ${displayId}`;
        title = `Discourse: ${postTitle}`;
        snippet = discourseMessage?.raw?.substring(0, 150) || discourseMessage?.content?.substring(0, 150) || '(No preview)';
        if (discourseUrl) {
            const baseUrl = discourseUrl.endsWith('/') ? discourseUrl.slice(0, -1) : discourseUrl;
            href = `${baseUrl}/p/${displayId}`;
        }
    }

    const hasError = pointError || rationaleError;

    return (
        <div className="flex items-start gap-3 p-3 border rounded-md bg-card/50 hover:bg-card/80 transition-colors">
            <Icon className="h-4 w-4 mt-1 flex-shrink-0 text-muted-foreground" />
            <div className="flex-grow min-w-0">
                <div className="text-sm font-medium flex items-center justify-between">
                    <span className="truncate pr-2">
                        {isLoading ? (
                            <Skeleton className="h-4 w-32 inline-block" />
                        ) : hasError ? (
                            `${source.type} ${displayId} (Error)`
                        ) : title ? (
                            title
                        ) : (
                            `${source.type} ${displayId}`
                        )}
                    </span>
                    {href && !isDiscourse && (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                            <Link href={href} target="_blank" rel="noopener noreferrer">
                                View <ExternalLink className="ml-1 h-3 w-3" />
                            </Link>
                        </Button>
                    )}
                    {isDiscourse && (
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                    Preview
                                </Button>
                            </DialogTrigger>
                            {href && (
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs ml-1" asChild>
                                    <Link href={href} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-3 w-3" />
                                    </Link>
                                </Button>
                            )}
                            <DialogContent className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[80vh] flex flex-col p-0">
                                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                                    <DialogTitle>Discourse Post {displayId} Preview</DialogTitle>
                                </DialogHeader>
                                <ScrollArea className="flex-grow overflow-y-auto px-6 py-4">
                                    <div
                                        className="prose prose-sm dark:prose-invert max-w-none [&_a]:text-primary [&_a:hover]:underline"
                                        dangerouslySetInnerHTML={{ __html: discourseMessage?.content || discourseMessage?.raw || `(No content preview available for Post ${displayId})` }}
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
                    )}
                </div>
                {isLoading ? (
                    <Skeleton className="h-3 w-4/5 mt-1.5" />
                ) : snippet && !hasError ? (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {snippet}
                    </p>
                ) : hasError ? (
                    <p className="text-xs text-destructive mt-1">Could not load details.</p>
                ) : (
                    <p className="text-xs text-muted-foreground/70 mt-1 italic">No further details available.</p>
                )}
            </div>
        </div>
    );
};


export const DetailedSourceList: React.FC<DetailedSourceListProps> = ({
    sources,
    space,
    discourseUrl,
    storedMessages
}) => {
    if (!sources || sources.length === 0) {
        return null;
    }

    return (
        <Accordion type="single" collapsible className="w-full mt-2 border-t pt-2">
            <AccordionItem value="sources" className="border-b-0">
                <AccordionTrigger className="text-xs text-muted-foreground hover:no-underline py-1">
                    View Sources ({sources.length})
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-0">
                    <div className="space-y-2">
                        {sources.map((source, index) => (
                            <SourceListItem
                                key={`${source.type}-${source.id}-${index}`}
                                source={source}
                                space={space}
                                discourseUrl={discourseUrl}
                                storedMessages={storedMessages}
                            />
                        ))}
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}; 