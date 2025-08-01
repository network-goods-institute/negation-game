import { useQuery } from "@tanstack/react-query";
import { fetchPoints } from "@/actions/points/fetchPoints";
import { fetchUserEndorsementsByPoints } from "@/actions/endorsements/fetchUserEndorsementsByPoints";
import { fetchPointEndorsementBreakdowns } from "@/actions/endorsements/fetchPointEndorsementBreakdowns";
import { fetchUsers } from "@/actions/users/fetchUsers";
import { useMemo } from "react";
import {
  RATIONALE_CACHE_CONFIG,
  QUERY_KEYS,
} from "@/lib/cache/rationaleLoadingStrategy";
import type { PointData } from "@/queries/points/usePointData";

export interface ParallelRationalePointData extends PointData {
  opCred?: number;
  endorsementBreakdown?: Array<{
    userId: string;
    username: string;
    cred: number;
  }>;
  authorData?: {
    id: string;
    username: string;
  };
  isEndorsementLoading?: boolean;
  isAuthorLoading?: boolean;
}

export interface UseParallelRationaleDataResult {
  pointsData: ParallelRationalePointData[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isPointsLoading: boolean;
  isUsersLoading: boolean;
  isEndorsementsLoading: boolean;
  isBreakdownsLoading: boolean;
}

export function useParallelRationaleData(
  pointIds: number[],
  originalPosterId?: string
): UseParallelRationaleDataResult {
  const predictedUserIds = useMemo(() => {
    const ids = new Set<string>();
    if (originalPosterId) ids.add(originalPosterId);
    return Array.from(ids);
  }, [originalPosterId]);

  const pointsQuery = useQuery({
    queryKey: QUERY_KEYS.rationalePoints(pointIds),
    queryFn: () => fetchPoints(pointIds),
    enabled: pointIds.length > 0,
    ...RATIONALE_CACHE_CONFIG.POINTS,
  });

  const usersQuery = useQuery({
    queryKey: QUERY_KEYS.rationaleUsers(predictedUserIds),
    queryFn: () => fetchUsers(predictedUserIds),
    enabled: predictedUserIds.length > 0,
    ...RATIONALE_CACHE_CONFIG.USERS,
  });

  const opEndorsementsQuery = useQuery({
    queryKey: QUERY_KEYS.rationaleOpEndorsements(pointIds, originalPosterId),
    queryFn: () =>
      originalPosterId
        ? fetchUserEndorsementsByPoints(originalPosterId, pointIds)
        : Promise.resolve([]),
    enabled: !!originalPosterId && pointIds.length > 0,
    ...RATIONALE_CACHE_CONFIG.ENDORSEMENTS,
  });

  const breakdownsQuery = useQuery({
    queryKey: QUERY_KEYS.rationaleEndorsementBreakdowns(pointIds),
    queryFn: () => fetchPointEndorsementBreakdowns(pointIds),
    enabled: pointIds.length > 0,
    ...RATIONALE_CACHE_CONFIG.ENDORSEMENTS,
  });

  const additionalUserIds = useMemo(() => {
    if (!pointsQuery.data) return [];
    const additionalIds = new Set<string>();
    pointsQuery.data.forEach((point) => {
      if (point.createdBy && !predictedUserIds.includes(point.createdBy)) {
        additionalIds.add(point.createdBy);
      }
    });
    return Array.from(additionalIds);
  }, [pointsQuery.data, predictedUserIds]);

  const additionalUsersQuery = useQuery({
    queryKey: QUERY_KEYS.rationaleUsers([
      ...predictedUserIds,
      ...additionalUserIds,
    ]),
    queryFn: () => fetchUsers([...predictedUserIds, ...additionalUserIds]),
    enabled: additionalUserIds.length > 0,
    ...RATIONALE_CACHE_CONFIG.USERS,
  });

  const allUsersData = additionalUsersQuery.data || usersQuery.data;

  const pointsData = useMemo(() => {
    if (!pointsQuery.data) return [];

    return pointsQuery.data.map((point) => {
      const authorData = allUsersData?.find((u) => u.id === point.createdBy);

      const opCred = opEndorsementsQuery.data?.find(
        (e) => e.pointId === point.pointId
      )?.cred;

      const breakdown = breakdownsQuery.data?.find(
        (b) => b.pointId === point.pointId
      )?.breakdown;

      return {
        ...point,
        opCred,
        endorsementBreakdown: breakdown,
        authorData: authorData
          ? {
              id: authorData.id,
              username: authorData.username,
            }
          : undefined,
        isEndorsementLoading:
          opEndorsementsQuery.isLoading || breakdownsQuery.isLoading,
        isAuthorLoading: usersQuery.isLoading || additionalUsersQuery.isLoading,
      } satisfies ParallelRationalePointData;
    });
  }, [
    pointsQuery.data,
    allUsersData,
    opEndorsementsQuery.data,
    opEndorsementsQuery.isLoading,
    breakdownsQuery.data,
    breakdownsQuery.isLoading,
    usersQuery.isLoading,
    additionalUsersQuery.isLoading,
  ]);

  const isLoading = pointsQuery.isLoading;
  const isError = pointsQuery.isError;
  const error = pointsQuery.error;

  return {
    pointsData,
    isLoading,
    isError,
    error,
    isPointsLoading: pointsQuery.isLoading,
    isUsersLoading: usersQuery.isLoading || additionalUsersQuery.isLoading,
    isEndorsementsLoading: opEndorsementsQuery.isLoading,
    isBreakdownsLoading: breakdownsQuery.isLoading,
  };
}
