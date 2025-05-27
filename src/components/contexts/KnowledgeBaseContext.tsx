'use client';

import {
    createContext,
    useContext,
    useState,
    ReactNode,
    useCallback,
} from 'react';

interface KnowledgeBaseContextType {
    isOpen: boolean;
    openDialog: (showBack?: boolean) => void;
    closeDialog: () => void;
    showBack: boolean;
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

    const openDialog = useCallback((back = false) => {
        setShowBack(back);
        setIsOpen(true);
    }, []);

    const closeDialog = useCallback(() => {
        setIsOpen(false);
        setShowBack(false);
    }, []);

    const value: KnowledgeBaseContextType = {
        isOpen,
        openDialog,
        closeDialog,
        showBack,
    };

    return (
        <KnowledgeBaseContext.Provider value={value}>
            {children}
        </KnowledgeBaseContext.Provider>
    );
}; 