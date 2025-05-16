import React, { useCallback } from "react";
import { ViewpointCard } from "./ViewpointCard";
import Link from "next/link";
import { preventDefaultIfContainsSelection } from "@/lib/preventDefaultIfContainsSelection";

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
    topic = ''
}: ViewpointCardWrapperProps) {
    // Card click handler - only triggers navigation when the ViewpointCard
    // component determines it's a valid click (not a text selection)
    const onCardClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        handleCardClick?.(`rationale-${id}`);
    }, [id, handleCardClick]);

    return (
        <Link
            draggable={false}
            href={`/s/${space}/rationale/${id}`}
            className="flex border-b cursor-pointer hover:bg-accent"
            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                preventDefaultIfContainsSelection(e);
                // Don't navigate if text is selected or if it's an action button
                const isActionButton = (e.target as HTMLElement).closest('[data-action-button="true"]');
                if (!isActionButton && window.getSelection()?.isCollapsed !== false) {
                    handleCardClick?.(`rationale-${id}`);
                }
            }}
        >
            <ViewpointCard
                className={className}
                id={id}
                topic={topic}
                title={title}
                description={description}
                author={author}
                authorId={authorId}
                createdAt={createdAt}
                space={space}
                statistics={statistics}
                linkable={false} // Disable internal linking since we're using the outer Link now
                isLoading={loadingCardId === `rationale-${id}`}
                data-rationale-id={id}
            />
        </Link>
    );
} 