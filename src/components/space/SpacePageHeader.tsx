"use client";

import React from "react";
import useIsMobile from "@/hooks/ui/useIsMobile";
import { Button } from "@/components/ui/button";
import { SpaceHeader } from "@/components/space/SpaceHeader";
import { SpaceTabs, Tab } from "@/components/space/SpaceTabs";

interface SpacePageHeaderProps {
    space: ReturnType<typeof import("@/queries/space/useSpace").useSpace>;
    selectedTab: Tab | null;
    onTabChange: (tab: Tab) => void;
    searchQuery: string;
    onSearchChange: (value: string) => void;
    isAiLoading: boolean;
    onAiClick: () => void;
    onLoginOrMakePoint: () => void;
    onNewViewpoint: () => void;
    onSelectNegation: () => void;
}

export function SpacePageHeader({
    space,
    selectedTab,
    onTabChange,
    searchQuery,
    onSearchChange,
    isAiLoading,
    onAiClick,
    onLoginOrMakePoint,
    onNewViewpoint,
    onSelectNegation,
}: SpacePageHeaderProps) {
    const isMobile = useIsMobile();
    return (
        <div className="sticky top-0 z-20 bg-background">
            {isMobile && (
                <div className="flex justify-around items-center bg-background border-b px-4 py-2">
                    <Button onClick={onLoginOrMakePoint} variant="default" size="sm">Make a Point</Button>
                    <Button onClick={onNewViewpoint} variant="secondary" size="sm">New Rationale</Button>
                    <Button onClick={onSelectNegation} variant="destructive" size="sm">Make a Negation</Button>
                </div>
            )}
            {!isMobile && (
                <SpaceHeader
                    space={space}
                    isLoading={isAiLoading}
                    onAiClick={onAiClick}
                />
            )}
            <SpaceTabs
                selectedTab={selectedTab ?? "rationales"}
                onTabChange={onTabChange}
                searchQuery={searchQuery}
                onSearchChange={onSearchChange}
                isAiLoading={isAiLoading}
                onAiClick={onAiClick}
                spaceId={space.data?.id ?? "global"}
                onLoginOrMakePoint={onLoginOrMakePoint}
                onNewViewpoint={onNewViewpoint}
                onSelectNegation={onSelectNegation}
            />
        </div>
    );
} 