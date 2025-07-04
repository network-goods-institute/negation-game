import React from 'react';
import { Button } from "@/components/ui/button";
import { PenSquare, GitBranchPlus, Loader2 } from 'lucide-react';
import { encodeId } from '@/lib/negation-game/encodeId';
import { useSetAtom } from 'jotai';
import { makePointSuggestionAtom } from '@/atoms/makePointSuggestionAtom';
import { makeNegationSuggestionAtom } from '@/atoms/makeNegationSuggestionAtom';
import { makeObjectionSuggestionAtom } from '@/atoms/makeObjectionSuggestionAtom';
import { usePointData } from '@/queries/points/usePointData';
import { PointReference } from '../visual/PointReference';

interface SuggestionBlockProps {
    type: 'point' | 'negation' | 'objection';
    targetId?: number;
    contextId?: number;
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

const renderTextWithReferences = (text: string, spaceInput: string | null | undefined) => {
    const space = spaceInput ?? null;
    const parts = text.split(/(\[Point:\d+\]|\[Rationale:[a-zA-Z0-9_-]+\])/g);
    return parts.map((part, index) => {
        const pointMatch = part.match(/\[Point:(\d+)\]/);
        const rationaleMatch = part.match(/\[Rationale:([a-zA-Z0-9_-]+)\]/);

        if (pointMatch) {
            return <PointReference key={index} id={parseInt(pointMatch[1])} space={space} />;
        } else if (rationaleMatch) {
            return <PointReference key={index} id={rationaleMatch[1]} space={space} />;
        } else {
            return <React.Fragment key={index}>{part}</React.Fragment>;
        }
    });
};

export const SuggestionBlock: React.FC<SuggestionBlockProps> = ({ type, targetId, contextId, text, space }) => {
    const Icon = type === 'point' ? GitBranchPlus : PenSquare;
    const setMakePointSuggestion = useSetAtom(makePointSuggestionAtom);
    const setMakeNegationSuggestion = useSetAtom(makeNegationSuggestionAtom);
    const setMakeObjectionSuggestion = useSetAtom(makeObjectionSuggestionAtom);

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
    const isObjectionSuggestion = type === 'objection' && targetId !== undefined && contextId !== undefined;

    const handleClick = () => {
        const textForAction = text;

        if (type === 'point') {
            if (!space) return;
            setMakePointSuggestion({ text: textForAction, context: 'chat', spaceId: space });
        } else if (isNegationSuggestion) {
            if (!space) return;
            setMakeNegationSuggestion({ targetId, text: textForAction, context: 'chat', spaceId: space });
        } else if (isObjectionSuggestion) {
            if (!space) return;
            setMakeObjectionSuggestion({
                targetId,
                contextId,
                text: textForAction,
                context: 'chat',
                spaceId: space
            });
        }
    };

    let buttonText = 'Suggestion';
    if (type === 'point') {
        buttonText = 'Make Point';
    } else if (isNegationSuggestion) {
        buttonText = 'Suggest Negation';
    } else if (isObjectionSuggestion) {
        buttonText = 'Suggest Objection';
    }

    return (
        <div className="my-4 p-4 border rounded-lg bg-card/50 overflow-hidden">
            {isObjectionSuggestion && contextId && (
                <>
                    <div className="mb-3">
                        <p className="text-xs text-muted-foreground mb-2">Original point being defended:</p>
                        <TargetPointDisplay pointId={contextId} />
                    </div>
                    <div className="mb-3">
                        <p className="text-xs text-muted-foreground mb-2">Counterpoint being objected to:</p>
                        <TargetPointDisplay pointId={targetId} />
                    </div>
                    <div className="mb-3 p-3 bg-orange-50 dark:bg-orange-950/20 border-l-4 border-orange-400 rounded-r-md">
                        <p className="text-sm text-orange-800 dark:text-orange-200">
                            You&apos;re suggesting that in regards to the counterpoint → original point relationship,
                            the counterpoint is irrelevant because:
                        </p>
                    </div>
                </>
            )}
            {isNegationSuggestion && !isObjectionSuggestion && (
                <TargetPointDisplay pointId={targetId} />
            )}
            <p className="mb-3 text-sm whitespace-pre-wrap break-words">
                {renderTextWithReferences(text, space)}
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