import { useQuery } from "@tanstack/react-query";
import { searchUsers } from "@/actions/users/searchUsers";
import { useDebounce } from "@/hooks/utils/useDebounce";

export const useSearchUsers = (query: string) => {
  const debouncedQuery = useDebounce(query, 300);

  return useQuery({
    queryKey: ["searchUsers", debouncedQuery],
    queryFn: async () => {
      try {
        console.log("Searching for users with query:", debouncedQuery);
        const result = await searchUsers(debouncedQuery);
        console.log("Search results:", result);
        return result;
      } catch (error) {
        console.error("Search error:", error);
        throw error;
      }
    },
    enabled: debouncedQuery.trim().length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};
