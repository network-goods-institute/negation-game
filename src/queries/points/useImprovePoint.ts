import { improvePoint } from "@/actions/ai/improvePoint";
import { POINT_MIN_LENGTH } from "@/constants/config";
import { useQuery } from "@tanstack/react-query";

export const useImprovePoint = (
  content: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ["improvementSuggestions", content],
    queryFn: ({ queryKey: [, query] }) =>
      content.length >= POINT_MIN_LENGTH ? improvePoint(query) : null,
    enabled: options?.enabled,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    gcTime: 0,
  });
};
