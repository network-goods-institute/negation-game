import React, { useCallback } from "react";
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

    // Card click handler - only triggers navigation when the ViewpointCard
    // component determines it's a valid click (not a text selection)
    const onCardClick = useCallback((e: React.MouseEvent) => {
        // Don't navigate if user is selecting text or clicking on interactive elements
        preventDefaultIfContainsSelection(e as any);

        // Check if the click target is a link or button (our View Topic button)
        const target = e.target as HTMLElement;
        if (target.closest('a') || target.closest('button')) {
            return; // Let the nested link/button handle the navigation
        }

        handleCardClick?.(`rationale-${id}`);
        router.push(`/s/${space}/rationale/${id}`);
    }, [id, handleCardClick, router, space]);

    return (
        <div
            className="flex border-b cursor-pointer hover:bg-accent min-w-0 w-full"
            onClick={onCardClick}
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
                linkable={false}
                isLoading={loadingCardId === `rationale-${id}`}
                data-rationale-id={id}
            />
        </div>
    );
} 