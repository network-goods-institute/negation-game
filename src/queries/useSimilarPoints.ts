import { fetchSimilarPoints } from "@/actions/fetchSimilarPoints";
import { POINT_MIN_LENGHT } from "@/constants/config";
import { useQuery } from "@tanstack/react-query";

export const useSimilarPoints = (content: string) => {
  return useQuery({
    queryKey: ["similarPoints", content],
    queryFn: ({ queryKey: [, query] }) =>
      content.length >= POINT_MIN_LENGHT ? fetchSimilarPoints({ query }) : [],
  });
};
