"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { SearchIcon, PlusIcon, EyeIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SearchInput } from "@/components/search/SearchInput";
import useIsMobile from "@/hooks/ui/useIsMobile";
import { useAtom } from "jotai";
import { rationalesFiltersOpenAtom } from "@/atoms/rationalesFiltersOpenAtom";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";

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
    onSelectNegation: () => void;
}

export function SpaceTabs({
    selectedTab,
    onTabChange,
    searchQuery,
    onSearchChange,
    onLoginOrMakePoint,
    onNewViewpoint,
    onSelectNegation,
}: SpaceTabsProps) {
    const isMobile = useIsMobile();
    const [filtersOpen, setFiltersOpen] = useAtom(rationalesFiltersOpenAtom);
    return (
        <div className="flex flex-col gap-4 px-4 sm:px-lg py-3 sm:py-sm">
            {!isMobile && (
                <div className="flex justify-around items-center bg-background px-4 py-2 mb-4 sm:px-0 space-x-4">
                    <Button onClick={onLoginOrMakePoint} variant="outline" size="default" className="flex-1 text-sm">
                        <PlusIcon className="h-4 w-4 mr-2" /> Make a Point
                    </Button>
                    <Button onClick={onNewViewpoint} variant="outline" size="default" className="flex-1 text-sm">
                        <EyeIcon className="h-4 w-4 mr-2" /> New Rationale
                    </Button>
                    <Button onClick={onSelectNegation} variant="outline" size="default" className="flex-1 text-sm">
                        <PlusIcon className="h-4 w-4 mr-2" /> Make a Negation
                    </Button>
                </div>
            )}
            <div className={cn("flex gap-2 sm:gap-4 overflow-x-auto no-scrollbar", !isMobile && "border-t pt-4")}>
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
                {isMobile && selectedTab === "rationales" && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFiltersOpen(open => !open)}
                        className="flex items-center ml-2 whitespace-nowrap"
                        text="Filtering"
                        rightSlot={
                            filtersOpen
                                ? <ChevronUpIcon className="h-4 w-4" />
                                : <ChevronDownIcon className="h-4 w-4" />
                        }
                    />
                )}
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