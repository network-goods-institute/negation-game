import { fetchSimilarPoints } from "@/actions/points/fetchSimilarPoints";
import { POINT_MIN_LENGTH } from "@/constants/config";
import { useQuery } from "@tanstack/react-query";

export const useSimilarPoints = (content: string) => {
  return useQuery({
    queryKey: ["similarPoints", content],
    queryFn: ({ queryKey: [, query] }) =>
      content.length >= POINT_MIN_LENGTH ? fetchSimilarPoints({ query }) : [],
  });
};
