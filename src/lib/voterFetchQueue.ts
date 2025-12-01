import type { VoterData } from "@/types/voters";

type PendingRequest = {
  ids: string[];
  resolve: (voters: VoterData[]) => void;
  reject: (error: unknown) => void;
};

let pendingIds = new Set<string>();
let pendingRequests: PendingRequest[] = [];
let flushPromise: Promise<void> | null = null;

const flushQueue = async (
  fetcher: (userIds: string[]) => Promise<VoterData[]>
): Promise<void> => {
  const idsToFetch = Array.from(pendingIds);
  const requests = pendingRequests;

  pendingIds = new Set();
  pendingRequests = [];
  flushPromise = null;

  if (idsToFetch.length === 0) {
    requests.forEach((req) => req.resolve([]));
    return;
  }

  try {
    const voters = await fetcher(idsToFetch);
    const voterMap = new Map(voters.map((voter) => [voter.id, voter]));

    requests.forEach((req) => {
      const result: VoterData[] = [];
      req.ids.forEach((id) => {
        const match = voterMap.get(id);
        if (match) {
          result.push(match);
        }
      });
      req.resolve(result);
    });
  } catch (error) {
    requests.forEach((req) => req.reject(error));
  }
};

export function queueVoterFetch(
  userIds: string[],
  fetcher: (userIds: string[]) => Promise<VoterData[]>
): Promise<VoterData[]> {
  const ids = Array.from(new Set(userIds.filter((id) => typeof id === "string" && id.trim())));

  if (ids.length === 0) {
    return Promise.resolve([]);
  }

  return new Promise((resolve, reject) => {
    ids.forEach((id) => pendingIds.add(id));
    pendingRequests.push({ ids, resolve, reject });

    if (!flushPromise) {
      flushPromise = Promise.resolve().then(() => flushQueue(fetcher));
    }
  });
}
