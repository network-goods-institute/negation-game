import { improvePoint } from "@/actions/improvePoint";
import { POINT_MIN_LENGHT } from "@/constants/config";
import { useQuery } from "@tanstack/react-query";

export const useImprovePoint = (content: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ["improvementSuggestions", content],
    queryFn: ({ queryKey: [, query] }) =>
      content.length >= POINT_MIN_LENGHT ? improvePoint(query) : null,
    enabled: options?.enabled,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    gcTime: 0
  });
}; 