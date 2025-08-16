'use client';

import React, { createContext, useContext, useState } from 'react';

interface SpaceSearchContextType {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    mobileFiltersOpen: boolean;
    setMobileFiltersOpen: (open: boolean) => void;
    activeTab: string;
    contentType: string;
}

const SpaceSearchContext = createContext<SpaceSearchContextType | undefined>(undefined);

export function SpaceSearchProvider({ children }: { children: React.ReactNode }) {
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<string>('all');
    const [contentType, setContentType] = useState<string>('all');

    return (
        <SpaceSearchContext.Provider value={{ 
            searchQuery, 
            setSearchQuery, 
            mobileFiltersOpen, 
            setMobileFiltersOpen,
            activeTab,
            contentType
        }}>
            {children}
        </SpaceSearchContext.Provider>
    );
}

export function useSpaceSearch() {
    const context = useContext(SpaceSearchContext);
    if (!context) {
        throw new Error('useSpaceSearch must be used within a SpaceSearchProvider');
    }
    return context;
}