"use client";

import React from "react";
import { ThumbsUp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuthSetup } from "@/hooks/experiment/multiplayer/useAuthSetup";

interface NodeVotingProps {
  nodeId: string;
  votes?: Array<string | { id: string; name?: string }>;
  onToggleVote?: (nodeId: string, userId: string, username?: string) => void;
  variant?: "blue" | "orange";
}

export const NodeVoting: React.FC<NodeVotingProps> = ({
  nodeId,
  votes = [],
  onToggleVote,
  variant = "blue",
}) => {
  const { userId, username } = useAuthSetup();

  const normalizedVotes = React.useMemo(
    () =>
      votes.map((entry) =>
        typeof entry === "string" ? { id: entry, name: undefined } : entry
      ),
    [votes]
  );

  const voted = normalizedVotes.some((v) => v.id === userId);
  const voteCount = normalizedVotes.length;

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    if (!userId) return;
    onToggleVote?.(nodeId, userId, username);
  };

  const votedClasses = "bg-blue-500 text-white border-blue-600 hover:bg-blue-600";

  const idleClasses =
    variant === "orange"
      ? "bg-white dark:bg-stone-900 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/40"
      : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-800";

  const namesForTooltip = React.useMemo(() => {
    const names = normalizedVotes.map((v) => {
      if (v.id === userId) return "You";
      if (v.name && v.name.trim()) return v.name;
      return `User ${v.id.slice(0, 6)}`;
    });
    return names;
  }, [normalizedVotes, userId]);

  const tooltipContent = React.useMemo(() => {
    if (voteCount === 0) return "No likes yet. Click to like.";
    const others = voted ? voteCount - 1 : voteCount;
    const base =
      voted && others > 0
        ? `You and ${others} ${others === 1 ? "other" : "others"} liked this`
        : voted
        ? "You liked this"
        : `${voteCount} ${voteCount === 1 ? "person" : "people"} like this`;

    const list =
      namesForTooltip.length > 0
        ? `Liked by ${namesForTooltip.slice(0, 5).join(", ")}${
            namesForTooltip.length > 5
              ? `, +${namesForTooltip.length - 5} more`
              : ""
          }`
        : undefined;

    return list ? `${base}. ${list}.` : base;
  }, [namesForTooltip, voteCount, voted]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors border pointer-events-auto relative z-[60] min-w-[110px] justify-center ${
              voted ? votedClasses : idleClasses
            }`}
            onClick={handleClick}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            data-interactive="true"
            aria-label={voted ? "Unlike" : "Like"}
            aria-pressed={voted}
          >
            <ThumbsUp className={`w-4 h-4 ${voted ? "fill-current" : ""}`} />
            <span className="w-6 text-center tabular-nums">{voteCount}</span>
            <span className="text-xs font-medium">{voted ? "Liked" : "Like"}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default NodeVoting;
