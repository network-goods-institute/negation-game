'use client';
import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface WriteupContextType {
    isOpen: boolean;
    openDialog: (back?: boolean) => void;
    closeDialog: () => void;
    showBack: boolean;
}

const WriteupContext = createContext<WriteupContextType | undefined>(undefined);

export const useWriteup = (): WriteupContextType => {
    const context = useContext(WriteupContext);
    if (!context) {
        throw new Error('useWriteup must be used within a WriteupProvider');
    }
    return context;
};

export const WriteupProvider = ({ children }: { children: ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showBack, setShowBack] = useState(false);

    const openDialog = useCallback((back: boolean = false) => {
        setShowBack(back);
        setIsOpen(true);
    }, []);
    const closeDialog = useCallback(() => {
        setIsOpen(false);
        setShowBack(false);
    }, []);

    const value: WriteupContextType = {
        isOpen,
        openDialog,
        closeDialog,
        showBack,
    };

    return (
        <WriteupContext.Provider value={value}>
            {children}
        </WriteupContext.Provider>
    );
}; 