import { improvePoint } from "@/actions/ai/improvePoint";
import { POINT_MIN_LENGTH } from "@/constants/config";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect } from "react";import { logger } from "@/lib/logger";

export const useImprovePoint = (
  content: string,
  options?: { enabled?: boolean }
) => {
  const queryResult = useQuery({
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

  useEffect(() => {
    if (queryResult.error) {
      toast.error(
        "Failed to get improvement suggestions. Please contact support if this persists."
      );
      logger.error(
        "Error fetching improvement suggestions:",
        queryResult.error
      );
    }
  }, [queryResult.error]);

  return queryResult;
};
