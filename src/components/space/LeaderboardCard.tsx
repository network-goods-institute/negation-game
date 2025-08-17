"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFeed } from "@/queries/feed/useFeed";
import { useAllUsers } from "@/queries/users/useAllUsers";
import { fetchSpaceViewpoints } from "@/actions/viewpoints/fetchSpaceViewpoints";
import { fetchUsersReputation } from "@/actions/users/fetchUsersReputation";
import { TrophyIcon, ChevronRightIcon } from "lucide-react";
import { useMemo } from "react";
import { useUser } from "@/queries/users/useUser";
import { cn } from "@/lib/utils/cn";
import { UsernameDisplay } from "@/components/ui/UsernameDisplay";
import { LeaderboardDialog } from "@/components/dialogs/LeaderboardDialog";

interface LeaderboardCardProps {
  space: string;
}

export function LeaderboardCard({ space }: LeaderboardCardProps) {
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const { data: feed } = useFeed();
  const { data: allUsers } = useAllUsers();
  const { data: spaceViewpoints } = useQuery({
    queryKey: ["spaceRationales", space],
    queryFn: () => fetchSpaceViewpoints(space),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const { data: currentUser } = useUser();

  const leaderboardData = useMemo(() => {
    if (!feed || !allUsers || !spaceViewpoints) return [];

    // Count points per user in this space
    const pointsCount = Array.isArray(feed)
      ? feed.reduce((acc: Record<string, number>, point: any) => {
        if (point.space === space) {
          acc[point.createdBy] = (acc[point.createdBy] || 0) + 1;
        }
        return acc;
      }, {})
      : {};

    // Calculate viewpoints count
    const viewpointsCount = spaceViewpoints.reduce((acc, viewpoint) => {
      acc[viewpoint.createdBy] = (acc[viewpoint.createdBy] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Merge with user data
    return allUsers.map(user => ({
      ...user,
      points: pointsCount[user.id] || 0,
      viewpoints: viewpointsCount[user.id] || 0,
    }));
  }, [feed, allUsers, spaceViewpoints, space]);

  const userIds = useMemo(() => {
    return leaderboardData.map(user => user.id);
  }, [leaderboardData]);

  // Fetch reputation data
  const { data: reputationData, isLoading: isReputationLoading } = useQuery({
    queryKey: ["users-reputation", userIds],
    queryFn: async () => {
      if (!userIds.length) return {};
      return await fetchUsersReputation(userIds);
    },
    enabled: userIds.length > 0,
    staleTime: 60 * 1000,
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

  // Sort by rationales (default)
  const topUsers = useMemo(() => {
    if (!leaderboardDataWithReputation?.length) return [];

    return [...leaderboardDataWithReputation]
      .sort((a, b) => (b.viewpoints || 0) - (a.viewpoints || 0))
      .slice(0, 5); // Show top 5 users
  }, [leaderboardDataWithReputation]);

  const currentUserData = useMemo(() => {
    if (!currentUser || !leaderboardDataWithReputation?.length) return null;
    return leaderboardDataWithReputation.find(u => u.id === currentUser.id);
  }, [currentUser, leaderboardDataWithReputation]);

  const currentUserRank = useMemo(() => {
    if (!currentUser || !leaderboardDataWithReputation?.length) return 0;
    const sorted = [...leaderboardDataWithReputation].sort(
      (a, b) => (b.viewpoints || 0) - (a.viewpoints || 0)
    );
    return sorted.findIndex(u => u.id === currentUser.id) + 1;
  }, [currentUser, leaderboardDataWithReputation]);

  const totalContributors = useMemo(() => {
    if (!leaderboardDataWithReputation?.length) return 0;
    return leaderboardDataWithReputation.filter(user =>
      (user.viewpoints || 0) > 0 || (user.points || 0) > 0
    ).length + 1;
  }, [leaderboardDataWithReputation]);

  const isLoading = !feed || !allUsers || !spaceViewpoints || isReputationLoading;

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card/50 backdrop-blur p-4">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-3 w-16 bg-muted rounded animate-pulse" />
        </div>

        {/* User list skeleton */}
        <div className="space-y-2">
          {[...Array(5)].map((_, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-1 px-2 rounded-md"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
                <div>
                  <div className="h-4 w-24 bg-muted rounded animate-pulse mb-1" />
                  <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer skeleton */}
        <div className="mt-3 pt-3 border-t">
          <div className="h-4 w-full bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card/50 backdrop-blur p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrophyIcon className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Top Contributors</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {totalContributors} total
        </span>
      </div>

      <div className="space-y-2">
        {topUsers.map((user, index) => (
          <div
            key={user.id}
            className={cn(
              "flex items-center justify-between py-1 px-2 rounded-md",
              user.id === currentUser?.id && "bg-primary/5"
            )}
          >
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium">
                {index + 1}
              </div>
              <div>
                <UsernameDisplay
                  username={user.username}
                  userId={user.id}
                  className="text-sm font-medium"
                />
                <div className="text-xs text-muted-foreground">
                  {user.viewpoints} rationales · {user.cred} cred
                </div>
              </div>
            </div>
            {user.id === currentUser?.id && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                You
              </span>
            )}
          </div>
        ))}
      </div>

      {currentUserData && currentUserRank > 5 && (
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center justify-between py-2 px-2 rounded-md bg-primary/5">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-xs font-medium">
                {currentUserRank}
              </div>
              <div>
                <UsernameDisplay
                  username={currentUserData.username}
                  userId={currentUserData.id}
                  className="text-sm font-medium"
                />
                <div className="text-xs text-muted-foreground">
                  {currentUserData.viewpoints} rationales · {currentUserData.cred} cred
                </div>
              </div>
            </div>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
              You
            </span>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsLeaderboardOpen(true)}
        className="w-full flex items-center justify-center gap-2 mt-3 pt-3 border-t text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        View Full Leaderboard
        <ChevronRightIcon className="size-3" />
      </button>

      <LeaderboardDialog
        open={isLeaderboardOpen}
        onOpenChange={setIsLeaderboardOpen}
        space={space}
      />
    </div>
  );
}