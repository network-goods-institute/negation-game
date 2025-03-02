"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { useFeed } from "@/queries/useFeed";
import { useAllUsers } from "@/queries/useAllUsers";
import { TrophyIcon, ArrowLeftIcon, HeartIcon, InfoIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useUser } from "@/queries/useUser";
import { fetchSpaceViewpoints } from "@/actions/fetchSpaceViewpoints";
import { fetchRestakerReputation } from "@/actions/fetchRestakerReputation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
        queryKey: ["spaceViewpoints", space],
        queryFn: () => fetchSpaceViewpoints(space),
    });
    const { data: user } = useUser();
    const [sortBy, setSortBy] = useState<"points" | "cred" | "viewpoints" | "reputation">("points");
    const [sortDescending, setSortDescending] = useState(true);

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
            reputation: 50,
        }));

    }, [feed, allUsers, spaceViewpoints, space]);

    const userIds = useMemo(() => {
        return leaderboardData.map(user => user.id);
    }, [leaderboardData]);

    // Fetch reputation data using the existing fetchRestakerReputation call
    const { data: reputationData } = useQuery({
        queryKey: ["users-reputation", userIds],
        queryFn: async () => {
            if (!userIds.length) return {};

            // Call the existing server action
            const results = await Promise.all(
                userIds.map(async (id) => {
                    try {
                        // Using default values for point/negation IDs that don't affect overall reputation
                        const data = await fetchRestakerReputation(0, 0);
                        return { id, reputation: data.aggregateReputation };
                    } catch (error) {
                        console.error("Failed to fetch reputation for user", id, error);
                        return { id, reputation: 50 }; // Default value
                    }
                })
            );

            // Convert to object with user IDs as keys
            return results.reduce((acc, { id, reputation }) => {
                acc[id] = reputation;
                return acc;
            }, {} as Record<string, number>);
        },
        enabled: userIds.length > 0,
    });

    const leaderboardDataWithReputation = useMemo(() => {
        if (!reputationData) return leaderboardData;

        return leaderboardData.map(user => ({
            ...user,
            reputation: reputationData[user.id] || 50,
        }));
    }, [leaderboardData, reputationData]);

    const sortedUsers = [...leaderboardDataWithReputation].sort((a, b) => {
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
            case "viewpoints":
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

    // Find current user's index in the sorted list
    const currentUserIndex = useMemo(() => {
        if (!user || !sortedUsers) return -1;
        return sortedUsers.findIndex(u => u.id === user.id);
    }, [user, sortedUsers]);

    // Get current user's actual rank (index + 1)
    const currentUserRank = currentUserIndex + 1;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl h-[90vh] sm:h-[80vh] flex flex-col">
                <div className="flex flex-col h-full">
                    <DialogHeader className="mb-4">
                        <div className="flex items-center gap-2">
                            <DialogClose asChild>
                                <Button variant="ghost" size="icon" className="text-primary -ml-2">
                                    <ArrowLeftIcon className="size-5" />
                                </Button>
                            </DialogClose>
                            <DialogTitle className="flex items-center gap-2">
                                <TrophyIcon className="size-5" />
                                s/{space} Leaderboard
                            </DialogTitle>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-auto">
                        <div className="space-y-4 mt-4 pb-4">
                            <div className="flex gap-2 flex-wrap">
                                <Button
                                    variant={sortBy === "points" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSortBy("points")}
                                >
                                    Sort by Points
                                </Button>
                                <Button
                                    variant={sortBy === "cred" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSortBy("cred")}
                                >
                                    Sort by Cred
                                </Button>
                                <Button
                                    variant={sortBy === "viewpoints" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSortBy("viewpoints")}
                                >
                                    Sort by Viewpoints
                                </Button>
                                <Button
                                    variant={sortBy === "reputation" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSortBy("reputation")}
                                >
                                    Sort by Reputation
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSortDescending(!sortDescending)}
                                >
                                    {sortDescending ? "Descending" : "Ascending"}
                                </Button>
                            </div>

                            <div className="border rounded-lg overflow-hidden">
                                <div className="overflow-x-auto max-w-full">
                                    <table className="w-full table-fixed">
                                        <thead className="bg-muted/30">
                                            <tr>
                                                <th className="text-left py-3 pl-4 pr-2 sm:py-3 sm:pl-4 sm:pr-2 text-xs sm:text-base w-[10%] sm:w-[8%]">Rank</th>
                                                <th className="text-left py-2 px-1 sm:py-3 sm:px-2 text-xs sm:text-base w-[40%] sm:w-[42%]">User</th>
                                                <th className="text-left py-2 px-1 sm:py-3 sm:px-2 text-xs sm:text-base w-[10%] sm:w-[10%]">Points</th>
                                                <th className="text-left py-2 px-1 sm:py-3 sm:px-2 text-xs sm:text-base w-[15%] sm:w-[15%]">Viewpoints</th>
                                                <th className="text-left py-2 px-1 sm:py-3 sm:px-2 text-xs sm:text-base w-[10%] sm:w-[10%]">Cred</th>
                                                <th className="text-left py-2 pr-3 sm:py-3 sm:pr-6 text-xs sm:text-base w-[15%] sm:w-[15%]">
                                                    <TooltipProvider delayDuration={300}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="flex items-center gap-1 cursor-help">
                                                                    <span className="truncate">Reputation</span>
                                                                    <InfoIcon className="size-3 text-muted-foreground flex-shrink-0" />
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top" sideOffset={5} className="max-w-[200px]">
                                                                <p className="text-xs">
                                                                    Epistemic reputation indicates how likely a user is to
                                                                    admit when they&apos;re wrong by slashing their restakes
                                                                    when faced with convincing counterarguments.
                                                                </p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* Current user row at top */}
                                            {currentUserIndex >= 0 && (
                                                <tr className="bg-muted/30 border-y-2 border-primary/20">
                                                    <td className="py-2 pl-2 pr-1 sm:py-3 sm:pl-4 sm:pr-2 text-xs sm:text-base">{currentUserRank}</td>
                                                    <td className="py-2 px-1 sm:py-3 sm:px-2 font-medium text-xs sm:text-base">
                                                        <div className="flex items-center gap-1 sm:gap-2 max-w-full overflow-hidden">
                                                            <span className="truncate">{sortedUsers[currentUserIndex].username}</span>
                                                            <span className="text-[10px] sm:text-xs text-primary px-1 sm:px-2 py-0.5 sm:py-1 rounded-full bg-primary/10 whitespace-nowrap flex-shrink-0">
                                                                You
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-1 sm:py-3 sm:px-2 text-xs sm:text-base">{sortedUsers[currentUserIndex].points}</td>
                                                    <td className="py-2 px-1 sm:py-3 sm:px-2 text-xs sm:text-base">{sortedUsers[currentUserIndex].viewpoints}</td>
                                                    <td className="py-2 px-1 sm:py-3 sm:px-2 text-xs sm:text-base">{sortedUsers[currentUserIndex].cred}</td>
                                                    <td className="py-2 pr-2 sm:py-3 sm:pr-6 text-xs sm:text-base">{sortedUsers[currentUserIndex].reputation}%</td>
                                                </tr>
                                            )}

                                            {/* Regular leaderboard - showing all users including the current user */}
                                            {sortedUsers.map((user, index) => (
                                                <tr key={user.id} className="border-t">
                                                    <td className="py-2 pl-2 pr-1 sm:py-3 sm:pl-4 sm:pr-2 text-xs sm:text-base">{index + 1}</td>
                                                    <td className="py-2 px-1 sm:py-3 sm:px-2 font-medium text-xs sm:text-base">
                                                        <div className="flex items-center gap-1 sm:gap-2 max-w-full overflow-hidden">
                                                            <span className="truncate">{user.username}</span>
                                                            {user.id === sortedUsers[currentUserIndex]?.id && (
                                                                <span className="text-[10px] sm:text-xs text-primary px-1 sm:px-2 py-0.5 sm:py-1 rounded-full bg-primary/10 whitespace-nowrap flex-shrink-0">
                                                                    You
                                                                </span>
                                                            )}
                                                            {user.delegationUrl && (
                                                                <TooltipProvider delayDuration={300}>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <a
                                                                                href={user.delegationUrl}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="text-primary hover:text-primary/80 flex-shrink-0"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                <HeartIcon className="size-4 fill-primary/30" />
                                                                            </a>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top" sideOffset={5}>
                                                                            <p className="text-xs">Delegate to this user</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-1 sm:py-3 sm:px-2 text-xs sm:text-base">{user.points}</td>
                                                    <td className="py-2 px-1 sm:py-3 sm:px-2 text-xs sm:text-base">{user.viewpoints}</td>
                                                    <td className="py-2 px-1 sm:py-3 sm:px-2 text-xs sm:text-base">{user.cred}</td>
                                                    <td className="py-2 pr-2 sm:py-3 sm:pr-6 text-xs sm:text-base">{user.reputation}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}; 