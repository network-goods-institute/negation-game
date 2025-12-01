"use client";

import React, { useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthSetup } from "@/hooks/experiment/multiplayer/useAuthSetup";
import { logger } from "@/lib/logger";
import { voterCache } from "@/lib/voterCache";
import { queueVoterFetch } from "@/lib/voterFetchQueue";
import type { VoterData } from "@/types/voters";
import { ThumbsUpIcon } from "./ThumbsUpIcon";

interface NodeVotingProps {
  nodeId: string;
  votes?: Array<string | { id: string; name?: string; avatarUrl?: string }>;
  onToggleVote?: (nodeId: string, userId: string, username?: string) => void;
  variant?: "blue" | "orange";
}

const getInitials = (name: string | undefined, id: string): string => {
  if (name && name.trim()) {
    return name.slice(0, 2).toUpperCase();
  }
  return id.slice(0, 2).toUpperCase();
};

const fetchVotersFromApi = async (userIds: string[]): Promise<VoterData[]> => {
  if (userIds.length === 0) return [];

  const response = await fetch("/api/users/voters", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userIds }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch voters (${response.status})`);
  }

  const data = (await response.json()) as { voters?: unknown };
  if (!data || !Array.isArray((data as { voters?: unknown }).voters)) {
    return [];
  }

  return (data as { voters: VoterData[] }).voters;
};

const VoterAvatar: React.FC<{
  voter: { id: string; username?: string; avatarUrl?: string | null };
  isCurrentUser?: boolean;
  isLoading?: boolean;
}> = ({ voter, isCurrentUser = false, isLoading = false }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const displayName = isCurrentUser ? "You" : (voter.username || "Anonymous user");
  const hasAvatar = voter.avatarUrl && !imageError;

  // If we're still loading voter data, show skeleton
  if (isLoading) {
    return (
      <div className="relative">
        <div className="h-8 w-8 rounded-full border-2 border-white dark:border-stone-800 shadow-sm bg-stone-200 dark:bg-stone-700 animate-pulse" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <Avatar className="h-8 w-8 border-2 border-white dark:border-stone-800 shadow-sm cursor-pointer transition-transform hover:scale-110">
              {hasAvatar && (
                <AvatarImage
                  src={voter.avatarUrl!}
                  alt={displayName}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                  className={imageLoaded ? "opacity-100" : "opacity-0"}
                />
              )}
              {/* Only show fallback if we know there's no avatar OR image failed to load */}
              {(!hasAvatar || (hasAvatar && !imageLoaded)) && (
                <AvatarFallback
                  className={`text-xs font-semibold bg-gradient-to-br from-blue-400 to-blue-600 text-white ${hasAvatar && !imageLoaded ? "opacity-0" : "opacity-100"
                    }`}
                >
                  {getInitials(voter.username, voter.id)}
                </AvatarFallback>
              )}
            </Avatar>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {displayName}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const NodeVoting: React.FC<NodeVotingProps> = ({
  nodeId,
  votes = [],
  onToggleVote,
  variant = "blue",
}) => {
  const { userId, username } = useAuthSetup();
  const [voterData, setVoterData] = useState<Map<string, VoterData>>(new Map());
  const [loading, setLoading] = useState(false);

  const normalizedVotes = React.useMemo(
    () =>
      votes.map((entry) =>
        typeof entry === "string"
          ? { id: entry, name: undefined, avatarUrl: undefined }
          : { id: entry.id, name: entry.name, avatarUrl: entry.avatarUrl }
      ),
    [votes]
  );

  const voted = normalizedVotes.some((v) => v.id === userId);
  const voteCount = normalizedVotes.length;

  useEffect(() => {
    const voterIds = normalizedVotes.map((v) => v.id);
    if (voterIds.length === 0) {
      setVoterData(new Map());
      return;
    }

    const { cached, missing } = voterCache.getMany(voterIds);

    const dataMap = new Map<string, VoterData>();
    cached.forEach((voter) => {
      dataMap.set(voter.id, voter);
    });
    setVoterData(dataMap);

    if (missing.length > 0) {
      let mounted = true;
      setLoading(true);

      queueVoterFetch(missing, fetchVotersFromApi)
        .then((voters) => {
          if (!mounted) return;

          voterCache.setMany(voters);

          const updatedMap = new Map(dataMap);
          voters.forEach((voter) => {
            updatedMap.set(voter.id, voter);
          });
          setVoterData(updatedMap);
        })
        .catch((error) => {
          if (!mounted) return;
          logger.error("Failed to fetch voter data:", error);
        })
        .finally(() => {
          if (!mounted) return;
          setLoading(false);
        });

      return () => {
        mounted = false;
      };
    }
  }, [normalizedVotes]);

  const enrichedVoters = React.useMemo(() => {
    return normalizedVotes.map((vote) => {
      const fetchedData = voterData.get(vote.id);
      const hasData = voterData.has(vote.id);

      return {
        id: vote.id,
        username: fetchedData?.username || vote.name,
        avatarUrl: fetchedData?.avatarUrl || vote.avatarUrl,
        isLoading: !hasData && loading,
      };
    });
  }, [normalizedVotes, voterData, loading]);

  const visibleAvatars = enrichedVoters.slice(0, 4);
  const remainingCount = Math.max(0, voteCount - 4);

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    if (!userId) return;
    onToggleVote?.(nodeId, userId, username);
  };

  const buttonVotedClasses =
    "bg-blue-500 text-white border-blue-600 hover:bg-blue-600 shadow-sm";

  const buttonIdleClasses =
    variant === "orange"
      ? "bg-white dark:bg-stone-900 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/40"
      : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-800";

  const namesForTooltip = React.useMemo(() => {
    const names = enrichedVoters.map((v) => {
      if (v.id === userId) return "You";
      if (v.username && v.username.trim()) return v.username;
      return `User ${v.id.slice(0, 6)}`;
    });
    return names;
  }, [enrichedVoters, userId]);

  const tooltipContent = React.useMemo(() => {
    if (voteCount === 0) return "No upvotes yet. Click to upvote.";

    const list = namesForTooltip.join(", ");
    return (
      <div className="space-y-1">
        <div className="font-medium">
          {voteCount} {voteCount === 1 ? "person upvoted" : "people upvoted"} this
        </div>
        <div className="text-stone-400 dark:text-stone-500 text-[11px]">
          {list}
        </div>
      </div>
    );
  }, [namesForTooltip, voteCount]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-3 pointer-events-auto">
            <button
              type="button"
              className={`inline-flex items-center justify-center h-10 w-10 rounded-full transition-all border-2 relative z-[60] ${voted ? buttonVotedClasses : buttonIdleClasses
                }`}
              onClick={handleClick}
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              data-interactive="true"
              aria-label={voted ? "Remove upvote" : "Upvote"}
              aria-pressed={voted}
            >
              <ThumbsUpIcon className="w-5 h-5" filled={false} />
            </button>
            {voteCount > 0 && (
              <div className="inline-flex items-center gap-1.5">
                <div className="flex -space-x-2">
                  {visibleAvatars.map((voter) => (
                    <VoterAvatar
                      key={voter.id}
                      voter={voter}
                      isCurrentUser={voter.id === userId}
                      isLoading={voter.isLoading}
                    />
                  ))}
                </div>
                {remainingCount > 0 && (
                  <div className="ml-1 text-sm text-stone-600 dark:text-stone-400 font-medium">
                    +{remainingCount}
                  </div>
                )}
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default NodeVoting;
