'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WhatIsAPoint } from '@/components/kb/WhatIsAPoint';
import { WhatIsANegation } from '@/components/kb/WhatIsANegation';
import { WhatIsCred } from '@/components/kb/WhatIsCred';
import { WhatAreRationales } from '@/components/kb/WhatAreRationales';
import { WhatAreSpaces } from '@/components/kb/WhatAreSpaces';
import { CommitmentMechanism } from '@/components/kb/CommitmentMechanism';
import { GettingStartedGuide } from '@/components/kb/GettingStartedGuide';
import { WhatIsRestaking } from '@/components/kb/WhatIsRestaking';
import { WhatIsSlashing } from '@/components/kb/WhatIsSlashing';
import { WhatIsDoubting } from '@/components/kb/WhatIsDoubting';
import { cn } from '@/lib/cn';

type KbTopic =
    | 'point'
    | 'negation'
    | 'cred'
    | 'rationales'
    | 'spaces'
    | 'commitment'
    | 'restaking'
    | 'slashing'
    | 'doubting'
    | 'gettingStarted'
    | null;

interface KnowledgeBaseDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export const KnowledgeBaseDialog = ({ isOpen, onClose }: KnowledgeBaseDialogProps) => {
    const [selectedTopic, setSelectedTopic] = useState<KbTopic>('point');

    const renderTopic = () => {
        switch (selectedTopic) {
            case 'point':
                return <WhatIsAPoint />;
            case 'negation':
                return <WhatIsANegation />;
            case 'cred':
                return <WhatIsCred />;
            case 'rationales':
                return <WhatAreRationales />;
            case 'spaces':
                return <WhatAreSpaces />;
            case 'commitment':
                return <CommitmentMechanism />;
            case 'restaking':
                return <WhatIsRestaking />;
            case 'slashing':
                return <WhatIsSlashing />;
            case 'doubting':
                return <WhatIsDoubting />;
            case 'gettingStarted':
                return <GettingStartedGuide />;
            default:
                return (
                    <p className="text-muted-foreground mt-4">
                        Select a topic from the list to learn more.
                    </p>
                );
        }
    };

    const TopicButton = ({ topic, label }: { topic: KbTopic, label: string }) => (
        <Button
            variant="ghost"
            className={cn(
                "justify-start w-full text-left px-3 whitespace-normal h-auto",
                selectedTopic === topic ? "bg-accent text-accent-foreground" : ""
            )}
            onClick={() => setSelectedTopic(selectedTopic === topic ? null : topic)}
        >
            {label}
        </Button>
    );

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
                    <DialogTitle>Knowledge Base</DialogTitle>
                </DialogHeader>
                <div className="flex-grow overflow-hidden grid grid-cols-1 md:grid-cols-4 gap-0">
                    <nav className="md:col-span-1 flex flex-col space-y-1 border-r bg-muted/40 p-4 h-full overflow-y-auto">
                        <h2 className="text-lg font-semibold mb-2 px-3 flex-shrink-0">Topics</h2>
                        <div className="flex-grow overflow-y-auto space-y-1">
                            <TopicButton topic="gettingStarted" label="Getting Started" />
                            <TopicButton topic="point" label="What is a Point?" />
                            <TopicButton topic="negation" label="What is a Negation?" />
                            <TopicButton topic="cred" label="What is Cred/Favor?" />
                            <TopicButton topic="rationales" label="What are Rationales?" />
                            <TopicButton topic="spaces" label="What are Spaces?" />
                            <TopicButton topic="commitment" label="Commitment Overview" />
                            <TopicButton topic="restaking" label="What is Restaking?" />
                            <TopicButton topic="slashing" label="What is Slashing?" />
                            <TopicButton topic="doubting" label="What is Doubting?" />
                        </div>
                    </nav>

                    <main className="md:col-span-3 p-6 overflow-y-auto">
                        {renderTopic()}
                    </main>
                </div>
                <DialogFooter className="p-6 pt-4 border-t mt-auto flex-shrink-0">
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}; 