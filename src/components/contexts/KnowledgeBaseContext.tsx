'use client';

import {
    createContext,
    useContext,
    useState,
    ReactNode,
    useCallback,
} from 'react';
import { KnowledgeBaseDialog } from '@/components/kb/KnowledgeBaseDialog';

interface KnowledgeBaseContextType {
    isOpen: boolean;
    openDialog: () => void;
    closeDialog: () => void;
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

    const openDialog = useCallback(() => {
        setIsOpen(true);
    }, []);

    const closeDialog = useCallback(() => {
        setIsOpen(false);
    }, []);

    const value = {
        isOpen,
        openDialog,
        closeDialog,
    };

    return (
        <KnowledgeBaseContext.Provider value={value}>
            {children}
            <KnowledgeBaseDialog isOpen={isOpen} onClose={closeDialog} />
        </KnowledgeBaseContext.Provider>
    );
}; 