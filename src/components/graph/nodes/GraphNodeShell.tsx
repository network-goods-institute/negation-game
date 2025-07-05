import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface GraphNodeShellProps {
    id: string;
    style?: React.CSSProperties;
    level: number;
    endorsedByOp?: boolean;
    isLoading?: boolean;
    isExpanding: boolean;
    dataIsExpanding?: boolean;
    hasAnimationPlayed: boolean;
    hovered: boolean;
    onHover: () => void;
    onLeave: () => void;
    onPressStart: () => void;
    onPressEnd: () => void;
    children: React.ReactNode;
}

export function GraphNodeShell({
    id,
    level,
    endorsedByOp,
    isLoading = false,
    isExpanding,
    dataIsExpanding,
    hasAnimationPlayed,
    hovered,
    onHover,
    onLeave,
    onPressStart,
    onPressEnd,
    children,
    style,
}: GraphNodeShellProps) {
    return (
        <div
            data-loading={isLoading}
            style={style}
            className={cn(
                'relative border-2 min-h-28 w-64 transition-all duration-200 select-none',
                level % 2 === 1 ? 'node-level-stripe' : 'bg-background',
                'border-muted-foreground/60 dark:border-muted-foreground/40',
                endorsedByOp && 'border-yellow-500 dark:border-yellow-500',
                hovered && 'border-primary dark:border-primary',
                (!hasAnimationPlayed && (isExpanding || dataIsExpanding)) && 'animate-node-expand'
            )}
            onMouseOver={onHover}
            onMouseLeave={onLeave}
            onTouchStart={onPressStart}
            onTouchEnd={onPressEnd}
            onTouchCancel={onPressEnd}
            onMouseDown={onPressStart}
            onMouseUp={onPressEnd}
            title={`Point ID: ${id}`}
        >
            {children}
        </div>
    );
} 