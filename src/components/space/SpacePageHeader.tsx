"use client";

import React from "react";
import useIsMobile from "@/hooks/ui/useIsMobile";
import { Button } from "@/components/ui/button";
import { SpaceHeader } from "@/components/space/SpaceHeader";
import { SpaceTabs, Tab } from "@/components/space/SpaceTabs";
import { NewRationaleButton } from "@/components/rationale/NewRationaleButton";

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
    isNewRationaleLoading?: boolean;
    onSelectNegation: () => void;
    filtersOpen: boolean;
    onFiltersToggle: () => void;
    topicsOpen: boolean;
    onTopicsToggle: () => void;
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
    isNewRationaleLoading = false,
    onSelectNegation,
    filtersOpen,
    onFiltersToggle,
    topicsOpen,
    onTopicsToggle,
}: SpacePageHeaderProps) {
    const isMobile = useIsMobile();

    const getMobileActionButtons = () => {
        switch (selectedTab) {
            case "rationales":
                return (
                    <NewRationaleButton
                        onClick={onNewViewpoint}
                        variant="outline"
                        size="sm"
                        loading={isNewRationaleLoading}
                    />
                );
            case "points":
                return (
                    <>
                        <Button onClick={onLoginOrMakePoint} variant="default" size="sm">Make a Point</Button>
                        <Button onClick={onSelectNegation} variant="destructive" size="sm">Make a Negation</Button>
                    </>
                );
            case "all":
                return (
                    <>
                        <Button onClick={onLoginOrMakePoint} variant="default" size="sm">Make a Point</Button>
                        <NewRationaleButton
                            onClick={onNewViewpoint}
                            variant="outline"
                            size="sm"
                            loading={isNewRationaleLoading}
                        />
                        <Button onClick={onSelectNegation} variant="destructive" size="sm">Make a Negation</Button>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <div className="sticky top-0 z-20 bg-background">
            {isMobile && selectedTab !== "search" && (
                <div className="flex justify-around items-center bg-background border-b px-4 py-2">
                    {getMobileActionButtons()}
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
                isNewRationaleLoading={isNewRationaleLoading}
                onSelectNegation={onSelectNegation}
                filtersOpen={filtersOpen}
                onFiltersToggle={onFiltersToggle}
                topicsOpen={topicsOpen}
                onTopicsToggle={onTopicsToggle}
            />
        </div>
    );
} 