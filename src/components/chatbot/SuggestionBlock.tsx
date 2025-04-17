import React from 'react';
import { Button } from "@/components/ui/button";
import { PenSquare, GitBranchPlus } from 'lucide-react';
import { encodeId } from '@/lib/encodeId';
import { useSetAtom } from 'jotai';
import { makePointSuggestionAtom } from '@/atoms/makePointSuggestionAtom';
import { negatedPointIdAtom } from '@/atoms/negatedPointIdAtom';
import { negationContentAtom } from '@/atoms/negationContentAtom';
import { DEFAULT_SPACE } from '@/constants/config';

interface SuggestionBlockProps {
    type: 'point' | 'negation';
    targetId?: number;
    text: string;
    space?: string | null;
}

export const SuggestionBlock: React.FC<SuggestionBlockProps> = ({ type, targetId, text, space }) => {
    const Icon = type === 'point' ? GitBranchPlus : PenSquare;
    const setMakePointSuggestion = useSetAtom(makePointSuggestionAtom);
    const setNegatedPointId = useSetAtom(negatedPointIdAtom);
    const setNegationContent = useSetAtom(negationContentAtom(targetId));

    let displayTargetId: string | number | undefined;
    if (type === 'negation' && targetId !== undefined) {
        try {
            displayTargetId = encodeId(targetId);
        } catch (e) {
            console.error(`SuggestionBlock: Failed to encode target ID ${targetId}`, e);
            displayTargetId = targetId;
        }
    } else {
        displayTargetId = targetId;
    }

    const buttonText = type === 'point' ? 'Make Point'
        : type === 'negation' && displayTargetId !== undefined ? `Negate Point ${displayTargetId}`
            : 'Suggestion';

    const handleClick = () => {
        if (type === 'point') {
            console.log('[SuggestionBlock] Make Point clicked. Setting atom with:', { text, spaceId: space ?? DEFAULT_SPACE });
            setMakePointSuggestion({ text, context: 'chat', spaceId: space ?? DEFAULT_SPACE });
        } else if (type === 'negation' && targetId !== undefined) {
            console.log('Negation Suggestion clicked:', { type, targetId, text, spaceId: space ?? DEFAULT_SPACE });
        } else {
            console.log('Suggestion clicked (unknown type):', { type, targetId, text });
        }
    };

    return (
        <div className="my-4 p-4 border rounded-lg bg-card/50 overflow-hidden">
            <p className="mb-3 text-sm whitespace-pre-wrap break-words">{text}</p>
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
    );
}; 