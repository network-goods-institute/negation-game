import { useQuery } from "@tanstack/react-query";
import { fetchUsersReputation } from "@/actions/users/fetchUsersReputation";

export const useUsersReputation = (userIds: string[]) => {
  return useQuery({
    queryKey: ["users-reputation", userIds],
    queryFn: () => fetchUsersReputation(userIds),
    enabled: userIds.length > 0,
  });
};
