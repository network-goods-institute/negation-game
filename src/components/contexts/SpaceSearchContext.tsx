'use client';

import React, { createContext, useContext, useState } from 'react';

interface SpaceSearchContextType {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    mobileFiltersOpen: boolean;
    setMobileFiltersOpen: (open: boolean) => void;
}

const SpaceSearchContext = createContext<SpaceSearchContextType | undefined>(undefined);

export function SpaceSearchProvider({ children }: { children: React.ReactNode }) {
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(false);

    return (
        <SpaceSearchContext.Provider value={{ searchQuery, setSearchQuery, mobileFiltersOpen, setMobileFiltersOpen }}>
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