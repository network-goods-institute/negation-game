/**
 * Comprehensive caching and loading strategy for rationale pages
 * Eliminates waterfall loading and coordinates all data dependencies
 */

export const RATIONALE_CACHE_CONFIG = {
  // Core data that changes infrequently
  POINTS: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  },

  // User data that rarely changes
  USERS: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  },

  // Endorsement data that changes more frequently
  ENDORSEMENTS: {
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  },

  // Favor history for charts
  FAVOR_HISTORY: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  },

  // Viewpoint data
  VIEWPOINTS: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  },
} as const;

export const LOADING_PRIORITIES = {
  // Critical path - blocks initial render
  CRITICAL: 1,

  // Important - needed for full functionality
  IMPORTANT: 2,

  // Enhancement - improves experience but not required
  ENHANCEMENT: 3,
} as const;

/**
 * Loading phases for progressive enhancement
 */
export const LOADING_PHASES = {
  // Phase 1: Show page structure and basic content (0-300ms target)
  STRUCTURE: "structure",

  // Phase 2: Show point cards with basic data (300-800ms target)
  CONTENT: "content",

  // Phase 3: Show enhanced features like gold badges (800-1200ms target)
  ENHANCEMENT: "enhancement",

  // Phase 4: Show detailed interactions and charts (1200ms+ target)
  DETAILS: "details",
} as const;

/**
 * Query key factories for consistent caching
 */
export const QUERY_KEYS = {
  rationalePoints: (pointIds: number[]) =>
    ["rationale-points-batch", pointIds.sort()] as const,

  rationaleUsers: (userIds: string[]) =>
    ["rationale-users-batch", userIds.sort()] as const,

  rationaleOpEndorsements: (pointIds: number[], originalPosterId?: string) =>
    ["rationale-op-endorsements", pointIds.sort(), originalPosterId] as const,
  
  // Individual point endorsement for stable caching
  pointOpEndorsement: (pointId: number, originalPosterId?: string) =>
    ["point-op-endorsement", pointId, originalPosterId] as const,

  rationaleEndorsementBreakdowns: (pointIds: number[]) =>
    ["rationale-endorsement-breakdowns", pointIds.sort()] as const,

  viewpoint: (id: string) => ["viewpoint", id] as const,

  favorHistory: (pointId: number, timelineScale: string) =>
    ["favor-history", pointId, timelineScale] as const,
} as const;

/**
 * Prefetch strategy for related data
 */
export class RationaleLoadingCoordinator {
  private static instance: RationaleLoadingCoordinator;
  private loadingPhases = new Map<string, string>();

  static getInstance(): RationaleLoadingCoordinator {
    if (!this.instance) {
      this.instance = new RationaleLoadingCoordinator();
    }
    return this.instance;
  }

  setPhase(rationaleId: string, phase: string): void {
    this.loadingPhases.set(rationaleId, phase);
  }

  getPhase(rationaleId: string): string {
    return this.loadingPhases.get(rationaleId) || LOADING_PHASES.STRUCTURE;
  }

  clearPhase(rationaleId: string): void {
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    this.loadingPhases.delete(rationaleId);
  }
}

/**
 * Performance monitoring for loading optimization
 */
export function trackLoadingPerformance(
  rationaleId: string,
  phase: string,
  duration: number
): void {
  if (typeof window !== "undefined" && window.performance) {
    // Mark performance milestones
    window.performance.mark(`rationale-${rationaleId}-${phase}-${duration}ms`);

    // Log slow loading phases in development
    if (process.env.NODE_ENV === "development" && duration > 1000) {
      console.warn(
        `Slow loading in rationale ${rationaleId} phase ${phase}: ${duration}ms`
      );
    }
  }
}
