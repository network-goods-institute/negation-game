import React from 'react';
import { Button } from "@/components/ui/button";
import { PenSquare, GitBranchPlus } from 'lucide-react';
interface SuggestionBlockProps {
    type: 'point' | 'negation';
    targetId?: number;
    text: string;

}

export const SuggestionBlock: React.FC<SuggestionBlockProps> = ({ type, targetId, text }) => {
    const buttonText = type === 'point' ? "Add Point" : `Negate Point ${targetId}`;
    const Icon = type === 'point' ? GitBranchPlus : PenSquare;

    return (
        <div className="my-4 p-4 border rounded-lg bg-card/50">
            <p className="mb-3 text-sm whitespace-pre-wrap">{text}</p>
            <Button
                size="sm"
                variant="outline"
                disabled
                className="text-xs"
            >
                <Icon className="h-3.5 w-3.5 mr-1.5" />
                {buttonText}
            </Button>
        </div>
    );
}; 