import { useQuery } from "@tanstack/react-query";
import { fetchSpaceUsers } from "@/actions/users/fetchSpaceUsers";

export const useSpaceUsers = (spaceId: string) => {
  return useQuery({
    queryKey: ["spaceUsers", spaceId],
    queryFn: () => fetchSpaceUsers(spaceId),
    staleTime: 5 * 60 * 1000,
  });
};