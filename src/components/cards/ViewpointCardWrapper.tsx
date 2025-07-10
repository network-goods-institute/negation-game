import React, { useCallback } from "react";
import { ViewpointCard } from "@/components/cards/ViewpointCard";
import Link from "next/link";
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
    // Card click handler - only triggers navigation when the ViewpointCard
    // component determines it's a valid click (not a text selection)
    const onCardClick = useCallback(() => {
        handleCardClick?.(`rationale-${id}`);
    }, [id, handleCardClick]);

    return (
        <Link
            draggable={false}
            href={`/s/${space}/rationale/${id}`}
            className="flex border-b cursor-pointer hover:bg-accent min-w-0 w-full"
            onClick={(e) => {
                preventDefaultIfContainsSelection(e as unknown as React.MouseEvent<HTMLAnchorElement>);
                onCardClick();
            }}
        >
            <ViewpointCard
                onClick={onCardClick}
                className={`${className} min-w-0 w-full`}
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
                linkable={false} // Disable internal linking since we're using the outer Link now
                isLoading={loadingCardId === `rationale-${id}`}
                data-rationale-id={id}
            />
        </Link>
    );
} 