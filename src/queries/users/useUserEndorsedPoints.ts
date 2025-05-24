import { fetchUserEndorsedPoints } from "@/actions/points/fetchUserEndorsedPoints";
import { useQuery } from "@tanstack/react-query";
import type { UserEndorsedPoint } from "@/actions/points/fetchUserEndorsedPoints";
import type { UseQueryOptions } from "@tanstack/react-query";

export const userEndorsedPointsQueryKey = (username?: string) => [
  "user-endorsed-points",
  username,
];

export const useUserEndorsedPoints = (
  username?: string,
  options?: Partial<UseQueryOptions<UserEndorsedPoint[] | null>>
) => {
  return useQuery<UserEndorsedPoint[] | null>({
    queryKey: userEndorsedPointsQueryKey(username),
    queryFn: () => fetchUserEndorsedPoints(username),
    staleTime: 60_000,
    ...options,
  });
};
