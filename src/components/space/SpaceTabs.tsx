"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { SearchIcon, PlusIcon, FilterIcon } from "lucide-react";
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
                        variant="outline"
                        size="sm"
                        className="flex-1 text-sm"
                        loading={isNewRationaleLoading}
                    />
                );
            case "points":
                return (
                    <>
                        <Button onClick={onLoginOrMakePoint} variant="outline" size="default" className="flex-1 text-sm">
                            <PlusIcon className="h-4 w-4 mr-2" /> Make a Point
                        </Button>
                        <Button onClick={onSelectNegation} variant="outline" size="default" className="flex-1 text-sm">
                            <PlusIcon className="h-4 w-4 mr-2" /> Make a Negation
                        </Button>
                    </>
                );
            case "all":
                return (
                    <>
                        <Button onClick={onLoginOrMakePoint} variant="outline" size="default" className="flex-1 text-sm">
                            <PlusIcon className="h-4 w-4 mr-2" /> Make a Point
                        </Button>
                        <NewRationaleButton
                            onClick={onNewViewpoint}
                            variant="outline"
                            size="sm"
                            className="flex-1 text-sm"
                            loading={isNewRationaleLoading}
                        />
                        <Button onClick={onSelectNegation} variant="outline" size="default" className="flex-1 text-sm">
                            <PlusIcon className="h-4 w-4 mr-2" /> Make a Negation
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
            {!isMobile && selectedTab !== "search" && (
                <div className="flex justify-around items-center bg-background px-4 py-2 mb-4 sm:px-0 space-x-4">
                    {getActionButtons()}
                </div>
            )}

            {/* Main tabs row */}
            <div className={cn("flex gap-2 sm:gap-4", !isMobile && "border-t pt-4", isMobile && "overflow-x-auto no-scrollbar")}>
                <button
                    onClick={() => onTabChange("rationales")}
                    className={cn(
                        "py-1.5 sm:py-2 px-2 sm:px-4 rounded text-sm sm:text-base whitespace-normal sm:whitespace-nowrap focus:outline-none",
                        selectedTab === "rationales"
                            ? "bg-primary text-white"
                            : "bg-transparent text-primary"
                    )}
                >
                    Rationales
                </button>
                <button
                    onClick={() => onTabChange("points")}
                    className={cn(
                        "py-1.5 sm:py-2 px-2 sm:px-4 rounded text-sm sm:text-base whitespace-normal sm:whitespace-nowrap focus:outline-none",
                        selectedTab === "points"
                            ? "bg-primary text-white"
                            : "bg-transparent text-primary"
                    )}
                >
                    Points
                </button>
                <button
                    onClick={() => onTabChange("all")}
                    className={cn(
                        "py-1.5 sm:py-2 px-2 sm:px-4 rounded text-sm sm:text-base whitespace-normal sm:whitespace-nowrap focus:outline-none",
                        selectedTab === "all"
                            ? "bg-primary text-white"
                            : "bg-transparent text-primary"
                    )}
                >
                    All
                </button>
                <button
                    onClick={() => onTabChange("search")}
                    className={cn(
                        "py-1.5 sm:py-2 px-2 sm:px-4 rounded text-sm sm:text-base whitespace-normal sm:whitespace-nowrap focus:outline-none flex items-center gap-1",
                        selectedTab === "search"
                            ? "bg-primary text-white"
                            : "bg-transparent text-primary"
                    )}
                >
                    <SearchIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>Search</span>
                </button>

                {/* Desktop filter toggle */}
                {!isMobile && showFiltersButton && (
                    <Button
                        variant={filtersOpen ? "default" : "outline"}
                        size="sm"
                        onClick={onFiltersToggle}
                        className="flex items-center gap-1 whitespace-nowrap"
                    >
                        <FilterIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span>Filters</span>
                    </Button>
                )}
            </div>

            {/* Mobile toggles row */}
            {isMobile && (
                <div className="flex gap-2 justify-center">
                    {showFiltersButton && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onFiltersToggle}
                            className="flex items-center whitespace-nowrap"
                            text="Filtering"
                            rightSlot={
                                filtersOpen
                                    ? <ChevronUpIcon className="h-4 w-4" />
                                    : <ChevronDownIcon className="h-4 w-4" />
                            }
                        />
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onTopicsToggle}
                        className="flex items-center whitespace-nowrap"
                        text="Topics"
                        rightSlot={
                            topicsOpen
                                ? <ChevronUpIcon className="h-4 w-4" />
                                : <ChevronDownIcon className="h-4 w-4" />
                        }
                    />
                </div>
            )}

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