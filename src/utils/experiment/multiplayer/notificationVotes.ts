export type NotificationVoteInput =
  | string
  | {
      id?: string | null;
      userId?: string | null;
      name?: string | null;
      username?: string | null;
    };

export type NormalizedNotificationVote = {
  id: string;
  name?: string;
};

export const normalizeNotificationVotes = (
  votes?: NotificationVoteInput[]
): NormalizedNotificationVote[] => {
  if (!Array.isArray(votes)) return [];
  return votes
    .map((vote) => {
      if (!vote) return null;
      if (typeof vote === "string") {
        return vote.trim() ? { id: vote.trim() } : null;
      }
      const id = vote.id || vote.userId || "";
      if (!id) return null;
      const rawName = vote.name || vote.username || "";
      const name = rawName ? rawName.trim() : undefined;
      return { id, name };
    })
    .filter((vote): vote is NormalizedNotificationVote => Boolean(vote));
};
