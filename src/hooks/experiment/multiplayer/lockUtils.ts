// Constants for multiplayer lock management
export const LOCK_TTL_MS = 9000;
export const LOCK_RENEWAL_INTERVAL = 3000;
export const ACTIVITY_CLEANUP_THRESHOLD = 60000;
export const RECENT_ACTIVITY_THRESHOLD = 15000;

// Lock resolution utility function
export type LockInfo = {
  nodeId: string;
  byId: string;
  name: string;
  color: string;
  kind: "edit" | "drag";
  ts: number;
  sessionId?: string;
  tabId?: string;
};

export interface LockResolutionResult {
  shouldReplace: boolean;
  lockInfo: LockInfo;
}

/**
 * Resolves conflicts between existing and incoming locks
 * @param existing - Existing lock info
 * @param incoming - Incoming lock info
 * @param localTabId - Current tab's ID
 * @param localSessionId - Current session's ID
 * @returns Resolution result indicating whether to replace the existing lock
 */
export const resolveLockConflict = (
  existing: LockInfo,
  incoming: LockInfo,
  localTabId: string,
  localSessionId: string
): LockResolutionResult => {
  const existingIsLocalTab = existing.tabId === localTabId;
  const incomingIsLocalTab = incoming.tabId === localTabId;
  const existingIsLocalUser = existing.sessionId === localSessionId;
  const incomingIsLocalUser = incoming.sessionId === localSessionId;

  if (existingIsLocalTab && incomingIsLocalTab) {
    // Same tab -> refresh fields with most recent data
    return {
      shouldReplace: true,
      lockInfo: {
        ...existing,
        ts: Math.max(existing.ts, incoming.ts),
        kind: incoming.kind || existing.kind,
      },
    };
  } else if (existingIsLocalUser && !incomingIsLocalUser) {
    // Prefer other users' locks over our own other tabs
    return {
      shouldReplace: true,
      lockInfo: incoming,
    };
  } else if (!existingIsLocalUser && incomingIsLocalUser) {
    // Keep other users' locks, ignore our own other tabs
    return {
      shouldReplace: false,
      lockInfo: existing,
    };
  } else if (existingIsLocalTab && !incomingIsLocalTab) {
    // Prefer our own active tab over other tabs
    return {
      shouldReplace: false,
      lockInfo: existing,
    };
  } else {
    // Keep existing by default
    return {
      shouldReplace: false,
      lockInfo: existing,
    };
  }
};