import { fetchProfilePoints } from "@/actions/fetchProfilePoints";
import { useQuery } from "@tanstack/react-query";
import type { ProfilePoint } from "@/actions/fetchProfilePoints";

export const profilePointsQueryKey = (username?: string) => ["profile-points", username];

export const useProfilePoints = (username?: string) => {
    return useQuery<ProfilePoint[] | null>({
        queryKey: profilePointsQueryKey(username),
        queryFn: () => fetchProfilePoints(username),
        staleTime: 60_000,
    });
}; 