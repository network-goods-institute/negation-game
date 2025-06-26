"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { SearchIcon, PlusIcon, Filter } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SearchInput } from "@/components/search/SearchInput";
import useIsMobile from "@/hooks/ui/useIsMobile";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { NewRationaleButton } from "@/components/rationale/NewRationaleButton";

export type Tab = "all" | "points" | "rationales" | "search";

interface SpaceTabsProps {
    selectedTab: Tab;
    onTabChange: (tab: Tab) => void;
    searchQuery: string;
    onSearchChange: (value: string) => void;
    isAiLoading: boolean;
    onAiClick: () => void;
    spaceId?: string;
    onLoginOrMakePoint: () => void;
    onNewViewpoint: () => void;
    isNewRationaleLoading?: boolean;
    onSelectNegation: () => void;
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
    onLoginOrMakePoint,
    onNewViewpoint,
    isNewRationaleLoading = false,
    onSelectNegation,
    filtersOpen,
    onFiltersToggle,
    topicsOpen,
    onTopicsToggle,
}: SpaceTabsProps) {
    const isMobile = useIsMobile();

    const getActionButtons = () => {
        switch (selectedTab) {
            case "rationales":
                return (
                    <NewRationaleButton
                        onClick={onNewViewpoint}
                        variant="default"
                        size="lg"
                        loading={isNewRationaleLoading}
                    />
                );
            case "points":
                return (
                    <>
                        <Button onClick={onLoginOrMakePoint} variant="outline" size="default" className="rounded-full flex items-center gap-2 px-6 font-bold border-green-300 bg-green-100 text-green-800 hover:bg-green-200 hover:border-green-400 dark:border-green-800 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900 dark:hover:border-green-800">
                            <span>Point</span>
                            <PlusIcon className="h-4 w-4" />
                        </Button>
                        <Button onClick={onSelectNegation} variant="outline" size="default" className="rounded-full flex items-center gap-2 px-6 font-bold border-red-300 bg-red-100 text-red-800 hover:bg-red-200 hover:border-red-400 dark:border-red-800 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900 dark:hover:border-red-800">
                            <span>Negation</span>
                            <PlusIcon className="h-4 w-4" />
                        </Button>
                    </>
                );
            case "all":
                return (
                    <>
                        <Button onClick={onLoginOrMakePoint} variant="outline" size="default" className="rounded-full flex items-center gap-2 px-6 font-bold border-green-300 bg-green-100 text-green-800 hover:bg-green-200 hover:border-green-400 dark:border-green-800 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900 dark:hover:border-green-800">
                            <span>Point</span>
                            <PlusIcon className="h-4 w-4" />
                        </Button>
                        <NewRationaleButton
                            onClick={onNewViewpoint}
                            variant="default"
                            size="lg"
                            loading={isNewRationaleLoading}
                        />
                        <Button onClick={onSelectNegation} variant="outline" size="default" className="rounded-full flex items-center gap-2 px-6 font-bold border-red-300 bg-red-100 text-red-800 hover:bg-red-200 hover:border-red-400 dark:border-red-800 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900 dark:hover:border-red-800">
                            <span>Negation</span>
                            <PlusIcon className="h-4 w-4" />
                        </Button>
                    </>
                );
            case "search":
                return (
                    <>
                        <Button onClick={onLoginOrMakePoint} variant="outline" size="default" className="rounded-full flex items-center gap-2 px-6 font-bold border-green-300 bg-green-100 text-green-800 hover:bg-green-200 hover:border-green-400 dark:border-green-800 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900 dark:hover:border-green-800">
                            <span>Point</span>
                            <PlusIcon className="h-4 w-4" />
                        </Button>
                        <NewRationaleButton
                            onClick={onNewViewpoint}
                            variant="default"
                            size="lg"
                            loading={isNewRationaleLoading}
                        />
                        <Button onClick={onSelectNegation} variant="outline" size="default" className="rounded-full flex items-center gap-2 px-6 font-bold border-red-300 bg-red-100 text-red-800 hover:bg-red-200 hover:border-red-400 dark:border-red-800 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900 dark:hover:border-red-800">
                            <span>Negation</span>
                            <PlusIcon className="h-4 w-4" />
                        </Button>
                    </>
                );
            default:
                return null;
        }
    };

    const showFiltersButton = selectedTab === "rationales";

    return (
        <div className="flex flex-col gap-4 px-4 sm:px-lg py-3 sm:py-sm">
            {!isMobile && (
                <div className="flex items-center justify-center gap-3 p-3 bg-gradient-to-r from-muted/30 to-muted/10 rounded-lg border border-border/30">
                    {getActionButtons()}
                </div>
            )}

            {/* Main tabs row */}
            <div className={cn("flex gap-2 sm:gap-4", !isMobile && "border-t pt-4", isMobile && "overflow-x-auto no-scrollbar")}>
                <button
                    onClick={() => onTabChange("rationales")}
                    className={cn(
                        "relative py-1.5 sm:py-2 px-2 sm:px-4 rounded text-sm sm:text-base whitespace-normal sm:whitespace-nowrap focus:outline-none transition-all duration-200",
                        selectedTab === "rationales"
                            ? "bg-primary text-white shadow-md"
                            : "bg-transparent text-primary dark:text-white hover:bg-primary/10"
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

                {/* Topics selector - always visible on mobile */}
                {isMobile && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onTopicsToggle}
                        className="flex items-center whitespace-nowrap px-3 py-1.5 sm:py-2"
                    >
                        Topics
                        {topicsOpen ? <ChevronUpIcon className="h-4 w-4 ml-1" /> : <ChevronDownIcon className="h-4 w-4 ml-1" />}
                    </Button>
                )}

                {/* Desktop filter toggle - only show if not on rationales tab since it's moved to centered section */}
                {!isMobile && showFiltersButton && selectedTab !== "rationales" && (
                    <Button
                        variant={filtersOpen ? "default" : "outline"}
                        size="sm"
                        onClick={onFiltersToggle}
                        className="flex items-center gap-1 whitespace-nowrap"
                    >
                        <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span>Filters</span>
                    </Button>
                )}
            </div>

            {/* Mobile toggles row - filtering moved to delta section, no longer needed here */}

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