import type { VoterData } from "@/types/voters";

const CACHE_DURATION = 60 * 1000; // 1 minute

interface CacheEntry {
  data: VoterData;
  expires: number;
}

class VoterCache {
  private cache: Map<string, CacheEntry> = new Map();

  get(userId: string): VoterData | null {
    const entry = this.cache.get(userId);
    if (!entry) return null;

    if (entry.expires < Date.now()) {
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      this.cache.delete(userId);
      return null;
    }

    return entry.data;
  }

  invalidate(userId: string): void {
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    this.cache.delete(userId);
  }

  set(userId: string, data: VoterData): void {
    this.cache.set(userId, {
      data,
      expires: Date.now() + CACHE_DURATION,
    });
  }

  setMany(voters: VoterData[]): void {
    const expires = Date.now() + CACHE_DURATION;
    voters.forEach((voter) => {
      this.cache.set(voter.id, { data: voter, expires });
    });
  }

  getMany(userIds: string[]): { cached: VoterData[]; missing: string[] } {
    const cached: VoterData[] = [];
    const missing: string[] = [];

    userIds.forEach((id) => {
      const data = this.get(id);
      if (data) {
        cached.push(data);
      } else {
        missing.push(id);
      }
    });

    return { cached, missing };
  }

  clear(): void {
    this.cache.clear();
  }
}

export const voterCache = new VoterCache();
