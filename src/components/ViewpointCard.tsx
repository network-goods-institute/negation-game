import { cn } from "@/lib/cn";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import dynamic from "next/dynamic";
import remarkGfm from "remark-gfm";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/popover";
import { Portal } from "@radix-ui/react-portal";
import { ViewpointIcon } from "@/components/icons/AppIcons";
import { useRouter } from "next/navigation";
import { ViewpointStatsBar } from "./ViewpointStatsBar";

const DynamicMarkdown = dynamic(() => import('react-markdown'), {
    loading: () => <div className="animate-pulse h-32 bg-muted/30 rounded-md" />,
    ssr: false
});

export interface ViewpointCardProps extends React.HTMLAttributes<HTMLDivElement> {
    id: string;
    title: string;
    description: string;
    author: string;
    createdAt: Date;
    className?: string;
    space: string;
    linkable?: boolean;
    statistics?: {
        views: number;
        copies: number;
        totalCred?: number;
        averageFavor?: number;
    };
    isLoading?: boolean;
}

export const ViewpointCard: React.FC<ViewpointCardProps> = ({
    id,
    title,
    description,
    author,
    createdAt,
    className,
    space,
    linkable = true,
    statistics,
    isLoading = false,
    onClick,
    ...props
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const mouseDownRef = useRef<{ x: number, y: number } | null>(null);

    // Monitor selection changes
    useEffect(() => {
        const handleSelectionChange = () => {
            const selection = window.getSelection();
            setIsSelecting(selection !== null && !selection.isCollapsed);
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
        };
    }, []);

    const handleHoverStart = useCallback(() => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        if (!isOpen) {
            setIsOpen(true);
        }
    }, [isOpen]);

    const handleHoverEnd = useCallback(() => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }

        hoverTimeoutRef.current = setTimeout(() => {
            setIsOpen(false);
        }, 100); // Small delay to prevent flickering when moving between elements
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        mouseDownRef.current = { x: e.clientX, y: e.clientY };
    }, []);

    const handleCardClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        // If there was no mousedown recorded, don't process the click
        if (!mouseDownRef.current) {
            return;
        }

        const mouseUp = { x: e.clientX, y: e.clientY };
        const mouseMoved = Math.abs(mouseDownRef.current.x - mouseUp.x) > 5 ||
            Math.abs(mouseDownRef.current.y - mouseUp.y) > 5;

        // Clear the mousedown ref for the next interaction
        mouseDownRef.current = null;

        // Check if text is selected
        const selection = window.getSelection();
        const hasSelection = selection && !selection.isCollapsed;

        // If text is selected or the mouse was dragged, don't navigate
        if (hasSelection || mouseMoved || isSelecting) {
            return;
        }

        const target = e.target as HTMLElement;
        const isActionButton = target.closest('[data-action-button="true"]');
        if (isActionButton) {
            return;
        }

        if (onClick) {
            onClick(e as React.MouseEvent<HTMLDivElement>);
        }

        if (linkable) {
            setIsOpen(false);
            router.push(`/s/${space}/rationale/${id}`);
        }
    }, [id, linkable, router, space, onClick, isSelecting]);

    return (
        <Popover
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) setIsOpen(false);
            }}
        >
            <PopoverTrigger asChild>
                <div
                    className={cn("block cursor-pointer focus:outline-none", className)}
                    onMouseEnter={handleHoverStart}
                    onMouseLeave={handleHoverEnd}
                    onMouseDown={handleMouseDown}
                    onMouseUp={() => {
                        // We need this for cases where mouse is released without a click
                        // e.g., after starting a selection but moving off the component
                        setTimeout(() => {
                            mouseDownRef.current = null;
                        }, 10);
                    }}
                    onClick={handleCardClick}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            const selection = window.getSelection();
                            if (!selection || selection.isCollapsed) {
                                if (onClick) {
                                    onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
                                }
                                setIsOpen(false);
                                router.push(`/s/${space}/rationale/${id}`);
                            }
                        }
                    }}
                    role="button"
                    tabIndex={0}
                    {...props}
                >
                    <div className="@container/point relative flex flex-col pt-4 pb-3 px-4 border-b hover:bg-accent">
                        {isLoading && (
                            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                                <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}
                        <div className="flex flex-col flex-grow w-full min-w-0">
                            <div className="flex items-start gap-2">
                                <ViewpointIcon className="flex-shrink-0" />
                                <h3 className="tracking-tight text-md @xs/point:text-md @sm/point:text-lg font-semibold -mt-1 mb-sm select-text flex-1 break-words whitespace-normal overflow-hidden">
                                    {title}
                                </h3>
                            </div>

                            <div className="text-sm text-muted-foreground line-clamp-2 mb-2 h-10 overflow-hidden select-text">
                                {description}
                            </div>

                            <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                                <span>By <span className="font-bold text-yellow-500">{author}</span></span>
                                <div className="flex items-center gap-2">
                                    <ViewpointStatsBar
                                        views={statistics?.views || 0}
                                        copies={statistics?.copies || 0}
                                        totalCred={statistics?.totalCred}
                                        averageFavor={statistics?.averageFavor}
                                        className="mr-2"
                                    />
                                    <Badge variant="secondary" className="text-xs">
                                        {new Date(createdAt).toLocaleDateString()}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </PopoverTrigger>
            <Portal>
                <PopoverContent
                    className="w-80 sm:w-96 max-h-80 overflow-auto"
                    onMouseEnter={handleHoverStart}
                    onMouseLeave={handleHoverEnd}
                    side="right"
                    align="start"
                    sideOffset={5}
                >
                    <div className="flex flex-col gap-3 pl-3">
                        <div className="flex items-start gap-2">
                            <ViewpointIcon />
                            <h3 className="text-lg font-semibold -mt-0.5">{title}</h3>
                        </div>

                        <div className="text-sm text-muted-foreground mb-1">
                            By <span className="font-bold text-yellow-500">{author}</span>
                        </div>

                        <ViewpointStatsBar
                            views={statistics?.views || 0}
                            copies={statistics?.copies || 0}
                            totalCred={statistics?.totalCred}
                            averageFavor={statistics?.averageFavor}
                            className="mb-2"
                        />

                        <div className="prose dark:prose-invert max-w-none text-sm [&>p]:mb-4 [&>p]:leading-7 [&>h1]:mt-8 [&>h1]:mb-4 [&>h2]:mt-6 [&>h2]:mb-4 [&>h3]:mt-4 [&>h3]:mb-2 [&>ul]:mb-4 [&>ul]:ml-6 [&>ol]:mb-4 [&>ol]:ml-6 [&>li]:mb-2 [&>blockquote]:border-l-4 [&>blockquote]:border-muted [&>blockquote]:pl-4 [&>blockquote]:italic">
                            <DynamicMarkdown remarkPlugins={[remarkGfm]}>
                                {description}
                            </DynamicMarkdown>
                        </div>
                    </div>
                </PopoverContent>
            </Portal>
        </Popover>
    );
}; 