import { fetchUserEndorsedPoints } from "@/actions/fetchUserEndorsedPoints";
import { useQuery } from "@tanstack/react-query";
import type { UserEndorsedPoint } from "@/actions/fetchUserEndorsedPoints";

export const userEndorsedPointsQueryKey = (username?: string) => [
  "user-endorsed-points",
  username,
];

export const useUserEndorsedPoints = (username?: string) => {
  return useQuery<UserEndorsedPoint[] | null>({
    queryKey: userEndorsedPointsQueryKey(username),
    queryFn: () => fetchUserEndorsedPoints(username),
    staleTime: 60_000,
  });
};
