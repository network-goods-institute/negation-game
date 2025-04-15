import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

interface SourceCitationProps {
    type: 'Rationale' | 'Endorsed Point' | 'Discourse Post';
    id: string | number;
    title?: string;
}

export const SourceCitation: React.FC<SourceCitationProps> = ({ type, id, title }) => {
    const baseClasses = "text-xs italic text-muted-foreground/80 mx-1 px-1.5 py-0.5 rounded bg-muted/50 inline-flex items-center gap-1";
    const linkClasses = "hover:bg-muted/70 hover:text-muted-foreground transition-colors";

    const content = (
        <>
            <span className="font-medium">{type}:</span>
            <span>{title ? `"${title}"` : `ID ${id}`}</span>
        </>
    );

    if (type === 'Rationale') {
        return (
            <Link href={`/r/${id}`} className={cn(baseClasses, linkClasses)} target="_blank" rel="noopener noreferrer">
                {content}
            </Link>
        );
    }

    if (type === 'Endorsed Point') {
        return (
            <Link href={`/p/${id}`} className={cn(baseClasses, linkClasses)} target="_blank" rel="noopener noreferrer">
                {content}
            </Link>
        );
    }

    // Discourse Post remains a span
    return (
        <span className={baseClasses}>
            {content}
        </span>
    );
}; 