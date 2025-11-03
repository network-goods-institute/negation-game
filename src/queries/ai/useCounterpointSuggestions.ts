import { getCounterpointSuggestions } from "@/actions/ai/getCounterpointSuggestions";
import {
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";import { logger } from "@/lib/logger";

export const counterpointSuggestionsKey = (pointId?: number) => [
  "counterpoint-suggestions",
  pointId,
];

export const useCounterpointSuggestions = (pointId?: number) => {
  const queryClient = useQueryClient();

  // Start loading immediately when pointId is available
  useEffect(() => {
    if (pointId) {
      queryClient.prefetchQuery({
        queryKey: counterpointSuggestionsKey(pointId),
        queryFn: () => getCounterpointSuggestions(pointId),
      });
    }
  }, [pointId, queryClient]);

  const { data: counterpointSuggestionsStream } = useQuery({
    queryKey: counterpointSuggestionsKey(pointId),
    queryFn: ({ queryKey: [, pointId] }) =>
      getCounterpointSuggestions(pointId as number),
    enabled: !!pointId,
    staleTime: Infinity,
  });

  const [counterpointSuggestions, setCounterpointSuggestions] = useState<
    string[]
  >([]);

  useEffect(() => {
    if (!counterpointSuggestionsStream || counterpointSuggestionsStream.locked)
      return;

    setCounterpointSuggestions([]);
    let isCancelled = false;

    const consumeStream = async () => {
      const reader = counterpointSuggestionsStream.getReader();
      try {
        while (!isCancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          setCounterpointSuggestions((prev) => [...prev, value]);
        }
      } catch (error) {
        toast.error(
          "Failed to stream counterpoint suggestions. Please contact support if this persists."
        );
        logger.error("Error consuming stream:", error);
      } finally {
        reader.releaseLock();
      }
    };

    consumeStream();

    return () => {
      isCancelled = true;
    };
  }, [counterpointSuggestionsStream]);

  return counterpointSuggestions;
};
