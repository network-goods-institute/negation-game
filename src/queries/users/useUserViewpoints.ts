import { fetchUserViewpoints } from "@/actions/viewpoints/fetchUserViewpoints";
import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";

export const useUserViewpoints = (
  username?: string,
  options?: Partial<
    UseQueryOptions<Awaited<ReturnType<typeof fetchUserViewpoints>>>
  >
) => {
  return useQuery({
    queryKey: ["user-rationales", username],
    queryFn: () => fetchUserViewpoints(username),
    staleTime: 60_000,
    ...options,
  });
};
