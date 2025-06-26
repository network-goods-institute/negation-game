"use client";

import React from "react";
import useIsMobile from "@/hooks/ui/useIsMobile";
import { Button } from "@/components/ui/button";
import { SpaceHeader } from "@/components/space/SpaceHeader";
import { SpaceTabs, Tab } from "@/components/space/SpaceTabs";
import { NewRationaleButton } from "@/components/rationale/NewRationaleButton";
import { DeltaComparisonWidget } from "@/components/delta/DeltaComparisonWidget";
import Link from "next/link";
import { BrainCircuitIcon, Sigma, PlusIcon, Filter } from "lucide-react";
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
        switch (selectedTab) {
            case "rationales":
                return (
                    <NewRationaleButton
                        onClick={onNewViewpoint}
                        variant="outline"
                        size="sm"
                        className="border-blue-300 bg-blue-100 text-blue-800 hover:bg-blue-200 hover:border-blue-400 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900 text-xs px-2 flex-shrink-0"
                        loading={isNewRationaleLoading}
                    />
                );
            case "points":
                return (
                    <>
                        <Button onClick={onLoginOrMakePoint} variant="outline" size="sm" className="rounded-full flex items-center gap-1 px-2 font-bold border-green-300 bg-green-100 text-green-800 hover:bg-green-200 hover:border-green-400 dark:border-green-800 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900 dark:hover:border-green-800 text-xs flex-shrink-0">
                            <span>Point</span>
                            <PlusIcon className="h-3 w-3" />
                        </Button>
                        <Button onClick={onSelectNegation} variant="outline" size="sm" className="rounded-full flex items-center gap-1 px-2 font-bold border-red-300 bg-red-100 text-red-800 hover:bg-red-200 hover:border-red-400 dark:border-red-800 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900 dark:hover:border-red-800 text-xs flex-shrink-0">
                            <span>Negation</span>
                            <PlusIcon className="h-3 w-3" />
                        </Button>
                    </>
                );
            case "all":
                return (
                    <>
                        <Button onClick={onLoginOrMakePoint} variant="outline" size="sm" className="rounded-full flex items-center gap-1 px-2 font-bold border-green-300 bg-green-100 text-green-800 hover:bg-green-200 hover:border-green-400 dark:border-green-800 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900 dark:hover:border-green-800 text-xs flex-shrink-0">
                            <span>Point</span>
                            <PlusIcon className="h-3 w-3" />
                        </Button>
                        <NewRationaleButton
                            onClick={onNewViewpoint}
                            variant="outline"
                            size="sm"
                            className="border-blue-300 bg-blue-100 text-blue-800 hover:bg-blue-200 hover:border-blue-400 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900 text-xs px-2 flex-shrink-0"
                            loading={isNewRationaleLoading}
                        />
                        <Button onClick={onSelectNegation} variant="outline" size="sm" className="rounded-full flex items-center gap-1 px-2 font-bold border-red-300 bg-red-100 text-red-800 hover:bg-red-200 hover:border-red-400 dark:border-red-800 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900 dark:hover:border-red-800 text-xs flex-shrink-0">
                            <span>Negation</span>
                            <PlusIcon className="h-3 w-3" />
                        </Button>
                    </>
                );
            case "search":
                return (
                    <>
                        <Button onClick={onLoginOrMakePoint} variant="outline" size="sm" className="rounded-full flex items-center gap-1 px-2 font-bold border-green-300 bg-green-100 text-green-800 hover:bg-green-200 hover:border-green-400 dark:border-green-800 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900 dark:hover:border-green-800 text-xs flex-shrink-0">
                            <span>Point</span>
                            <PlusIcon className="h-3 w-3" />
                        </Button>
                        <NewRationaleButton
                            onClick={onNewViewpoint}
                            variant="outline"
                            size="sm"
                            className="border-blue-300 bg-blue-100 text-blue-800 hover:bg-blue-200 hover:border-blue-400 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900 text-xs px-2 flex-shrink-0"
                            loading={isNewRationaleLoading}
                        />
                        <Button onClick={onSelectNegation} variant="outline" size="sm" className="rounded-full flex items-center gap-1 px-2 font-bold border-red-300 bg-red-100 text-red-800 hover:bg-red-200 hover:border-red-400 dark:border-red-800 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900 dark:hover:border-red-800 text-xs flex-shrink-0">
                            <span>Negation</span>
                            <PlusIcon className="h-3 w-3" />
                        </Button>
                    </>
                );
            default:
                return null;
        }
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
                <div className="border-b bg-background px-4 py-3">
                    <div className="flex items-center gap-4">
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
                        <Button
                            variant={filtersOpen ? "default" : "outline"}
                            size="sm"
                            onClick={onFiltersToggle}
                            className="flex items-center gap-1 whitespace-nowrap"
                        >
                            <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span>Filters</span>
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
} 