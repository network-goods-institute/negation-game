"use client";

import { MakePointDialog } from "@/components/dialogs/MakePointDialog";
import { NegateDialog } from "@/components/dialogs/NegateDialog";
import { useKnowledgeBase } from '@/components/contexts/KnowledgeBaseContext';
import { KnowledgeBaseDialog } from '@/components/knowledgebase/KnowledgeBaseDialog';
import { useWriteup } from '@/components/contexts/WriteupContext';
import { WriteupDialog } from '@/components/dialogs/WriteupDialog';

export function GlobalDialogs() {
    const { isOpen: isKbOpen, closeDialog: closeKb, showBack: kbShowBack, initialTopic } = useKnowledgeBase();
    const { isOpen: isWriteupOpen, closeDialog: closeWriteup, showBack: writeupShowBack } = useWriteup();
    return (
        <>
            <MakePointDialog />
            <NegateDialog />
            <KnowledgeBaseDialog isOpen={isKbOpen} onClose={closeKb} showBack={kbShowBack} initialTopic={initialTopic} />
            <WriteupDialog isOpen={isWriteupOpen} onClose={closeWriteup} showBack={writeupShowBack} />
        </>
    );
} 