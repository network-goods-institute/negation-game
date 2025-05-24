import { fetchProfilePoints } from "@/actions/points/fetchProfilePoints";
import { useQuery } from "@tanstack/react-query";
import type { ProfilePoint } from "@/actions/points/fetchProfilePoints";

export const profilePointsQueryKey = (username?: string) => ["profile-points", username];

export const useProfilePoints = (username?: string) => {
    return useQuery<ProfilePoint[] | null>({
        queryKey: profilePointsQueryKey(username),
        queryFn: () => fetchProfilePoints(username),
        staleTime: 60_000,
    });
}; 