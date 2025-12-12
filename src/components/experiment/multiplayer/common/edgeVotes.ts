import { EdgeType } from "./EdgeConfiguration";

type VoteInput = string | { id?: string; userId?: string };

const normalizeVoteId = (vote: VoteInput | null | undefined) => {
  if (!vote) return "";
  if (typeof vote === "string") return vote;
  return vote.id || vote.userId || "";
};

export const normalizeVoteIds = (votes?: VoteInput[]) => {
  if (!Array.isArray(votes)) return [] as string[];
  const out: string[] = [];
  for (const v of votes) {
    const id = normalizeVoteId(v);
    if (id) out.push(id);
  }
  return out;
};

const mergeVoteIds = (primary: string[], secondary: string[]) => {
  if (secondary.length === 0) return primary;
  const merged = [...primary];
  for (const id of secondary) {
    if (!merged.includes(id)) merged.push(id);
  }
  return merged;
};

export const getTargetVoteIds = ({
  edgeType,
  targetVotes,
  parentEdgeVotes,
}: {
  edgeType: EdgeType;
  targetVotes?: VoteInput[];
  parentEdgeVotes?: VoteInput[];
}) => {
  const normalizedTargetVotes = normalizeVoteIds(targetVotes);
  if (edgeType !== "objection") return normalizedTargetVotes;
  const normalizedParentVotes = normalizeVoteIds(parentEdgeVotes);
  if (normalizedParentVotes.length === 0) return normalizedTargetVotes;
  return mergeVoteIds(normalizedTargetVotes, normalizedParentVotes);
};
