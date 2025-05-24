import { useEffect, useState, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useSetAtom } from "jotai";
import { visitedPointsAtom } from "@/atoms/visitedPointsAtom";

const DB_NAME = "appStorage";
const STORE_NAME = "visitedPoints";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
const PRUNE_AGE = 6 * 30 * 24 * 60 * 60 * 1000; // 6 months retention
const BATCH_DEBOUNCE = 1000; // 1 second write batching

type VisitedCache = {
  entries: Map<number, boolean>;
  lastUpdated: number;
};

let dbPromise: Promise<IDBDatabase> | null = null;
let writeQueue = new Map<number, number>();
let writeTimeout: NodeJS.Timeout | null = null;
let memoryCache: VisitedCache = {
  entries: new Map(),
  lastUpdated: 0,
};

// Initialize database connection during app load - but only in browser environments
if (typeof window !== "undefined" && typeof window.indexedDB !== "undefined") {
  initializeDb();
}

function initializeDb() {
  if (
    typeof window === "undefined" ||
    typeof window.indexedDB === "undefined"
  ) {
    return Promise.resolve(null);
  }

  return (dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 2);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "pointId" });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      pruneOldEntries(db)
        .then(() => resolve(db))
        .catch(reject);
    };
    request.onerror = () => reject(request.error);
  }));
}

async function pruneOldEntries(db: IDBDatabase) {
  const threshold = Date.now() - PRUNE_AGE;
  const transaction = db.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  const index = store.index("timestamp");
  const range = IDBKeyRange.upperBound(threshold);

  const request = index.getAllKeys(range);
  const keys: IDBValidKey[] = await new Promise((resolve) => {
    request.onsuccess = () => resolve(request.result);
  });

  keys.forEach((key: IDBValidKey) => {
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    store.delete(key);
  });
}

async function bulkWritePoints() {
  if (writeQueue.size === 0 || !dbPromise) return;

  const db = await dbPromise;
  if (!db) return;

  const transaction = db.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  const entries = Array.from(writeQueue.entries()).map(
    ([pointId, timestamp]) => ({ pointId, timestamp })
  );

  entries.forEach((entry) => store.put(entry));
  writeQueue.clear();

  // Update memory cache
  entries.forEach(({ pointId }) => memoryCache.entries.set(pointId, true));
  memoryCache.lastUpdated = Date.now();
}

async function bulkReadPoints(
  pointIds: number[]
): Promise<Map<number, boolean>> {
  if (!dbPromise) return new Map();

  const db = await dbPromise;
  if (!db) return new Map();

  return new Promise((resolve) => {
    const results = new Map<number, boolean>();
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);

    // Points are unvisited by default
    pointIds.forEach((pointId) => results.set(pointId, false));

    pointIds.forEach((pointId) => {
      const request = store.get(pointId);
      request.onsuccess = () => {
        // If we have a record at all, the point was visited
        if (request.result) {
          results.set(pointId, true);
        }
      };
    });

    transaction.oncomplete = () => resolve(results);
    transaction.onerror = () => resolve(results);
  });
}

async function getAllVisitedPoints(): Promise<Set<number>> {
  if (!dbPromise) return new Set();

  const db = await dbPromise;
  if (!db) return new Set();

  return new Promise((resolve) => {
    const results = new Set<number>();
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      request.result.forEach((record: { pointId: number }) => {
        results.add(record.pointId);
      });
      resolve(results);
    };
    request.onerror = () => resolve(new Set());
  });
}

export function useVisitedPoints() {
  const [isDbReady, setIsDbReady] = useState(false);
  const { user } = usePrivy();
  const setVisitedPoints = useSetAtom(visitedPointsAtom);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.indexedDB === "undefined"
    ) {
      return;
    }

    initializeDb()
      .then(async (db) => {
        if (db) {
          setIsDbReady(true);
          // Initialize atom with all visited points from IndexedDB
          const allVisited = await getAllVisitedPoints();
          setVisitedPoints(allVisited);
        }
      })
      .catch(console.error);
  }, [setVisitedPoints]);

  const markPointAsRead = useCallback(
    (pointId: number) => {
      if (!isDbReady || !user) return;

      // Batch writes to IndexedDB
      writeQueue.set(pointId, Date.now());
      if (writeTimeout) clearTimeout(writeTimeout);
      writeTimeout = setTimeout(bulkWritePoints, BATCH_DEBOUNCE);

      // Update memory cache
      memoryCache.entries.set(pointId, true);

      // Update atom state
      setVisitedPoints((prev) => {
        const newSet = new Set(prev);
        newSet.add(pointId);
        return newSet;
      });
    },
    [isDbReady, user, setVisitedPoints]
  );

  const arePointsVisited = useCallback(
    async (pointIds: number[]) => {
      if (!isDbReady || !user) return new Map<number, boolean>();

      // Cache-first strategy
      if (Date.now() - memoryCache.lastUpdated < CACHE_TTL) {
        return new Map(
          pointIds.map((id) => [id, memoryCache.entries.get(id) || false])
        );
      }

      // Bulk read and cache
      const dbResults = await bulkReadPoints(pointIds);
      dbResults.forEach((val, key) => memoryCache.entries.set(key, val));
      memoryCache.lastUpdated = Date.now();
      return dbResults;
    },
    [isDbReady, user]
  );

  const isVisited = useCallback(
    async (pointId: number) => {
      // Always return true if user is not logged in
      if (!isDbReady || !user) return true;

      if (memoryCache.entries.has(pointId))
        return memoryCache.entries.get(pointId)!;

      const results = await bulkReadPoints([pointId]);
      const visited = results.get(pointId) ?? true;

      // Update memory cache with the result
      memoryCache.entries.set(pointId, visited);
      memoryCache.lastUpdated = Date.now();

      return visited;
    },
    [isDbReady, user]
  );

  return { isVisited, arePointsVisited, markPointAsRead };
}
