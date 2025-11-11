/**
 * Server-side in-memory cache for market data
 * Reduces expensive market maker recreations and price calculations
 */

import { MarketView } from "@/actions/market/getMarketView";
import { ReconciledMarket } from "@/actions/market/reconcileTradableSecurities";

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

const DEFAULT_TTL_MS = 30000; // 30 seconds
const MAX_CACHE_SIZE = 1000;

class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private ttl: number;
  private maxSize: number;

  constructor(ttl: number = DEFAULT_TTL_MS, maxSize: number = MAX_CACHE_SIZE) {
    this.ttl = ttl;
    this.maxSize = maxSize;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      this.cache.delete(key);
      return null;
    }

    // Move to end (LRU)
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  set(key: string, data: T): void {
    // Remove if exists (to update position)
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    this.cache.delete(key);

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, { data, timestamp: Date.now() });
  }

  invalidate(key: string): void {
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    this.cache.delete(key);
  }

  invalidatePattern(pattern: RegExp): void {
    for (const key of Array.from(this.cache.keys())) {
      if (pattern.test(key)) {
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Market view cache: keyed by docId:userId
const marketViewCache = new LRUCache<MarketView>(30000); // 30s TTL

// Structure cache: keyed by docId, longer TTL since structure changes less frequently
const structureCache = new LRUCache<ReconciledMarket>(60000); // 60s TTL

export const marketCache = {
  // Market View methods
  getMarketView(docId: string, userId?: string): MarketView | null {
    const key = `${docId}:${userId || "anon"}`;
    return marketViewCache.get(key);
  },

  setMarketView(docId: string, userId: string | undefined, view: MarketView): void {
    const key = `${docId}:${userId || "anon"}`;
    marketViewCache.set(key, view);
  },

  invalidateMarketView(docId: string, userId?: string): void {
    if (userId) {
      marketViewCache.invalidate(`${docId}:${userId}`);
    } else {
      // Invalidate all views for this doc
      marketViewCache.invalidatePattern(new RegExp(`^${docId}:`));
    }
  },

  // Structure methods
  getStructure(docId: string): ReconciledMarket | null {
    return structureCache.get(docId);
  },

  setStructure(docId: string, structure: ReconciledMarket): void {
    structureCache.set(docId, structure);
  },

  invalidateStructure(docId: string): void {
    structureCache.invalidate(docId);
    // Also invalidate all market views for this doc since they depend on structure
    marketViewCache.invalidatePattern(new RegExp(`^${docId}:`));
  },

  // Clear all caches
  clear(): void {
    marketViewCache.clear();
    structureCache.clear();
  },

  // Stats for debugging
  stats() {
    return {
      marketViews: marketViewCache.size(),
      structures: structureCache.size(),
    };
  },
};
