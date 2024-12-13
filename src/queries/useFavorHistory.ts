import { fetchFavorHistory } from "@/actions/fetchFavorHistory";
import { TimelineScale } from "@/lib/timelineScale";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

export const useFavorHistory = ({
  pointId,
  timelineScale,
}: {
  pointId: number;
  timelineScale: TimelineScale;
}) => {
  return useQuery({
    queryKey: [pointId, "favor-history", timelineScale] as const,
    queryFn: ({ queryKey: [pointId, , scale] }) => {
      return fetchFavorHistory({ pointId, scale });
    },
    placeholderData: keepPreviousData,
    refetchInterval: 60000,
  });
};
