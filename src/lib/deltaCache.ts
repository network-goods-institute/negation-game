/**
 * Delta computation caching layer
 * Caches computed delta results to avoid expensive recomputation
 */

export interface CachedDeltaResult {
  delta: number | null;
  noInteraction: boolean;
  noEngagementBy?: "A" | "B" | "both";
  cachedAt: number; // timestamp
  ttl: number; // time to live in milliseconds
}

export interface DeltaCacheKey {
  userAId: string;
  userBId: string;
  rootPointId?: number;
  rationaleId?: string;
  topicId?: number;
  snapDay: string;
}

class DeltaCache {
  private cache = new Map<string, CachedDeltaResult>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  private generateKey(key: DeltaCacheKey): string {
    const parts = [key.userAId, key.userBId, key.snapDay];

    if (key.rootPointId) parts.push(`root:${key.rootPointId}`);
    if (key.rationaleId) parts.push(`rationale:${key.rationaleId}`);
    if (key.topicId) parts.push(`topic:${key.topicId}`);

    return parts.join("|");
  }

  get(key: DeltaCacheKey): CachedDeltaResult | null {
    const cacheKey = this.generateKey(key);
    const cached = this.cache.get(cacheKey);

    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now > cached.cachedAt + cached.ttl) {
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      this.cache.delete(cacheKey);
      return null;
    }

    return cached;
  }

  set(
    key: DeltaCacheKey,
    result: Omit<CachedDeltaResult, "cachedAt" | "ttl">,
    ttl?: number
  ): void {
    const cacheKey = this.generateKey(key);
    const cached: CachedDeltaResult = {
      ...result,
      cachedAt: Date.now(),
      ttl: ttl || this.defaultTTL,
    };

    this.cache.set(cacheKey, cached);
  }

  invalidate(key: DeltaCacheKey): void {
    const cacheKey = this.generateKey(key);
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    this.cache.delete(cacheKey);
  }

  invalidateUserPair(userAId: string, userBId: string, snapDay: string): void {
    const prefix = `${userAId}|${userBId}|${snapDay}|`;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        this.cache.delete(key);
      }
    }
  }

  cleanup(): number {
    const now = Date.now();
    let cleared = 0;

    for (const [key, cached] of this.cache.entries()) {
      if (now > cached.cachedAt + cached.ttl) {
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        this.cache.delete(key);
        cleared++;
      }
    }

    return cleared;
  }

  getStats() {
    const now = Date.now();
    let expired = 0;
    let valid = 0;

    for (const cached of this.cache.values()) {
      if (now > cached.cachedAt + cached.ttl) {
        expired++;
      } else {
        valid++;
      }
    }

    return {
      total: this.cache.size,
      valid,
      expired,
    };
  }

  clear(): void {
    this.cache.clear();
  }
}

export const deltaCache = new DeltaCache();
export function getCachedDelta(key: DeltaCacheKey): CachedDeltaResult | null {
  return deltaCache.get(key);
}

export function setCachedDelta(
  key: DeltaCacheKey,
  result: {
    delta: number | null;
    noInteraction: boolean;
    noEngagementBy?: "A" | "B" | "both";
  },
  ttl?: number
): void {
  deltaCache.set(key, result, ttl);
}

export function invalidateDeltaCache(key: DeltaCacheKey): void {
  deltaCache.invalidate(key);
}

export function invalidateUserPairCache(
  userAId: string,
  userBId: string,
  snapDay: string
): void {
  deltaCache.invalidateUserPair(userAId, userBId, snapDay);
}

export function cleanupDeltaCache(): number {
  return deltaCache.cleanup();
}

export function getDeltaCacheStats() {
  return deltaCache.getStats();
}
