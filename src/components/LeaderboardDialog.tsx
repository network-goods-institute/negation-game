"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFeed } from "@/queries/useFeed";
import { useAllUsers } from "@/queries/useAllUsers";
import { TrophyIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useUser } from "@/queries/useUser";

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
    const { data: user } = useUser();
    const [sortBy, setSortBy] = useState<"points" | "cred">("points");
    const [sortDescending, setSortDescending] = useState(true);

    const leaderboardData = useMemo(() => {
        if (!feed || !allUsers) return [];

        // Count points per user in this space
        const pointsCount = feed.reduce((acc, point) => {
            if (point.space === space) {
                acc[point.createdBy] = (acc[point.createdBy] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        // Merge with user data - include all users
        return allUsers.map(user => ({
            ...user,
            points: pointsCount[user.id] || 0
        }));

    }, [feed, allUsers, space]);

    const sortedUsers = [...leaderboardData].sort((a, b) => {
        const valueA = (sortBy === "points" ? a.points : a.cred) || 0;
        const valueB = (sortBy === "points" ? b.points : b.cred) || 0;
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
                        <DialogTitle className="flex items-center gap-2">
                            <TrophyIcon className="size-5" />
                            s/{space} Leaderboard
                        </DialogTitle>
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
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSortDescending(!sortDescending)}
                                >
                                    {sortDescending ? "Descending" : "Ascending"}
                                </Button>
                            </div>

                            <div className="border rounded-lg overflow-auto">
                                <table className="w-full">
                                    <thead className="bg-muted/30">
                                        <tr>
                                            <th className="text-left py-3 pl-4 pr-2">Rank</th>
                                            <th className="text-left py-3 px-2">User</th>
                                            <th className="text-left py-3 px-2">Points</th>
                                            <th className="text-left py-3 pr-6">Cred</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Current user row at top */}
                                        {currentUserIndex >= 0 && (
                                            <tr className="bg-muted/30 border-y-2 border-primary/20">
                                                <td className="py-3 pl-4 pr-2">{currentUserRank}</td>
                                                <td className="py-3 px-2 font-medium flex items-center gap-2">
                                                    {sortedUsers[currentUserIndex].username}
                                                    <span className="text-xs text-primary px-2 py-1 rounded-full bg-primary/10">
                                                        You
                                                    </span>
                                                </td>
                                                <td className="py-3 px-2">{sortedUsers[currentUserIndex].points}</td>
                                                <td className="py-3 pr-6">{sortedUsers[currentUserIndex].cred}</td>
                                            </tr>
                                        )}

                                        {/* Regular leaderboard */}
                                        {sortedUsers.map((user, index) => (
                                            <tr key={user.id} className="border-t">
                                                <td className="py-3 pl-4 pr-2">{index + 1}</td>
                                                <td className="py-3 px-2 font-medium">
                                                    {user.id === sortedUsers[currentUserIndex]?.id ? (
                                                        <span className="flex items-center gap-2">
                                                            {user.username}
                                                            <span className="text-xs text-primary px-2 py-1 rounded-full bg-primary/10">
                                                                You
                                                            </span>
                                                        </span>
                                                    ) : (
                                                        user.username
                                                    )}
                                                </td>
                                                <td className="py-3 px-2">{user.points}</td>
                                                <td className="py-3 pr-6">{user.cred}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}; 