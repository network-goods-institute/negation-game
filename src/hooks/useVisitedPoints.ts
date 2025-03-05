import { useEffect, useState, useCallback } from "react";

const DB_NAME = "appStorage";
const STORE_NAME = "visitedPoints";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
const PRUNE_AGE = 6 * 30 * 24 * 60 * 60 * 1000; // 6 months retention
const BATCH_DEBOUNCE = 1000; // 1 second write batching

type VisitedCache = {
  entries: Map<number, boolean>;
  lastUpdated: number;
};

let dbPromise: Promise<IDBDatabase>;
let writeQueue = new Map<number, number>();
let writeTimeout: NodeJS.Timeout | null = null;
let memoryCache: VisitedCache = {
  entries: new Map(),
  lastUpdated: 0,
};

// Initialize database connection during app load
if (typeof window !== "undefined") {
  initializeDb();
}

function initializeDb() {
  return (dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);

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
  if (writeQueue.size === 0) return;

  const db = await dbPromise;
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
  const db = await dbPromise;
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

export function useVisitedPoints() {
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    initializeDb()
      .then(() => setIsDbReady(true))
      .catch(console.error);
  }, []);

  const markPointAsRead = useCallback(
    (pointId: number) => {
      if (!isDbReady) return;

      // Batch writes
      writeQueue.set(pointId, Date.now());
      if (writeTimeout) clearTimeout(writeTimeout);
      writeTimeout = setTimeout(bulkWritePoints, BATCH_DEBOUNCE);

      // Optimistic UI update
      memoryCache.entries.set(pointId, true);
    },
    [isDbReady]
  );

  const arePointsVisited = useCallback(
    async (pointIds: number[]) => {
      if (!isDbReady) return new Map<number, boolean>();

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
    [isDbReady]
  );

  const isVisited = useCallback(
    async (pointId: number) => {
      if (!isDbReady) return true;
      if (memoryCache.entries.has(pointId))
        return memoryCache.entries.get(pointId)!;

      const results = await bulkReadPoints([pointId]);
      const visited = results.get(pointId) ?? true;

      // Update memory cache with the result
      memoryCache.entries.set(pointId, visited);
      memoryCache.lastUpdated = Date.now();

      return visited;
    },
    [isDbReady]
  );

  return { isVisited, arePointsVisited, markPointAsRead };
}
