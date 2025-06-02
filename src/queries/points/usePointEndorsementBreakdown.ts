import { useQuery } from "@tanstack/react-query";
import { fetchPointEndorsementBreakdown } from "../../actions/endorsements/fetchPointEndorsementBreakdown";

export interface EndorsementDetail {
  userId: string;
  username: string;
  cred: number;
}

export const usePointEndorsementBreakdown = (
  pointId: number,
  enabled: boolean = true
) => {
  return useQuery<EndorsementDetail[]>({
    queryKey: ["point", pointId, "endorsementBreakdown"],
    queryFn: () => fetchPointEndorsementBreakdown(pointId),
    staleTime: 1000 * 60 * 5,
    enabled,
  });
};
