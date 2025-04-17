import React from 'react';
import { Button } from "@/components/ui/button";
import { PenSquare, GitBranchPlus } from 'lucide-react';
import { encodeId } from '@/lib/encodeId';

interface SuggestionBlockProps {
    type: 'point' | 'negation';
    targetId?: number;
    text: string;
}

export const SuggestionBlock: React.FC<SuggestionBlockProps> = ({ type, targetId, text }) => {
    const Icon = type === 'point' ? GitBranchPlus : PenSquare;

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
        console.log('Suggestion clicked:', { type, targetId, text });
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