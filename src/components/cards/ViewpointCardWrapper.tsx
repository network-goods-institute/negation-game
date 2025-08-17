import React, { useCallback, useState } from "react";
import { ViewpointCard } from "@/components/cards/ViewpointCard";
import { useRouter } from "next/navigation";
import { preventDefaultIfContainsSelection } from "@/lib/utils/preventDefaultIfContainsSelection";


interface ViewpointCardWrapperProps {
    id: string;
    title: string;
    description: string;
    authorId: string;
    author: string;
    createdAt: Date;
    space: string;
    statistics: {
        views: number;
        copies: number;
        totalCred?: number;
        averageFavor?: number;
    };
    loadingCardId?: string | null;
    handleCardClick?: (id: string) => void;
    className?: string;
    topic?: string;
    topicId?: number;
}

export function ViewpointCardWrapper({
    id,
    title,
    description,
    authorId,
    author,
    createdAt,
    space,
    statistics,
    loadingCardId,
    handleCardClick,
    className = "flex-grow",
    topic = '',
    topicId
}: ViewpointCardWrapperProps) {
    const router = useRouter();
    const [isLocalLoading, setIsLocalLoading] = useState(false);

    // Card click handler - only triggers navigation when the ViewpointCard
    // component determines it's a valid click (not a text selection)
    const onCardClick = useCallback((e: React.MouseEvent) => {
        // Don't navigate if user is selecting text
        preventDefaultIfContainsSelection(e as any);

        const target = e.target as HTMLElement;
        if (target.closest('a') || target.closest('button')) {
            return;
        }

        // Allow browser defaults for modifier/middle clicks and context menu
        // @ts-ignore - MouseEvent has these props at runtime
        if ((e as any).metaKey || (e as any).ctrlKey || (e as any).shiftKey || (e as any).altKey || (e as any).button === 1) {
            return;
        }
        // Right-click should open the browser context menu; do not intercept
        // Note: onClick won't fire for button === 2, but in case of synthetic events, guard it
        // @ts-ignore
        if ((e as any).button === 2) {
            return;
        }

        e.preventDefault();
        setIsLocalLoading(true);
        handleCardClick?.(`rationale-${id}`);
        // Defer to the child card overlay to render immediately; navigate shortly after
        setTimeout(() => {
            router.push(`/s/${space}/rationale/${id}`);
        }, 50);
    }, [id, space, handleCardClick, router]);

    return (
        <div
            className="flex border-b cursor-pointer hover:bg-accent min-w-0 w-full overflow-hidden"
            onClick={onCardClick}
            draggable={false}
            role="link"
            tabIndex={0}
            onContextMenu={(e) => {
                // ensure we never block the browser context menu
                // do not call preventDefault here
                e.stopPropagation();
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    onCardClick(e as unknown as React.MouseEvent);
                }
            }}
        >
            <ViewpointCard
                className={`${className} min-w-0 w-full overflow-hidden`}
                id={id}
                topic={topic}
                topicId={topicId}
                title={title}
                description={description}
                author={author}
                authorId={authorId}
                createdAt={createdAt}
                space={space}
                statistics={statistics}
                linkable={false}
                isLoading={isLocalLoading || loadingCardId === `rationale-${id}`}
                data-rationale-id={id}
            />
        </div>
    );
} 