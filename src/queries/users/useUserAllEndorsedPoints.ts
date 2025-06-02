import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { fetchAllUserEndorsedPoints } from "@/actions/points/fetchAllUserEndorsedPoints";
import type { UserEndorsedPoint } from "@/actions/points/fetchUserEndorsedPoints";

export const userAllEndorsedPointsQueryKey = (username?: string) => [
  "user-all-endorsed-points",
  username,
];

export const useUserAllEndorsedPoints = (
  username?: string,
  options?: Partial<UseQueryOptions<UserEndorsedPoint[] | null>>
) => {
  return useQuery<UserEndorsedPoint[] | null>({
    queryKey: userAllEndorsedPointsQueryKey(username),
    queryFn: () => fetchAllUserEndorsedPoints(username),
    staleTime: 60_000,
    ...options,
  });
};
