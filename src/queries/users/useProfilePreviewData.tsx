import { fetchUserProfilePreviewData } from "@/actions/users/fetchUserProfilePreviewData";
import { useQuery } from "@tanstack/react-query";

export const profilePreviewQueryKey = (userId?: string) => ["profile-preview", userId];

export const useProfilePreviewData = (userId?: string) => {
    return useQuery({
        queryKey: profilePreviewQueryKey(userId),
        queryFn: async () => {
            if (!userId) return null;
            const result = await fetchUserProfilePreviewData(userId);
            return result;
        },
        enabled: !!userId,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 1,
    });
}; 