"use client";

import React, { useState } from "react";
import { ListTree, Filter, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import useIsMobile from "@/hooks/ui/useIsMobile";
import type { SortOrder } from "@/app/s/[space]/SpacePageClient";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { MobileFilterDrawer } from "@/components/mobile/MobileFilterDrawer";
import { useSpaceSearch } from "@/components/contexts/SpaceSearchContext";
import { PointFilterSelector } from "@/components/inputs/PointFilterSelector";

export type Tab = "all" | "points" | "rationales";

interface SpaceTabsProps {
    selectedTab: Tab;
    onTabChange: (tab: Tab) => void;
    spaceId?: string;
    onNewViewpoint: () => void;
    isNewRationaleLoading?: boolean;
    filtersOpen: boolean;
    onFiltersToggle: () => void;
    topicsOpen: boolean;
    onTopicsToggle: () => void;
    sortOrder: SortOrder;
    onSortOrderChange: (order: SortOrder) => void;
    topicFilters: string[];
    onTopicFiltersChange: (filters: string[]) => void;
    // Point filtering
    points?: any[];
    selectedPointIds: number[];
    onPointSelect: (pointId: number) => void;
    onPointDeselect: (pointId: number) => void;
    onClearAll: () => void;
    matchType: "any" | "all";
    onMatchTypeChange: (type: "any" | "all") => void;
}

export function SpaceTabs({
    selectedTab,
    onTabChange,
    spaceId,
    onNewViewpoint,
    isNewRationaleLoading = false,
    filtersOpen,
    onFiltersToggle,
    topicsOpen,
    onTopicsToggle,
    sortOrder,
    onSortOrderChange,
    topicFilters,
    onTopicFiltersChange,
    // Point filtering
    points = [],
    selectedPointIds,
    onPointSelect,
    onPointDeselect,
    onClearAll,
    matchType,
    onMatchTypeChange,
}: SpaceTabsProps) {
    const isMobile = useIsMobile();
    const [showExplanations, setShowExplanations] = useState(!isMobile);
    const { searchQuery, setSearchQuery, mobileFiltersOpen, setMobileFiltersOpen } = useSpaceSearch();

    return (
        <div className="border-b border-border/50">
            {/* Tabs and filters */}
            <div className="px-4 sm:px-6 lg:px-8 py-3">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        {/* Tabs */}
                        <div className="flex-1 flex items-center gap-1 border-b border-border/50">
                            <button
                                onClick={() => onTabChange("rationales")}
                                className={cn(
                                    "relative py-2 px-4 text-sm font-medium whitespace-nowrap focus:outline-none focus:ring-0 focus-visible:ring-0 transition-all duration-200 border-b-2",
                                    selectedTab === "rationales"
                                        ? "text-foreground border-primary"
                                        : "text-muted-foreground hover:text-foreground border-transparent hover:border-secondary/80"
                                )}
                            >
                                Rationales
                            </button>
                            <button
                                onClick={() => onTabChange("points")}
                                className={cn(
                                    "relative py-2 px-4 text-sm font-medium whitespace-nowrap focus:outline-none focus:ring-0 focus-visible:ring-0 transition-all duration-200 border-b-2",
                                    selectedTab === "points"
                                        ? "text-foreground border-primary"
                                        : "text-muted-foreground hover:text-foreground border-transparent hover:border-secondary/80"
                                )}
                            >
                                Points
                            </button>
                            <button
                                onClick={() => onTabChange("all")}
                                className={cn(
                                    "relative py-2 px-4 text-sm font-medium whitespace-nowrap focus:outline-none focus:ring-0 focus-visible:ring-0 transition-all duration-200 border-b-2",
                                    selectedTab === "all"
                                        ? "text-foreground border-primary"
                                        : "text-muted-foreground hover:text-foreground border-transparent hover:border-secondary/80"
                                )}
                            >
                                All
                            </button>
                        </div>

                        {/* Sort selector and Filter buttons */}
                        <div className="flex items-center gap-4">
                            {/* Desktop controls - hidden on mobile/tablet */}
                            <div className="hidden lg:flex items-center gap-4">
                                {/* Sort selector - desktop only */}
                                <Select value={sortOrder} onValueChange={onSortOrderChange}>
                                    <SelectTrigger className="h-8 px-3 text-sm w-auto">
                                        <SelectValue placeholder="Sort by" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="recent">Most Recent</SelectItem>
                                        <SelectItem value="favor">Highest Favor</SelectItem>
                                        <SelectItem value="cred">Most Cred</SelectItem>
                                        <SelectItem value="activity">Most Active</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Filter button - desktop */}
                                {(selectedTab === "all" || selectedTab === "rationales") && (
                                    <button
                                        onClick={onFiltersToggle}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-0 focus-visible:ring-0",
                                            filtersOpen
                                                ? "bg-primary/10 text-primary"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                        )}
                                    >
                                        <Filter className="h-4 w-4" />
                                        <span>Filters</span>
                                    </button>
                                )}
                            </div>

                            {/* Mobile filter drawer - visible on mobile/tablet */}
                            <div className="lg:hidden">
                                <MobileFilterDrawer
                                    space={spaceId || ""}
                                    topicFilters={topicFilters}
                                    onTopicFiltersChange={onTopicFiltersChange}
                                    sortOrder={sortOrder}
                                    onSortOrderChange={onSortOrderChange}
                                    isOpen={mobileFiltersOpen}
                                    onOpenChange={setMobileFiltersOpen}
                                    searchQuery={searchQuery}
                                    onSearchQueryChange={setSearchQuery}
                                    points={points}
                                    selectedPointIds={selectedPointIds}
                                    onPointSelect={onPointSelect}
                                    onPointDeselect={onPointDeselect}
                                    onClearAllPoints={onClearAll}
                                    matchType={matchType}
                                    onMatchTypeChange={onMatchTypeChange}
                                    selectedTab={selectedTab}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Tab explanations - collapsible on mobile/tablet */}
                    {selectedTab && (
                        <div className="mt-1">
                            <button
                                onClick={() => setShowExplanations(!showExplanations)}
                                className="flex lg:hidden items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <ChevronDown className={cn(
                                    "h-3 w-3 transition-transform",
                                    showExplanations && "rotate-180"
                                )} />
                                <span>{showExplanations ? "Hide" : "Show"} description</span>
                            </button>
                            <div className={cn(
                                "text-xs text-muted-foreground mt-1",
                                "lg:block",
                                showExplanations ? "block" : "hidden"
                            )}>
                                {selectedTab === "rationales" && (
                                    <span>
                                        Rationales are structured collections of points and negations that represent complete arguments. They allow users to create and share comprehensive reasoning structures rather than isolated points.
                                    </span>
                                )}
                                {selectedTab === "points" && (
                                    <span>Points are individual claims or arguments that can be endorsed, negated, or restaked</span>
                                )}
                                {selectedTab === "all" && (
                                    <span>View all rationales and points in one unified feed</span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Filters panel - inline expandable for point filtering */}
                {filtersOpen && (selectedTab === "all" || selectedTab === "rationales") && (
                    <div className="p-4">
                        <div className="p-2 bg-muted/30 rounded-lg border">
                            <div className="flex flex-col gap-3">
                                {selectedPointIds.length > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={onClearAll}
                                        className="h-auto py-1 px-2.5 text-xs"
                                    >
                                        Clear all
                                    </Button>
                                )}
                                <PointFilterSelector
                                    points={points}
                                    selectedPointIds={selectedPointIds}
                                    onPointSelect={onPointSelect}
                                    onPointDeselect={onPointDeselect}
                                    onClearAll={onClearAll}
                                    matchType={matchType}
                                    onMatchTypeChange={onMatchTypeChange}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
} 