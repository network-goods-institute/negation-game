import { useMemo } from 'react';

interface UseVoteVisualsProps {
  votes: Array<string | { id: string; name?: string; avatarUrl?: string }>;
  currentUserId?: string;
}

export const useVoteVisuals = ({ votes, currentUserId }: UseVoteVisualsProps) => {
  const effectiveUserId = currentUserId || '';

  const { hasMyVote, othersVotes, hasOthersVotes } = useMemo(() => {
    const normalizedVotes = votes.map((v) => typeof v === 'string' ? v : v.id);
    const hasMyVote = effectiveUserId && normalizedVotes.includes(effectiveUserId);
    const othersVotes = effectiveUserId
      ? normalizedVotes.filter((voterId) => voterId !== effectiveUserId)
      : normalizedVotes;
    const hasOthersVotes = othersVotes.length > 0;

    return { hasMyVote, othersVotes, hasOthersVotes };
  }, [votes, effectiveUserId]);

  const glowOpacity = Math.min(0.5, 0.2 + othersVotes.length * 0.1);

  return {
    hasMyVote,
    othersVotes,
    hasOthersVotes,
    glowOpacity,
  };
};
