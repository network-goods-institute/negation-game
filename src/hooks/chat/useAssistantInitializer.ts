import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getSpace } from "@/actions/spaces/getSpace";
import {
  fetchAllSpacePoints,
  PointInSpace,
} from "@/actions/points/fetchAllSpacePoints";
import {
  fetchProfilePoints,
  ProfilePoint,
} from "@/actions/points/fetchProfilePoints";
import {
  fetchUserEndorsedPoints,
  UserEndorsedPoint,
} from "@/actions/points/fetchUserEndorsedPoints";
import { fetchViewpoints } from "@/actions/viewpoints/fetchViewpoints";
import { ChatRationale } from "@/types/chat";
import { nanoid } from "nanoid";

export function useAssistantInitializer(isAuthenticated: boolean | null) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isFetchingRationales, setIsFetchingRationales] = useState(true);
  const [currentSpace, setCurrentSpace] = useState<string | null>(null);
  const [allPointsInSpace, setAllPointsInSpace] = useState<PointInSpace[]>([]);
  const [ownedPoints, setOwnedPoints] = useState<ProfilePoint[]>([]);
  const [endorsedPoints, setEndorsedPoints] = useState<UserEndorsedPoint[]>([]);
  const [userRationales, setUserRationales] = useState<ChatRationale[]>([]);
  const [availableRationales, setAvailableRationales] = useState<
    ChatRationale[]
  >([]);

  useEffect(() => {
    const initialize = async () => {
      setIsInitializing(true);
      setIsFetchingRationales(true);
      try {
        const space = await getSpace();
        setCurrentSpace(space);
        if (isAuthenticated) {
          const [allPoints, profilePoints, endorsed] = await Promise.all([
            fetchAllSpacePoints(),
            fetchProfilePoints(),
            fetchUserEndorsedPoints(),
          ]);
          setAllPointsInSpace(allPoints || []);
          setOwnedPoints(profilePoints || []);
          setEndorsedPoints(endorsed || []);

          let fetched: any[] = [];
          try {
            fetched = await fetchViewpoints(space);
          } catch {
            toast.error("Failed to load rationales for distillation.");
          } finally {
            setIsFetchingRationales(false);
          }

          const converted = (fetched || []).map((r: any): ChatRationale => {
            const defaultGraph = { nodes: [], edges: [] };
            const graphData = r.graph || defaultGraph;
            const statsData = r.statistics || {
              views: 0,
              copies: 0,
              totalCred: 0,
              averageFavor: 0,
            };
            return {
              id: String(r.id || nanoid()),
              title: String(r.title || "Untitled Rationale"),
              description: String(r.description || ""),
              author: String(r.authorUsername || "Unknown Author"),
              authorId: String(r.authorId || "unknown"),
              authorUsername: String(r.authorUsername || "unknown"),
              createdAt: String(r.createdAt || new Date().toISOString()),
              graph: {
                nodes: (graphData.nodes || []).map((n: any) => ({
                  id: String(n.id || nanoid()),
                  type: ["point", "statement", "addPoint"].includes(n.type)
                    ? n.type
                    : "statement",
                  data: {
                    content: n.data?.content,
                    statement: n.data?.statement,
                    pointId: n.data?.pointId,
                  },
                })),
                edges: (graphData.edges || []).map((e: any) => ({
                  id: String(e.id || nanoid()),
                  type: String(e.type || "default"),
                  source: String(e.source),
                  target: String(e.target),
                })),
              },
              statistics: {
                views: Number(statsData.views || 0),
                copies: Number(statsData.copies || 0),
                totalCred: Number(statsData.totalCred || 0),
                averageFavor: Number(statsData.averageFavor || 0),
              },
            };
          });
          setUserRationales(converted);
          setAvailableRationales(converted);
        } else {
          setAllPointsInSpace([]);
          setOwnedPoints([]);
          setEndorsedPoints([]);
          setUserRationales([]);
          setAvailableRationales([]);
          setIsFetchingRationales(false);
        }
      } catch {
        setCurrentSpace("global");
        setAllPointsInSpace([]);
        setOwnedPoints([]);
        setEndorsedPoints([]);
        setUserRationales([]);
        setAvailableRationales([]);
        setIsFetchingRationales(false);
      } finally {
        setTimeout(() => setIsInitializing(false), 200);
      }
    };
    if (isAuthenticated !== null && isAuthenticated !== undefined) {
      initialize();
    }
  }, [isAuthenticated]);

  return {
    isInitializing,
    isFetchingRationales,
    currentSpace,
    allPointsInSpace,
    ownedPoints,
    endorsedPoints,
    userRationales,
    availableRationales,
  };
}
