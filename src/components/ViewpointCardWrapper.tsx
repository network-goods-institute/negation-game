import React from "react";
import { ViewpointCard } from "./ViewpointCard";

interface ViewpointCardWrapperProps {
    id: string;
    title: string;
    description: string;
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
}

export function ViewpointCardWrapper({
    id,
    title,
    description,
    author,
    createdAt,
    space,
    statistics,
    loadingCardId,
    handleCardClick,
    className = "flex-grow"
}: ViewpointCardWrapperProps) {
    return (
        <div
            className="relative"
            onClick={() => handleCardClick?.(`rationale-${id}`)}
        >
            <ViewpointCard
                className={className}
                id={id}
                title={title}
                description={description}
                author={author}
                createdAt={createdAt}
                space={space}
                statistics={statistics}
                linkable={true}
                isLoading={loadingCardId === `rationale-${id}`}
            />
        </div>
    );
} 