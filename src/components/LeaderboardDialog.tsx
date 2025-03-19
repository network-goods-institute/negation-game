"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { useFeed } from "@/queries/useFeed";
import { useAllUsers } from "@/queries/useAllUsers";
import { TrophyIcon, ArrowLeftIcon, HeartIcon, InfoIcon, ChevronDownIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useUser } from "@/queries/useUser";
import { fetchSpaceViewpoints } from "@/actions/fetchSpaceViewpoints";
import { fetchUsersReputation } from "@/actions/fetchUsersReputation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SortOption = "points" | "cred" | "rationales" | "reputation";

export const LeaderboardDialog = ({
    open,
    onOpenChange,
    space,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    space: string;
}) => {
    const { data: feed } = useFeed();
    const { data: allUsers } = useAllUsers();
    const { data: spaceViewpoints } = useQuery({
        queryKey: ["spaceRationales", space],
        queryFn: () => fetchSpaceViewpoints(space),
    });
    const { data: user } = useUser();
    const [sortBy, setSortBy] = useState<SortOption>("rationales");
    const [sortDescending, setSortDescending] = useState(true);
    const [viewMode, setViewMode] = useState<"table" | "cards">("cards");

    const leaderboardData = useMemo(() => {
        if (!feed || !allUsers || !spaceViewpoints) return [];

        // Count points per user in this space
        const pointsCount = feed.reduce((acc, point) => {
            if (point.space === space) {
                acc[point.createdBy] = (acc[point.createdBy] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        // Calculate viewpoints count
        const viewpointsCount = spaceViewpoints.reduce((acc, viewpoint) => {
            acc[viewpoint.createdBy] = (acc[viewpoint.createdBy] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Merge with user data - include all users
        return allUsers.map(user => ({
            ...user,
            points: pointsCount[user.id] || 0,
            viewpoints: viewpointsCount[user.id] || 0,
            reputation: 50, // Default value, will be updated with actual data
        }));

    }, [feed, allUsers, spaceViewpoints, space]);

    const userIds = useMemo(() => {
        return leaderboardData.map(user => user.id);
    }, [leaderboardData]);

    // Fetch reputation data using fetchUsersReputation
    const { data: reputationData, isLoading: isReputationLoading } = useQuery({
        queryKey: ["users-reputation", userIds],
        queryFn: async () => {
            if (!userIds.length) return {};
            return await fetchUsersReputation(userIds);
        },
        enabled: userIds.length > 0,
        staleTime: 60 * 1000,
        retry: 3,
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),
    });

    const leaderboardDataWithReputation = useMemo(() => {
        if (!leaderboardData?.length || isReputationLoading || !reputationData) {
            return [];
        }

        return leaderboardData.map(user => ({
            ...user,
            reputation: reputationData[user.id] ?? 50,
        }));
    }, [leaderboardData, reputationData, isReputationLoading]);

    const sortedUsers = useMemo(() => {
        if (!leaderboardDataWithReputation?.length) return [];

        return [...leaderboardDataWithReputation].sort((a, b) => {
            let valueA = 0;
            let valueB = 0;

            switch (sortBy) {
                case "points":
                    valueA = a.points || 0;
                    valueB = b.points || 0;
                    break;
                case "cred":
                    valueA = a.cred || 0;
                    valueB = b.cred || 0;
                    break;
                case "rationales":
                    valueA = a.viewpoints || 0;
                    valueB = b.viewpoints || 0;
                    break;
                case "reputation":
                    valueA = a.reputation || 0;
                    valueB = b.reputation || 0;
                    break;
            }

            return sortDescending ? valueB - valueA : valueA - valueB;
        });
    }, [leaderboardDataWithReputation, sortBy, sortDescending]);

    // Find current user's index in the sorted list
    const currentUserIndex = useMemo(() => {
        if (!user || !sortedUsers?.length) return -1;
        return sortedUsers.findIndex(u => u.id === user.id);
    }, [user, sortedUsers]);

    // Get current user's actual rank (index + 1)
    const currentUserRank = currentUserIndex >= 0 ? currentUserIndex + 1 : 0;
    const currentUserData = currentUserIndex >= 0 ? sortedUsers[currentUserIndex] : null;

    // Map of sort options to display text
    const sortOptionLabels: Record<SortOption, string> = {
        points: "Points",
        cred: "Cred",
        rationales: "Rationales",
        reputation: "Reputation"
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl md:max-w-2xl h-auto max-h-[85vh] flex flex-col p-4 sm:p-6">
                <DialogHeader className="space-y-1">
                    <div className="flex items-center gap-2">
                        <DialogClose asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ArrowLeftIcon className="size-4" />
                            </Button>
                        </DialogClose>
                        <DialogTitle className="flex items-center gap-2">
                            <TrophyIcon className="size-5" />
                            s/{space} Leaderboard
                        </DialogTitle>
                    </div>
                </DialogHeader>

                {/* User stats card */}
                {currentUserData && (
                    <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-primary/20">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-sm font-medium">
                                    {currentUserRank}
                                </div>
                                <div>
                                    <div className="font-medium flex items-center gap-1">
                                        {currentUserData.username}
                                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                            You
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                        {currentUserData.viewpoints} rationales · {currentUserData.points} points · {Math.round(currentUserData.reputation)}% reputation
                                    </div>
                                </div>
                            </div>
                            <div className="text-sm font-medium">
                                {currentUserData.cred} cred
                            </div>
                        </div>
                    </div>
                )}

                {/* Controls */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8">
                                    <span>Sort by: {sortOptionLabels[sortBy]}</span>
                                    <ChevronDownIcon className="ml-1 size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                {(Object.keys(sortOptionLabels) as SortOption[]).map((option) => (
                                    <DropdownMenuItem
                                        key={option}
                                        onClick={() => setSortBy(option)}
                                        className={sortBy === option ? "bg-muted" : ""}
                                    >
                                        {sortOptionLabels[option]}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => setSortDescending(!sortDescending)}
                        >
                            {sortDescending ? "↓ Desc" : "↑ Asc"}
                        </Button>
                    </div>

                    <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "table" | "cards")}>
                        <TabsList className="h-8">
                            <TabsTrigger value="table" className="text-xs px-2">Table</TabsTrigger>
                            <TabsTrigger value="cards" className="text-xs px-2">Cards</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Leaderboard content */}
                <div className="mt-2 flex-1 overflow-y-auto">
                    {isReputationLoading ? (
                        <div className="flex justify-center items-center p-6">
                            <div className="text-sm text-muted-foreground">Loading reputation data...</div>
                        </div>
                    ) : (
                        <Tabs value={viewMode} className="w-full">
                            <TabsContent value="table" className="mt-0">
                                <div className="border rounded-lg overflow-x-auto">
                                    <table className="w-full min-w-[600px]">
                                        <thead className="bg-muted/30">
                                            <tr>
                                                <th className="text-left py-2 pl-3 pr-2 text-xs font-medium w-[10%]">Rank</th>
                                                <th className="text-left py-2 px-2 text-xs font-medium w-[30%]">User</th>
                                                <th className="text-right py-2 px-2 text-xs font-medium w-[15%]">Points</th>
                                                <th className="text-right py-2 px-2 text-xs font-medium w-[15%]">Rationales</th>
                                                <th className="text-right py-2 px-2 text-xs font-medium w-[20%]">
                                                    <TooltipProvider delayDuration={300}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="flex items-center justify-end gap-1 cursor-help">
                                                                    <span>Reputation</span>
                                                                    <InfoIcon className="size-3 text-muted-foreground" />
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top" className="max-w-[200px] text-xs">
                                                                Epistemic reputation indicates how likely a user is to
                                                                admit when they&apos;re wrong by slashing their restakes
                                                                when faced with convincing counterarguments. A reputation of 100% means that the user has always slashed their restakes. 50% is the default if a user has not interacted epistemically.
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </th>
                                                <th className="text-right py-2 px-3 text-xs font-medium w-[15%]">Cred</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedUsers.map((user, index) => (
                                                <tr
                                                    key={user.id}
                                                    className={cn(
                                                        "border-t hover:bg-muted/20 transition-colors",
                                                        user.id === currentUserData?.id && "bg-primary/5"
                                                    )}
                                                >
                                                    <td className="py-2 pl-3 pr-2 text-sm">{index + 1}</td>
                                                    <td className="py-2 px-2 font-medium text-sm">
                                                        <div className="flex items-center gap-2 max-w-full">
                                                            {user.delegationUrl && (
                                                                <TooltipProvider delayDuration={300}>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <a
                                                                                href={user.delegationUrl}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="inline-flex justify-center items-center w-6 h-6 bg-purple-500 rounded-full"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                <HeartIcon className="size-3.5 text-white" />
                                                                            </a>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top">
                                                                            <p className="text-xs">Delegate to this user</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            )}
                                                            <span className="truncate">{user.username}</span>
                                                            {user.id === currentUserData?.id && (
                                                                <span className="text-xs text-primary px-1.5 py-0.5 rounded-full bg-primary/10 whitespace-nowrap">
                                                                    You
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-2 text-sm text-right">{user.points}</td>
                                                    <td className="py-2 px-2 text-sm text-right">{user.viewpoints}</td>
                                                    <td className="py-2 px-2 text-sm text-right">{Math.round(user.reputation)}%</td>
                                                    <td className="py-2 px-3 text-sm text-right">{user.cred}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </TabsContent>

                            <TabsContent value="cards" className="mt-0 space-y-2 overflow-x-auto">
                                {sortedUsers.map((user, index) => (
                                    <div
                                        key={user.id}
                                        className={cn(
                                            "p-3 rounded-lg border",
                                            user.id === currentUserData?.id ? "bg-primary/5 border-primary/20" : "bg-card"
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center min-w-7 h-7 rounded-full bg-muted text-sm font-medium">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <div className="font-medium flex items-center gap-1.5 text-sm">
                                                        {user.username}
                                                        {user.id === currentUserData?.id && (
                                                            <span className="text-xs text-primary px-1.5 py-0.5 rounded-full bg-primary/10 whitespace-nowrap">
                                                                You
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-2">
                                                        <span>{user.viewpoints} rationales</span>
                                                        <span>{user.points} points</span>
                                                        <span>{Math.round(user.reputation)}% reputation</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <div className="text-sm font-medium">{user.cred} cred</div>
                                                {user.delegationUrl && (
                                                    <TooltipProvider delayDuration={300}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <a
                                                                    href={user.delegationUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="mt-1 inline-flex justify-center items-center w-6 h-6 bg-purple-500 rounded-full"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <HeartIcon className="size-3.5 text-white" />
                                                                </a>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top">
                                                                <p className="text-xs">Delegate to this user</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </TabsContent>
                        </Tabs>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};