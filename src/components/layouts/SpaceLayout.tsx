"use client";

import React, { ReactNode, useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { FixedCreateButton } from "./FixedCreateButton";
// Lazy load components for code splitting
const TopicsSidebar = React.lazy(() => import("@/components/space/TopicsSidebar").then(mod => ({ default: mod.TopicsSidebar })));
const StatisticsSummaryCard = React.lazy(() => import("@/components/statistics/StatisticsSummaryCard").then(mod => ({ default: mod.StatisticsSummaryCard })));
const LeaderboardCard = React.lazy(() => import("@/components/space/LeaderboardCard").then(mod => ({ default: mod.LeaderboardCard })));
const UserProfilePreview = React.lazy(() => import("@/components/space/UserProfilePreview").then(mod => ({ default: mod.UserProfilePreview })));
const FullWidthAiButton = React.lazy(() => import("@/components/ai/FullWidthAiButton").then(mod => ({ default: mod.FullWidthAiButton })));


interface SpaceLayoutProps {
    space: string;
    children: ReactNode;
    header?: ReactNode;
    rightSidebarContent?: ReactNode;
    onCreateRationale?: () => void;
    isCreatingRationale?: boolean;
    topicFilters?: string[];
    onTopicFiltersChange?: (filters: string[]) => void;
    showSidebars?: boolean;
    showTopicsSidebar?: boolean;
    showStatsSidebar?: boolean;
    showUserProfilePreview?: boolean;
    topicsOpen?: boolean;
    onTopicsToggle?: (open: boolean) => void;
    isHomePage?: boolean;
}

export function SpaceLayout({
    space,
    children,
    header,
    rightSidebarContent,
    onCreateRationale,
    isCreatingRationale = false,
    topicFilters = [],
    onTopicFiltersChange = () => { },
    showSidebars = true,
    showTopicsSidebar = true,
    showStatsSidebar = true,
    showUserProfilePreview = true,
    topicsOpen: topicsOpenProp,
    onTopicsToggle,
    isHomePage = true,
}: SpaceLayoutProps) {
    const [topicsOpenState, setTopicsOpenState] = useState(false);
    const topicsOpen = topicsOpenProp !== undefined ? topicsOpenProp : topicsOpenState;
    const setTopicsOpen = onTopicsToggle || setTopicsOpenState;

    // Handle close topics event from mobile overlay
    React.useEffect(() => {
        const handleCloseTopics = () => {
            setTopicsOpen(false);
        };

        window.addEventListener('closeTopics', handleCloseTopics);
        return () => {
            window.removeEventListener('closeTopics', handleCloseTopics);
        };
    }, [setTopicsOpen]);


    return (
        <div className="flex-1 flex h-full relative">
            <div className="w-full mx-auto flex">
                {/* Left Sidebar - Fixed */}
                {showSidebars && showTopicsSidebar && (
                    <aside className="hidden lg:block w-72 flex-shrink-0 ">
                        <div className="fixed w-72 top-14 bottom-0 border-r dark:border-border/50 bg-muted/10">
                            <div className="px-4 xl:px-8 py-4 space-y-4 flex flex-col h-full">
                                {/* User Profile Preview */}
                                {showUserProfilePreview && (
                                    <Suspense fallback={<div className="h-24 animate-pulse bg-muted/20 rounded-lg" />}>
                                        <UserProfilePreview />
                                    </Suspense>
                                )}

                                {/* Topics Sidebar */}
                                <Suspense fallback={<div className="flex-1 animate-pulse bg-muted/20 rounded-lg" />}>
                                    <TopicsSidebar
                                        space={space}
                                        topicFilters={topicFilters}
                                        onTopicFiltersChange={onTopicFiltersChange}
                                        isOpen={topicsOpen}
                                        onClose={() => setTopicsOpen(false)}
                                    />
                                </Suspense>

                                {/* Create Rationale Button */}
                                <div className="flex-1 flex flex-col justify-end">
                                    <Button
                                        onClick={onCreateRationale || (() => window.location.href = `/s/${space}/rationale/new`)}
                                        className="w-full flex items-center justify-center gap-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
                                        size="lg"
                                        disabled={isCreatingRationale}
                                    >
                                        <div className="flex items-center gap-2">
                                            {isCreatingRationale ? (
                                                <Loader size={20} color="white" />
                                            ) : (
                                                <Plus size={20} color="#FFFFFF" />
                                            )}
                                            <span className="text-white">Create a rationale</span>
                                        </div>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </aside>
                )}

                {/* Main content area - Center column */}
                <main className="flex-1 flex flex-col min-w-0 relative">
                    {/* Sticky Header */}
                    {header && (
                        <div className="sticky top-16 z-50 border-b bg-background">
                            <div className="bg-muted/10">
                                {header}
                            </div>
                        </div>
                    )}

                    <div className="flex-1 sm:mt-6">
                        <div className="mx-auto w-full max-w-5xl px-3">
                            {children}
                        </div>
                    </div>
                </main>

                {/* Right Sidebar - Fixed */}
                {showSidebars && showStatsSidebar && (
                    <aside className="hidden xl:block w-80 flex-shrink-0">
                        <div className="fixed w-80 top-14 bottom-0 border-l bg-muted/10">
                            <div className="px-4 2xl:px-8 py-4 h-full flex flex-col overflow-hidden">
                                {/* Full-width AI Assistant button for desktop */}
                                <Suspense fallback={<div className="h-12 animate-pulse bg-muted/20 rounded-lg" />}>
                                    <FullWidthAiButton />
                                </Suspense>

                                {/* Right sidebar content area. Not scrollable by default; pages can manage their own scrolling inside. */}
                                <div className="flex-1 min-h-0 mt-4">
                                    {rightSidebarContent ? (
                                        rightSidebarContent
                                    ) : (
                                        <div className="space-y-4">
                                            <Suspense fallback={<div className="h-32 animate-pulse bg-muted/20 rounded-lg" />}>
                                                <StatisticsSummaryCard space={space} />
                                            </Suspense>
                                            <Suspense fallback={<div className="h-64 animate-pulse bg-muted/20 rounded-lg" />}>
                                                <LeaderboardCard space={space} />
                                            </Suspense>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </aside>
                )}
            </div>

            {/* Mobile Topics Sidebar Overlay */}
            {showSidebars && showTopicsSidebar && (
                <div className={cn(
                    "lg:hidden fixed inset-0 z-50 flex",
                    topicsOpen ? "pointer-events-auto" : "pointer-events-none"
                )}>
                    <div className={cn(
                        "fixed inset-0 bg-black/50 transition-opacity",
                        topicsOpen ? "opacity-100" : "opacity-0"
                    )} onClick={() => setTopicsOpen(false)} />
                    <div className={cn(
                        "relative flex w-72 flex-col bg-background transition-transform",
                        topicsOpen ? "translate-x-0" : "-translate-x-full"
                    )}>
                        <div className="p-4">
                            <Suspense fallback={<div className="h-full animate-pulse bg-muted/20 rounded-lg" />}>
                                <TopicsSidebar
                                    space={space}
                                    topicFilters={topicFilters}
                                    onTopicFiltersChange={onTopicFiltersChange}
                                    isOpen={topicsOpen}
                                    onClose={() => setTopicsOpen(false)}
                                />
                            </Suspense>
                        </div>
                    </div>
                </div>
            )}

            {/* Fixed Create Button for Mobile */}
            {onCreateRationale && isHomePage && (
                <FixedCreateButton
                    onCreateRationale={onCreateRationale}
                    isCreatingRationale={isCreatingRationale}
                />
            )}

        </div>
    );
}