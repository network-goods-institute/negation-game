"use client";

import React from "react";
import useIsMobile from "@/hooks/ui/useIsMobile";
import { SpaceHeader } from "@/components/space/SpaceHeader";
import { SpaceTabs, Tab } from "@/components/space/SpaceTabs";
import { NewRationaleButton } from "@/components/rationale/NewRationaleButton";
import Link from "next/link";
import { BrainCircuitIcon, Sigma } from "lucide-react";
import { Loader } from "@/components/ui/loader";

interface SpacePageHeaderProps {
    space: ReturnType<typeof import("@/queries/space/useSpace").useSpace>;
    selectedTab: Tab | null;
    onTabChange: (tab: Tab) => void;
    searchQuery: string;
    onSearchChange: (value: string) => void;
    isAiLoading: boolean;
    onAiClick: () => void;
    chatHref: string;
    isDeltaLoading: boolean;
    onDeltaClick: () => void;
    deltaHref: string;
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
    isDeltaLoading,
    onDeltaClick,
    deltaHref,
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
                                        <Loader className="size-4" />
                                        <span className="text-sm font-medium">AI Assistant</span>
                                    </>
                                ) : (
                                    <>
                                        <BrainCircuitIcon className="size-4" />
                                        <span className="text-sm font-medium">AI Assistant</span>
                                    </>
                                )}
                            </Link>
                            <Link
                                href={deltaHref}
                                onClick={onDeltaClick}
                                className="flex items-center gap-2 px-4 py-2 rounded-md bg-muted/50 hover:bg-muted border border-border text-foreground hover:text-orange-600 transition-colors"
                            >
                                {isDeltaLoading ? (
                                    <>
                                        <Loader className="size-4" />
                                        <span className="text-sm font-medium">Delta Compare</span>
                                    </>
                                ) : (
                                    <>
                                        <Sigma className="size-4" />
                                        <span className="text-sm font-medium">Delta Compare</span>
                                    </>
                                )}
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
                    isDeltaLoading={isDeltaLoading}
                    onDeltaClick={onDeltaClick}
                    deltaHref={deltaHref}
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