import { getCounterpointSuggestions } from "@/actions/getCounterpointSuggestions";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export const useCounterpointSuggestions = (pointId?: number) => {
  const { data: counterpointSuggestionsStream } = useQuery({
    queryKey: ["counterpoint-suggestions", pointId],
    queryFn: ({ queryKey: [, pointId] }) =>
      getCounterpointSuggestions(pointId as number),
    enabled: !!pointId,
    staleTime: Infinity,
  });

  const [counterpointSuggestions, setCounterpointSuggestions] = useState<
    string[]
  >([]);

  useEffect(() => {
    if (
      counterpointSuggestionsStream === undefined ||
      counterpointSuggestionsStream.locked
    )
      return;

    setCounterpointSuggestions([]);
    let isCancelled = false;

    const consumeStream = async () => {
      const reader = counterpointSuggestionsStream.getReader();
      while (!isCancelled) {
        const { done, value } = await reader.read();
        if (done) break;
        setCounterpointSuggestions((prev) => [...prev, value]);
      }
      reader.releaseLock();
    };

    consumeStream();

    return () => {
      isCancelled = true;
    };
  }, [counterpointSuggestionsStream]);

  return counterpointSuggestions;
};
