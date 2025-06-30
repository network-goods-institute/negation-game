'use client';

import {
    createContext,
    useContext,
    useState,
    ReactNode,
    useCallback,
} from 'react';

type KbTopic = 'point' | 'negation' | 'cred' | 'rationales' | 'spaces' | 'commitment' | 'restaking' | 'slashing' | 'doubting' | 'gettingStarted' | 'edges' | 'assistant';

interface KnowledgeBaseContextType {
    isOpen: boolean;
    openDialog: (showBack?: boolean, initialTopic?: KbTopic) => void;
    closeDialog: () => void;
    showBack: boolean;
    initialTopic?: KbTopic;
}

const KnowledgeBaseContext = createContext<KnowledgeBaseContextType | undefined>(
    undefined,
);

export const useKnowledgeBase = () => {
    const context = useContext(KnowledgeBaseContext);
    if (context === undefined) {
        throw new Error('useKnowledgeBase must be used within a KnowledgeBaseProvider');
    }
    return context;
};

export const KnowledgeBaseProvider = ({ children }: { children: ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showBack, setShowBack] = useState(false);
    const [initialTopic, setInitialTopic] = useState<KbTopic | undefined>();

    const openDialog = useCallback((back = false, topic?: KbTopic) => {
        setShowBack(back);
        setInitialTopic(topic);
        setIsOpen(true);
    }, []);

    const closeDialog = useCallback(() => {
        setIsOpen(false);
        setShowBack(false);
        setInitialTopic(undefined);
    }, []);

    const value: KnowledgeBaseContextType = {
        isOpen,
        openDialog,
        closeDialog,
        showBack,
        initialTopic,
    };

    return (
        <KnowledgeBaseContext.Provider value={value}>
            {children}
        </KnowledgeBaseContext.Provider>
    );
}; 