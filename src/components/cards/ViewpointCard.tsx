import { cn } from "@/lib/utils/cn";
import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
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
import { useRouter, usePathname } from "next/navigation";
import { encodeId } from "@/lib/negation-game/encodeId";
import Link from "next/link";
import { ViewpointStatsBar } from "../rationale/ViewpointStatsBar";
import { UsernameDisplay } from "@/components/ui/UsernameDisplay";
import useIsMobile from "@/hooks/ui/useIsMobile";

const DynamicMarkdown = dynamic(() => import('react-markdown'), {
    loading: () => <div className="animate-pulse h-32 bg-muted/30 rounded-md" />,
    ssr: false
});

const stripMarkdown = (text: string): string => {
    return text
        // Remove headers
        .replace(/#{1,6}\s+/g, '')
        // Remove bold and italic
        .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
        // Remove links
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Remove images
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        // Remove code blocks
        .replace(/```[\s\S]*?```/g, '')
        // Remove inline code
        .replace(/`([^`]+)`/g, '$1')
        // Remove blockquotes
        .replace(/^>\s+/gm, '')
        // Remove horizontal rules
        .replace(/^---+$/gm, '')
        // Remove list markers
        .replace(/^[\s-]*[-+*]\s+/gm, '')
        .replace(/^\s*\d+\.\s+/gm, '')
        // Remove HTML tags
        .replace(/<[^>]*>/g, '')
        // Collapse multiple newlines
        .replace(/\n{2,}/g, '\n')
        .trim();
};

export interface ViewpointCardProps extends React.HTMLAttributes<HTMLDivElement> {
    id: string;
    title: string;
    description: string;
    author: string;
    authorId: string;
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
    bio?: string;
    delegationUrl?: string | null;
    rationalesCount?: number;
    createdAtDate?: Date;
    avatarUrl?: string | null;
    isUsernameLoading?: boolean;
    isUsernameError?: boolean;
    onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
    topic?: string;
    topicId?: number;
}

export const ViewpointCard: React.FC<ViewpointCardProps> = ({
    id,
    title,
    description,
    author,
    authorId,
    createdAt,
    className,
    space,
    linkable = true,
    statistics,
    isLoading = false,
    bio = "Placeholder Bio",
    delegationUrl = null,
    rationalesCount = 0,
    createdAtDate = new Date(),
    avatarUrl = null,
    isUsernameLoading = false,
    isUsernameError = false,
    onClick,
    topic,
    topicId,
    ...props
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const mouseDownRef = useRef<{ x: number, y: number } | null>(null);
    const isMobile = useIsMobile();
    const [isTopicClicked, setIsTopicClicked] = useState(false);
    const [isViewTopicClicked, setIsViewTopicClicked] = useState(false);

    const plainDescription = useMemo(() => stripMarkdown(description), [description]);


    useEffect(() => {
        if (isTopicClicked) {
            const timer = setTimeout(() => {
                setIsTopicClicked(false);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isTopicClicked]);

    useEffect(() => {
        if (isViewTopicClicked) {
            const timer = setTimeout(() => {
                setIsViewTopicClicked(false);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isViewTopicClicked]);

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
        if (isMobile) return; // Disable popover on mobile
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        if (!isOpen) {
            setIsOpen(true);
        }
    }, [isOpen, isMobile]);

    const handleHoverEnd = useCallback(() => {
        if (isMobile) return; // Disable popover on mobile
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }

        hoverTimeoutRef.current = setTimeout(() => {
            setIsOpen(false);
        }, 100); // Small delay to prevent flickering when moving between elements
    }, [isMobile]);

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
                    <div className="@container/point relative flex flex-col pt-4 pb-3 px-4 border-b hover:bg-accent min-w-0 overflow-hidden">
                        {isLoading && (
                            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 pointer-events-none">
                                <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}
                        <div className="flex flex-col flex-grow w-full min-w-0 overflow-hidden">
                            <div className="flex items-start gap-2">
                                <ViewpointIcon className="flex-shrink-0" />
                                <h3 className={cn(
                                    "tracking-tight text-md @xs/point:text-md @sm/point:text-lg font-semibold -mt-1 select-text flex-1 break-words whitespace-normal overflow-hidden",
                                    plainDescription ? "mb-sm" : "mb-1"
                                )}>
                                    <>
                                        {topic ? (
                                            topicId ? (
                                                <>
                                                    {isTopicClicked && (
                                                        <div className="inline-block mr-2 size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                    )}
                                                    <span
                                                        className={cn(
                                                            "text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                                        )}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setIsTopicClicked(true);
                                                            router.push(`/s/${space}/rationale/${id}`);
                                                        }}
                                                        data-href={`/s/${space}/rationale/${id}`}
                                                        title={`View rationale`}
                                                    >
                                                        {topic}
                                                    </span>
                                                </>
                                            ) : (
                                                <span>{topic}</span>
                                            )
                                        ) : (
                                            <span>{title}</span>
                                        )}
                                        <span className="text-muted-foreground mx-1">-</span>
                                        <UsernameDisplay
                                            username={author}
                                            userId={authorId}
                                            className="text-yellow-600 dark:text-yellow-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-medium"
                                        />
                                        {topic && topicId && (
                                            <a
                                                href={`/s/${space}/topic/${encodeId(topicId)}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsViewTopicClicked(true);
                                                }}
                                                className="ml-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline font-medium inline-flex items-center"
                                                title="View topic and proposal generation features"
                                            >
                                                <span className="w-3 h-3 mr-1 flex items-center justify-center flex-shrink-0">
                                                    {isViewTopicClicked && (
                                                        <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                                    )}
                                                </span>
                                                <span>View Topic</span>
                                            </a>
                                        )}
                                    </>
                                </h3>
                            </div>

                            {plainDescription && (
                                <div className="text-sm text-muted-foreground select-text sm:line-clamp-2 sm:mb-2 sm:h-10 overflow-hidden whitespace-normal">
                                    {plainDescription}
                                </div>
                            )}
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs text-muted-foreground mt-1 gap-1 sm:gap-0">
                                <div></div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <ViewpointStatsBar
                                        views={statistics?.views || 0}
                                        copies={statistics?.copies || 0}
                                        totalCred={statistics?.totalCred}
                                        averageFavor={statistics?.averageFavor}
                                        className="mr-2"
                                    />
                                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                                        {new Date(createdAt).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'numeric',
                                            day: 'numeric',
                                            timeZone: 'UTC'
                                        })}
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
                    sideOffset={5}
                    align="start"
                    avoidCollisions={true}
                    collisionPadding={16}
                >
                    <div className="flex flex-col gap-3 pl-3">
                        <div className="flex items-start gap-2">
                            <ViewpointIcon />
                            <h3 className="text-lg font-semibold -mt-0.5 flex-1">
                                <>
                                    {topic ? (
                                        topicId ? (
                                            <>
                                                {isTopicClicked && (
                                                    <div className="inline-block mr-2 size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                )}
                                                <span
                                                    className={cn(
                                                        "text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                                    )}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setIsTopicClicked(true);
                                                        router.push(`/s/${space}/rationale/${id}`);
                                                    }}
                                                    data-href={`/s/${space}/rationale/${id}`}
                                                    title={`View rationale`}
                                                >
                                                    {topic}
                                                </span>
                                            </>
                                        ) : (
                                            <span>{topic}</span>
                                        )
                                    ) : (
                                        <span>{title}</span>
                                    )}
                                    <span className="text-muted-foreground mx-1">-</span>
                                    <UsernameDisplay
                                        username={author}
                                        userId={authorId}
                                        className="text-yellow-600 dark:text-yellow-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-medium"
                                    />
                                    {topic && topicId && (
                                        <Link
                                            href={`/s/${space}/topic/${encodeId(topicId)}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsViewTopicClicked(true);
                                            }}
                                            className="ml-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline font-medium inline-flex items-center"
                                            title="View topic and proposal generation features"
                                        >
                                            <span className="w-3 h-3 mr-1 flex items-center justify-center flex-shrink-0">
                                                {isViewTopicClicked && (
                                                    <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                                )}
                                            </span>
                                            <span>View Topic</span>
                                        </Link>
                                    )}
                                </>
                            </h3>
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