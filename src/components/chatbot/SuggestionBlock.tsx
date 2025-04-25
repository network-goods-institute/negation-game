import React from 'react';
import { Button } from "@/components/ui/button";
import { PenSquare, GitBranchPlus, Loader2 } from 'lucide-react';
import { encodeId } from '@/lib/encodeId';
import { useSetAtom } from 'jotai';
import { makePointSuggestionAtom } from '@/atoms/makePointSuggestionAtom';
import { makeNegationSuggestionAtom } from '@/atoms/makeNegationSuggestionAtom';
import { DEFAULT_SPACE } from '@/constants/config';
import { usePointData } from '@/queries/usePointData';

interface SuggestionBlockProps {
    type: 'point' | 'negation';
    targetId?: number;
    text: string;
    space?: string | null;
}

const TargetPointDisplay: React.FC<{ pointId: number }> = ({ pointId }) => {
    const { data: targetPoint, isLoading, error } = usePointData(pointId);

    if (isLoading) {
        return <div className="flex items-center text-xs text-muted-foreground"><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Loading target point...</div>;
    }

    if (error || !targetPoint) {
        return <div className="text-xs text-destructive">Error loading target point {encodeId(pointId)}.</div>;
    }

    return (
        <blockquote className="mb-3 border-l-4 bg-muted/30 p-3 rounded-r-md">
            <p className="text-sm text-muted-foreground">
                {targetPoint.content}
            </p>
        </blockquote>
    );
};

export const SuggestionBlock: React.FC<SuggestionBlockProps> = ({ type, targetId, text, space }) => {
    const Icon = type === 'point' ? GitBranchPlus : PenSquare;
    const setMakePointSuggestion = useSetAtom(makePointSuggestionAtom);
    const setMakeNegationSuggestion = useSetAtom(makeNegationSuggestionAtom);

    let displayTargetId: string | number | undefined;
    if (type === 'negation' && targetId !== undefined) {
        try {
            displayTargetId = encodeId(targetId);
        } catch (e) {
            displayTargetId = targetId;
        }
    } else {
        displayTargetId = targetId;
    }

    const isNegationSuggestion = type === 'negation' && targetId !== undefined;

    const handleClick = () => {
        if (type === 'point') {
            setMakePointSuggestion({ text, context: 'chat', spaceId: space ?? DEFAULT_SPACE });
        } else if (isNegationSuggestion) {
            setMakeNegationSuggestion({ targetId, text, context: 'chat', spaceId: space ?? DEFAULT_SPACE });
        }
    };

    let buttonText = 'Suggestion';
    if (type === 'point') {
        buttonText = 'Make Point';
    } else if (isNegationSuggestion) {
        buttonText = 'Suggest Negation';
    }

    return (
        <div className="my-4 p-4 border rounded-lg bg-card/50 overflow-hidden">
            {isNegationSuggestion && (
                <TargetPointDisplay pointId={targetId} />
            )}
            <p className="mb-3 text-sm whitespace-pre-wrap break-words">
                {text}
            </p>
            <div>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClick}
                    className="text-xs"
                >
                    <Icon className="h-3.5 w-3.5 mr-1.5" />
                    {buttonText}
                </Button>
            </div>
        </div>
    );
}; 