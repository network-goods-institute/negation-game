"use client";

import React from "react";
import { SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SearchInput } from "@/components/search/SearchInput";
import useIsMobile from "@/hooks/ui/useIsMobile";
import { usePrivy } from "@privy-io/react-auth";

export type Tab = "all" | "points" | "rationales" | "search";

interface SpaceTabsProps {
    selectedTab: Tab;
    onTabChange: (tab: Tab) => void;
    searchQuery: string;
    onSearchChange: (value: string) => void;
    isAiLoading: boolean;
    onAiClick: () => void;
    spaceId?: string;
    onNewViewpoint: () => void;
    isNewRationaleLoading?: boolean;
    filtersOpen: boolean;
    onFiltersToggle: () => void;
    topicsOpen: boolean;
    onTopicsToggle: () => void;
}

export function SpaceTabs({
    selectedTab,
    onTabChange,
    searchQuery,
    onSearchChange,
    spaceId,
    onNewViewpoint,
    isNewRationaleLoading = false,
    filtersOpen,
    onFiltersToggle,
    topicsOpen,
    onTopicsToggle,
}: SpaceTabsProps) {
    const isMobile = useIsMobile();
    const { user: privyUser } = usePrivy();



    return (
        <div className="flex flex-col gap-4 px-4 sm:px-6 lg:px-8 py-3 sm:py-sm border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            {/* Main tabs row */}
            <div className={cn("flex items-start justify-between gap-2 sm:gap-4", isMobile && "overflow-x-auto no-scrollbar")}>
                <div className="flex gap-2 sm:gap-4">
                    <button
                        onClick={() => onTabChange("rationales")}
                        className={cn(
                            "relative py-1.5 sm:py-2 px-2 sm:px-4 rounded-lg text-sm sm:text-base whitespace-normal sm:whitespace-nowrap focus:outline-none transition-all duration-200 border",
                            selectedTab === "rationales"
                                ? "bg-primary text-white shadow-lg border-primary"
                                : "bg-background/50 text-primary dark:text-white hover:bg-primary/10 border-border/50 hover:border-primary/50"
                        )}
                    >
                        Rationales
                    </button>
                    <button
                        onClick={() => onTabChange("points")}
                        className={cn(
                            "relative py-1.5 sm:py-2 px-2 sm:px-4 rounded text-sm sm:text-base whitespace-normal sm:whitespace-nowrap focus:outline-none transition-all duration-200",
                            selectedTab === "points"
                                ? "bg-primary text-white shadow-md"
                                : "bg-transparent text-primary dark:text-white hover:bg-primary/10"
                        )}
                    >
                        Points
                    </button>
                    <button
                        onClick={() => onTabChange("all")}
                        className={cn(
                            "relative py-1.5 sm:py-2 px-2 sm:px-4 rounded text-sm sm:text-base whitespace-normal sm:whitespace-nowrap focus:outline-none transition-all duration-200",
                            selectedTab === "all"
                                ? "bg-primary text-white shadow-md"
                                : "bg-transparent text-primary dark:text-white hover:bg-primary/10"
                        )}
                    >
                        All
                    </button>
                    <button
                        onClick={() => onTabChange("search")}
                        className={cn(
                            "relative py-1.5 sm:py-2 px-2 sm:px-4 rounded text-sm sm:text-base whitespace-normal sm:whitespace-nowrap focus:outline-none flex items-center gap-1 transition-all duration-200",
                            selectedTab === "search"
                                ? "bg-primary text-white shadow-md"
                                : "bg-transparent text-primary dark:text-white hover:bg-primary/10"
                        )}
                    >
                        <SearchIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span>Search</span>
                    </button>


                </div>

            </div>


            {selectedTab === "search" && (
                <div className="pb-2">
                    <SearchInput
                        value={searchQuery}
                        onChange={onSearchChange}
                        placeholder="Search points, rationales, or authors..."
                    />
                </div>
            )}
        </div>
    );
} 