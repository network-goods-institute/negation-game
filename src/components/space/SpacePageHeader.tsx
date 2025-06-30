"use client";

import React from "react";
import useIsMobile from "@/hooks/ui/useIsMobile";
import { SpaceHeader } from "@/components/space/SpaceHeader";
import { SpaceTabs, Tab } from "@/components/space/SpaceTabs";
import { NewRationaleButton } from "@/components/rationale/NewRationaleButton";
import Link from "next/link";
import { BrainCircuitIcon, Sigma } from "lucide-react";
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
    onNewViewpoint: () => void;
    isNewRationaleLoading?: boolean;
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
    onNewViewpoint,
    isNewRationaleLoading = false,
    filtersOpen,
    onFiltersToggle,
    topicsOpen,
    onTopicsToggle,
}: SpacePageHeaderProps) {
    const isMobile = useIsMobile();

    const getMobileActionButtons = () => {
        return (
            <div className="flex items-center gap-2">
                <NewRationaleButton
                    href={`/s/${space.data?.id ?? "global"}/rationale/new`}
                    onClick={onNewViewpoint}
                    variant="default"
                    size="sm"
                    loading={isNewRationaleLoading}
                />
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
                onNewViewpoint={onNewViewpoint}
                isNewRationaleLoading={isNewRationaleLoading}
                filtersOpen={filtersOpen}
                onFiltersToggle={onFiltersToggle}
                topicsOpen={topicsOpen}
                onTopicsToggle={onTopicsToggle}
            />

        </div>
    );
} 