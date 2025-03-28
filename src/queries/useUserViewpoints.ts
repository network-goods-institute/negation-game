import { fetchUserViewpoints } from "@/actions/fetchUserViewpoints";
import { useQuery } from "@tanstack/react-query";

export const useUserViewpoints = (username?: string) => {
  return useQuery({
    queryKey: ["user-rationales", username],
    queryFn: () => fetchUserViewpoints(username),
    staleTime: 60_000,
  });
};
