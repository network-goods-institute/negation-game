import { fetchAllUsers } from "@/actions/users/fetchAllUsers";
import { useQuery } from "@tanstack/react-query";

export const useAllUsers = () => {
  return useQuery({
    queryKey: ["allUsers"],
    queryFn: fetchAllUsers,
  });
};
