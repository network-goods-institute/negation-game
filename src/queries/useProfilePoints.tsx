import { fetchProfilePoints } from "@/actions/fetchProfilePoints";
import { useQuery } from "@tanstack/react-query";
import type { ProfilePoint } from "@/actions/fetchProfilePoints";

export const profilePointsQueryKey = ["profile-points"];

export const useProfilePoints = () => {
    return useQuery<ProfilePoint[]>({
        queryKey: profilePointsQueryKey,
        queryFn: () => fetchProfilePoints(),
        staleTime: 60_000,
    });
}; 