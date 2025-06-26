"use client";

import React from "react";
import useIsMobile from "@/hooks/ui/useIsMobile";
import { Button } from "@/components/ui/button";
import { SpaceHeader } from "@/components/space/SpaceHeader";
import { SpaceTabs, Tab } from "@/components/space/SpaceTabs";
import { NewRationaleButton } from "@/components/rationale/NewRationaleButton";
import { DeltaComparisonWidget } from "@/components/delta/DeltaComparisonWidget";
import { MakePointButton, MakeNegationButton } from "@/components/space/action-buttons";
import Link from "next/link";
import { BrainCircuitIcon, Sigma, Filter } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { Skeleton } from "@/components/ui/skeleton";

interface SpacePageHeaderProps {
    space: ReturnType<typeof import("@/queries/space/useSpace").useSpace>;
    selectedTab: Tab | null;
    onTabChange: (tab: Tab) => void;
    searchQuery: string;
    onSearchChange: (value: string) => void;
    isAiLoading: boolean;
    onAiClick: () => void;
    chatHref: string;
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
    chatHref,
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
    const { user: privyUser } = usePrivy();

    const getMobileActionButtons = () => {
        const shouldShowActionButtons = selectedTab === "points" || selectedTab === "all" || selectedTab === "search";

        return (
            <div className="flex items-center gap-2">
                {shouldShowActionButtons && (
                    <MakePointButton onClick={onLoginOrMakePoint} size="sm" />
                )}
                <NewRationaleButton
                    href={`/s/${space.data?.id ?? "global"}/rationale/new`}
                    onClick={onNewViewpoint}
                    variant="default"
                    size="sm"
                    loading={isNewRationaleLoading}
                />
                {shouldShowActionButtons && (
                    <MakeNegationButton onClick={onSelectNegation} size="sm" />
                )}
            </div>
        );
    };

    return (
        <div className="sticky top-0 z-20 bg-background">
            {isMobile ? (
                <>
                    <div className="flex items-center justify-center px-3 py-2 border-b">
                        <div className="flex gap-2 flex-shrink-0">
                            <Link
                                href={chatHref}
                                onClick={onAiClick}
                                className="flex items-center gap-2 px-4 py-2 rounded-md bg-muted/50 hover:bg-muted border border-border text-foreground hover:text-primary transition-colors"
                            >
                                {isAiLoading ? (
                                    <>
                                        <Skeleton className="h-4 w-4 rounded" />
                                        <Skeleton className="h-4 w-16" />
                                    </>
                                ) : (
                                    <>
                                        <BrainCircuitIcon className="size-4" />
                                        <span className="text-sm font-medium">AI Assistant</span>
                                    </>
                                )}
                            </Link>
                            <Link
                                href={`/s/${space.data?.id}/delta`}
                                className="flex items-center gap-2 px-4 py-2 rounded-md bg-muted/50 hover:bg-muted border border-border text-foreground hover:text-orange-600 transition-colors"
                            >
                                <Sigma className="size-4" />
                                <span className="text-sm font-medium">Delta Compare</span>
                            </Link>
                        </div>
                    </div>
                    <div className="flex items-center justify-center gap-1 bg-gradient-to-r from-muted/30 to-muted/10 border-b px-1 py-2 overflow-x-auto">
                        {getMobileActionButtons()}
                    </div>
                </>
            ) : (
                <SpaceHeader
                    space={space}
                    isLoading={isAiLoading}
                    onAiClick={onAiClick}
                    chatHref={chatHref}
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

            {/* Delta Comparison Widget and Filtering - on rationales tab */}
            {selectedTab === "rationales" && (
                <div className="border-b bg-background px-4 sm:px-6 lg:px-8 py-3">
                    <div className="flex items-start gap-4">
                        {/* Filter button positioned to the left of delta */}
                        <Button
                            variant={filtersOpen ? "default" : "outline"}
                            size="sm"
                            onClick={onFiltersToggle}
                            className="flex items-center gap-1 whitespace-nowrap flex-shrink-0"
                        >
                            <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span>Filters</span>
                        </Button>
                        <DeltaComparisonWidget
                            comparison={{ type: "space", spaceId: space.data?.id ?? "global" }}
                            title="Space Alignment Discovery"
                            description={
                                <>
                                    Find users who align or disagree with you most across{" "}
                                    <span className="text-yellow-500 font-medium">
                                        s/{space.data?.id ?? "this entire space"}
                                    </span>
                                </>
                            }
                            currentUserId={privyUser?.id}
                        />
                    </div>
                </div>
            )}
        </div>
    );
} 