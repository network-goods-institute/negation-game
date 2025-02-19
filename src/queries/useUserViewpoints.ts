import { fetchUserViewpoints } from "@/actions/fetchUserViewpoints";
import { useQuery } from "@tanstack/react-query";

export const useUserViewpoints = () => {
  return useQuery({
    queryKey: ["user-viewpoints"],
    queryFn: () => fetchUserViewpoints(),
    staleTime: 60_000,
  });
};
