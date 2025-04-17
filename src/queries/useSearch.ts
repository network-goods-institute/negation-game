import { searchContent, SearchResult } from "@/actions/searchContent";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { useDebounce } from "@uidotdev/usehooks";

export const useSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 500);
  const [isActive, setIsActive] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const {
    data: searchResults,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.trim().length < 2) {
        return [] as SearchResult[];
      }
      setHasSearched(true);
      return searchContent([debouncedQuery]);
    },
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 30000,
  });

  useEffect(() => {
    if (!searchQuery) {
      setIsActive(false);
      setHasSearched(false);
    } else if (searchQuery && searchQuery.trim().length >= 2) {
      setIsActive(true);
    }
  }, [searchQuery]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const isSearchLoading = isLoading || isFetching;

  return {
    searchQuery,
    searchResults: searchResults || [],
    isLoading: isSearchLoading,
    handleSearch,
    isActive,
    setIsActive,
    hasSearched,
  };
};
